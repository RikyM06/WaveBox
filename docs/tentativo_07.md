# Branch `tentativo_07`: test di ricezione audio dal PCM1808

Branch creato da `tentativo_06`. Il firmware è stato riscritto come **test dell'ADC PCM1808**: legge l'audio via I2S e mostra i livelli sul monitor seriale. Il passthrough verso il PCM5102A di [tentativo_05.md](tentativo_05.md) non è presente in questa versione.

**Stato: questa versione funziona, ma i test devono ancora essere terminati.**

## Modifiche

### `src/main.cpp`

- Riscritto da zero: un solo I2S (`I2S_NUM_0`) in **master RX**, 48 kHz, 32 bit, stereo, formato I2S standard.
- Pin PCM1808: BCK GPIO 2, LRCK GPIO 15, DIN GPIO 16, MCLK GPIO 0.
- `loop()` legge 512 campioni, li porta a 24 bit (`>> 8`), calcola per ogni canale il valore RMS in dBFS e stampa sulla seriale (115200 baud) una barra di livello a 30 caratteri, più minimo e massimo dei campioni.
- In fondo al file è annotato il collegamento completo del modulo PCM1808 all'ESP32 (alimentazioni, `MD0`/`MD1`/`FMT` a GND, `SCK` su GPIO 0).
- Rimossi guadagno fisso, uscita verso il DAC e task su core separato.

### `platformio.ini`

- Piattaforma `espressif32` aggiornata da 6.6.0 a 6.10.0.
- `lib_deps` rimosso: il firmware usa solo il driver `driver/i2s.h` di ESP-IDF.
- Aggiunti `upload_protocol = esptool` e `upload_speed = 115200`.
- `upload_port` e `monitor_port` restano su `/dev/cu.SLAB_USBtoUART` (porta macOS): su altre macchine vanno adattate.

## File rimossi

- `include/README`, `lib/README`, `test/README`: testi standard di PlatformIO, non servono.

## Stato e problemi noti

- La ricezione dal PCM1808 funziona; i test completi (livelli, rumore, canali, frequenze) non sono ancora terminati.
- Bluetooth A2DP, display OLED, analizzatore di spettro e uscita sul PCM5102A non sono presenti.
- `lib/ESP32-A2DP-main` resta nel repository ma non è più usata dal firmware.

## Prossimi passi

1. Terminare i test del PCM1808.
2. Riportare l'uscita sul PCM5102A (passthrough).
3. Reintegrare Bluetooth A2DP e spettro su OLED.
