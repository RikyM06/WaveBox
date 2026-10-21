// ==========================
// MODELLO 3D DELLO SCHEMA ELETTRICO
// ==========================

// Rappresenta schede e collegamenti di docs/schema_elettrico.md.
// Quando cambia lo schema vanno aggiornati MODULES, WIRES e PIN_NOTES.
// Unità: millimetri. Asse y verso l'alto, z verso chi guarda, x verso destra.
// Le posizioni delle schede sono indicative: non è un disegno meccanico.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const container = document.getElementById('scena-3d');
const tooltip = document.getElementById('tooltip-3d');
const infoBox = document.getElementById('info-3d');
const legendBox = document.getElementById('legenda-3d');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const FONT = '"Source Sans Pro", Helvetica, Arial, sans-serif';
const PCB_T = 1.6;        // spessore delle schede
const LIFT = 2;           // distanziali sotto le schede
const PITCH = 2.54;       // passo dei pin
const PLASTIC_H = 2.5;    // plastica dei pin header
const PIN_H = 6;          // pin sopra la plastica
const TERMINAL_H = 9;     // morsetti a vite del relè
const PICK_LAYER = 1;     // layer delle forme invisibili usate solo per il puntatore

// ==========================
// SEGNALI
// ==========================

const NETS = {
  v5:    { name: 'Alimentazione 5V',  color: '#e53935' },
  v33:   { name: 'Alimentazione 3V3', color: '#fb8c00' },
  gnd:   { name: 'GND',               color: '#263238' },
  bck:   { name: 'I²S BCK',           color: '#f9d71c' },
  lrck:  { name: 'I²S LRCK',          color: '#43a047' },
  data:  { name: 'I²S dati',          color: '#1e63d6' },
  spi:   { name: 'SPI display',       color: '#8e24aa' },
  audio: { name: 'Audio analogico',   color: '#00acc1' },
  relay: { name: 'Comando relè',      color: '#ec407a' },
};

// ==========================
// SCHEDE
// ==========================

