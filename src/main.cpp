#define USE_A2DP

#include "AudioTools.h"
#include "AudioKitHAL.h"

BluetoothA2DPSink a2dp_sink;
AudioKitStream kit;


// funzione che riceve audio Bluetooth e lo manda al codec ES8388
void read_data_stream(const uint8_t *data, uint32_t length) {
    kit.write(data, length);
}


void setup() {

    Serial.begin(115200);

    AudioLogger::instance().begin(Serial, AudioLogger::Info);

    // configurazione AudioKit
    auto cfg = kit.defaultConfig(TX_MODE);
    cfg.default_volume = 70;

    kit.begin(cfg);

    // collega stream bluetooth
    a2dp_sink.set_stream_reader(read_data_stream, false);

    // nome bluetooth visibile sul telefono
    a2dp_sink.start("ESP32_AUDIO_KIT");

    Serial.println("Bluetooth pronto!");
}


void loop() {
    kit.processActions();
}