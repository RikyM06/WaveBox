# Branch `tentativo_03`

Branch creato da `main` al commit `91edecf` (merge di `tentativo_02`).

## Riepilogo

Rispetto a `main`, questo branch riduce il firmware a un **ricevitore Bluetooth A2DP con codec ES8388**: l'analizzatore di spettro su OLED è stato tolto, il codec viene inizializzato via I2C e le librerie non usate sono state rimosse dal repository. Obiettivo: avere prima l'audio funzionante sulla scheda (ESP32 Audio Kit A1S), poi reintrodurre il display.

Commit del branch:

1. `39a9142` Rimossi file non usati: audiokit, audio-tools, src/libraries e README di PlatformIO
2. `aebb346` README aggiornato: A2DP sink con ES8388, pin attuali, librerie e logo
3. `219f582` Firmware ridotto ad A2DP sink con init minima del codec ES8388

## Modifiche a `src/main.cpp`

Rimosso:

- display SSD1322 con U8g2 e task di disegno (`screen_Task_routine`)
- FFT con ArduinoFFT e task di calcolo (`fft_task`), ring buffer e callback `on_bt_pcm_data`
- LED di stato sul GPIO 2 (`loop()` ora fa solo `delay(5)`)

Aggiunto:

- **Init del codec ES8388 via I2C** (SDA 33, SCL 32, 100 kHz): cerca il codec all'indirizzo `0x10`, poi `0x11`, e scrive i registri minimi (soft reset, alimentazione, formato I2S 16 bit, unmute DAC, volume medio, abilitazione uscite). Se il codec non risponde lo segnala sulla seriale e prosegue.
- **Log su seriale** di connessione/disconnessione Bluetooth e di avvio/arresto dell'audio (`set_on_connection_state_changed`, `set_on_audio_state_changed`).
- Impostazioni A2DP esplicite: `set_bits_per_sample(16)` e `set_volume(90)`.

Pin I2S cambiati:

| Segnale | `main` | `tentativo_03` |
|---------|--------|----------------|
| BCLK    | 27     | 27             |
| LRCK    | 25     | 26             |
| DOUT    | 26     | 25             |

Il nome Bluetooth resta `RIKY-ESP32-AUDIO`.

## Modifiche a `platformio.ini`

- `lib_deps` ridotte a ESP32-A2DP e arduino-audio-tools (da git); tolte U8g2, ArduinoFFT, Adafruit SSD1327 e arduino-audiokit
- tolti `board_build.partitions = huge_app.csv`, `-fno-lto` e il `build_src_filter` che escludeva `ssd-1322-gfx`
- aggiunto `-DCORE_DEBUG_LEVEL=1`

## File rimossi

- `lib/arduino-audiokit-main/` e `lib/arduino-audio-tools-main/`: copie locali non usate da `main.cpp`. arduino-audio-tools resta in `lib_deps`.
- `src/libraries/` (kiss-fft, `cq_kernel`, driver `ssd-1322-gfx`) aggiunte in `tentativo_02` e mai integrate; vedi [tentativo_02.md](tentativo_02.md). Si recuperano dal branch `main`.
- `include/README`, `lib/README`, `test/README`: testi standard di PlatformIO.
- File non tracciati da git: metadati macOS (`.DS_Store`, `._*`) e gli zip in `lib/`.

Resta in `lib/` solo la copia locale di ESP32-A2DP (1.8.8), che ha la precedenza su quella di `lib_deps` e fornisce l'API `set_pin_config(i2s_pin_config_t)` usata da `main.cpp`.

## Documentazione

- `README.md` aggiornato al nuovo firmware (funzionalità, collegamenti, architettura, librerie)
- aggiunto il logo `docs/logo.svg`

## Stato e problemi noti

- **Non compilato né provato su hardware.**
- **Partizione**: senza `huge_app.csv` lo stack Bluetooth potrebbe non entrare nella partizione app predefinita. Se la build segnala che il firmware è troppo grande, rimettere `board_build.partitions = huge_app.csv`.
- **Init ES8388 "best-effort"**: i valori dei registri vengono da esempi AudioKit comuni e non sono verificati sul datasheet; se l'audio è assente o distorto, è il primo punto da controllare (insieme ai pin I2S).
- Il nuovo `main.cpp` usa `Wire.h`; `Wire` fa parte del core Arduino ESP32 e non serve aggiungerla a `lib_deps`.

## Prossimi passi

1. Compilare con `pio run` e provare l'audio sulla scheda.
2. Reintrodurre display e spettro, valutando le librerie di `tentativo_02` (kiss-fft + CQT, `Adafruit_SSD1322`).
