import { OPP_NAMES, TRAINERS, TRAINER } from './content';
import { DEX, SHOP_BY_RARITY, levelEvolution } from './dex';
import { teamMaxHp } from './stats';
import type { Opponent, Unit } from './model';
import { pick, weighted, type Rng } from './rng';
import { loadGhosts } from './storage';
import { TRINKETS } from './trinkets';

const ODDS = [
  [100, 0, 0, 0, 0, 0], [100, 0, 0, 0, 0, 0], [75, 25, 0, 0, 0, 0], [60, 32, 8, 0, 0, 0], [48, 35, 15, 2, 0, 0],
  [38, 35, 20, 6, 1, 0], [30, 32, 25, 10, 3, 0], [22, 30, 28, 14, 5, 1], [16, 26, 30, 18, 8, 2], [12, 22, 30, 22, 11, 3],
  [8, 18, 30, 26, 14, 4],
];

function levelFor(day: number, rng: Rng) {
  const p2 = Math.min(0.8, 0.11 * (day - 2));
  const p3 = Math.min(0.35, 0.05 * (day - 6));
  const p4 = Math.min(0.08, 0.02 * (day - 11));
  const r = rng();
  if (r < p4) return 4;
  if (r < p3) return 3;
  if (r < p2) return 2;
  return 1;
}

function evolveFor(species: number, level: number, rng: Rng): number {
  let id = species;
  for (let g = 0; g < 3; g++) {
    const next = levelEvolution(id, level);
    if (next != null) { id = next; continue; }
    // pedras/contadores: o rival às vezes já evoluiu
    if (DEX[id].evolvesTo.length && level >= 2 && rng() < 0.55) { id = pick(rng, DEX[id].evolvesTo).id; continue; }
    break;
  }
  return id;
}

/**
 * HP alvo dos rivais gerados. A curva da OS (1,5k → 200k) cresce ×133 do dia 1 ao 10, mas o jogador cresce ~×13
 * com as regras de orçamento (seção 2) e nível (seção 4); por isso os dias 1–10 foram calibrados pelo bot
 * (mediana do HP do jogador × 0,92) e o Modo Infinito mantém o ×1,6 por dia.
 */
export const HP_CURVE = [0, 1930, 3680, 6070, 8100, 10210, 12790, 14810, 17300, 20880, 25210];
export function targetHp(day: number) {
  if (day <= 10) return HP_CURVE[Math.max(1, day)];
  return HP_CURVE[10] * 1.6 ** (day - 10);
}

export function genOpponent(day: number, rng: Rng, mmr = 1000): Opponent {
  const ghosts = loadGhosts()[day] ?? [];
  if (ghosts.length && rng() < 0.4) {
    // emparelhamento por MMR: prefere fantasmas de MMR próximo
    const g = weighted(rng, ghosts, ghosts.map((x) => 1 / (1 + Math.abs((x.mmr ?? 1000) - mmr) / 100)));
    return { ...structuredClone(g), trinkets: g.trinkets ?? [], ghost: true };
  }
  const pool = TRAINERS.filter((t) => !t.unlock || day >= 4 + t.unlock);
  const trainer = pick(rng, pool);
  const size = Math.min(6, Math.ceil(day * 0.8) + 1);
  const team: (Unit | null)[] = Array(6).fill(null);
  const order = [2, 5, 1, 4, 0, 3];
  for (let i = 0; i < size; i++) {
    const r = weighted(rng, [1, 2, 3, 4, 5, 6], ODDS[Math.max(1, Math.min(10, day - 1))]);
    const list = SHOP_BY_RARITY[r].length ? SHOP_BY_RARITY[r] : SHOP_BY_RARITY[1];
    // fusões de raros são difíceis: limita o nível pela raridade
    const level = Math.min(levelFor(day, rng), r >= 6 ? 1 : r === 5 ? (rng() < 0.3 ? 2 : 1) : r === 4 ? 3 : 4);
    const species = evolveFor(pick(rng, list), level, rng);
    const bump = Math.max(0, day - 3);
    team[order[i]] = {
      uid: -(i + 1), species, level, shiny: rng() < 0.04, extraTypes: [],
      perm: { dmg: Math.round(rng() * bump * 2) }, prog: {},
    };
  }
  const trinkets: string[] = [];
  const nT = Math.floor((day - 1) / 1.5);
  const tpool = TRINKETS.filter((t) => t.rarity <= Math.min(5, 1 + Math.floor(day / 3)) && !t.income && !['smoke-ball', 'focus-band', 'lucky-egg', 'bicycle', 'card-key', 'silph-scope', 'research', 'master-ball', 'coin-case', 'amulet-coin'].includes(t.id));
  for (let i = 0; i < nT; i++) trinkets.push(pick(rng, tpool).id);
  const name = trainer.unlock ? trainer.title : `${trainer.title} ${pick(rng, OPP_NAMES)}`;
  const raw = teamMaxHp(team, trainer, 0, trinkets);
  const hpScale = Math.max(0.2, targetHp(day) / raw);
  return { name, trainer: trainer.id, team, hpBonus: 0, trinkets, ghost: false, scale: hpScale };
}

export const trainerFor = (o: Opponent) => TRAINER[o.trainer];
