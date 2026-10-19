#include <Arduino.h>
#include <U8g2lib.h>
#include "BluetoothA2DPSink.h"
#include <arduinoFFT.h>
#include <math.h>
#include <SPI.h>

// =========================
// DISPLAY SSD1322 (4-wire SW SPI) - pins che hai e che funzionano
// SCLK=18, MOSI=23, CS=5, DC=19, RESET=3V3 fisso
// =========================
static const uint8_t PIN_SCLK = 18;
static const uint8_t PIN_MOSI = 23;
static const uint8_t OLED_CS   = 5;
//static const uint8_t PIN_DC   = 19;
static const uint8_t PIN_DC   = 0;

U8G2_SSD1322_NHD_256X64_F_4W_HW_SPI u8g2(
  U8G2_R0,
  OLED_CS,
  PIN_DC
);

#ifndef SSD1322_WHITE
#define SSD1322_WHITE 1
#endif

// =========================
// LED (opzionale)
// =========================
#ifndef LED_PIN
#define LED_PIN 2
#endif

// =========================
// AUDIO / A2DP -> I2S (ATTENZIONE: questi pin devono essere quelli del tuo codec sulla Audio Kit)
// =========================
static const int I2S_BCLK = 27;
static const int I2S_LRCK = 25;
static const int I2S_DOUT = 26;

BluetoothA2DPSink a2dp_sink;

// =========================
// SPECTRUM CONFIG
// =========================
static const int screen_width  = 256;
static const int screen_height = 64;

static const int bar_count = 32;          // numero barre/linee
static const int bar_width = 6;           // pixel
static const int peak_gap  = 2;           // distanza dal picco (come tuo codice)
static const int bar_refresh_rate = 60;   // refresh logica barre (Hz)

static const float dB_min = -70.0f;
static const float dB_max = 0.0f;

// Modalità peaks come tuo codice
static const int PEAK_MODE = 0; // 0=bars+peaks, 1=solo bars, 2=solo peaks
static const int peak_hold_delay = 6; // più alto = tiene più a lungo (tuning)

// =========================
// DOUBLE BUFFER per passare dati FFT -> screen task (simile al tuo colBuffer)
// =========================
struct ColumnBuffer {
  float a[bar_count];
  float b[bar_count];
  float *readBuffer = a;
  float *writeBuffer = b;

  void alloc() {
    for (int i = 0; i < bar_count; i++) { a[i] = dB_min; b[i] = dB_min; }
  }
  void swap() {
    float *tmp = readBuffer;
    readBuffer = writeBuffer;
    writeBuffer = tmp;
  }
} colBuffer;

volatile bool colBuffer_swap_ready = false;

// =========================
// PEAK ARRAYS (come tuo codice)
// =========================
static int peak_position[bar_count];
static int peak_timer[bar_count];
static uint32_t currentPeakMicros[bar_count];

// =========================
// AUDIO RING BUFFER (campioni mono int16)
// =========================
static const int RB_SIZE = 8192;     // deve essere potenza di 2 per comodità
static volatile uint32_t rb_head = 0;
static volatile uint32_t rb_tail = 0;
static int16_t rb[RB_SIZE];

portMUX_TYPE rbMux = portMUX_INITIALIZER_UNLOCKED;

// push 1 sample (mono)
static inline void rb_push(int16_t s) {
  portENTER_CRITICAL(&rbMux);
  uint32_t next = (rb_head + 1) & (RB_SIZE - 1);
  if (next != rb_tail) {
    rb[rb_head] = s;
    rb_head = next;
  } else {
    // overflow: drop oldest
    rb_tail = (rb_tail + 1) & (RB_SIZE - 1);
    rb[rb_head] = s;
    rb_head = next;
  }
  portEXIT_CRITICAL(&rbMux);
}

// pop 1 sample, returns false if empty
static inline bool rb_pop(int16_t &out) {
  bool ok = false;
  portENTER_CRITICAL(&rbMux);
  if (rb_tail != rb_head) {
    out = rb[rb_tail];
    rb_tail = (rb_tail + 1) & (RB_SIZE - 1);
    ok = true;
  }
  portEXIT_CRITICAL(&rbMux);
  return ok;
}

// =========================
// A2DP CALLBACK: prende PCM e lo mette nel ringbuffer
// PCM tipico: stereo 16-bit little-endian
// =========================
void on_bt_pcm_data(const uint8_t *data, uint32_t len) {
  // len in bytes
  // stereo: 4 bytes per frame (L16 + R16)
  if (len < 4) return;

  for (uint32_t i = 0; i + 3 < len; i += 4) {
    int16_t l = (int16_t)((data[i + 1] << 8) | data[i + 0]);
    int16_t r = (int16_t)((data[i + 3] << 8) | data[i + 2]);

    int32_t m = (int32_t)l + (int32_t)r;
    m /= 2;
    rb_push((int16_t)m);
  }
}

// =========================
// BT state callbacks (come tuo codice)
// =========================
volatile bool bt_connected = false;