const MODULES = [
  {
    id: 'esp32', short: 'ESP32', title: 'ESP32 DevKitC (ESP32-WROOM-32)',
    role: 'Microcontrollore: genera i clock I²S condivisi, legge il PCM1808, scrive sul PCM5102A, pilota display e relè.',
    note: 'Disposizione dei pin della DevKitC a 38 pin: su altre schede ESP32 la posizione dei pin cambia, i numeri GPIO restano gli stessi.',
    pos: [0, 0], size: [31, 55], color: '#1d2129', labelSize: 1.05,
    headers: [
      { at: [-13, -22.86], labels: 1, pins: ['3V3', 'EN', 'VP', 'VN', '34', '35', '32', '33', '25', '26', '27', '14', '12', 'GND', '13', 'D2', 'D3', 'CMD', '5V'] },
      { at: [13, -22.86], labels: -1, pins: ['GND', '23', '22', 'TX', 'RX', '21', 'GND', '19', '18', '5', '17', '16', '4', '0', '2', '15', 'D1', 'D0', 'CLK'] },
    ],
    silk(s) {
      s.text('ESP32-DevKitC', 0, 5.2, 1.9);
      s.text('EN', -6.5, 25.8, 1.1);
      s.text('BOOT', 6.5, 25.8, 1.1);
    },
    parts(g, top) {
      // Modulo WROOM-32 con l'antenna verso il retro
      const wroom = makeSilk(18, 25.5, '#1f3355');
      wroom.meander(-7.5, -12.2, 15, 4.6);
      g.add(slab(18, 0.8, 25.5, '#1f3355', wroom.texture(), 0, top, -11));
      const shield = makeSilk(15.8, 17.6, '#c4c8cf', 16);
      shield.text('ESP32-WROOM-32', 0, -3, 1.6, 'center', '#4a4d55');
      shield.text('Wi-Fi · BT · BLE', 0, 0, 1.1, 'center', '#6a6e77');
      g.add(slab(15.8, 2.4, 17.6, '#c4c8cf', shield.texture(), 0, top + 0.8, -8.2, { metalness: 0.75, roughness: 0.3 }));
      g.add(box(7.6, 2.8, 5.6, MAT.metal, 0, top, 25.8));
      for (const x of [-6.5, 6.5]) {
        g.add(box(3.6, 1.4, 3.6, MAT.metal, x, top, 22.5));
        g.add(cyl(0.9, 0.9, MAT.chip, x, top + 1.4, 22.5));
      }
      chip(g, 'CP2102', 5, 5, 0, top, 13);
      chip(g, '', 6.5, 3.5, 0, top, 19, 1.6);
      g.add(box(1.6, 0.6, 0.8, MAT.led, 5.5, top, 9));
    },
  },
  {
    id: 'pcm1808', short: 'PCM1808', title: 'ADC PCM1808 – Ingresso audio',
    role: 'Converte in digitale il segnale del jack di ingresso e lo invia all\'ESP32 via I²S.',
    note: 'SCK (clock di sistema SCKI), MD0, MD1, FMT e 3.3V non sono indicati nello schema: vedi i punti aperti.',
    pos: [-64, -38], size: [32, 34], color: '#4b2479',
    headers: [
      { at: [13.5, -11.43], labels: -1, pins: ['BCK', 'DOUT', 'LRCK', 'SCK', 'GND', '3.3V', 'VCC', 'MD0', 'MD1', 'FMT'] },
      { at: [-13.5, -2.54], labels: 1, pins: ['LIN', 'AGND', 'RIN'] },
    ],
    silk(s) {
      s.text('PCM1808', -1, 14, 2.4);
      s.text('ADC', -1, -14.2, 1.8);
    },
    parts(g, top) {
      chip(g, 'PCM1808', 5, 6.4, -1, top, -3);
      for (const x of [-6, -1, 4]) capacitor(g, x, top, 8.5);
    },
  },
  {
    id: 'pcm5102a', short: 'PCM5102A', title: 'DAC PCM5102A – Uscita audio',
    role: 'Riceve l\'audio digitale dall\'ESP32 via I²S e lo converte in segnale analogico di linea.',
    note: 'SCK non collegato: il PCM5102A ricava il clock interno dal BCK.',
    pos: [-64, 40], size: [32, 22], color: '#5d1f8e',
    headers: [
      { at: [13.5, -6.35], labels: -1, pins: ['SCK', 'BCK', 'DIN', 'LCK', 'GND', 'VIN'] },
      { at: [-13.5, -2.54], labels: 1, pins: ['L', 'AGND', 'R'] },
    ],
    silk(s) {
      s.text('PCM5102A', -1, 8.3, 2.2);
      s.text('DAC', -1, -8.6, 1.6);
    },
    parts(g, top) {
      chip(g, 'PCM5102A', 6.5, 4.4, -1, top, -2);
      capacitor(g, -7, top, -6.5);
      capacitor(g, 5, top, -6.5);
    },
  },
  {
    id: 'jackIn', short: 'Jack TRRS', title: 'Jack TRRS – Ingresso audio',
    role: 'Ingresso analogico della sorgente AUX verso il PCM1808.',
    note: 'MIC non collegato. Verificare lo standard del jack (CTIA o OMTP): cambia quale polo è GND.',
    pos: [-110, -38], size: [16, 22], color: '#1c4d2f',
    headers: [{ at: [5.5, -3.81], labels: -1, pins: ['L', 'R', 'GND', 'MIC'] }],
    silk(s) { s.text('TRRS IN', 0, 8.8, 1.8); },
    parts(g, top) { jack(g, top); },
  },
  {
    id: 'relay', short: 'Relè', title: 'Relè DPDT – Selezione uscita audio',
    role: 'A riposo (contatti NC) porta al jack di uscita il PCM5102A, eccitato (contatti NO) il pass-through.',
    note: 'GPIO 27 è proposto. Il GPIO non alimenta la bobina: serve un modulo con transistor. Verificare che IN commuti a 3,3 V e se è attivo alto o basso.',
    pos: [-112, 42], size: [32, 42], color: '#123f80', labelSize: 1.2,
    headers: [
      { at: [-12, -12.7], pitch: 5.08, kind: 'terminal', labels: 1, pins: ['NO1', 'COM1', 'NC1', 'NO2', 'COM2', 'NC2'] },
      { at: [13.5, 12.7], labels: -1, pins: ['IN', 'VCC', 'GND'] },
    ],
    parts(g, top) {
      const lid = makeSilk(13, 21, '#1e7be0', 16);
      lid.text('RELÈ DPDT', 0, -3, 1.9);
      lid.text('5V DC', 0, 0.2, 1.5);
      lid.text('NC: DAC · NO: pass-through', 0, 3.6, 0.95);
      g.add(slab(13, 15, 21, '#1e7be0', lid.texture(), 3.5, top, -3));
      g.add(cyl(1.3, 3.5, MAT.chip, 2, top, 13));
      g.add(box(3, 0.9, 1.4, MAT.resistor, -3.5, top, 12.7));
      g.add(box(1.6, 0.6, 0.8, MAT.led, -3.5, top, 16.5));
    },
  },
  {
    id: 'jackOut', short: 'Jack uscita', title: 'Jack 3,5 mm – Uscita audio',
    role: 'Uscita di linea verso le casse amplificate, collegata ai contatti COM del relè.',
    note: 'Lo schema non indica dove va il GND del jack di uscita.',
    pos: [-152, 80], size: [16, 20], color: '#1c4d2f',
    headers: [{ at: [5.5, -2.54], labels: -1, pins: ['L', 'R', 'GND'] }],
    silk(s) { s.text('OUT', 0, 7.8, 1.8); },
    parts(g, top) { jack(g, top); },
  },
  {
    id: 'pass', short: 'Pass-through', title: 'Pass-through (origine da definire)',
    role: 'Segnale analogico che il relè porta al jack di uscita quando è eccitato (contatti NO).',
    note: 'Lo schema non dice da dove arriva il segnale: per esempio direttamente dal jack di ingresso.',
    pos: [-152, 14], size: [16, 20], color: '#eceef4', ghost: true,
    headers: [{ at: [5.5, -1.27], labels: -1, pins: ['L', 'R'] }],
    silk(s) {
      s.text('?', -1.5, -0.5, 9, 'center', '#8a8fa3');
      s.text('PASS-THROUGH', 0, 8, 1.5, 'center', '#8a8fa3');
    },
  },
  {
    id: 'oled', short: 'OLED', title: 'Display OLED SSD1322 3,12" 256×64 – SPI 4 fili',
    role: 'Mostra lo stato del dispositivo e il segnale audio. Alimentato a 3,3 V.',
    note: 'SCK e MOSI sono i pin VSPI di default dell\'ESP32 (GPIO 18 e 23): si può usare lo SPI hardware.',
    pos: [88, 6], size: [88, 30], color: '#16181d',
    standing: { tilt: 12, bottom: 13 },
    headers: [{ at: [-40, 11.4], dir: 'x', face: 'bottom', labels: 0, pins: ['GND', 'VCC', 'SCK', 'MOSI', 'RST', 'DC', 'CS'] }],
    parts(g, top) {
      g.add(box(82, 1.2, 25, MAT.glass, 1, top, -0.6));
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(76.8, 19.2), new THREE.MeshBasicMaterial({ map: oledTexture }));
      screen.rotation.x = -Math.PI / 2;
      screen.position.set(1, top + 1.25, -1);
      g.add(screen);
    },
  },
];

