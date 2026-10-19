#include <Arduino.h>
#include <Wire.h>

#include "BluetoothA2DPSink.h"

// I2S pins (ESP32 -> ES8388 DAC)
static const int I2S_BCLK = 27;
static const int I2S_LRCK = 26;
static const int I2S_DOUT = 25;

// I2C pins (ESP32 -> ES8388 control). Common on many A1S AudioKit boards.
static const int I2C_SDA = 33;
static const int I2C_SCL = 32;

static uint8_t g_es8388_addr = 0x10; // try 0x10 first, fallback to 0x11
// inizzializzazione della classe del bluetooth
BluetoothA2DPSink a2dp_sink;

static bool i2c_probe(uint8_t addr) {
  Wire.beginTransmission(addr);
  return (Wire.endTransmission() == 0);
}

static void i2c_select_es8388_addr() {
  Serial.println("[I2C] probing ES8388...");
  if (i2c_probe(0x10)) {
    g_es8388_addr = 0x10;
    Serial.println("[I2C] ES8388 at 0x10");
  } else if (i2c_probe(0x11)) {
    g_es8388_addr = 0x11;
    Serial.println("[I2C] ES8388 at 0x11");
  } else {
    Serial.println("[I2C] ES8388 NOT FOUND (audio likely silent)");
  }
}

static bool es8388_write(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(g_es8388_addr);
  Wire.write(reg);
  Wire.write(val);
  return (Wire.endTransmission() == 0);
}

static void es8388_init_minimal() {
  if (!i2c_probe(g_es8388_addr)) {
    Serial.println("[ES8388] init skipped: codec not reachable");
    return;
  }

  Serial.println("[ES8388] init...");

  // Soft reset
  es8388_write(0x00, 0x80);
  delay(10);

  // Power up (best-effort defaults used in many AudioKit examples)
  es8388_write(0x01, 0x50);
  es8388_write(0x02, 0x00);

  // I2S, 16-bit
  es8388_write(0x17, 0x18);

  // Unmute DAC
  es8388_write(0x19, 0x02);

  // Medium volume
  es8388_write(0x2E, 0x1A);
  es8388_write(0x2F, 0x1A);

  // Enable outputs (best-effort)
  es8388_write(0x04, 0x3C);

  Serial.println("[ES8388] init done");
}

void on_connection_state_changed(esp_a2d_connection_state_t state, void *) {
  if (state == ESP_A2D_CONNECTION_STATE_CONNECTED) {
    Serial.println("[BT] connected");
  } else if (state == ESP_A2D_CONNECTION_STATE_DISCONNECTED) {
    Serial.println("[BT] disconnected");
  }
}

void on_audio_state_changed(esp_a2d_audio_state_t state, void *) {
  if (state == ESP_A2D_AUDIO_STATE_STARTED) Serial.println("[BT] audio started");
  if (state == ESP_A2D_AUDIO_STATE_STOPPED) Serial.println("[BT] audio stopped");
}

void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println("Boot: A2DP Sink + ES8388 minimal init");
// quando il processo termina fa il boot del bluethooth 
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(100000);
  i2c_select_es8388_addr();
  es8388_init_minimal();

  i2s_pin_config_t pins = {
      .bck_io_num = I2S_BCLK,
      .ws_io_num = I2S_LRCK,
      .data_out_num = I2S_DOUT,
      .data_in_num = I2S_PIN_NO_CHANGE};

  a2dp_sink.set_pin_config(pins);
  a2dp_sink.set_bits_per_sample(16);
  a2dp_sink.set_volume(90);
  a2dp_sink.set_on_connection_state_changed(on_connection_state_changed);
  a2dp_sink.set_on_audio_state_changed(on_audio_state_changed);

  a2dp_sink.start("RIKY-ESP32-AUDIO");
  Serial.println("Pair with: RIKY-ESP32-AUDIO");
}
// coso che fa cose che mica mi vede a vedere sto strunz qua che ha proprio la faccia da pelato malvagio non come quelatro che è normale questo sembra propriio malvagio li a smanettare son un avvitatore fake 
void loop() {
  delay(5);
}