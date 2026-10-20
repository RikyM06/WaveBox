# Branch `tentativo_05`: passthrough I2S PCM1808 → PCM5102A

Branch creato da `sito_web` (commit `a1324ff`), che a sua volta parte da `main`. Cambia l'hardware di riferimento: non più la scheda ESP32 Audio Kit con ES8388 di [tentativo_04.md](tentativo_04.md), ma moduli separati su un ESP32 DevKit: ADC **PCM1808** in ingresso e DAC **PCM5102A** in uscita.

## Riepilogo

`src/main.cpp` è stato riscritto. Il firmware legge l'audio dall'ADC PCM1808 tramite I2S, lo amplifica con un guadagno fisso e lo scrive sul DAC PCM5102A. Bluetooth A2DP, analizzatore di spettro e display OLED non sono presenti in questa versione.

## Modifiche a `src/main.cpp`

Rimosso:

- `AudioKitStream`, `AudioTools.h` e la callback `read_data_stream()`
- `BluetoothA2DPSink` e il nome Bluetooth `ESP32_AUDIO_KIT`

Aggiunto, con il driver `driver/i2s.h` di ESP-IDF:

- **Uscita** (`I2S_NUM_0`, master TX): 44,1 kHz, 32 bit, stereo, APLL attivo e `fixed_mclk = 44100 * 256`. Pin: MCLK GPIO 0, BCK 26, LRCK 33, DIN del DAC 21.
- **Ingresso** (`I2S_NUM_1`, slave RX): stesso formato, usa BCK e LRCK generati dall'uscita. Dato dall'ADC su GPIO 34.
- **`audio_task`** (core 1, priorità 3): legge 512 campioni a 32 bit dall'ADC, li moltiplica per `GAIN` (128) con saturazione a 32 bit e li scrive sul DAC. Ogni 500 ms stampa sulla seriale il livello di picco (`PCM1808 livello`).
- `loop()` si limita a un `delay(1000)`.

## Modifiche a `platformio.ini`

- piattaforma fissata a `espressif32@6.6.0` (prima senza versione)
- `lib_deps`: restano ESP32-A2DP, U8g2 e ArduinoFFT; tolti `arduino-audiokit` e `arduino-audio-tools`
- tolto `board_build.partitions = huge_app.csv`, non più necessario senza stack Bluetooth e audio-tools
- ripristinati i commenti iniziali del file generato da PlatformIO
- tolte `upload_port` e `monitor_port` (`/dev/cu.SLAB_USBtoUART`, percorsi macOS che impedivano il caricamento su Windows)

`.vscode/extensions.json` segnala anche `pioarduino.pioarduino-ide` tra le estensioni da non consigliare.

## File rimossi

- `include/README`, `lib/README`, `test/README`: testi standard di PlatformIO, già tolti in passato
- `src/main con audio out blu funzionante`: file di appunti senza estensione (non compilato) con vecchie versioni di `main.cpp`, tra cui il sink A2DP con display e FFT. Non era tracciato da git: è stato spostato fuori dal repository, in `C:\Work\Riky\WaveBox_backup\`, per non perdere gli appunti.

## Stato e problemi noti

- **Non funziona ancora: non compilato né provato sulla scheda.** Su questo PC PlatformIO non è installato.
- Il guadagno `GAIN = 128` è fisso e molto alto: con segnali forti satura e distorce.
- Il progetto non ha più funzioni Bluetooth né display. Le versioni con A2DP e spettro sono in `main` e nella cronologia git.
- `lib_deps` contiene ancora librerie non usate dal codice (ESP32-A2DP, U8g2, ArduinoFFT) e ESP32-A2DP è scaricata da git HEAD, senza versione fissata.
- ADC e DAC condividono BCK e LRCK ma usano due periferiche I2S diverse: va verificato sull'hardware che lo slave RX si sincronizzi correttamente.

## Prossimi passi

1. Installare PlatformIO, compilare con `pio run` e provare l'audio.
2. Regolare o rendere configurabile il guadagno.
3. Reintegrare Bluetooth A2DP e display con lo spettro sopra il passthrough.