// ==========================
// COLLEGAMENTI (uno per riga dello schema)
// ==========================

const WIRES = [
  // 1. PCM5102A – uscita audio
  { a: 'pcm5102a.VIN', b: 'esp32.5V', net: 'v5' },
  { a: 'pcm5102a.GND', b: 'esp32.GND', net: 'gnd' },
  { a: 'pcm5102a.BCK', b: 'esp32.26', net: 'bck', note: 'BCK condiviso con il PCM1808' },
  { a: 'pcm5102a.LCK', b: 'esp32.33', net: 'lrck', note: 'LRCK condiviso con il PCM1808' },
  { a: 'pcm5102a.DIN', b: 'esp32.21', net: 'data' },
  // 2. PCM1808 – ingresso audio
  { a: 'pcm1808.VCC', b: 'esp32.5V', net: 'v5' },
  { a: 'pcm1808.GND', b: 'esp32.GND', net: 'gnd' },
  { a: 'pcm1808.BCK', b: 'esp32.26', net: 'bck', note: 'BCK condiviso con il PCM5102A' },
  { a: 'pcm1808.LRCK', b: 'esp32.33', net: 'lrck', note: 'LRCK condiviso con il PCM5102A' },
  { a: 'pcm1808.DOUT', b: 'esp32.35', net: 'data', note: 'GPIO 35 è solo ingresso' },
  // 3. Display OLED SSD1322
  { a: 'oled.VCC', b: 'esp32.3V3', net: 'v33' },
  { a: 'oled.GND', b: 'esp32.GND_2', net: 'gnd' },
  { a: 'oled.SCK', b: 'esp32.18', net: 'spi' },
  { a: 'oled.MOSI', b: 'esp32.23', net: 'spi' },
  { a: 'oled.CS', b: 'esp32.5', net: 'spi' },
  { a: 'oled.DC', b: 'esp32.19', net: 'spi' },
  { a: 'oled.RST', b: 'esp32.4', net: 'spi' },
  // 4. Jack TRRS – ingresso audio
  { a: 'jackIn.L', b: 'pcm1808.LIN', net: 'audio' },
  { a: 'jackIn.R', b: 'pcm1808.RIN', net: 'audio' },
  { a: 'jackIn.GND', b: 'pcm1808.AGND', net: 'gnd' },
  // 5. Relè DPDT – selezione uscita audio
  { a: 'relay.COM1', b: 'jackOut.L', net: 'audio' },
  { a: 'relay.COM2', b: 'jackOut.R', net: 'audio' },
  { a: 'relay.NC1', b: 'pcm5102a.L', net: 'audio', note: 'relè a riposo' },
  { a: 'relay.NC2', b: 'pcm5102a.R', net: 'audio', note: 'relè a riposo' },
  { a: 'relay.NO1', b: 'pass.L', net: 'audio', uncertain: 'origine del pass-through da definire' },
  { a: 'relay.NO2', b: 'pass.R', net: 'audio', uncertain: 'origine del pass-through da definire' },
  { a: 'relay.IN', b: 'esp32.27', net: 'relay', uncertain: 'GPIO 27 proposto' },
  { a: 'relay.VCC', b: 'esp32.5V', net: 'v5', note: '5V se compatibile con il modulo' },
  { a: 'relay.GND', b: 'esp32.GND', net: 'gnd' },
];

// Pin non collegati o non indicati nello schema
const PIN_NOTES = {
  'pcm1808.SCK': 'clock di sistema (SCKI): non indicato nello schema, nel firmware attuale arriva da GPIO 0',
  'pcm1808.3.3V': 'non indicato nello schema',
  'pcm1808.MD0': 'non indicato nello schema (nel montaggio attuale a GND)',
  'pcm1808.MD1': 'non indicato nello schema (nel montaggio attuale a GND)',
  'pcm1808.FMT': 'non indicato nello schema (nel montaggio attuale a GND)',
  'pcm5102a.SCK': 'non collegato: il PCM5102A ricava il clock dal BCK',
  'jackIn.MIC': 'non collegato',
  'jackOut.GND': 'non indicato nello schema',
  'esp32.0': 'nel firmware attuale è l\'MCLK verso SCKI del PCM1808 (non nello schema)',
};

// ==========================
// SCENA
// ==========================

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (err) {
  container.classList.add('senza-webgl');
  container.innerHTML = '<p>Questo browser non supporta WebGL: il modello 3D non può essere mostrato. ' +
    'I collegamenti sono nelle tabelle dello <a href="schema_elettrico.html">schema elettrico</a>.</p>';
  throw err;
}

await document.fonts.ready;

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
// La scena è ferma: le ombre si ricalcolano solo quando cambiano i fili visibili
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
container.appendChild(renderer.domElement);
const maxAniso = renderer.capabilities.getMaxAnisotropy();

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'etichette-3d';
container.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#f4f5f9');

