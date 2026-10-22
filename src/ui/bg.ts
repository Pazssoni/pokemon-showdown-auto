// Cenários de batalha desenhados proceduralmente em 320x180 e ampliados com pixel nítido
import { makeRng, type Rng } from '../game/rng';

export type Scene = 'forest' | 'cave' | 'beach' | 'tower' | 'victory' | 'plateau';

export const SCENE_NAME: Record<Scene, string> = {
  forest: 'Viridian Forest', cave: 'Mt. Moon', beach: 'Rota 24', tower: 'Torre Pokémon',
  victory: 'Victory Road', plateau: 'Indigo Plateau',
};

export function sceneForDay(day: number): Scene {
  if (day <= 2) return 'forest';
  if (day <= 4) return 'cave';
  if (day <= 6) return 'beach';
  if (day <= 8) return 'tower';
  if (day <= 10) return 'victory';
  return 'plateau';
}

const W = 320, H = 180;

export function drawScene(canvas: HTMLCanvasElement, scene: Scene, seed = 7) {
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  const rng = makeRng(seed);
  ({ forest, cave, beach, tower, victory, plateau })[scene](c, rng);
}

type C = CanvasRenderingContext2D;

const R = (c: C, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

/** faixas horizontais com uma linha de dithering entre elas */
function bands(c: C, y0: number, y1: number, cols: string[]) {
  const bh = (y1 - y0) / cols.length;
  cols.forEach((col, i) => R(c, 0, y0 + i * bh, W, bh + 1, col));
  for (let i = 1; i < cols.length; i++) {
    const y = Math.round(y0 + i * bh);
    c.fillStyle = cols[i - 1];
    for (let x = 0; x < W; x += 2) c.fillRect(x + (y % 2), y, 1, 1);
  }
}

function pine(c: C, x: number, base: number, h: number, dark: string, light?: string) {
  R(c, x - 1, base - 3, 3, 4, '#3b2a1e');
  for (let k = 0; k < 3; k++) {
    const top = base - h + (k * h) / 3.4;
    const th = h / 2.4;
    for (let r = 0; r < th; r++) {
      const w = 1 + Math.floor((r / th) * (h / 4.5 + k * 2));
      R(c, x - w, top + r, w * 2 + 1, 1, dark);
      if (light && r % 3 === 0) R(c, x - w, top + r, Math.max(1, w / 2), 1, light);
    }
  }
}

function blob(c: C, x: number, y: number, w: number, h: number, col: string) {
  for (let r = 0; r < h; r++) {
    const t = r / h;
    const ww = w * Math.sqrt(1 - (2 * t - 1) ** 2);
    R(c, x - ww / 2, y + r, ww, 1, col);
  }
}

function ellipseFloor(c: C, cx: number, cy: number, rx: number, ry: number, col: string) {
  for (let y = -ry; y <= ry; y++) {
    const w = rx * Math.sqrt(1 - (y / ry) ** 2);
    R(c, cx - w, cy + y, w * 2, 1, col);
  }
}

function forest(c: C, rng: Rng) {
  bands(c, 0, 62, ['#3d9df0', '#4dabf3', '#62b9f6', '#7cc8f8', '#96d6f9']);
  // raios de luz
  c.globalAlpha = 0.13;
  c.fillStyle = '#ffffff';
  for (const [x, w] of [[10, 18], [40, 10], [70, 6]]) {
    c.beginPath();
    c.moveTo(x, 0); c.lineTo(x + w, 0); c.lineTo(x + w + 90, 120); c.lineTo(x + 80, 120);
    c.fill();
  }
  c.globalAlpha = 1;
  // colinas distantes
  for (let x = 0; x < W; x++) {
    const y = 54 + Math.sin(x / 23) * 3 + Math.sin(x / 7) * 1;
    R(c, x, y, 1, 20, '#8fd08e');
  }
  for (let i = 0; i < 26; i++) pine(c, rng() * W, 70, 16 + rng() * 14, '#2f8a4f', '#3fa55e');
  for (let x = 0; x < W; x += 4) blob(c, x + rng() * 3, 64 + rng() * 3, 10 + rng() * 6, 9, '#4fae45');
  R(c, 0, 71, W, 110, '#8bcf4c');
  for (let y = 74; y < H; y += 7) R(c, 0, y, W, 2, '#84c847');
  for (let i = 0; i < 140; i++) {
    const x = rng() * W, y = 72 + rng() * 90;
    R(c, x, y, 1, 2, '#6fb53d');
    R(c, x + 2, y + 1, 1, 1, '#6fb53d');
  }
  for (let i = 0; i < 30; i++) R(c, rng() * W, 71 + rng() * 6, 1, 1, rng() < 0.5 ? '#f5a742' : '#fff4a0');
  // primeiro plano escuro
  for (let x = -10; x < W + 10; x += 6) {
    const y = 148 + Math.sin(x / 13) * 6 + rng() * 5;
    blob(c, x, y, 16 + rng() * 10, 60, '#1f6646');
  }
  R(c, 0, 165, W, 20, '#1f6646');
  pine(c, 8, 186, 120, '#1d5e40');
  pine(c, 312, 186, 110, '#1d5e40');
  pine(c, 290, 190, 70, '#1d5e40');
}

function cave(c: C, rng: Rng) {
  R(c, 0, 0, W, H, '#1a2624');
  for (let i = 0; i < 18; i++) {
    const x = (i / 18) * W + rng() * 10;
    const w = 14 + rng() * 14;
    R(c, x, 0, w, 80, rng() < 0.5 ? '#2f3f39' : '#384a42');
    for (let k = 0; k < 6; k++) blob(c, x + rng() * w, rng() * 70, 6 + rng() * 10, 6 + rng() * 8, rng() < 0.5 ? '#4a5c4e' : '#5d6c56');
  }
  for (let x = 0; x < W; x += 3) {
    const h = 6 + rng() * 22;
    for (let r = 0; r < h; r++) R(c, x + (r / h) * 1.5, r, Math.max(1, 3 - (r / h) * 3), 1, '#121b19');
  }
  R(c, 0, 70, W, 110, '#203431');
  ellipseFloor(c, 160, 110, 175, 46, '#2b4440');
  ellipseFloor(c, 160, 110, 140, 34, '#31504b');
  for (let i = 0; i < 60; i++) R(c, rng() * W, 80 + rng() * 60, 2, 1, '#3a5c56');
  for (let i = 0; i < 9; i++) blob(c, rng() * W, 64 + rng() * 10, 14 + rng() * 18, 10, '#4a5c4e');
  for (let x = -10; x < W + 10; x += 8) blob(c, x, 155 + rng() * 8, 22 + rng() * 10, 40, '#111a18');
  R(c, 0, 170, W, 10, '#111a18');
}

function beach(c: C, rng: Rng) {
  bands(c, 0, 56, ['#4aa8f0', '#5db6f4', '#74c4f7', '#90d2f8', '#b4e2fa']);
  for (let i = 0; i < 5; i++) {
    const x = rng() * W, y = 8 + rng() * 25;
    blob(c, x, y, 26 + rng() * 20, 7, '#ffffff');
    blob(c, x + 8, y - 3, 14, 6, '#ffffff');
  }
  bands(c, 56, 82, ['#2f7fd0', '#3990dc', '#47a0e6']);
  for (let i = 0; i < 40; i++) R(c, rng() * W, 58 + rng() * 22, 4 + rng() * 6, 1, '#8fd0f6');
  for (let x = 0; x < W; x++) R(c, x, 80 + Math.round(Math.sin(x / 6) * 1.5), 1, 3, '#e8f6ff');
  R(c, 0, 84, W, 100, '#f0d68c');
  for (let y = 88; y < H; y += 6) R(c, 0, y, W, 1, '#e8cc7e');
  for (let i = 0; i < 90; i++) R(c, rng() * W, 86 + rng() * 90, 1, 1, rng() < 0.7 ? '#d9b866' : '#ffffff');
  for (let i = 0; i < 6; i++) blob(c, rng() * W, 150 + rng() * 15, 20 + rng() * 14, 14, '#b39a6a');
  for (let x = -10; x < W + 10; x += 9) blob(c, x, 166 + rng() * 6, 26, 30, '#c9ae6e');
}

function tower(c: C, rng: Rng) {
  bands(c, 0, 80, ['#151028', '#1d1636', '#271e46', '#33285a', '#40336a']);
  for (let i = 0; i < 70; i++) R(c, rng() * W, rng() * 60, 1, 1, rng() < 0.8 ? '#cfc6ff' : '#ffffff');
  ellipseFloor(c, 255, 24, 11, 11, '#f4efd2');
  ellipseFloor(c, 259, 21, 8, 8, '#1d1636');
  // torre ao fundo
  R(c, 140, 18, 40, 62, '#120d22');
  for (let i = 0; i < 4; i++) R(c, 136 - i * 2, 18 + i * 15, 48 + i * 4, 3, '#0d0918');
  for (let i = 0; i < 4; i++) R(c, 156, 26 + i * 14, 4, 6, '#f5d36a');
  for (let x = 0; x < W; x++) R(c, x, 70 + Math.sin(x / 17) * 3, 1, 20, '#2a2146');
  R(c, 0, 78, W, 102, '#4a3d66');
  for (let y = 82; y < H; y += 10) for (let x = (y / 10) % 2 ? 0 : 10; x < W; x += 20) R(c, x, y, 10, 10, '#433760');
  for (let i = 0; i < 14; i++) {
    const x = rng() * W, y = 70 + rng() * 14;
    R(c, x, y, 7, 10, '#857aa3');
    R(c, x + 1, y - 1, 5, 1, '#857aa3');
    R(c, x + 2, y + 3, 3, 1, '#5d527c');
  }
  c.globalAlpha = 0.18;
  for (let i = 0; i < 6; i++) blob(c, rng() * W, 110 + rng() * 40, 90, 10, '#d8d0ff');
  c.globalAlpha = 1;
  for (let x = -10; x < W + 10; x += 8) blob(c, x, 158 + rng() * 6, 24, 40, '#1b1530');
}

function victory(c: C, rng: Rng) {
  R(c, 0, 0, W, H, '#2e2016');
  for (let i = 0; i < 16; i++) {
    const x = (i / 16) * W + rng() * 10;
    R(c, x, 0, 18 + rng() * 14, 82, rng() < 0.5 ? '#4a3626' : '#5a4330');
    for (let k = 0; k < 5; k++) blob(c, x + rng() * 20, rng() * 70, 8 + rng() * 10, 6 + rng() * 6, '#6e5338');
  }
  R(c, 0, 76, W, 104, '#7a5d3e');
  ellipseFloor(c, 160, 112, 170, 42, '#8a6b48');
  for (let i = 0; i < 80; i++) R(c, rng() * W, 82 + rng() * 80, 2, 1, '#6e5236');
  for (let i = 0; i < 8; i++) {
    const x = rng() * W;
    blob(c, x, 66 + rng() * 10, 16 + rng() * 12, 14, '#a08262');
    blob(c, x - 2, 66, 8, 5, '#b89a78');
  }
  for (let x = -10; x < W + 10; x += 8) blob(c, x, 156 + rng() * 8, 24, 40, '#1f150e');
}

function plateau(c: C, rng: Rng) {
  bands(c, 0, 70, ['#5b3f8f', '#7a4f9e', '#a8609e', '#d9709a', '#ff8f7a', '#ffb07a']);
  ellipseFloor(c, 80, 62, 16, 16, '#ffe0a0');
  for (let x = 0; x < W; x++) R(c, x, 52 + Math.sin(x / 20) * 6 + Math.sin(x / 7), 1, 30, '#4a3470');
  // ginásio da Liga
  R(c, 180, 30, 100, 44, '#2b1f45');
  ellipseFloor(c, 230, 30, 26, 16, '#2b1f45');
  R(c, 204, 28, 52, 2, '#e8435a');
  for (let i = 0; i < 5; i++) R(c, 190 + i * 19, 48, 8, 10, '#f5d36a');
  R(c, 0, 72, W, 108, '#c9c3b8');
  for (let y = 72; y < H; y += 12) R(c, 0, y, W, 1, '#aaa396');
  for (let y = 72; y < H; y += 12) for (let x = (y / 12) % 2 ? 0 : 12; x < W; x += 24) R(c, x, y, 1, 12, '#aaa396');
  R(c, 140, 72, 40, 108, '#c23a4f');
  R(c, 142, 72, 2, 108, '#e8b84a');
  R(c, 176, 72, 2, 108, '#e8b84a');
  void rng;
  for (let x = -10; x < W + 10; x += 8) blob(c, x, 162 + rng() * 6, 24, 30, '#7d766b');
}

// ---------- camada animada (desenhada por cima do cenário estático) ----------

interface P { x: number; y: number; vx: number; vy: number; s: number; ph: number; c: string }

export function sceneAnimator(canvas: HTMLCanvasElement, scene: Scene, seed = 3) {
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  const rng = makeRng(seed);
  const rand = (a: number, b: number) => a + rng() * (b - a);
  const many = (n: number, f: () => P) => Array.from({ length: n }, f);
  const px = (x: number, y: number, w: number, h: number, col: string, a = 1) => {
    c.globalAlpha = a;
    c.fillStyle = col;
    c.fillRect(Math.round(x), Math.round(y), w, h);
    c.globalAlpha = 1;
  };
  const cloud = (x: number, y: number, w: number, col: string, a: number) => {
    px(x, y + 3, w, 4, col, a);
    px(x + w * 0.2, y, w * 0.45, 4, col, a);
    px(x + w * 0.55, y + 1, w * 0.3, 3, col, a);
  };
  const wrap = (v: number, max: number, pad = 20) => (((v + pad) % (max + pad * 2)) + max + pad * 2) % (max + pad * 2) - pad;

  const clouds = many(5, () => ({ x: rand(0, W), y: rand(4, 40), vx: rand(2, 5), vy: 0, s: rand(22, 40), ph: 0, c: '#ffffff' }));
  const leaves = many(14, () => ({ x: rand(0, W), y: rand(-H, H), vx: rand(-4, 4), vy: rand(8, 16), s: 1, ph: rand(0, 6), c: rng() < 0.5 ? '#6fb53d' : '#e8a33a' }));
  const birds = many(2, () => ({ x: rand(-40, W), y: rand(10, 35), vx: rand(14, 22), vy: 0, s: 1, ph: rand(0, 6), c: '#2b3a4a' }));
  const drips = many(8, () => ({ x: rand(10, W - 10), y: rand(0, 60), vx: 0, vy: rand(30, 50), s: 1, ph: rand(0, 3), c: '#9fd8d0' }));
  const crystals = many(10, () => ({ x: rand(0, W), y: rand(5, 70), vx: 0, vy: 0, s: 1, ph: rand(0, 6), c: rng() < 0.5 ? '#8fe0ff' : '#e0a0ff' }));
  const stars = many(40, () => ({ x: rand(0, W), y: rand(0, 62), vx: 0, vy: 0, s: 1, ph: rand(0, 6), c: '#ffffff' }));
  const wisps = many(5, () => ({ x: rand(0, W), y: rand(80, 140), vx: rand(-3, 3), vy: 0, s: 1, ph: rand(0, 6), c: rng() < 0.5 ? '#9b7bff' : '#6fd0ff' }));
  const fog = many(4, () => ({ x: rand(0, W), y: rand(100, 150), vx: rand(3, 7), vy: 0, s: rand(70, 120), ph: 0, c: '#d8d0ff' }));
  const dust = many(26, () => ({ x: rand(0, W), y: rand(60, 170), vx: rand(3, 9), vy: rand(-2, 2), s: 1, ph: rand(0, 6), c: '#e8cfa0' }));
  const gulls = many(3, () => ({ x: rand(0, W), y: rand(10, 40), vx: rand(-12, -6), vy: 0, s: 1, ph: rand(0, 6), c: '#ffffff' }));

  return (t: number) => {
    c.clearRect(0, 0, W, H);
    if (scene === 'forest' || scene === 'beach' || scene === 'plateau') {
      for (const p of clouds) cloud(wrap(p.x + p.vx * t, W, 50), p.y, p.s, scene === 'plateau' ? '#ffd8c0' : '#ffffff', 0.55);
    }
    if (scene === 'forest') {
      // raios de luz pulsando
      c.globalAlpha = 0.05 + 0.04 * Math.sin(t * 0.8);
      c.fillStyle = '#ffffff';
      c.beginPath(); c.moveTo(14, 0); c.lineTo(34, 0); c.lineTo(130, 120); c.lineTo(100, 120); c.fill();
      c.globalAlpha = 1;
      for (const p of leaves) {
        const y = wrap(p.y + p.vy * t, H, 10);
        const x = wrap(p.x + p.vx * t + Math.sin(t * 2 + p.ph) * 6, W, 10);
        px(x, y, 2, 1, p.c, 0.9);
      }
      for (const p of birds) {
        const x = wrap(p.x + p.vx * t, W, 40), y = p.y + Math.sin(t * 2 + p.ph) * 2;
        const up = Math.sin(t * 12 + p.ph) > 0;
        px(x, y, 1, 1, p.c); px(x - 2, y + (up ? -1 : 1), 2, 1, p.c); px(x + 1, y + (up ? -1 : 1), 2, 1, p.c);
      }
    }
    if (scene === 'cave' || scene === 'victory') {
      for (const p of (scene === 'cave' ? drips : [])) {
        const cyc = (t * p.vy / 80 + p.ph) % 1.6;
        if (cyc < 1) px(p.x, p.y + cyc * 60, 1, 2, p.c, 0.8);
        else px(p.x - 1, p.y + 61, 3, 1, p.c, 1.6 - cyc);
      }
      if (scene === 'cave') for (const p of crystals) { const a = 0.3 + 0.7 * Math.max(0, Math.sin(t * 2 + p.ph)); px(p.x, p.y, 1, 1, p.c, a); if (a > 0.85) { px(p.x - 1, p.y, 3, 1, p.c, 0.4); px(p.x, p.y - 1, 1, 3, p.c, 0.4); } }
      if (scene === 'victory') for (const p of dust) px(wrap(p.x + p.vx * t, W, 5), p.y + Math.sin(t + p.ph) * 3, 1, 1, p.c, 0.6);
    }
    if (scene === 'beach') {
      // brilho e espuma das ondas
      for (let i = 0; i < 26; i++) {
        const x = wrap(i * 13 + t * 6, W, 6), y = 60 + (i % 5) * 4;
        px(x, y, 4 + (i % 3), 1, '#d6f0ff', 0.35 + 0.3 * Math.sin(t * 3 + i));
      }
      for (let x = 0; x < W; x += 2) px(x, 80 + Math.round(Math.sin(x / 6 + t * 2) * 1.5), 2, 1, '#ffffff', 0.9);
      for (const p of gulls) {
        const x = wrap(p.x + p.vx * t, W, 30), y = p.y + Math.sin(t * 1.5 + p.ph) * 3;
        const up = Math.sin(t * 9 + p.ph) > 0;
        px(x, y, 1, 1, p.c); px(x - 2, y + (up ? -1 : 0), 2, 1, p.c); px(x + 1, y + (up ? -1 : 0), 2, 1, p.c);
      }
    }
    if (scene === 'tower') {
      for (const p of stars) px(p.x, p.y, 1, 1, p.c, 0.2 + 0.8 * Math.max(0, Math.sin(t * 1.7 + p.ph)));
      for (const p of fog) { const x = wrap(p.x + p.vx * t, W, 120); px(x, p.y, p.s, 6, p.c, 0.1); px(x + 10, p.y - 3, p.s * 0.6, 3, p.c, 0.08); }
      for (const p of wisps) {
        const x = wrap(p.x + p.vx * t + Math.sin(t + p.ph) * 8, W, 10), y = p.y + Math.sin(t * 2 + p.ph) * 4;
        px(x, y, 2, 2, p.c, 0.7); px(x, y - 1, 1, 1, '#ffffff', 0.8);
      }
    }
    if (scene === 'plateau') {
      // bandeiras no topo do ginásio
      for (const fx of [196, 262]) {
        px(fx, 14, 1, 14, '#2b1f45');
        for (let i = 0; i < 6; i++) px(fx + 1 + i, 14 + Math.round(Math.sin(t * 6 + i * 0.9)), 1, 4, i % 2 ? '#e8435a' : '#ffd23f');
      }
    }
  };
}
