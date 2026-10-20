<p align="center">
  <img src="docs/logo.svg" alt="WaveBox logo" width="200">
</p>

# WaveBox

> **Attenzione: questa versione non funziona ancora.** Il firmware di questo branch non è stato compilato né provato sulla scheda. Dettagli in [docs/tentativo_06.md](docs/tentativo_06.md) e [docs/tentativo_05.md](docs/tentativo_05.md).

Passthrough audio su ESP32 con ADC PCM1808 in ingresso e DAC PCM5102A in uscita.

Il firmware legge l'audio dal PCM1808 via I2S, lo amplifica con un guadagno fisso (`GAIN = 128`) e lo manda al PCM5102A. Bluetooth A2DP e analizzatore di spettro su OLED delle versioni precedenti non sono presenti in questo branch.

## Funzionalità

- Ingresso I2S dal PCM1808 (`I2S_NUM_1`, slave) e uscita I2S verso il PCM5102A (`I2S_NUM_0`, master), 44,1 kHz a 32 bit
- Guadagno digitale fisso con saturazione
- Livello di picco dell'ingresso stampato sulla seriale ogni 500 ms

## Hardware

- ESP32 DevKit (`esp32dev` in PlatformIO)
- ADC PCM1808 (dato su GPIO 34)
- DAC PCM5102A (DIN su GPIO 21)
- Linee condivise: BCK GPIO 26, LRCK GPIO 33, MCLK GPIO 0

## Compilazione e caricamento

Il progetto usa [PlatformIO](https://platformio.org/) (framework Arduino).

```bash
pio run                      # compila
pio run -t upload            # carica sulla scheda
pio device monitor           # monitor seriale (115200 baud)
```

## Architettura

Tutto il codice applicativo è in `src/main.cpp`, con il driver `driver/i2s.h` di ESP-IDF:

1. **`setup_i2s_output()`** e **`setup_i2s_input()`**: configurano le due porte I2S.
2. **`audio_task`** (core 1): legge dal PCM1808, applica il guadagno e scrive sul PCM5102A.
3. **`loop()`**: vuoto (`delay(1000)`).

## Librerie

`lib_deps` elenca ESP32-A2DP, U8g2 e ArduinoFFT, ma il codice di questo branch non le usa. In `lib/` è inclusa una copia locale di ESP32-A2DP (1.8.8).

## Documentazione

- [docs/tentativo_06.md](docs/tentativo_06.md): modifiche del branch `tentativo_06` (pulizia file e pinout del PCM5102A)
- [docs/tentativo_05.md](docs/tentativo_05.md): modifiche del branch `tentativo_05` (passthrough PCM1808 → PCM5102A)
- [docs/tentativo_04.md](docs/tentativo_04.md): modifiche del branch `tentativo_04` (AudioKitStream)
- [docs/tentativo_03.md](docs/tentativo_03.md): modifiche del branch `tentativo_03` (init manuale dell'ES8388), unito in `main` con la PR #2
- [docs/tentativo_02.md](docs/tentativo_02.md): modifiche del branch `tentativo_02` (le librerie in `src/libraries/` descritte lì sono state rimosse in seguito)

## Autore

Riccardo Melis: [LinkedIn](https://www.linkedin.com/in/rikym06/) · [GitHub](https://github.com/RikyM06)