const camera = new THREE.PerspectiveCamera(40, 1, 1, 4000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.zoomToCursor = true;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 60;
controls.maxDistance = 1200;
controls.autoRotateSpeed = 0.8;

scene.add(new THREE.HemisphereLight('#ffffff', '#9196a8', 1.7));
const sun = new THREE.DirectionalLight('#ffffff', 2.3);
sun.position.set(-110, 320, 200);
sun.target.position.set(-17, 0, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -200, right: 200, top: 150, bottom: -150, near: 100, far: 800 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.4;
scene.add(sun, sun.target);

// ==========================
// MATERIALI E FORME DI BASE
// ==========================

const MAT = {
  chip: new THREE.MeshStandardMaterial({ color: '#1b1b1d', roughness: 0.45 }),
  metal: new THREE.MeshStandardMaterial({ color: '#c9cdd3', metalness: 0.75, roughness: 0.32 }),
  gold: new THREE.MeshStandardMaterial({ color: '#d8b24a', metalness: 0.85, roughness: 0.3 }),
  pinOff: new THREE.MeshStandardMaterial({ color: '#9aa0a8', metalness: 0.5, roughness: 0.45 }),
  plastic: new THREE.MeshStandardMaterial({ color: '#18181a', roughness: 0.7 }),
  terminal: new THREE.MeshStandardMaterial({ color: '#2f7d43', roughness: 0.55 }),
  capacitor: new THREE.MeshStandardMaterial({ color: '#23324a', roughness: 0.4 }),
  resistor: new THREE.MeshStandardMaterial({ color: '#c8b48a', roughness: 0.6 }),
  led: new THREE.MeshStandardMaterial({ color: '#ff3b30', emissive: '#ff3b30', emissiveIntensity: 0.6 }),
  standoff: new THREE.MeshStandardMaterial({ color: '#b8bcc4', metalness: 0.4, roughness: 0.5 }),
  glass: new THREE.MeshStandardMaterial({ color: '#0b0c10', metalness: 0.1, roughness: 0.15 }),
  acrylic: new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, roughness: 0.1 }),
  outline: new THREE.LineBasicMaterial({ color: '#8e44ad' }),
  ghostLine: new THREE.LineDashedMaterial({ color: '#8a8fa3', dashSize: 2, gapSize: 1.5 }),
  pick: new THREE.MeshBasicMaterial(),
};

function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// y è la base dell'oggetto, non il centro
function box(w, h, d, material, x, y, z) {
  return mesh(new THREE.BoxGeometry(w, h, d), material, x, y + h / 2, z);
}

function cyl(r, h, material, x, y, z) {
  return mesh(new THREE.CylinderGeometry(r, r, h, 20), material, x, y + h / 2, z);
}

// Parallelepipedo con una texture solo sulla faccia superiore
function slab(w, h, d, color, topTexture, x, y, z, extra = {}) {
  const side = new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
  const top = new THREE.MeshStandardMaterial({ map: topTexture, roughness: 0.6, ...extra });
  return mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, side, side, side], x, y + h / 2, z);
}

// Disegno 2D (serigrafia) in millimetri, con origine al centro della scheda
function makeSilk(w, d, color, scale = 12) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * scale);
  canvas.height = Math.ceil(d * scale);
  const g = canvas.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, canvas.width, canvas.height);
  const X = x => (x + w / 2) * scale;
  const Z = z => (z + d / 2) * scale;
  return {
    text(str, x, z, size, align = 'center', fill = '#f1f1f1') {
      g.fillStyle = fill;
      g.font = `400 ${size * scale}px ${FONT}`;
      g.textAlign = align;
      g.textBaseline = 'middle';
      g.fillText(str, X(x), Z(z));
    },
    pad(x, z, r = 0.85) {
      g.fillStyle = '#d8b24a';
      g.beginPath();
      g.arc(X(x), Z(z), r * scale, 0, Math.PI * 2);
      g.fill();
    },
    // Antenna a serpentina del WROOM
    meander(x, z, len, depth) {
      g.strokeStyle = '#d8b24a';
      g.lineWidth = 0.5 * scale;
      g.beginPath();
      g.moveTo(X(x), Z(z));
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const zz = i % 2 ? z : z + depth;
        g.lineTo(X(x + (len * i) / steps), Z(zz));
        g.lineTo(X(x + (len * (i + 1)) / steps), Z(zz));
      }
      g.stroke();
    },
    texture() {
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = maxAniso;
      return t;
    },
  };
}

function chip(g, label, w, d, x, top, z, h = 1) {
  const s = makeSilk(w, d, '#1b1b1d', 32);
  if (label) s.text(label, 0, 0, Math.min(1.1, (w / label.length) * 1.7), 'center', '#a0a0a0');
  g.add(slab(w, h, d, '#1b1b1d', s.texture(), x, top, z, { roughness: 0.45 }));
}

function capacitor(g, x, top, z) {
  g.add(cyl(1.5, 4.2, MAT.capacitor, x, top, z));
  g.add(cyl(1.35, 0.15, MAT.metal, x, top + 4.2, z));
}

// Jack da 3,5 mm con l'imbocco verso sinistra
function jack(g, top) {
  g.add(box(9, 5.5, 7, MAT.plastic, -3.5, top, 0));
  const barrel = mesh(new THREE.CylinderGeometry(2.7, 2.7, 3.5, 24), MAT.plastic, -9.75, top + 2.75, 0);
  barrel.rotation.z = Math.PI / 2;
  const hole = mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.4, 24), MAT.metal, -11.4, top + 2.75, 0);
  hole.rotation.z = Math.PI / 2;
  g.add(barrel, hole);
}

// ==========================
// DISPLAY: SPETTRO ANIMATO
// ==========================

const oledCanvas = document.createElement('canvas');
oledCanvas.width = 512;
oledCanvas.height = 128;
const oledCtx = oledCanvas.getContext('2d');
const oledTexture = new THREE.CanvasTexture(oledCanvas);
oledTexture.colorSpace = THREE.SRGBColorSpace;
const BARS = 32;
const levels = new Float32Array(BARS);
const peaks = new Float32Array(BARS);

