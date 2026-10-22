// Trilha chiptune original no estilo Game Boy: 2 canais de pulso, 1 de onda (baixo) e ruído (bateria)
import { getMeta } from '../game/storage';
import { audioCtx } from './sfx';

type Ch = 'lead' | 'harm' | 'bass' | 'drums';
interface Song { bpm: number; loop: boolean; ch: Partial<Record<Ch, string>> }

// notação: "NOTA/duração" em semicolcheias; "-" = pausa; bateria: k (bumbo), s (caixa), h (chimbal)
const SONGS: Record<string, Song> = {
  title: {
    bpm: 132, loop: true,
    ch: {
      lead: `G4/2 C5/2 E5/2 G5/6 E5/2 G5/2 | A5/4 G5/2 F5/2 E5/4 D5/4 | F4/2 A4/2 C5/2 F5/6 E5/2 D5/2 | E5/4 D5/2 C5/2 D5/8 |
             G4/2 C5/2 E5/2 G5/6 A5/2 B5/2 | C6/6 B5/2 A5/4 G5/4 | F5/4 A5/4 G5/2 F5/2 E5/2 D5/2 | C5/12 -/4`,
      harm: `E4/16 | F4/16 | A4/16 | B4/16 | E4/16 | C5/16 | A4/8 B4/8 | E4/16`,
      bass: `C3/4 G3/4 C3/4 G3/4 | F2/4 C3/4 F2/4 C3/4 | F2/4 C3/4 F2/4 C3/4 | G2/4 D3/4 G2/4 D3/4 |
             C3/4 G3/4 C3/4 G3/4 | A2/4 E3/4 A2/4 E3/4 | F2/4 C3/4 G2/4 D3/4 | C3/4 G2/4 C3/8`,
      drums: `k/4 h/2 h/2 s/4 h/4 | k/4 h/2 h/2 s/4 h/4 | k/4 h/2 h/2 s/4 h/4 | k/4 h/2 k/2 s/4 s/2 s/2 |
              k/4 h/2 h/2 s/4 h/4 | k/4 h/2 h/2 s/4 h/4 | k/4 h/2 h/2 s/4 h/4 | k/4 s/2 s/2 s/2 s/2 s/4`,
    },
  },
  shop: {
    bpm: 104, loop: true,
    ch: {
      lead: `A4/3 C5/1 F5/4 E5/2 D5/2 C5/4 | D5/3 C5/1 A4/4 G4/4 -/4 | A#4/3 D5/1 F5/4 G5/2 F5/2 E5/4 | F5/12 -/4 |
             A5/3 G5/1 F5/4 D5/4 C5/4 | A#4/3 A4/1 G4/4 C5/8 | D5/2 E5/2 F5/2 G5/2 A5/4 G5/4 | F5/12 -/4`,
      harm: `C4/8 A3/8 | D4/8 F4/8 | D4/8 A#3/8 | C4/16 | F4/8 D4/8 | D4/8 E4/8 | A#3/8 C4/8 | A3/16`,
      bass: `F2/4 -/2 F2/2 C3/4 -/4 | D2/4 -/2 D2/2 A2/4 -/4 | A#1/4 -/2 A#1/2 F2/4 -/4 | F2/4 -/2 F2/2 C3/4 -/4 |
             D2/4 -/2 D2/2 A2/4 -/4 | A#1/4 -/2 A#1/2 C2/4 -/4 | A#1/4 -/4 C2/4 -/4 | F2/4 -/2 F2/2 C2/4 -/4`,
      drums: `k/4 h/4 s/4 h/4 | k/4 h/4 s/4 h/4 | k/4 h/4 s/4 h/4 | k/4 h/4 s/4 h/2 h/2 |
              k/4 h/4 s/4 h/4 | k/4 h/4 s/4 h/4 | k/4 h/4 s/4 h/4 | k/4 h/4 s/2 s/2 h/4`,
    },
  },
  battle: {
    bpm: 168, loop: true,
    ch: {
      lead: `A4/2 C5/2 E5/2 A5/2 G5/4 E5/4 | F5/2 E5/2 D5/2 C5/2 D5/4 E5/4 | F5/4 A5/4 C6/4 A5/4 | G5/2 F5/2 E5/2 D5/2 B4/4 D5/4 |
             A4/2 C5/2 E5/2 A5/2 B5/4 C6/4 | B5/2 A5/2 G5/2 E5/2 A5/8 | F5/2 G5/2 A5/2 F5/2 C6/4 A5/4 | G#5/4 B5/4 E6/4 -/4`,
      harm: `E4/2 A4/2 E4/2 A4/2 E4/2 A4/2 E4/2 A4/2 | E4/2 A4/2 E4/2 A4/2 E4/2 A4/2 E4/2 A4/2 | F4/2 A4/2 F4/2 A4/2 F4/2 A4/2 F4/2 A4/2 | G4/2 B4/2 G4/2 B4/2 G4/2 B4/2 G4/2 B4/2 |
             E4/2 A4/2 E4/2 A4/2 E4/2 A4/2 E4/2 A4/2 | E4/2 A4/2 E4/2 A4/2 E4/2 A4/2 E4/2 A4/2 | F4/2 A4/2 F4/2 A4/2 F4/2 C5/2 F4/2 C5/2 | E4/2 G#4/2 E4/2 G#4/2 E4/2 B4/2 E4/2 B4/2`,
      bass: `A2/2 A3/2 A2/2 A3/2 A2/2 A3/2 A2/2 A3/2 | A2/2 A3/2 A2/2 A3/2 A2/2 A3/2 G2/2 G3/2 | F2/2 F3/2 F2/2 F3/2 F2/2 F3/2 F2/2 F3/2 | G2/2 G3/2 G2/2 G3/2 G2/2 G3/2 G2/2 G3/2 |
             A2/2 A3/2 A2/2 A3/2 A2/2 A3/2 A2/2 A3/2 | A2/2 A3/2 A2/2 A3/2 A2/2 A3/2 G2/2 G3/2 | F2/2 F3/2 F2/2 F3/2 F2/2 F3/2 F2/2 F3/2 | E2/2 E3/2 E2/2 E3/2 E2/2 E3/2 E2/2 E3/2`,
      drums: `k/2 h/2 s/2 h/2 k/2 k/2 s/2 h/2 | k/2 h/2 s/2 h/2 k/2 k/2 s/2 h/2 | k/2 h/2 s/2 h/2 k/2 k/2 s/2 h/2 | k/2 h/2 s/2 h/2 k/2 s/2 s/2 s/2 |
              k/2 h/2 s/2 h/2 k/2 k/2 s/2 h/2 | k/2 h/2 s/2 h/2 k/2 k/2 s/2 h/2 | k/2 h/2 s/2 h/2 k/2 k/2 s/2 h/2 | k/2 s/2 k/2 s/2 s/2 s/2 s/2 s/2`,
    },
  },
  victory: {
    bpm: 150, loop: false,
    ch: {
      lead: `C5/2 E5/2 G5/2 C6/6 G5/2 C6/2 | D6/2 C6/2 B5/2 C6/10`,
      harm: `E4/2 G4/2 C5/2 E5/6 C5/2 E5/2 | F5/2 E5/2 D5/2 E5/10`,
      bass: `C3/8 G2/8 | G2/4 G2/2 C3/10`,
      drums: `k/2 h/2 s/2 h/2 k/2 h/2 s/4 | k/2 s/2 s/2 s/2 k/8`,
    },
  },
  defeat: {
    bpm: 90, loop: false,
    ch: {
      lead: `E5/4 D5/4 C5/4 B4/4 | A4/12 -/4`,
      harm: `C5/4 B4/4 A4/4 G#4/4 | E4/12 -/4`,
      bass: `A2/8 E2/8 | A1/12 -/4`,
    },
  },
};

