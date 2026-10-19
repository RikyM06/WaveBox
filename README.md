<p align="center">
  <img src="docs/logo.svg" alt="WaveBox logo" width="200">
</p>

# WaveBox

Ricevitore audio Bluetooth basato su ESP32 con codec ES8388.

L'ESP32 si presenta come cassa Bluetooth (A2DP sink), configura il codec ES8388 via I2C e gli invia l'audio via I2S.

L'analizzatore di spettro su display OLED SSD1322 della versione precedente (branch `main`) non è presente in questo branch.

## Funzionalità

- Ricezione audio Bluetooth A2DP, nome dispositivo **`RIKY-ESP32-AUDIO`**
- Inizializzazione minima del codec ES8388 via I2C (indirizzo 0x10, con fallback a 0x11)
- Uscita audio I2S a 16 bit verso il codec
- Log su seriale di connessione Bluetooth e avvio/arresto dell'audio

## Hardware

- Scheda ESP32 (`esp32dev`), es. ESP32 Audio Kit (A1S)
- Codec audio ES8388

### Collegamenti

| Funzione        | GPIO |
|-----------------|------|
| I2S BCLK        | 27   |
| I2S LRCK (WS)   | 26   |
| I2S DOUT        | 25   |
| I2C SDA         | 33   |
| I2C SCL         | 32   |

I pin devono corrispondere a quelli del codec montato sulla scheda.

## Compilazione e caricamento

Il progetto usa [PlatformIO](https://platformio.org/) (framework Arduino).

```bash
pio run                      # compila
pio run -t upload            # carica sulla scheda
pio device monitor           # monitor seriale (115200 baud)
```

Dopo l'avvio, abbinare il telefono o il PC al dispositivo Bluetooth `RIKY-ESP32-AUDIO` e avviare la riproduzione.

## Architettura

Tutto il codice applicativo è in `src/main.cpp`:

1. **Setup I2C**: cerca l'ES8388 sul bus e scrive i registri minimi (reset, alimentazione, formato I2S 16 bit, unmute, volume, uscite).
2. **Bluetooth A2DP**: `BluetoothA2DPSink` riceve il flusso PCM e lo invia all'I2S; le callback stampano sulla seriale lo stato della connessione e dell'audio.

## Librerie

- [ESP32-A2DP](https://github.com/pschatzmann/ESP32-A2DP): Bluetooth audio
- [arduino-audio-tools](https://github.com/pschatzmann/arduino-audio-tools)

In `lib/` è inclusa una copia locale di ESP32-A2DP (1.8.8), che ha la precedenza su quella scaricata da `lib_deps`. `src/main.cpp` usa l'API `set_pin_config(i2s_pin_config_t)`, presente in questa versione.

## Documentazione

- [docs/tentativo_03.md](docs/tentativo_03.md): modifiche del branch `tentativo_03`
- [docs/tentativo_02.md](docs/tentativo_02.md): modifiche del branch `tentativo_02` (le librerie in `src/libraries/` descritte lì sono state rimosse da questo branch)