function drawSpectrum(t) {
  const g = oledCtx;
  g.fillStyle = '#050505';
  g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < BARS; i++) {
    const f = i / (BARS - 1);
    const wave = 0.55 + 0.45 * Math.sin(t * 2.1 + i * 0.55) * Math.sin(t * 1.3 + i * 0.23);
    const target = reduceMotion
      ? 0.75 - 0.5 * f
      : Math.min(1, Math.max(0.04, (0.9 - 0.55 * f) * wave + 0.1 * Math.sin(t * 7.3 + i * 1.7)));
    levels[i] += (target - levels[i]) * 0.25;
    peaks[i] = Math.max(peaks[i] - 0.006, levels[i]);
    const x = 4 + i * 16;
    const h = levels[i] * 108;
    g.fillStyle = '#c99a1e';
    g.fillRect(x, 124 - h, 12, h);
    g.fillStyle = '#ffd23f';
    g.fillRect(x, 124 - h, 12, Math.min(h, 10));
    g.fillRect(x, 124 - peaks[i] * 108 - 7, 12, 3);
  }
  oledTexture.needsUpdate = true;
}

// ==========================
// BASE
// ==========================

const BASE = { x: -16, z: 16, w: 314, d: 174 };
{
  const s = 2;
  const canvas = document.createElement('canvas');
  canvas.width = BASE.w * s;
  canvas.height = BASE.d * s;
  const g = canvas.getContext('2d');
  g.fillStyle = '#dfe2ea';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#c9cdd8';
  for (let x = 5; x < BASE.w; x += 10) {
    for (let z = 5; z < BASE.d; z += 10) g.fillRect(x * s - 1, z * s - 1, 2, 2);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  const side = new THREE.MeshStandardMaterial({ color: '#cfd3dd', roughness: 0.95 });
  const top = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
  const base = mesh(new THREE.BoxGeometry(BASE.w, 5, BASE.d), [side, side, top, side, side, side], BASE.x, -2.5, BASE.z);
  base.castShadow = false;
  scene.add(base);
}

// ==========================
// COSTRUZIONE DELLE SCHEDE
// ==========================

const modules = new Map();   // id -> { def, group, outline, label }
const pins = new Map();      // 'modulo.pin' -> { key, mod, id, label, tip, dir, labelObj }
const pickables = [];
const pinLabels = [];

// Pezzi ripetuti (pin, plastica dei pin, distanziali): un InstancedMesh per tipo,
// per disegnare centinaia di pezzi con poche chiamate alla GPU
const REPEATED = {
  pin: { geometry: new THREE.BoxGeometry(0.64, PIN_H, 0.64), material: MAT.gold },
  pinOff: { geometry: new THREE.BoxGeometry(0.64, PIN_H, 0.64), material: MAT.pinOff },
  plastic: { geometry: new THREE.BoxGeometry(2.5, PLASTIC_H, 2.5), material: MAT.plastic },
  standoff: { geometry: new THREE.CylinderGeometry(1.2, 1.2, LIFT, 16), material: MAT.standoff },
};
for (const r of Object.values(REPEATED)) r.items = [];

// x, y, z: centro del pezzo nelle coordinate della scheda
function addRepeated(kind, group, moduleId, x, y, z) {
  REPEATED[kind].items.push({ group, module: moduleId, matrix: new THREE.Matrix4().makeTranslation(x, y, z) });
}

function buildModule(def) {
  const group = new THREE.Group();
  const [w, d] = def.size;
  const base = def.standing ? -PCB_T / 2 : LIFT;
  const top = base + PCB_T;

  // Serigrafia: piazzole, nomi dei pin e testi della scheda
  const silk = makeSilk(w, d, def.color);
  const headerPins = [];
  for (const h of def.headers) {
    const pitch = h.pitch ?? PITCH;
    h.pins.forEach((label, i) => {
      const along = i * pitch;
      const x = h.dir === 'x' ? h.at[0] + along : h.at[0];
      const z = h.dir === 'x' ? h.at[1] : h.at[1] + along;
      headerPins.push({ h, label, x, z });
      if (h.face !== 'bottom' && h.kind !== 'terminal') silk.pad(x, z);
      if (h.labels) {
        const offset = h.kind === 'terminal' ? 4.6 : 1.9;
        silk.text(label, x + h.labels * offset, z, def.labelSize ?? 1.3, h.labels > 0 ? 'left' : 'right');
      }
    });
  }
  def.silk?.(silk);

  const sideMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.7 });
  const topMat = new THREE.MeshStandardMaterial({ map: silk.texture(), roughness: 0.6 });
  if (def.ghost) {
    for (const m of [sideMat, topMat]) Object.assign(m, { transparent: true, opacity: 0.6 });
  }
  const pcb = mesh(new THREE.BoxGeometry(w, PCB_T, d), [sideMat, sideMat, topMat, sideMat, sideMat, sideMat], 0, base + PCB_T / 2, 0);
  group.add(pcb);
  if (def.ghost) {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(pcb.geometry), MAT.ghostLine);
    edges.position.copy(pcb.position);
    edges.computeLineDistances();
    group.add(edges);
  }
  if (!def.standing) {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      addRepeated('standoff', group, def.id, sx * (w / 2 - 2), LIFT / 2, sz * (d / 2 - 2));
    }
  }

  // Pin header (o morsetti) con la punta dove si attacca il filo
  const used = new Map();
  for (const p of headerPins) {
    const { h } = p;
    const n = (used.get(p.label) ?? 0) + 1;
    used.set(p.label, n);
    const id = n === 1 ? p.label : `${p.label}_${n}`;
    const key = `${def.id}.${id}`;
    const sy = h.face === 'bottom' ? -1 : 1;
    const surface = h.face === 'bottom' ? base : top;
    let tipY;
    if (h.kind === 'terminal') {
      group.add(box(7.6, 8.5, 5, MAT.terminal, p.x, top, p.z));
      group.add(cyl(1.5, 0.5, MAT.metal, p.x + 0.8, top + 8.5, p.z));
      group.add(box(0.3, 2.6, 3, MAT.plastic, p.x - 3.85, top + 1.5, p.z));
      tipY = top + TERMINAL_H;
    } else {
      addRepeated('plastic', group, def.id, p.x, surface + sy * PLASTIC_H / 2, p.z);
      addRepeated(PIN_NOTES[key] ? 'pinOff' : 'pin', group, def.id, p.x, surface + sy * (PLASTIC_H + PIN_H / 2), p.z);
      tipY = surface + sy * (PLASTIC_H + PIN_H);
    }
    const tip = new THREE.Vector3(p.x, tipY, p.z);
    const dir = new THREE.Vector3(0, sy, 0);
    const pick = new THREE.Mesh(new THREE.BoxGeometry(3, 5, 3), MAT.pick);
    pick.position.copy(tip).addScaledVector(dir, -2);
    pick.layers.set(PICK_LAYER);
    pick.userData = { kind: 'pin', id: key };
    group.add(pick);
    pickables.push(pick);

    const el = document.createElement('div');
    el.className = 'pin-3d';
    el.textContent = p.label;
    const labelObj = new CSS2DObject(el);
    labelObj.position.copy(tip).addScaledVector(dir, 3.5);
    labelObj.visible = false;
    group.add(labelObj);
    pinLabels.push(labelObj);

    pins.set(key, { key, mod: def.id, id, label: p.label, tip, dir, labelObj });
  }

  def.parts?.(group, top);

  // Posizione nella scena
  if (def.standing) {
    const angle = THREE.MathUtils.degToRad(90 - def.standing.tilt);
    group.rotation.x = angle;
    group.position.set(def.pos[0], def.standing.bottom + (d / 2) * Math.sin(angle), def.pos[1]);
    const edgeZ = def.pos[1] + (d / 2) * Math.cos(angle);
    scene.add(box(w - 4, 2, 16, MAT.acrylic, def.pos[0], 0, edgeZ - 3));
    for (const sx of [-1, 1]) scene.add(cyl(1.8, def.standing.bottom - 2, MAT.standoff, def.pos[0] + sx * (w / 2 - 8), 2, edgeZ - 0.5));
  } else {
    group.position.set(def.pos[0], 0, def.pos[1]);
  }
  scene.add(group);
  group.updateMatrixWorld(true);

  group.traverse(o => {
    if (o.isMesh && !o.userData.kind) {
      o.userData = { kind: 'module', id: def.id };
      pickables.push(o);
    }
  });

  // Riquadro di evidenziazione
  const bounds = new THREE.Box3().setFromObject(group).expandByScalar(1.5);
  const outline = new THREE.Box3Helper(bounds, MAT.outline.color);
  outline.visible = false;
  scene.add(outline);

  // Nome della scheda
  const title = document.createElement('div');
  title.className = 'modulo-3d';
  title.textContent = def.short;
  const label = new CSS2DObject(title);
  label.position.set((bounds.min.x + bounds.max.x) / 2, bounds.max.y + 5, (bounds.min.z + bounds.max.z) / 2);
  scene.add(label);

  modules.set(def.id, { def, group, outline, label });
}

