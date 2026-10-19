# WaveBox

Ricevitore audio Bluetooth basato su ESP32 con analizzatore di spettro in tempo reale su display OLED.

L'ESP32 si presenta come cassa Bluetooth (A2DP sink), invia l'audio al codec via I2S e contemporaneamente calcola la FFT del segnale per disegnare 32 barre di spettro con indicatori di picco su un display SSD1322 256x64.

## Funzionalità

- Ricezione audio Bluetooth A2DP, nome dispositivo **`RIKY-ESP32-AUDIO`**
- Uscita audio I2S verso il codec
- Analizzatore di spettro a 32 barre (FFT 256 punti, scala in dB da -70 a 0)
- Barre smussate con filtro IIR e indicatori di picco con caduta lenta
- Refresh del display a 60 fps
- LED di stato: lampeggia quando non connesso, fisso quando connesso
- Indicatore di connessione BT nell'angolo in alto a sinistra del display

## Hardware

- Scheda ESP32 (`esp32dev`), es. ESP32 Audio Kit
- Display OLED SSD1322 256x64 (SPI 4 fili)
- Codec audio I2S

### Collegamenti

| Funzione        | GPIO |
|-----------------|------|
| OLED SCLK       | 18   |
| OLED MOSI       | 23   |
| OLED CS         | 5    |
| OLED DC         | 0    |
| OLED RESET      | 3V3 fisso |
| I2S BCLK        | 27   |
| I2S LRCK (WS)   | 25   |
| I2S DOUT        | 26   |
| LED di stato    | 2    |

I pin I2S devono corrispondere a quelli del codec montato sulla scheda.

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

1. **Bluetooth A2DP (core 0)**: riceve il flusso PCM stereo, lo invia all'I2S e ne mette una copia mono in un ring buffer.
2. **Task FFT (core 1)**: legge blocchi di 256 campioni, applica finestra di Hamming e FFT, e raggruppa i bin in 32 barre su scala logaritmica.
3. **Task display (core 1)**: smussa le barre, gestisce i picchi e disegna il frame con U8g2.

I parametri principali (numero di barre, range dB, modalità picchi `PEAK_MODE`, fps) sono costanti in testa a `src/main.cpp`.

## Librerie

- [U8g2](https://github.com/olikraus/u8g2): display
- [ESP32-A2DP](https://github.com/pschatzmann/ESP32-A2DP): Bluetooth audio
- [ArduinoFFT](https://github.com/kosme/arduinoFFT): FFT
- [arduino-audiokit](https://github.com/pschatzmann/arduino-audiokit) e [arduino-audio-tools](https://github.com/pschatzmann/arduino-audio-tools)

In `lib/` sono incluse copie locali di ESP32-A2DP, arduino-audiokit e arduino-audio-tools, che hanno la precedenza su quelle scaricate da `lib_deps`.
