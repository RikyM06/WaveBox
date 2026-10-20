#include <Arduino.h>
#include "driver/i2s.h"

#define I2S_OUT_PORT I2S_NUM_0
#define I2S_IN_PORT  I2S_NUM_1

#define I2S_BCK   26
#define I2S_LRCK  33
#define I2S_MCLK  0

#define PCM5102_DIN 21
#define PCM1808_OUT 34

#define SAMPLE_RATE 44100
#define GAIN 128

void setup_i2s_output() {
  i2s_config_t config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 256,
    .use_apll = true,
    .tx_desc_auto_clear = true,
    .fixed_mclk = SAMPLE_RATE * 256
  };

  i2s_pin_config_t pins = {
    .mck_io_num = I2S_MCLK,
    .bck_io_num = I2S_BCK,
    .ws_io_num = I2S_LRCK,
    .data_out_num = PCM5102_DIN,
    .data_in_num = I2S_PIN_NO_CHANGE
  };

  i2s_driver_install(I2S_OUT_PORT, &config, 0, NULL);
  i2s_set_pin(I2S_OUT_PORT, &pins);
  i2s_zero_dma_buffer(I2S_OUT_PORT);

  Serial.println("I2S OUT OK");
}

void setup_i2s_input() {
  i2s_config_t config = {
    .mode = (i2s_mode_t)(I2S_MODE_SLAVE | I2S_MODE_RX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 256,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };

  i2s_pin_config_t pins = {
    .bck_io_num = I2S_BCK,
    .ws_io_num = I2S_LRCK,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = PCM1808_OUT
  };

  i2s_driver_install(I2S_IN_PORT, &config, 0, NULL);
  i2s_set_pin(I2S_IN_PORT, &pins);
  i2s_zero_dma_buffer(I2S_IN_PORT);

  Serial.println("I2S IN OK");
}

void audio_task(void *pvParameters) {
  static int32_t rx_buffer[512];
  static int32_t tx_buffer[512];

  uint32_t lastPrint = 0;

  while (true) {
    size_t bytes_read = 0;
    size_t bytes_written = 0;

    esp_err_t result = i2s_read(
      I2S_IN_PORT,
      rx_buffer,
      sizeof(rx_buffer),
      &bytes_read,
      portMAX_DELAY
    );

    if (result != ESP_OK || bytes_read == 0) {
      continue;
    }

    int samples = bytes_read / sizeof(int32_t);

    int32_t maxLevel = 0;

    for (int i = 0; i < samples; i++) {
      int32_t s = rx_buffer[i];

      int64_t amplified = (int64_t)s * GAIN;

      if (amplified > INT32_MAX) amplified = INT32_MAX;
      if (amplified < INT32_MIN) amplified = INT32_MIN;

      tx_buffer[i] = (int32_t)amplified;

      int32_t level = abs(s >> 16);
      if (level > maxLevel) maxLevel = level;
    }

    i2s_write(
      I2S_OUT_PORT,
      tx_buffer,
      bytes_read,
      &bytes_written,
      portMAX_DELAY
    );

    if (millis() - lastPrint > 500) {
      lastPrint = millis();
      Serial.print("PCM1808 livello: ");
      Serial.println(maxLevel);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("Boot PCM1808 -> PCM5102A");

  setup_i2s_output();
  delay(300);
  setup_i2s_input();

  xTaskCreatePinnedToCore(
    audio_task,
    "audio_task",
    8192,
    nullptr,
    3,
    nullptr,
    1
  );
}

void loop() {
  delay(1000);
}