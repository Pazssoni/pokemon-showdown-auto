import type { Opponent, RunState } from './model';

const K_RUN = 'kanto.run';
const K_GHOSTS = 'kanto.ghosts2';
const K_META = 'kanto.meta';

export interface Meta {
  runsWon: number;
  runsPlayed: number;
  seen: number[];
  used: number[];
  speed: number;
  muted: boolean;
  musicMuted: boolean;
  /** Ranked: MMR por vitórias contra fantasmas */
  mmr: number;
  bestMmr: number;
  /** maior golpe de todas as runs */
  bestHit: number;
}

/** divisões do Ranked (seção 9) */
export const DIVISIONS = [
  { name: 'Poké Ball', icon: 'poke-ball', min: 0 },
  { name: 'Grande', icon: 'great-ball', min: 1100 },
  { name: 'Ultra', icon: 'ultra-ball', min: 1300 },
  { name: 'Master', icon: 'master-ball', min: 1500 },
];
export const divisionOf = (mmr: number) => [...DIVISIONS].reverse().find((d) => mmr >= d.min)!;

function read<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}

export const loadRun = (): RunState | null => {
  const r = read<RunState | null>(K_RUN, null);
  if (r && r.version === 2) { r.shopBuff ??= []; r.nextBuy ??= null; return r; }
  return null;
};
export const saveRun = (r: RunState | null) => {
  if (!r || r.phase === 'over') {
    try { localStorage.removeItem(K_RUN); } catch {}
  } else write(K_RUN, r);
};

export const loadGhosts = (): Record<number, Opponent[]> => read(K_GHOSTS, {});
export function saveGhost(day: number, g: Opponent) {
  const all = loadGhosts();
  const list = (all[day] ??= []);
  list.push(g);
  if (list.length > 6) list.shift();
  write(K_GHOSTS, all);
}

let meta: Meta | null = null;
export function getMeta(): Meta {
  meta ??= { runsWon: 0, runsPlayed: 0, seen: [], used: [], speed: 1, muted: false, musicMuted: false, mmr: 1000, bestMmr: 1000, bestHit: 0, ...read<Partial<Meta>>(K_META, {}) };
  return meta;
}
export const saveMeta = () => write(K_META, getMeta());

export function markSeen(ids: number[], used = false) {
  const m = getMeta();
  const set = new Set(used ? m.used : m.seen);
  let changed = false;
  for (const id of ids) if (!set.has(id)) { set.add(id); changed = true; }
  if (!changed) return;
  if (used) m.used = [...set];
  else m.seen = [...set];
  if (used) markSeen(ids);
  saveMeta();
}
