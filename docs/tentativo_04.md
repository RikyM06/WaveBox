# Branch `tentativo_03`: uscita audio con AudioKitStream

Branch creato da `main` al commit `d93a9f6` ("Create SECURITY.md for security policy"), dopo il merge della PR #2. Riprende il nome del `tentativo_03` precedente (descritto in [tentativo_03.md](tentativo_03.md)), ma è un lavoro nuovo.

## Riepilogo

L'inizializzazione manuale del codec ES8388 via I2C è sostituita da `AudioKitStream` di arduino-audio-tools, che si appoggia ad arduino-audiokit per configurare il codec e l'I2S della scheda ESP32 Audio Kit. Il sink A2DP non scrive più direttamente sull'I2S: passa il flusso PCM a una callback che lo scrive su `AudioKitStream`.

Commit del branch:

1. `848b851` tentativo_03: uscita audio tramite AudioKitStream
2. documentazione: questo file e `README.md`

## Modifiche a `src/main.cpp`

Rimosso:

- init del codec ES8388 via I2C (`Wire`, SDA 33, SCL 32): ricerca dell'indirizzo `0x10`/`0x11` e scrittura dei registri
- configurazione dei pin I2S con `set_pin_config(i2s_pin_config_t)`, `set_bits_per_sample(16)` e `set_volume(90)`
- callback di log per connessione Bluetooth e avvio/arresto dell'audio

Aggiunto:

- `#define USE_A2DP` e gli include `AudioTools.h` e `AudioKitHAL.h` al posto di `Arduino.h`, `Wire.h` e `BluetoothA2DPSink.h`
- `AudioKitStream kit`, configurato con `defaultConfig(TX_MODE)` e volume iniziale 70
- `read_data_stream()`: riceve il PCM dal sink e lo scrive su `kit`. È registrata con `set_stream_reader(read_data_stream, false)`, quindi il sink A2DP non usa la propria uscita I2S.
- `AudioLogger` sulla seriale a livello `Info`
- `loop()` chiama `kit.processActions()` (gestione dei tasti della scheda) al posto di `delay(5)`

Il nome Bluetooth passa da `RIKY-ESP32-AUDIO` a **`ESP32_AUDIO_KIT`**. I pin di I2S e I2C non sono più nel codice: li sceglie arduino-audiokit in base alla scheda configurata nella libreria.

## Modifiche a `platformio.ini`

- aggiunto `arduino-audiokit` (da git) a `lib_deps`, accanto a ESP32-A2DP e arduino-audio-tools
- tolto `-DCORE_DEBUG_LEVEL=1`
- tolti i commenti iniziali del file generato da PlatformIO

## File rimossi

Nella cartella di lavoro erano ricomparsi file che la PR #2 aveva già tolto. Sono stati eliminati senza mai entrare in un commit:

- `lib/arduino-audio-tools-main/` (1.2.2, circa 88 MB) e `lib/arduino-audiokit-main/` (0.7.0): copie locali delle librerie, che restano in `lib_deps`
- `include/README`, `lib/README`, `test/README`: testi standard di PlatformIO
- circa 2.500 file di metadati macOS (`.DS_Store`, `._*`)

In `lib/` resta solo la copia locale di ESP32-A2DP (1.8.8).

## Altre operazioni sul repository

La storia di `main` è stata riscritta per attribuire a Riccardo Melis i due commit iniziali creati con un'altra identità git. Contenuto e date dei commit sono invariati, ma tutti gli SHA sono cambiati. I riferimenti in [tentativo_02.md](tentativo_02.md) e [tentativo_03.md](tentativo_03.md) sono stati aggiornati ai nuovi SHA (`d4e5aab` → `64e9432`, `91edecf` → `f82928d`).

## Stato e problemi noti

- **Non funziona ancora: non compilato né provato su hardware.** Su questo PC PlatformIO non è installato.
- **Include probabilmente insufficienti.** Nella copia 1.2.2 di arduino-audio-tools, `AudioTools.h` non dichiara né `AudioKitStream` né `BluetoothA2DPSink`, e `USE_A2DP` non ha effetto. Se la build segnala tipi non definiti, aggiungere in cima a `main.cpp`:

  ```cpp
  #include "BluetoothA2DPSink.h"
  #include "AudioTools/AudioLibs/AudioKit.h"
  ```

- **Versioni non fissate.** arduino-audio-tools e arduino-audiokit vengono scaricate da git HEAD, mentre ESP32-A2DP è compilata dalla copia locale 1.8.8, che ha la precedenza. Le tre versioni potrebbero non essere compatibili tra loro.
- **Scheda.** arduino-audiokit sceglie pin e codec con la macro `AUDIOKIT_BOARD`. `platformio.ini` non la imposta, quindi vale il default della libreria, che va verificato rispetto alla scheda usata.
- **Partizione.** Come in [tentativo_03.md](tentativo_03.md), manca `board_build.partitions = huge_app.csv`. Con audio-tools e audiokit in più il firmware è ancora più grande.

## Prossimi passi

1. Compilare con `pio run` e correggere gli include se necessario.
2. Fissare le versioni delle librerie in `lib_deps` (tag o commit).
3. Verificare `AUDIOKIT_BOARD` e provare l'audio sulla scheda.
