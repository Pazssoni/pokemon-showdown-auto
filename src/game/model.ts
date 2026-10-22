import type { PType } from './types';

export type StatKey = 'dmg' | 'spectral' | 'heal' | 'cleanse' | 'shield' | 'armor' | 'burn' | 'poison' | 'shock' | 'cold'
  | 'growth' | 'crit' | 'charge' | 'swarm' | 'echo' | 'punish' | 'blessing' | 'casts' | 'cdSpeed' | 'hp';
export type Perm = Partial<Record<StatKey, number>>;

/** multiplicador por nível (OS v2, seção 4): Lv1 ×1 · Lv2 ×2 · Lv3 ×4 · Lv4 ×8 · Lv5 ×16 */
export const LEVEL_MULT = [0, 1, 2, 4, 8, 16];

export interface Unit {
  uid: number;
  species: number;
  level: number;
  shiny: boolean;
  extraTypes: PType[];
  /** bônus permanentes fixos (habilidades, itens, itens segurados) */
  perm: Perm;
  /** contadores de evolução especial (batalhas, derrotas, ouro...) */
  prog: Record<string, number>;
  /** cópia gerada (Twins): vende por 0 */
  noSell?: boolean;
}

export type ShopSlot =
  | { kind: 'mon'; species: number; shiny: boolean; price: number }
  | { kind: 'item'; item: string; price: number }
  | null;

export interface Opponent {
  name: string;
  trainer: string;
  team: (Unit | null)[];
  hpBonus: number;
  trinkets: string[];
  ghost: boolean;
  /** MMR de quem gerou o fantasma (emparelhamento do Ranked) */
  mmr?: number;
  /** escala de poder dos rivais gerados (curva de HP da seção 5) */
  scale?: number;
}

export interface Gift {
  choices: string[];
  takeAll: boolean;
  reason: string;
}

export interface RunState {
  version: 2;
  seed: number;
  day: number;
  hearts: number;
  wins: number;
  losses: number;
  gold: number;
  trainer: string;
  bench: (Unit | null)[];
  team: (Unit | null)[];
  shop: ShopSlot[];
  locked: boolean;
  trinkets: string[];
  hpBonus: number;
  freeRerolls: number;
  nextUid: number;
  rankBonus: number;
  /** rank só para hoje (Repelente) */
  rankToday: number;
  itemsUsed: number;
  itemLimit: number;
  shopDiscount: number;
  winChip: number;
  flags: Record<string, number>;
  opponent: Opponent | null;
  /** fila de telas pendentes antes da loja */
  queue: Pending[];
  phase: 'pending' | 'shop' | 'over';
  lastResult: null | { won: boolean; heartsLost: number };
  eggs: { species: number; days: number; level: number }[];
  /** buffs para Pokémon comprados pelo resto da run (ex.: Nidorina) */
  shopBuff: { type?: PType; perm: Perm }[];
  /** bônus para o próximo Pokémon comprado (ex.: Exeggcute) */
  nextBuy: { type?: PType; perm: Perm } | null;
  /** espécies (primeiro estágio) disponíveis nesta run, por raridade */
  pool: number[][];
  log: string[];
}

export type Pending =
  | { kind: 'event'; id: string }
  | { kind: 'gift'; gift: Gift }
  | { kind: 'typepick'; types: PType[] };

export const BENCH_SIZE = 4;
export const TEAM_SIZE = 6;
export const MAX_HEARTS = 10;
export const WINS_TO_WIN = 10;
export const MAX_MERGE_LEVEL = 3;
export const ABS_MAX_LEVEL = 4;
/** só o Poliwrath passa do Lv. 4 */
export const POLIWRATH_MAX = 5;

export const RARITY_NAME = ['', 'Comum', 'Incomum', 'Raro', 'Super Raro', 'Lendário', 'Mítico'];
export const RARITY_COLOR = ['', '#8e9aa6', '#5cb85c', '#3d8fd6', '#9b5bd6', '#f08a24', '#e8435a'];
