#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

// ==========================
// PCM1808 - INPUT
// ==========================

#define IN_BCK   2
#define IN_LRCK  15
#define IN_DOUT  16
#define IN_MCLK  0

// ==========================
// PCM5102A - OUTPUT
// ==========================

#define OUT_BCK   26
#define OUT_LRCK  33
#define OUT_DIN   21

// ==========================
// CONFIGURAZIONE AUDIO
// ==========================

#define SAMPLE_RATE 48000
#define BUFFER_SIZE 512

#define INPUT_PORT  I2S_NUM_0
#define OUTPUT_PORT I2S_NUM_1

// Volume digitale: 0.5 = 50%
#define VOLUME 0.5f

int32_t audioBuffer[BUFFER_SIZE];

unsigned long lastPrint = 0;

// ==========================
// CONTROLLO ERRORI
// ==========================

void checkError(esp_err_t err, const char* message) {

  if (err != ESP_OK) {
    Serial.printf(
      "%s - Errore: %d\n",
      message,
      err
    );

    while (true) {
      delay(1000);
    }
  }
}

// ==========================
// CONFIGURAZIONE INPUT
// ==========================

void setupInput() {

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

  checkError(
    i2s_driver_install(
      INPUT_PORT,
      &config,
      0,
      NULL
    ),
    "Installazione INPUT"
  );

  i2s_pin_config_t pins = {};

  pins.mck_io_num = IN_MCLK;
  pins.bck_io_num = IN_BCK;
  pins.ws_io_num = IN_LRCK;

  pins.data_out_num = I2S_PIN_NO_CHANGE;
  pins.data_in_num = IN_DOUT;

  checkError(
    i2s_set_pin(INPUT_PORT, &pins),
    "Configurazione pin INPUT"
  );

  i2s_zero_dma_buffer(INPUT_PORT);

  Serial.println("PCM1808 inizializzato");
}

// ==========================
// CONFIGURAZIONE OUTPUT
// ==========================

void setupOutput() {

  i2s_config_t config = {};

  config.mode = (i2s_mode_t)(
    I2S_MODE_MASTER |
    I2S_MODE_TX
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
  config.tx_desc_auto_clear = true;
  config.fixed_mclk = 0;

  checkError(
    i2s_driver_install(
      OUTPUT_PORT,
      &config,
      0,
      NULL
    ),
    "Installazione OUTPUT"
  );

  i2s_pin_config_t pins = {};

  pins.mck_io_num = I2S_PIN_NO_CHANGE;

  pins.bck_io_num = OUT_BCK;
  pins.ws_io_num = OUT_LRCK;

  pins.data_out_num = OUT_DIN;
  pins.data_in_num = I2S_PIN_NO_CHANGE;

  checkError(
    i2s_set_pin(OUTPUT_PORT, &pins),
    "Configurazione pin OUTPUT"
  );

  i2s_zero_dma_buffer(OUTPUT_PORT);

  Serial.println("PCM5102A inizializzato");
}

// ==========================
// SETUP PRINCIPALE
// ==========================

void setup() {

  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("==============================");
  Serial.println("    ESP32 AUDIO PASSTHROUGH");
  Serial.println("==============================");

  Serial.println("Input:  PCM1808");
  Serial.println("Output: PCM5102A");

  Serial.printf(
    "Sample rate: %d Hz\n",
    SAMPLE_RATE
  );

  Serial.printf(
    "Volume: %.0f%%\n",
    VOLUME * 100
  );

  setupInput();
  setupOutput();

  Serial.println();
  Serial.println("Sistema pronto!");
  Serial.println("Avvia la musica...");
  Serial.println();
}

// ==========================
// LOOP PRINCIPALE
// ==========================

void loop() {

  size_t bytesRead = 0;

  // ==========================
  // LETTURA AUDIO
  // ==========================

  esp_err_t err = i2s_read(
    INPUT_PORT,
    audioBuffer,
    sizeof(audioBuffer),
    &bytesRead,
    portMAX_DELAY
  );

  if (err != ESP_OK || bytesRead == 0) {
    Serial.println("Errore lettura audio");
    return;
  }

  int count = bytesRead / sizeof(int32_t);

  // ==========================
  // ANALISI LIVELLI AUDIO
  // ==========================

  double sumLeft = 0;
  double sumRight = 0;

  int countLeft = 0;
  int countRight = 0;

  bool printLevels = millis() - lastPrint >= 300;

  if (printLevels) {

    for (int i = 0; i < count; i++) {

      int32_t sample = audioBuffer[i] >> 8;

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
  }

  // ==========================
  // CONTROLLO VOLUME
  // ==========================

  // Riduzione al 50% senza
  // modificare il formato I2S

  for (int i = 0; i < count; i++) {

    audioBuffer[i] /= 2;

  }

  // ==========================
  // INVIO AUDIO AL PCM5102A
  // ==========================

  size_t totalWritten = 0;

  while (totalWritten < bytesRead) {

    size_t bytesWritten = 0;

    err = i2s_write(
      OUTPUT_PORT,
      (uint8_t*)audioBuffer + totalWritten,
      bytesRead - totalWritten,
      &bytesWritten,
      portMAX_DELAY
    );

    if (err != ESP_OK || bytesWritten == 0) {
      Serial.println("Errore scrittura audio");
      return;
    }

    totalWritten += bytesWritten;
  }

  // ==========================
  // MONITOR SERIALE
  // ==========================

  if (printLevels) {

    lastPrint = millis();

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

    Serial.print("LEFT  [");

    for (int i = 0; i < 30; i++) {
      Serial.print(
        i < levelLeft ? "#" : " "
      );
    }

    Serial.printf(
      "] %.1f dBFS\n",
      dbLeft
    );

    Serial.print("RIGHT [");

    for (int i = 0; i < 30; i++) {
      Serial.print(
        i < levelRight ? "#" : " "
      );
    }

    Serial.printf(
      "] %.1f dBFS\n",
      dbRight
    );

    Serial.println("--------------------------------");
  }
}