void on_connection_state_changed(esp_a2d_connection_state_t state, void *ptr) {
  if (state == ESP_A2D_CONNECTION_STATE_CONNECTED) {
    bt_connected = true;
    digitalWrite(LED_PIN, HIGH);
    Serial.println("[BT] A2DP connected");
  } else if (state == ESP_A2D_CONNECTION_STATE_DISCONNECTED) {
    bt_connected = false;
    digitalWrite(LED_PIN, LOW);
    Serial.println("[BT] A2DP disconnected");
  } else {
    Serial.println("[BT] A2DP connection state changed");
  }
}

void on_audio_state_changed(esp_a2d_audio_state_t state, void *ptr) {
  if (state == ESP_A2D_AUDIO_STATE_STARTED) {
    Serial.println("[BT] Audio started");
  } else if (state == ESP_A2D_AUDIO_STATE_STOPPED) {
    Serial.println("[BT] Audio stopped");
  } else if (state == ESP_A2D_AUDIO_STATE_REMOTE_SUSPEND) {
    Serial.println("[BT] Audio suspended");
  }
}

// =========================
// FFT TASK
// =========================
static const uint16_t FFT_SIZE = 256;
static const uint32_t FFT_SAMPLE_RATE = 44100; // frequenza di campionamento

static double vReal[FFT_SIZE];
static double vImag[FFT_SIZE];

ArduinoFFT<double> FFT = ArduinoFFT<double>(vReal, vImag, FFT_SIZE, FFT_SAMPLE_RATE);

static float mag_to_db(float mag) {
  // evita log(0)
  if (mag < 1e-6f) mag = 1e-6f;
  float db = 20.0f * log10f(mag);
  // clamp
  if (db < dB_min) db = dB_min;
  if (db > dB_max) db = dB_max;
  return db;
}

// mappa bin FFT -> barre (log-ish)
static int bin_for_bar(int barIndex, int binMax) {
  // distribuzione logaritmica semplice
  // bar 0 -> bin 1, bar last -> binMax
  float t = (float)barIndex / (float)(bar_count - 1);
  float f = powf(t, 2.2f); // curva (tuning)
  int bin = 1 + (int)(f * (binMax - 1));
  if (bin < 1) bin = 1;
  if (bin > binMax) bin = binMax;
  return bin;
}

void fft_task(void *pvParameters) {
  // init peaks
  for (int i = 0; i < bar_count; i++) {
    peak_position[i] = 1;
    peak_timer[i] = 0;
    currentPeakMicros[i] = micros();
  }

  while (true) {
    // aspetta abbastanza audio
    int16_t s;
    uint16_t collected = 0;

    while (collected < FFT_SIZE) {
      if (rb_pop(s)) {
        // normalize to [-1..1]
        vReal[collected] = (double)s / 32768.0;
        vImag[collected] = 0.0;
        collected++;
      } else {
        // niente dati: piccola pausa
        vTaskDelay(1);
      }
    }

    // Window + FFT
    FFT.windowing(FFT_WIN_TYP_HAMMING, FFT_FORWARD);
    FFT.compute(FFT_FORWARD);
    FFT.complexToMagnitude();

    // bins utili: 1..FFT_SIZE/2-1
    const int binMax = (FFT_SIZE / 2) - 1;

    // costruisci barre (media su piccolo range attorno al bin log)
    for (int i = 0; i < bar_count; i++) {
      int binCenter = bin_for_bar(i, binMax);
      int binStart = max(1, binCenter - 2);
      int binEnd   = min(binMax, binCenter + 2);

      double sum = 0;
      for (int b = binStart; b <= binEnd; b++) sum += vReal[b];
      double avg = sum / (double)(binEnd - binStart + 1);

      // converti in dB “visuali”
      float db = mag_to_db((float)avg);

      colBuffer.writeBuffer[i] = db;
    }

    colBuffer_swap_ready = true;

    // limita un po’ il carico CPU
    vTaskDelay(1);
  }
}

// =========================
// SCREEN TASK (la tua funzione “disegna linee” già convertita a U8g2)
// =========================
volatile uint32_t refresh = 0;

