<p align="center">
  <img src="docs/logo.svg" alt="WaveBox logo" width="200">
</p>

# WaveBox

> **Stato: questa versione funziona, ma i test devono ancora essere terminati.** Dettagli in [docs/tentativo_07.md](docs/tentativo_07.md).

Test di ricezione audio su ESP32 con ADC PCM1808.

Il firmware legge l'audio dal PCM1808 via I2S (48 kHz, 32 bit, stereo) e stampa sulla seriale il livello RMS in dBFS di ogni canale. Passthrough verso il PCM5102A, Bluetooth A2DP e analizzatore di spettro su OLED delle versioni precedenti non sono presenti in questo branch.

## Funzionalità

- Ingresso I2S dal PCM1808 (I2S_NUM_0, master RX)
- Barra di livello e dBFS per canale sul monitor seriale ogni ~100 ms
- Valori minimo e massimo dei campioni

## Hardware

- ESP32 DevKit (esp32dev in PlatformIO)
- ADC PCM1808: BCK GPIO 2, LRCK GPIO 15, DIN GPIO 16, MCLK GPIO 0
## Compilazione e caricamento

Il progetto usa [PlatformIO](https://platformio.org/) (framework Arduino).

```bash
pio run                      # compila
pio run -t upload            # carica sulla scheda
pio device monitor           # monitor seriale (115200 baud)
```

## Architettura

Tutto il codice applicativo è in src/main.cpp, con il driver driver/i2s.h di ESP-IDF: setup() configura l'I2S in RX e i pin, loop() legge i campioni, calcola RMS e dBFS e li stampa.

## Librerie

Nessuna libreria esterna: lib_deps è vuoto. In lib/ resta una copia locale di ESP32-A2DP (1.8.8), non usata in questo branch.

## Documentazione

- [docs/tentativo_07.md](docs/tentativo_07.md): modifiche del branch 	entativo_07 (test PCM1808)
- [docs/tentativo_06.md](docs/tentativo_06.md): modifiche del branch `tentativo_06` (pulizia file e pinout del PCM5102A)
- [docs/tentativo_05.md](docs/tentativo_05.md): modifiche del branch `tentativo_05` (passthrough PCM1808 → PCM5102A)
- [docs/tentativo_04.md](docs/tentativo_04.md): modifiche del branch `tentativo_04` (AudioKitStream)
- [docs/tentativo_03.md](docs/tentativo_03.md): modifiche del branch `tentativo_03` (init manuale dell'ES8388), unito in `main` con la PR #2
- [docs/tentativo_02.md](docs/tentativo_02.md): modifiche del branch `tentativo_02` (le librerie in `src/libraries/` descritte lì sono state rimosse in seguito)

## Autore

Riccardo Melis: [LinkedIn](https://www.linkedin.com/in/rikym06/) · [GitHub](https://github.com/RikyM06)