const NOTE: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = (n: string) => {
  const m = n.match(/^([A-G]#?)(\d)$/)!;
  return 440 * 2 ** ((NOTE[m[1]] + (Number(m[2]) + 1) * 12 - 69) / 12);
};

interface Ev { step: number; len: number; note: string }
function parse(src: string): { evs: Ev[]; len: number } {
  const evs: Ev[] = [];
  let step = 0;
  for (const tok of src.replace(/\|/g, ' ').split(/\s+/).filter(Boolean)) {
    const [note, d] = tok.split('/');
    const len = Number(d);
    if (note !== '-') evs.push({ step, len, note });
    step += len;
  }
  return { evs, len: step };
}

const VOL: Record<Ch, number> = { lead: 0.05, harm: 0.022, bass: 0.07, drums: 0.05 };
let master: GainNode | null = null;
let current: { name: string; byStep: Map<number, [Ch, Ev][]>; len: number; loop: boolean; stepDur: number; step: number; next: number } | null = null;
let timer = 0;

function out() {
  const c = audioCtx();
  if (!master) {
    master = c.createGain();
    master.gain.value = 1;
    master.connect(c.destination);
  }
  return master;
}

function voice(ch: Ch, e: Ev, t: number, dur: number) {
  const c = audioCtx();
  const g = c.createGain();
  g.connect(out());
  if (ch === 'drums') {
    if (e.note === 'k') {
      const o = c.createOscillator();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(VOL.drums * 2.2, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.15);
      return;
    }
    const len = e.note === 's' ? 0.12 : 0.035;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = e.note === 's' ? 1500 : 7000;
    g.gain.setValueAtTime(VOL.drums * (e.note === 's' ? 1.2 : 0.6), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g);
    src.start(t);
    return;
  }
  const o = c.createOscillator();
  o.type = ch === 'bass' ? 'triangle' : 'square';
  o.frequency.value = freq(e.note);
  const v = VOL[ch];
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + 0.005);
  g.gain.setValueAtTime(v * 0.8, t + Math.max(0.01, dur - 0.04));
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function tick() {
  if (!current) return;
  const c = audioCtx();
  if (c.state !== 'running') { current.next = c.currentTime + 0.05; return; }
  if (current.next < c.currentTime - 0.2) current.next = c.currentTime + 0.05;
  while (current && current.next < c.currentTime + 0.25) {
    for (const [ch, e] of current.byStep.get(current.step) ?? []) voice(ch, e, current.next, e.len * current.stepDur * 0.95);
    current.next += current.stepDur;
    current.step++;
    if (current.step >= current.len) {
      if (current.loop) current.step = 0;
      else { current = null; break; }
    }
  }
}

export const music = {
  play(name: keyof typeof SONGS | string) {
    if (current?.name === name) return;
    this.stop();
    if (getMeta().musicMuted || getMeta().muted) return;
    const song = SONGS[name];
    if (!song) return;
    const byStep = new Map<number, [Ch, Ev][]>();
    let len = 0;
    for (const [ch, src] of Object.entries(song.ch) as [Ch, string][]) {
      const p = parse(src);
      len = Math.max(len, p.len);
      for (const e of p.evs) byStep.set(e.step, [...(byStep.get(e.step) ?? []), [ch, e]]);
    }
    const c = audioCtx();
    current = { name, byStep, len, loop: song.loop, stepDur: 60 / song.bpm / 4, step: 0, next: c.currentTime + 0.08 };
    if (!timer) timer = window.setInterval(tick, 50);
    tick();
  },
  stop() {
    current = null;
    if (master) {
      // corta as notas já agendadas
      const old = master;
      old.gain.setTargetAtTime(0, audioCtx().currentTime, 0.02);
      setTimeout(() => old.disconnect(), 200);
      master = null;
    }
  },
  get playing() {
    return current?.name ?? null;
  },
};
