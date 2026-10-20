# Branch `tentativo_06`: pulizia e pinout del PCM5102A

Branch creato da `main` (commit `440bcde`, che include `tentativo_05`). Non cambia la logica del firmware: il passthrough I2S PCM1808 → PCM5102A di [tentativo_05.md](tentativo_05.md) resta identico. Questo branch ripulisce il repository e annota il collegamento del DAC.

## Modifiche

### `src/main.cpp`

- In fondo al file è stato aggiunto un commento con il collegamento del DAC **PCM5102A** all'ESP32:

  | PCM5102A | ESP32 |
  |----------|-------|
  | VIN | 5V |
  | GND | GND |
  | BCK | GPIO 26 |
  | LRCK | GPIO 33 |
  | DIN | GPIO 21 |
  | SCK | non collegato |

- Aggiunto il newline finale a `loop()`; nessuna modifica al codice eseguibile.

### `platformio.ini`

- Reintrodotte `upload_port` e `monitor_port` su `/dev/cu.SLAB_USBtoUART` (porta seriale macOS). Sono specifiche della macchina di sviluppo e **non funzionano su Windows**: tentativo_05 le aveva tolte per questo motivo.
- Rimosso il BOM UTF-8 dalla prima riga.

### `.vscode/extensions.json`

- Nessuna modifica di contenuto: git segnalava solo la conversione dei fine riga.

## File rimossi

- `include/README`, `lib/README`, `test/README`: testi standard di PlatformIO, non servono.
- `src/main con audio out blu funzionante`: file di appunti senza estensione (non compilato) con vecchie versioni di `main.cpp`. Una copia identica è già in `C:\Work\Riky\WaveBox_backup\main_con_audio_out_blu_funzionante.txt`, fuori dal repository.

## Stato e problemi noti

- **Non funziona ancora.** Il firmware non è stato compilato né provato sulla scheda in questo branch.
- Valgono i problemi noti di [tentativo_05.md](tentativo_05.md): guadagno fisso `GAIN = 128` molto alto, nessun Bluetooth né display, sincronizzazione dello slave RX da verificare sull'hardware.
- Le porte seriali macOS in `platformio.ini` vanno adattate (o tolte) su altre macchine.

## Prossimi passi

1. Compilare con `pio run` e provare il passthrough sull'hardware.
2. Decidere se tenere `upload_port`/`monitor_port` fuori da `platformio.ini` (per esempio in un file locale non tracciato).
3. Reintegrare Bluetooth A2DP e display con lo spettro sopra il passthrough.