MODULES.forEach(buildModule);

for (const r of Object.values(REPEATED)) {
  const inst = new THREE.InstancedMesh(r.geometry, r.material, r.items.length);
  r.items.forEach((item, i) => inst.setMatrixAt(i, item.group.matrixWorld.clone().multiply(item.matrix)));
  inst.castShadow = true;
  inst.receiveShadow = true;
  inst.computeBoundingSphere();
  inst.userData = { kind: 'instanced', ids: r.items.map(item => item.module) };
  scene.add(inst);
  pickables.push(inst);
}

// Punte dei pin in coordinate della scena
for (const p of pins.values()) {
  const group = modules.get(p.mod).group;
  p.tip = group.localToWorld(p.tip.clone());
  p.dir = p.dir.clone().transformDirection(group.matrixWorld);
}

// ==========================
// FILI
// ==========================

const stripes = (() => {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 4;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 18, 4);
  g.fillStyle = '#1f1f1f';
  g.fillRect(18, 0, 14, 4);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
})();

function curveDir(dir) {
  // I pin orizzontali (display) partono anche un po' verso l'alto
  const d = dir.clone();
  if (Math.abs(d.y) < 0.5) d.y += 0.8;
  return d.normalize();
}

const wires = WIRES.map((def, index) => {
  const a = pins.get(def.a);
  const b = pins.get(def.b);
  if (!a || !b) throw new Error(`Pin sconosciuto nel collegamento ${def.a} -> ${def.b}`);
  const p0 = a.tip.clone().addScaledVector(a.dir, 2.2);
  const p3 = b.tip.clone().addScaledVector(b.dir, 2.2);
  const reach = Math.max(16, p0.distanceTo(p3) * 0.42);
  const curve = new THREE.CubicBezierCurve3(
    p0,
    p0.clone().addScaledVector(curveDir(a.dir), reach),
    p3.clone().addScaledVector(curveDir(b.dir), reach),
    p3,
  );
  const color = new THREE.Color(NETS[def.net].color);
  const baseOpacity = def.uncertain ? 0.75 : 1;
  const tubeMat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, transparent: true, opacity: baseOpacity, emissive: color, emissiveIntensity: 0 });
  if (def.uncertain) {
    tubeMat.alphaMap = stripes.clone();
    tubeMat.alphaMap.repeat.set(curve.getLength() / 5, 1);
    tubeMat.alphaMap.needsUpdate = true;
  }
  const endMat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, transparent: true, opacity: baseOpacity, emissive: color, emissiveIntensity: 0 });

  const tube = mesh(new THREE.TubeGeometry(curve, 80, 0.6, 8, false), tubeMat);
  tube.receiveShadow = false;
  const ends = [a, b].map(p => {
    const end = mesh(new THREE.CylinderGeometry(0.95, 0.95, 3.4, 12), endMat);
    end.position.copy(p.tip).addScaledVector(p.dir, 0.7);
    end.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.dir);
    return end;
  });
  const pick = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 1.5, 6, false), MAT.pick);
  pick.layers.set(PICK_LAYER);
  pick.userData = { kind: 'wire', id: index };
  scene.add(tube, pick, ...ends);
  pickables.push(pick);
  return { index, def, a, b, meshes: [tube, ...ends, pick], materials: [tubeMat, endMat], baseOpacity, visible: true };
});

