import { getMeta } from '../game/storage';

let ctx: AudioContext | null = null;
let lastHit = 0;

// aba em segundo plano: todo o áudio fica suspenso até a aba voltar
let hidden = typeof document !== 'undefined' && document.hidden;
function ac() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended' && !hidden) void ctx.resume();
  return ctx;
}
export const audioCtx = ac;
export const audioHidden = () => hidden;
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    if (!ctx) return;
    if (hidden) void ctx.suspend();
    else void ctx.resume();
  });
}

// gritos clássicos (PokéAPI); limita para não virar barulho
let lastCry = 0;
export function cry(id: number, vol = 0.3, rate = 1, gap = 120) {
  if (getMeta().muted || hidden) return;
  const now = performance.now();
  if (now - lastCry < gap) return;
  lastCry = now;
  try {
    const a = new Audio(`${import.meta.env.BASE_URL}sounds/cries/${id}.ogg`);
    a.volume = vol;
    a.playbackRate = rate;
    void a.play().catch(() => {});
  } catch {}
}

// ondas de pulso do Game Boy (12,5% / 25% / 50%) geradas por série de Fourier
const waves = new Map<number, PeriodicWave>();
function pulse(duty: number) {
  const c = ac();
  if (!waves.has(duty)) {
    const n = 32, real = new Float32Array(n), imag = new Float32Array(n);
    for (let k = 1; k < n; k++) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    waves.set(duty, c.createPeriodicWave(real, imag));
  }
  return waves.get(duty)!;
}

function tone(freq: number, start: number, dur: number, duty = 0.25, vol = 0.07, slideTo?: number) {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.setPeriodicWave(pulse(duty));
  const t = c.currentTime + start;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.setValueAtTime(vol, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function tri(freq: number, start: number, dur: number, vol = 0.09) {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'triangle';
  const t = c.currentTime + start;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.05, from = 2400, to = 300) {
  const c = ac();
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  // ruído "granulado" como o LFSR do Game Boy
  let v = 0;
  for (let i = 0; i < d.length; i++) { if (i % 6 === 0) v = Math.random() * 2 - 1; d[i] = v; }
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(from, c.currentTime);
  f.frequency.exponentialRampToValueAtTime(to, c.currentTime + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start();
}

const N = (n: string) => {
  const m = n.match(/^([A-G]#?)(\d)$/)!;
  const idx = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 }[m[1]]!;
  return 440 * 2 ** ((idx + (Number(m[2]) + 1) * 12 - 69) / 12);
};
const seq = (notes: string[], step: number, dur: number, duty = 0.25, vol = 0.07) =>
  notes.forEach((n, i) => n !== '-' && tone(N(n), i * step, dur, duty, vol));

export const sfx = {
  /** "bip" de cursor/menu dos jogos de GB */
  click: () => play(() => tone(N('C7'), 0, 0.045, 0.125, 0.05)),
  hover: () => play(() => tone(N('G6'), 0, 0.025, 0.125, 0.025)),
  open: () => play(() => { tone(N('C6'), 0, 0.04, 0.125, 0.05); tone(N('G6'), 0.04, 0.06, 0.125, 0.05); }),
  buy: () => play(() => { seq(['E6', 'B6'], 0.055, 0.07, 0.125); tri(N('E4'), 0, 0.12); }),
  sell: () => play(() => seq(['B6', 'E7'], 0.05, 0.09, 0.25, 0.05)),
  error: () => play(() => { tone(N('D#3'), 0, 0.09, 0.5, 0.06); tone(N('C3'), 0.09, 0.14, 0.5, 0.06); }),
  merge: () => play(() => { seq(['C6', 'E6', 'G6', 'C7'], 0.06, 0.09, 0.25); tri(N('C4'), 0, 0.3); }),
  levelUp: () => play(() => { seq(['G5', 'G5', 'G5', 'C6', '-', 'E6', 'G6'], 0.07, 0.1, 0.25); tri(N('C4'), 0, 0.5); }),
  evolve: () => play(() => {
    tone(N('C5'), 0, 0.9, 0.25, 0.04, N('C7'));
    seq(['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'C6', 'E6', 'G6', 'C7', 'E7'], 0.07, 0.12, 0.125, 0.05);
  }),
  heal: () => play(() => seq(['E6', 'G#6', 'B6', 'E7'], 0.09, 0.14, 0.5, 0.045)),
  hit: () =>
    play(() => {
      const now = performance.now();
      if (now - lastHit < 45) return;
      lastHit = now;
      noise(0.09, 0.06);
    }),
  ko: () => play(() => { tone(N('A4'), 0, 0.35, 0.5, 0.05, N('A2')); noise(0.3, 0.04, 1200, 100); }),
  win: () => play(() => seq(['C6', 'E6', 'G6', 'C7'], 0.1, 0.18)),
  lose: () => play(() => seq(['G5', 'E5', 'C5', 'G4'], 0.16, 0.25, 0.5)),
  vs: () => play(() => { tone(N('C4'), 0, 0.5, 0.5, 0.05, N('C6')); noise(0.4, 0.03, 4000, 500); }),
};

function play(fn: () => void) {
  if (getMeta().muted) return;
  try {
    fn();
  } catch {}
}
