# Branch `tentativo_08`: passthrough PCM1808 → PCM5102A funzionante

Branch creato da `main` (dopo la PR di `tentativo_07`). Il firmware torna a essere un **passthrough audio**: il PCM1808 legge l'ingresso analogico, l'ESP32 lo inoltra via I²S al PCM5102A e stampa i livelli sulla seriale.

**Stato: questa versione funziona, i test hanno dato esiti positivi, ma ci sono ancora alcune migliorie da fare.**

## Modifiche

### `src/main.cpp`

- Due driver I²S indipendenti, entrambi master a 48 kHz, 32 bit, stereo, formato I²S standard:
  - **INPUT** (`I2S_NUM_0`, RX) dal PCM1808: BCK GPIO 2, LRCK GPIO 15, DIN GPIO 16, MCLK GPIO 0.
  - **OUTPUT** (`I2S_NUM_1`, TX) verso il PCM5102A: BCK GPIO 26, LRCK GPIO 33, DIN GPIO 21 (nessun MCLK, il PCM5102A lo ricava dal BCK).
- `loop()` legge 512 campioni dal PCM1808, applica un volume digitale fisso del 50% (`audioBuffer[i] /= 2`) e scrive il buffer sul PCM5102A, gestendo le scritture parziali.
- Ogni 300 ms calcola il valore RMS in dBFS per canale (campioni portati a 24 bit) e stampa sulla seriale (115200 baud) una barra di livello a 30 caratteri.
- `checkError()` ferma il firmware con un messaggio se l'installazione di un driver I²S o la configurazione dei pin fallisce.
- Reintrodotti rispetto a `tentativo_07`: uscita verso il DAC e volume. Restano assenti Bluetooth A2DP, display OLED e spettro.

### `platformio.ini`

- Nessuna modifica di sostanza rispetto a `tentativo_07` (solo fine riga). `upload_port` e `monitor_port` restano su `/dev/cu.SLAB_USBtoUART` (porta macOS): su altre macchine vanno adattate.

## File rimossi

- `lib/ESP32-A2DP-main/`: copia locale della libreria Bluetooth, non usata dal firmware (che usa solo `driver/i2s.h` di ESP-IDF). Reintegrando A2DP si potrà riaggiungere come dipendenza di `platformio.ini`.
- `include/README`, `lib/README`, `test/README`: testi standard di PlatformIO, non servono.
- `src/._main.cpp`: metadato macOS, già ignorato da git.

## Test

- Il segnale in ingresso al PCM1808 arriva sull'uscita del PCM5102A.
- I livelli stampati sulla seriale seguono il segnale.
- Esiti positivi.

## Migliorie da fare

- Il volume è fisso al 50% e fatto con una divisione intera: renderlo configurabile.
- Il passthrough è bloccante nel `loop()`: valutare un task dedicato su un core.
- Misurare con più calma latenza, rumore di fondo e risposta in frequenza.
- `upload_port`/`monitor_port` sono specifici di macOS.
- Aggiungere un controllo sul rilevamento di clipping in ingresso.

## Schema elettrico

Le specifiche delle schede ricevute dopo questo branch sono in [schema_elettrico.md](schema_elettrico.md). Il PCM5102A è già collegato come previsto (GPIO 26, 33, 21); il PCM1808 invece nello schema condivide BCK (GPIO 26) e LRCK (GPIO 33) con il DAC e ha DOUT su GPIO 35, mentre qui usa GPIO 2, 15 e 16 su una porta I²S separata. Lo schema aggiunge anche il display (DC GPIO 19, RST GPIO 4) e un relè di selezione dell'uscita su GPIO 27.

## Prossimi passi

1. Applicare le migliorie sopra.
2. Adattare il firmware allo [schema elettrico](schema_elettrico.md): I²S condiviso tra ADC e DAC, PCM1808 su GPIO 26/33/35, comando del relè.
3. Reintegrare Bluetooth A2DP come seconda sorgente.
4. Reintegrare lo spettro su display OLED.