// ==========================
// TESTI E INFORMAZIONI
// ==========================

function pinName(p) {
  return p.mod === 'esp32' && /^\d+$/.test(p.label) ? `GPIO ${p.label}` : p.label;
}

function endName(p) {
  return `${modules.get(p.mod).def.short} ${pinName(p)}`;
}

function wireText(w) {
  const extra = [w.def.note, w.def.uncertain].filter(Boolean).join(', ');
  return `${endName(w.a)} → ${endName(w.b)} · ${NETS[w.def.net].name}${extra ? ` (${extra})` : ''}`;
}

function swatch(net) {
  return `<span class="campione" style="background:${NETS[net].color}"></span>`;
}

function moduleWires(id) {
  return wires.filter(w => w.a.mod === id || w.b.mod === id);
}

const DEFAULT_INFO = infoBox.innerHTML;

function showModule(id) {
  const { def } = modules.get(id);
  const rows = moduleWires(id).map(w => {
    const [mine, other] = w.a.mod === id ? [w.a, w.b] : [w.b, w.a];
    const extra = [w.def.note, w.def.uncertain].filter(Boolean).join(', ');
    return { sort: pinName(mine), html: `<tr><td>${pinName(mine)}</td><td>${endName(other)}</td><td>${swatch(w.def.net)}${NETS[w.def.net].name}${extra ? ` <em>(${extra})</em>` : ''}</td></tr>` };
  });
  for (const p of pins.values()) {
    if (p.mod === id && PIN_NOTES[p.key] && !moduleWires(id).some(w => w.a === p || w.b === p)) {
      rows.push({ sort: pinName(p), html: `<tr><td>${pinName(p)}</td><td colspan="2"><em>${PIN_NOTES[p.key]}</em></td></tr>` });
    }
  }
  rows.sort((x, y) => x.sort.localeCompare(y.sort, 'it', { numeric: true }));
  infoBox.innerHTML = `<h3>${def.title}</h3><p>${def.role}</p>` +
    '<div class="table-wrapper"><table><thead><tr><th>Pin</th><th>Collegato a</th><th>Segnale</th></tr></thead>' +
    `<tbody>${rows.map(r => r.html).join('')}</tbody></table></div>` +
    (def.note ? `<p><em>${def.note}</em></p>` : '');
}

function showWire(index) {
  const w = wires[index];
  infoBox.innerHTML = `<h3>${swatch(w.def.net)}${NETS[w.def.net].name}</h3><p>${wireText(w)}</p>` +
    '<p>Clic su una scheda per vedere tutti i suoi collegamenti.</p>';
}

function hoverText(target) {
  if (target.kind === 'wire') return wireText(wires[target.id]);
  if (target.kind === 'pin') {
    const p = pins.get(target.id);
    const linked = wires.filter(w => w.a === p || w.b === p).map(w => endName(w.a === p ? w.b : w.a));
    const note = PIN_NOTES[p.key];
    return `${endName(p)}${linked.length ? ` → ${linked.join(', ')}` : ''}${note ? ` · ${note}` : ''}`;
  }
  return modules.get(target.id).def.title;
}

// ==========================
// EVIDENZIAZIONE
// ==========================

let hovered = null;
let selected = null;

function focusOf(target) {
  if (!target) return null;
  if (target.kind === 'wire') return new Set([target.id]);
  if (target.kind === 'pin') {
    const p = pins.get(target.id);
    return new Set(wires.filter(w => w.a === p || w.b === p).map(w => w.index));
  }
  return new Set(moduleWires(target.id).map(w => w.index));
}

function moduleOf(target) {
  if (!target || target.kind === 'wire') return null;
  return target.kind === 'pin' ? pins.get(target.id).mod : target.id;
}

function refresh() {
  const target = hovered ?? selected;
  const focus = focusOf(target);
  for (const w of wires) {
    const on = !focus || focus.has(w.index);
    for (const m of w.materials) {
      m.opacity = w.baseOpacity * (on ? 1 : 0.13);
      m.emissiveIntensity = focus && on ? 0.4 : 0;
    }
  }
  const mod = moduleOf(target);
  for (const [id, m] of modules) m.outline.visible = id === mod;
}

// ==========================
// PUNTATORE
// ==========================

const raycaster = new THREE.Raycaster();
raycaster.layers.enable(PICK_LAYER);
const pointer = new THREE.Vector2();
let viewW = 1;
let viewH = 1;