void screen_Task_routine(void *pvParameters) {
  colBuffer.alloc();

  // display init
    // Force SPI pins (ESP32) and set a faster bus clock for higher FPS.
  // If the display becomes unstable, lower this (e.g. 10000000).
  //SPI.begin(PIN_SCLK, -1, PIN_MOSI, PIN_CS);
  SPI.begin();
  u8g2.setBusClock(1700000);
  u8g2.begin();
  u8g2.setPowerSave(0);
  u8g2.setContrast(255);

  unsigned long currentMicros = micros();

    const uint32_t target_fps = 60;                 // increase if your display+SPI can handle it
  const TickType_t frameTicks = pdMS_TO_TICKS(1000 / target_fps);
  TickType_t lastWake = xTaskGetTickCount();
    // Precompute mapping (avoid repeated float math)
  const float dbRange = (dB_max - dB_min);
  const float pxPerDb = (float)screen_height / dbRange;
  const int col_px = screen_width / bar_count;
    // Static buffers: avoid heap usage inside a task
  static float y[bar_count];
  static float y_1[bar_count];
  static float y_2[bar_count];
  static float x_1[bar_count];
  static float x_2[bar_count];
  for (int i = 0; i < bar_count; i++) {
    y[i] = y_1[i] = y_2[i] = 0.0f;
    x_1[i] = x_2[i] = 0.0f;
  }

  delay(100);

  while (true) {
    if (colBuffer_swap_ready) {
      colBuffer.swap();
      colBuffer_swap_ready = false;
    }

    if (micros() - currentMicros > 100000 / bar_refresh_rate) {
      currentMicros = micros();

      for (int i = 0; i < bar_count; i++) {
        float x = colBuffer.readBuffer[i] - dB_min; // porta a [0..range]
        if (x < 0) x = 0;

        // 2nd-order Butterworth IIR (come tuo ramo #else)
        y[i] = 0.081926471866054f * x + 0.163852943732109f * x_1[i] + 0.081926471866054f * x_2[i]
             + 1.043326781704508f * y_1[i] - 0.371032669168726f * y_2[i];

        x_2[i] = x_1[i];
        x_1[i] = x;
        y_2[i] = y_1[i];
        y_1[i] = y[i];
      }
    }

    // ===== DRAW =====
    u8g2.clearBuffer();
    u8g2.setDrawColor(SSD1322_WHITE);

    // (opzionale) testo stato BT in alto
    // Minimal BT indicator (no font rendering)
    if (bt_connected) {
      u8g2.drawBox(0, 0, 6, 6);
    } else {
      u8g2.drawFrame(0, 0, 6, 6);
    }

    const int col_px = screen_width / bar_count;

    // Bars
    if (PEAK_MODE == 0 || PEAK_MODE == 1) {
      for (int i = 0; i < bar_count; i++) {
        int length = (int)(y[i] * ((float)screen_height / (dB_max - dB_min)) - peak_gap);

        if (length < 1) length = 1;

        // sposta in basso per lasciare spazio al testo
        int baseY = screen_height;
        int x = i * col_px - bar_width;
        int yTop = baseY - length;

        u8g2.drawBox(x, yTop, bar_width, length);
      }
    }

    // Peaks
    if (PEAK_MODE == 0 || PEAK_MODE == 2) {
      for (int i = 0; i < bar_count; i++) {
        int length = (int)(y[i] * ((float)screen_height / (dB_max - dB_min)));

        if (peak_position[i] < length) {
          peak_position[i] = length;
          peak_timer[i] = 1;
          currentPeakMicros[i] = micros();
        } else if (peak_position[i] > length) {
          if (peak_timer[i] == 0) peak_position[i] -= 1;
        }

        if (micros() - currentPeakMicros[i] > 10000000 / peak_hold_delay) {
          peak_timer[i] = 0;
        }

        if (peak_position[i] < 1) peak_position[i] = 1;

        int x = i * col_px - bar_width;
        int yLine = screen_height - peak_position[i];

        u8g2.drawHLine(x, yLine, bar_width);
      }
    }

    u8g2.sendBuffer();
    refresh++;

    vTaskDelayUntil(&lastWake, frameTicks);
  }
}

// =========================
// SETUP / LOOP
// =========================
void setup() {
  setCpuFrequencyMhz(240);  // Aumenta il clock a 240 MHz
  Serial.begin(115200);
  delay(300);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.println("Boot: ESP32 A2DP Sink + SSD1322 Spectrum");

  // --- I2S pin config (per codec) ---
  i2s_pin_config_t my_pin_config = {
    .bck_io_num = I2S_BCLK,
    .ws_io_num = I2S_LRCK,
    .data_out_num = I2S_DOUT,
    .data_in_num = I2S_PIN_NO_CHANGE
  };
  a2dp_sink.set_pin_config(my_pin_config);

  // accesso ai PCM per FFT (e mantiene anche l’output I2S)
  a2dp_sink.set_stream_reader(on_bt_pcm_data, true);

  a2dp_sink.set_volume(90);
  a2dp_sink.set_on_connection_state_changed(on_connection_state_changed);
  a2dp_sink.set_on_audio_state_changed(on_audio_state_changed);

  const char *device_name = "RIKY-ESP32-AUDIO";
  a2dp_sink.set_task_core(0);   // Bluetooth + I2S sul core 0
  a2dp_sink.start(device_name);

  Serial.printf("Bluetooth started. Pair with: %s\n", device_name);

  // Tasks: FFT + Screen
  xTaskCreatePinnedToCore(fft_task, "fft_task", 6144, nullptr, 1, nullptr, 1);     // FFT → core 1
  xTaskCreatePinnedToCore(screen_Task_routine, "screen_task", 6144, nullptr, 1, nullptr, 1); // Display → core 1
}

void loop() {
  // LED: lampeggia quando NON connesso, fisso ON quando connesso
  static uint32_t last = 0;
  static bool led = false;

  if (!bt_connected) {
    if (millis() - last > 500) {
      last = millis();
      led = !led;
      digitalWrite(LED_PIN, led ? HIGH : LOW);
    }
  } else {
    digitalWrite(LED_PIN, HIGH);
  }

  delay(5);
} 