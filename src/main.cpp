#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

// ==========================
// COLLEGAMENTI PCM1808
// ==========================

#define I2S_BCK   2
#define I2S_LRCK  15
#define I2S_DIN   16
#define I2S_MCLK  0

// ==========================
// CONFIGURAZIONE AUDIO
// ==========================

#define I2S_PORT I2S_NUM_0

#define SAMPLE_RATE 48000
#define BUFFER_SIZE 512

int32_t samples[BUFFER_SIZE];

// ==========================
// SETUP
// ==========================

void setup() {

  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("===========================");
  Serial.println("     PCM1808 AUDIO TEST");
  Serial.println("===========================");

  i2s_config_t config = {};

  config.mode = (i2s_mode_t)(
      I2S_MODE_MASTER |
      I2S_MODE_RX
  );

  config.sample_rate = SAMPLE_RATE;

  config.bits_per_sample =
      I2S_BITS_PER_SAMPLE_32BIT;

  config.channel_format =
      I2S_CHANNEL_FMT_RIGHT_LEFT;

  config.communication_format =
      I2S_COMM_FORMAT_STAND_I2S;

  config.intr_alloc_flags = 0;

  config.dma_buf_count = 8;
  config.dma_buf_len = 256;

  config.use_apll = false;
  config.tx_desc_auto_clear = false;
  config.fixed_mclk = 0;

  esp_err_t err = i2s_driver_install(
      I2S_PORT,
      &config,
      0,
      NULL
  );

  if (err != ESP_OK) {
    Serial.printf("Errore I2S: %d\n", err);
    while (true) delay(1000);
  }

  i2s_pin_config_t pins = {};

  pins.mck_io_num = I2S_MCLK;
  pins.bck_io_num = I2S_BCK;
  pins.ws_io_num = I2S_LRCK;
  pins.data_out_num = I2S_PIN_NO_CHANGE;
  pins.data_in_num = I2S_DIN;

  err = i2s_set_pin(I2S_PORT, &pins);

  if (err != ESP_OK) {
    Serial.printf("Errore pin I2S: %d\n", err);
    while (true) delay(1000);
  }

  Serial.println("PCM1808 inizializzato!");
  Serial.println("In attesa di audio...");
}

// ==========================
// LOOP
// ==========================

void loop() {

  size_t bytesRead = 0;

  esp_err_t err = i2s_read(
      I2S_PORT,
      samples,
      sizeof(samples),
      &bytesRead,
      pdMS_TO_TICKS(1000)
  );

  if (err != ESP_OK || bytesRead == 0) {
    Serial.println("Errore lettura audio");
    return;
  }

  int count = bytesRead / sizeof(int32_t);

  double sumLeft = 0;
  double sumRight = 0;

  int countLeft = 0;
  int countRight = 0;

  int32_t minSample = INT32_MAX;
  int32_t maxSample = INT32_MIN;

  for (int i = 0; i < count; i++) {

    int32_t sample = samples[i] >> 8;

    if (sample < minSample) minSample = sample;
    if (sample > maxSample) maxSample = sample;

    double normalized =
        (double)sample / 8388608.0;

    if (i % 2 == 0) {

      sumLeft += normalized * normalized;
      countLeft++;

    } else {

      sumRight += normalized * normalized;
      countRight++;

    }
  }

  float rmsLeft = countLeft
      ? sqrt(sumLeft / countLeft)
      : 0;

  float rmsRight = countRight
      ? sqrt(sumRight / countRight)
      : 0;

  float dbLeft =
      20.0 * log10(rmsLeft + 0.000001);

  float dbRight =
      20.0 * log10(rmsRight + 0.000001);

  int levelLeft = constrain(
      (int)((dbLeft + 60) / 2),
      0,
      30
  );

  int levelRight = constrain(
      (int)((dbRight + 60) / 2),
      0,
      30
  );

  // ==========================
  // MONITOR SERIALE
  // ==========================

  Serial.print("LEFT  [");

  for (int i = 0; i < 30; i++) {
    Serial.print(i < levelLeft ? "#" : " ");
  }

  Serial.print("] ");
  Serial.print(dbLeft, 1);
  Serial.println(" dBFS");

  Serial.print("RIGHT [");

  for (int i = 0; i < 30; i++) {
    Serial.print(i < levelRight ? "#" : " ");
  }

  Serial.print("] ");
  Serial.print(dbRight, 1);
  Serial.println(" dBFS");

  Serial.printf(
      "Samples: %d | MIN: %ld | MAX: %ld\n",
      count,
      (long)minSample,
      (long)maxSample
  );

  Serial.println("--------------------------------");

  delay(100);
} 
/*
PCM1808

ESP32

BCK

GPIO 2

OUT

GPIO 16

LRC

GPIO 15

SCK

GPIO 0

GND

GND

3.3V (entrambi)

3V3

+5V

5V

MD0

GND

MD1

GND

FMT/FMY

GND
*/