// x, y in pixel rispetto al canvas
function pickAt(x, y) {
  pointer.set((x / viewW) * 2 - 1, -(y / viewH) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const active = pickables.filter(o => o.userData.kind !== 'wire' || wires[o.userData.id].visible);
  const hit = raycaster.intersectObjects(active, false)[0];
  if (!hit) return null;
  const data = hit.object.userData;
  return data.kind === 'instanced' ? { kind: 'module', id: data.ids[hit.instanceId] } : data;
}

function placeTooltip(x, y) {
  const right = x > viewW / 2;
  tooltip.style.left = right ? '' : `${x + 14}px`;
  tooltip.style.right = right ? `${viewW - x + 14}px` : '';
  tooltip.style.top = `${y > viewH * 0.75 ? y - 48 : y + 16}px`;
}

// Il puntatore viene elaborato al massimo una volta per fotogramma
let pendingMove = null;
let hoverKey = '';

function handleMove() {
  if (!pendingMove) return;
  const r = renderer.domElement.getBoundingClientRect();
  const x = pendingMove.x - r.left;
  const y = pendingMove.y - r.top;
  pendingMove = null;
  const target = pickAt(x, y);
  const key = target ? `${target.kind}:${target.id}` : '';
  if (key !== hoverKey) {
    hoverKey = key;
    hovered = target;
    renderer.domElement.style.cursor = target ? 'pointer' : '';
    if (target) tooltip.textContent = hoverText(target);
    tooltip.hidden = !target;
    refresh();
  }
  if (target) placeTooltip(x, y);
}

let downAt = null;
renderer.domElement.addEventListener('pointerdown', ev => { downAt = [ev.clientX, ev.clientY]; });

renderer.domElement.addEventListener('pointermove', ev => {
  pendingMove = ev.buttons ? null : { x: ev.clientX, y: ev.clientY };
});

renderer.domElement.addEventListener('pointerleave', () => {
  pendingMove = null;
  hoverKey = '';
  hovered = null;
  tooltip.hidden = true;
  refresh();
});

renderer.domElement.addEventListener('pointerup', ev => {
  if (!downAt || Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 5) return;
  const r = renderer.domElement.getBoundingClientRect();
  const target = pickAt(ev.clientX - r.left, ev.clientY - r.top);
  if (!target) {
    selected = null;
    infoBox.innerHTML = DEFAULT_INFO;
  } else if (target.kind === 'wire') {
    selected = target;
    showWire(target.id);
  } else {
    selected = { kind: 'module', id: moduleOf(target) };
    showModule(selected.id);
  }
  if (ev.pointerType !== 'mouse') {
    hovered = null;
    hoverKey = '';
  }
  refresh();
});

// ==========================
// LEGENDA E COMANDI
// ==========================

legendBox.innerHTML = Object.entries(NETS).map(([key, net]) =>
  `<li><input type="checkbox" id="rete-${key}" data-net="${key}" checked>` +
  `<label for="rete-${key}">${swatch(key)}${net.name}</label></li>`).join('') +
  '<li class="tratteggio"><span class="campione campione-tratteggio"></span>Tratteggiato: collegamento proposto o da definire</li>';

legendBox.addEventListener('change', ev => {
  const net = ev.target.dataset.net;
  if (!net) return;
  for (const w of wires) {
    if (w.def.net !== net) continue;
    w.visible = ev.target.checked;
    for (const m of w.meshes) m.visible = w.visible;
  }
  renderer.shadowMap.needsUpdate = true;
});

document.getElementById('nomi-pin').addEventListener('change', ev => {
  for (const l of pinLabels) l.visible = ev.target.checked;
});

const VIEW_TARGET = new THREE.Vector3(BASE.x, 4, BASE.z - 2);

// Su schermi in verticale la base si guarda dal lato sinistro, con il lato lungo in verticale
function resetView(fromTop = false) {
  topView = fromTop;
  const portrait = camera.aspect < 0.95;
  const dir = fromTop
    ? new THREE.Vector3(portrait ? -0.0001 : 0, 1, portrait ? 0 : 0.0001)
    : new THREE.Vector3(portrait ? -0.6 : 0, 0.8, portrait ? 0 : 0.6);
  // Ingombro della base sullo schermo: in orizzontale (across) e in profondità (along)
  const [across, along] = portrait ? [BASE.d, BASE.w] : [BASE.w, BASE.d];
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const tanH = tanV * camera.aspect;
  const halfAcross = across / 2 + 8;
  const halfAlong = fromTop ? along / 2 + 8 : along * 0.44;
  // Nella vista obliqua il bordo vicino appare più grande: serve più margine
  const distance = Math.max(halfAcross / tanH, halfAlong / tanV) * (fromTop ? 1.05 : 1.22);
  controls.target.copy(VIEW_TARGET);
  camera.position.copy(VIEW_TARGET).addScaledVector(dir.normalize(), distance);
  controls.update();
}

let topView = false;

let userMoved = false;
controls.addEventListener('start', () => { userMoved = true; });

document.getElementById('vista-reset').addEventListener('click', ev => { ev.preventDefault(); userMoved = false; resetView(); });
document.getElementById('vista-alto').addEventListener('click', ev => { ev.preventDefault(); userMoved = false; resetView(true); });
const spinButton = document.getElementById('rotazione');
spinButton.addEventListener('click', ev => {
  ev.preventDefault();
  controls.autoRotate = !controls.autoRotate;
  spinButton.textContent = controls.autoRotate ? 'Ferma la rotazione' : 'Rotazione automatica';
});

// ==========================
// DIMENSIONI E CICLO DI DISEGNO
// ==========================

function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  viewW = w;
  viewH = h;
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (!userMoved) resetView(topView);
}
new ResizeObserver(resize).observe(container);
resize();

let onScreen = true;
new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }).observe(container);

const timer = new THREE.Timer();
timer.connect(document);
for (let i = 0; i < 40; i++) drawSpectrum(0);
renderer.setAnimationLoop(time => {
  if (!onScreen) return;
  timer.update(time);
  if (!reduceMotion) drawSpectrum(timer.getElapsed());
  handleMove();
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});

container.classList.add('pronto');
