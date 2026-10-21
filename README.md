<p align="center">
  <img src="docs/logo.svg" alt="WaveBox logo" width="200">
</p>

# WaveBox

> **Stato: questa versione funziona, i test hanno dato esiti positivi, ma c'è qualche miglioria da fare.** Dettagli in [docs/tentativo_08.md](docs/tentativo_08.md).

Passthrough audio su ESP32 con ADC PCM1808 e DAC PCM5102A.

Il firmware legge l'audio dal PCM1808 via I2S (48 kHz, 32 bit, stereo), lo inoltra al PCM5102A con volume digitale al 50% e stampa sulla seriale il livello RMS in dBFS di ogni canale. Bluetooth A2DP e analizzatore di spettro su OLED delle versioni precedenti non sono presenti in questo branch.

## Funzionalità

- Ingresso I2S dal PCM1808 (I2S_NUM_0, master RX)
- Uscita I2S verso il PCM5102A (I2S_NUM_1, master TX)
- Volume digitale fisso al 50%
- Barra di livello e dBFS per canale sul monitor seriale ogni 300 ms

## Hardware

Lo schema elettrico completo, con le note e i punti ancora aperti, è in [docs/schema_elettrico.md](docs/schema_elettrico.md).

| Scheda | Collegamento all'ESP32 |
|--------|------------------------|
| ESP32 DevKit (`esp32dev` in PlatformIO) | — |
| DAC PCM5102A (uscita) | BCK GPIO 26, LCK GPIO 33, DIN GPIO 21, VIN 5V |
| ADC PCM1808 (ingresso) | BCK GPIO 26 e LRCK GPIO 33 condivisi con il DAC, DOUT GPIO 35, VCC 5V |
| OLED SSD1322 256×64, SPI 4 fili | SCK GPIO 18, MOSI GPIO 23, CS GPIO 5, DC GPIO 19, RST GPIO 4, VCC 3V3 |
| Jack TRRS (ingresso) | L, R e GND verso LIN, RIN e AGND del PCM1808; MIC non collegato |
| Relè DPDT (selezione uscita) | IN GPIO 27 (proposto): a riposo il jack di uscita riceve il PCM5102A, eccitato riceve il pass-through |

Il firmware attuale non segue ancora lo schema per il PCM1808: usa BCK GPIO 2, LRCK GPIO 15, DOUT GPIO 16 e MCLK GPIO 0, su una porta I2S separata. Display e relè non sono gestiti.

## Compilazione e caricamento

Il progetto usa [PlatformIO](https://platformio.org/) (framework Arduino).

```bash
pio run                      # compila
pio run -t upload            # carica sulla scheda
pio device monitor           # monitor seriale (115200 baud)
```

## Architettura

Tutto il codice applicativo è in src/main.cpp, con il driver driver/i2s.h di ESP-IDF: setup() configura due I2S (RX dal PCM1808, TX verso il PCM5102A), loop() legge i campioni, calcola RMS e dBFS, applica il volume e scrive sull'uscita.

## Librerie

Nessuna libreria esterna: lib_deps è vuoto. La copia locale di ESP32-A2DP in lib/ è stata rimossa perché non usata.

## Documentazione

- [docs/schema_elettrico.md](docs/schema_elettrico.md): schema elettrico completo (PCM5102A, PCM1808, OLED, jack TRRS, relè, riepilogo GPIO)
- [docs/tentativo_08.md](docs/tentativo_08.md): modifiche del branch `tentativo_08` (passthrough PCM1808 → PCM5102A funzionante)
- [docs/tentativo_07.md](docs/tentativo_07.md): modifiche del branch `tentativo_07` (test PCM1808)
- [docs/tentativo_06.md](docs/tentativo_06.md): modifiche del branch `tentativo_06` (pulizia file e pinout del PCM5102A)
- [docs/tentativo_05.md](docs/tentativo_05.md): modifiche del branch `tentativo_05` (passthrough PCM1808 → PCM5102A)
- [docs/tentativo_04.md](docs/tentativo_04.md): modifiche del branch `tentativo_04` (AudioKitStream)
- [docs/tentativo_03.md](docs/tentativo_03.md): modifiche del branch `tentativo_03` (init manuale dell'ES8388), unito in `main` con la PR #2
- [docs/tentativo_02.md](docs/tentativo_02.md): modifiche del branch `tentativo_02` (le librerie in `src/libraries/` descritte lì sono state rimosse in seguito)

## Autore

Riccardo Melis: [LinkedIn](https://www.linkedin.com/in/rikym06/) · [GitHub](https://github.com/RikyM06)
