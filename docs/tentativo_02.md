# Branch `tentativo_02`

Branch creato da `main` al commit `64e9432` ("Progetto WaveBox: firmware, librerie, README e .gitignore").

## Riepilogo

Rispetto a `main`, questo branch aggiunge tre librerie in `src/libraries/`, in vista di un'alternativa all'attuale pipeline FFT/display. `src/main.cpp` e il comportamento del firmware **non sono cambiati**: le nuove librerie non sono ancora incluse né usate.

Modifiche a `platformio.ini`:

- aggiunta `adafruit/Adafruit SSD1327` a `lib_deps` (porta con sé Adafruit GFX, che fornisce `Adafruit_GrayOLED.h`)
- aggiunto `build_src_filter` che esclude `src/libraries/ssd-1322-gfx/` dalla build

## File aggiunti

### `src/libraries/kiss-fft/`

[KISS FFT](https://github.com/mborgerding/kissfft): libreria FFT leggera in C.

- `kiss_fft.c/.h`: FFT complessa
- `kiss_fftr.c/.h`: FFT di segnali reali (usata da `cq_kernel`)
- `_kiss_fft_guts.h`: macro interne

`kiss_fft.h` contiene una piccola modifica di colonelwatch (`#include <stdint.h>`) per compilare su ESP32 con Arduino.

### `src/libraries/kernel/`

- `cq_kernel.c/.h` (Kenny Peng, licenza Apache 2.0): **trasformata a Q costante** (Constant-Q Transform). Genera un kernel per banda con frequenze centrali distribuite in modo logaritmico tra `fmin` e `fmax`, e lo applica all'uscita di `kiss_fftr`. I kernel sono salvati come array sparsi per ridurre la memoria.
  - Configurazione tramite `struct cq_kernel_cfg`: `samples`, `bands`, `fmin`, `fmax`, `fs`, `window_type` (`HAMMING` o `GAUSSIAN`), `min_val` (soglia di sparsità)
  - API: `generate_kernels()`, `reallocate_kernels()`, `apply_kernels()`, `free_kernels()`
  - Nota: `generate_kernels()` usa temporaneamente più di `3 * samples * sizeof(kiss_fft_scalar)` byte di heap
- `buffer.h`: due template C++
  - `doubleBuffer<TYPE, SIZE>`: doppio buffer lettura/scrittura con `swap()`, simile alla `ColumnBuffer` di `main.cpp` ma allocato con `malloc`
  - `fftBuffer<TYPE, SIZE>`: buffer circolare che restituisce sempre gli ultimi `SIZE` campioni (finestra scorrevole)

Rispetto all'approccio attuale (ArduinoFFT a 256 punti, bin raggruppati con una curva `powf(t, 2.2)`), la CQT dà bande realmente logaritmiche con risoluzione costante per ottava, più adatte a uno spettro musicale.

### `src/libraries/ssd-1322-gfx/`

`SSD1322_for_Adafruit_GFX.cpp/.h` (licenza BSD): driver per OLED SSD1322 256x64 basato su Adafruit GFX (fork di venice1200 della libreria Adafruit SSD1327). Espone la classe `Adafruit_SSD1322`, con costruttori I2C, SPI software e SPI hardware e supporto a 16 livelli di grigio (`SSD1322_WHITE = 0xF`). È un'alternativa a U8g2, che oggi pilota il display in `main.cpp`.

## Stato e problemi noti

- **Le librerie non sono ancora integrate**: `main.cpp` usa ancora ArduinoFFT e U8g2.
- **`ssd-1322-gfx` esclusa dalla build**: PlatformIO compila tutti i file in `src/`, sottocartelle comprese, e `SSD1322_for_Adafruit_GFX.cpp` include `"splash.h"`, che non è presente nella cartella. Per questo la cartella è esclusa con `build_src_filter`. Per usarla bisogna:
  - copiare `splash.h` dalla libreria originale nella cartella `ssd-1322-gfx/`
  - rimuovere la riga `-<libraries/ssd-1322-gfx/>` da `platformio.ini`
  - in alternativa, spostarla in `lib/`, dove le librerie vengono compilate solo se incluse
- `kiss-fft` e `kernel` restano nella build anche se non usate: aumentano il tempo di compilazione, ma non dovrebbero causare errori.
- **Conflitto di nomi**: `main.cpp` definisce `SSD1322_WHITE` come `1` (se non già definito), mentre la libreria lo definisce `0xF`. Se si usano insieme, va tenuto presente.
- Non compilato né provato su hardware.

## Prossimi passi

1. Decidere se sostituire ArduinoFFT con kiss-fft + `cq_kernel` nel task FFT.
2. Decidere se mantenere U8g2 o passare ad `Adafruit_SSD1322` per il display.
3. Sistemare la build (vedi sopra) e verificare con `pio run`.
