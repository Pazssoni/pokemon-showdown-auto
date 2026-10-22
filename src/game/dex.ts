import raw from '../data/pokemon.json';
import type { PType } from './types';

export interface Evolution {
  id: number;
  method: 'level' | 'stone' | 'trade';
  item: string | null;
}

export interface Species {
  id: number;
  name: string;
  types: PType[];
  stats: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  bst: number;
  legendary: boolean;
  line: number;
  stage: number;
  lineLength: number;
  evolvesTo: Evolution[];
  /** tem sprite animado (Gen ≤ 5); senão usa o sprite estático estilo DS */
  anim: boolean;
  /** raridade da linha (1–6), herdada por todos os estágios */
  rarity: number;
  /** orçamento de stats (seção 2 da OS v2) */
  budget: number;
}

/** DEX[id] → espécie (índice 0 vazio) */
export const DEX: Species[] = [];
for (const s of raw as Omit<Species, 'rarity' | 'budget'>[]) DEX[s.id] = { ...s, rarity: 1, budget: 0 };

export const ALL_IDS = DEX.filter(Boolean).map((s) => s.id);

export function lineMembers(id: number): number[] {
  const line = DEX[id].line;
  return ALL_IDS.filter((x) => DEX[x].line === line).sort((a, b) => DEX[a].stage - DEX[b].stage || a - b);
}

export const baseOf = (id: number) => lineMembers(id)[0];

/** bebês (Gen 2 e Gen 4) */
export const BABIES = new Set([172, 173, 174, 236, 238, 239, 240, 439, 440, 446]);

const RARITY_OVERRIDE: Record<number, number> = { 129: 1, 147: 4, 90: 3, 120: 3, 132: 2, 151: 6, 446: 4 };

// raridade pelo potencial da linha (BST do último estágio); linhas de 3 estágios ficam 1 nível abaixo
for (const id of ALL_IDS) {
  const s = DEX[id];
  if (s.stage !== 0) continue;
  const members = lineMembers(id);
  const fin = Math.max(...members.map((m) => DEX[m].bst));
  let r = s.legendary || fin >= 580 ? 5 : fin > 515 ? 4 : fin > 480 ? 3 : fin > 420 ? 2 : 1;
  if (s.lineLength === 3 && r > 1 && r < 5) r--;
  r = RARITY_OVERRIDE[id] ?? r;
  for (const m of members) DEX[m].rarity = r;
}

// ---------- orçamento de stats (seção 2) ----------
export const BUDGET_BASE = [0, 100, 130, 170, 220, 300, 360];
/** bebê 0.8 · 1º estágio 1.0 · 2º 1.35 · 3º 1.7 · evolução de Gen 4+ 2.0 */
export function stageFactor(id: number): number {
  if (BABIES.has(id)) return 0.8;
  const s = DEX[id];
  if (id > 251 && s.stage > 0) return 2.0;
  const hasBaby = lineMembers(id).some((m) => BABIES.has(m));
  const stage = hasBaby ? s.stage - 1 : s.stage;
  return [1.0, 1.35, 1.7][Math.max(0, Math.min(2, stage))];
}
export const MEAN_BST: number[] = [0, 0, 0, 0, 0, 0, 0];
for (let r = 1; r <= 6; r++) {
  const list = ALL_IDS.filter((i) => DEX[i].rarity === r);
  MEAN_BST[r] = list.reduce((a, i) => a + DEX[i].bst, 0) / Math.max(1, list.length);
}
for (const id of ALL_IDS) {
  const s = DEX[id];
  s.budget = Math.round(BUDGET_BASE[s.rarity] * stageFactor(id) * (s.bst / MEAN_BST[s.rarity]));
}

/** só o primeiro estágio aparece na loja; fósseis ficam para eventos */
const SHOP_EXCLUDE = new Set([138, 140, 142]);
export const SHOP_BY_RARITY: number[][] = [[], [], [], [], [], [], []];
for (const id of ALL_IDS) if (DEX[id].stage === 0 && !SHOP_EXCLUDE.has(id)) SHOP_BY_RARITY[DEX[id].rarity].push(id);

export const RARITY_PRICE = [0, 10, 18, 28, 40, 60, 80];

const BASE = import.meta.env.BASE_URL;
export const spriteUrl = (id: number, shiny = false) =>
  `${BASE}sprites/pokemon/${shiny ? 'shiny/' : ''}${id}.${DEX[id]?.anim === false ? 'png' : 'gif'}`;
export const itemIcon = (name: string) => `${BASE}sprites/items/${name}.png`;
export const trainerSprite = (name: string) => `${BASE}sprites/trainers/${name}.png`;

export const sameLine = (a: number, b: number) => DEX[a].line === DEX[b].line;

// ---------- fusão ----------

/** quantas cópias do nível `level` são necessárias para subir */
export function copiesNeeded(species: number, level: number): number {
  if (level >= 4) return Infinity;
  if (level === 1 && DEX[species].line === DEX[129].line) return 5;
  return level === 1 ? 3 : 2;
}

/** cópias equivalentes (para venda), Lv1..Lv5 */
export const COPIES_AT = [0, 1, 3, 6, 12, 24];
export function copiesFor(species: number, level: number) {
  // Magikarp: o Lv2 é formado por 5 cópias (e não 3)
  if (DEX[species].line === DEX[129].line && level >= 2) return COPIES_AT[level] * 5 / 3;
  return COPIES_AT[level];
}

// ---------- evolução ----------

export type EvoRule =
  | { kind: 'none' }
  | { kind: 'level'; level: number }
  | { kind: 'stone'; level: number }
  | { kind: 'counter'; key: string; need: number; text: string; levelFallback?: number };

const LEVEL2 = new Set([19, 50, 109, 129]);
const STONE_ONLY = new Set([37, 58, 90, 120, 102, 133]);
/** evoluções antecipadas por contador (estilo Batomon), alternativas ao nível */
export const COUNTER: Record<number, Extract<EvoRule, { kind: 'counter' }>> = {
  52: { kind: 'counter', key: 'gold', need: 12, text: 'Evolui depois de ganhar ₽12 com Pay Day (vira Perrserker se estiver ao lado de um Pokémon de Aço)' },
  56: { kind: 'counter', key: 'losses', need: 1, text: 'Evolui de raiva depois que o time perde uma batalha' },
  57: { kind: 'counter', key: 'attacks', need: 60, text: 'Evolui em Annihilape depois de 60 ataques em batalha (ou no Lv. 3)', levelFallback: 3 },
  54: { kind: 'counter', key: 'battles', need: 4, text: 'Evolui depois de 4 batalhas no time' },
  104: { kind: 'counter', key: 'allyKo', need: 3, text: 'Evolui depois de ver 3 aliados nocauteados' },
  79: { kind: 'counter', key: 'shellder', need: 1, text: "Evolui ao começar uma batalha ao lado de um Shellder (ou no Lv. 3); com King's Rock vira Slowking", levelFallback: 3 },
  83: { kind: 'counter', key: 'crits', need: 20, text: "Evolui em Sirfetch'd depois de causar 20 críticos (ou no Lv. 3)", levelFallback: 3 },
  240: { kind: 'counter', key: 'teamBurn', need: 25, text: 'Evolui quando o time aplica Queimadura 25 vezes (ou no Lv. 2)', levelFallback: 2 },
  239: { kind: 'counter', key: 'teamShock', need: 25, text: 'Evolui quando o time aplica Choque 25 vezes (ou no Lv. 2)', levelFallback: 2 },
  238: { kind: 'counter', key: 'teamCold', need: 25, text: 'Evolui quando o time aplica Frio 25 vezes (ou no Lv. 3)', levelFallback: 3 },
  88: { kind: 'counter', key: 'teamPoison', need: 40, text: 'Evolui quando o time aplica Veneno 40 vezes (ou no Lv. 3)', levelFallback: 3 },
  74: { kind: 'counter', key: 'teamShield', need: 20, text: 'Evolui quando o time recebe Escudo 20 vezes (ou no Lv. 2)', levelFallback: 2 },
  95: { kind: 'counter', key: 'teamShield', need: 20, text: 'Evolui em Steelix quando o time recebe Escudo 20 vezes (ou no Lv. 3)', levelFallback: 3 },
};

export function evoRule(id: number): EvoRule {
  const s = DEX[id];
  if (!s.evolvesTo.length) return { kind: 'none' };
  if (COUNTER[id]) return COUNTER[id];
  if (s.lineLength === 3) return { kind: 'level', level: s.stage === 0 ? 2 : 3 };
  if (STONE_ONLY.has(id)) return { kind: 'stone', level: 3 };
  return { kind: 'level', level: LEVEL2.has(id) ? 2 : 3 };
}

export interface EvoCtx { uid?: number; kingsRock?: boolean; slot?: number | null; commonType?: PType | null; steelAdjacent?: boolean }

/** Eevee no Lv. 3 sem pedra: vira a evolução do tipo mais comum do time */
export const EEVEE_BY_TYPE: Partial<Record<PType, number>> = { water: 134, electric: 135, fire: 136, psychic: 196, dark: 197, grass: 470, ice: 471, fairy: 700 };

/** escolhe o ramo nas evoluções com mais de um destino */
export function branchPick(id: number, o: EvoCtx = {}): number {
  const evs = DEX[id].evolvesTo;
  if (id === 236) {
    // Tyrogue: frente = Hitmonlee, meio = Hitmontop, trás = Hitmonchan
    const col = o.slot != null ? o.slot % 3 : Math.abs(o.uid ?? 0) % 3;
    return col === 2 ? 106 : col === 1 ? 237 : 107;
  }
  if (id === 61) return o.kingsRock ? 186 : 62;
  if (id === 79) return o.kingsRock ? 199 : 80;
  if (id === 44) return 45;
  if (id === 52) return o.steelAdjacent ? 863 : 53;
  if (id === 123) return 212;
  if (id === 95) return 208;
  if (id === 57) return 979;
  if (id === 83) return 865;
  if (id === 133) {
    const t = o.commonType && EEVEE_BY_TYPE[o.commonType];
    return t || [134, 135, 136][Math.abs(o.uid ?? 0) % 3];
  }
  return evs[0].id;
}

/** próxima espécie se a regra de nível for satisfeita */
export function levelEvolution(id: number, level: number, o: EvoCtx = {}): number | null {
  const r = evoRule(id);
  if ((r.kind === 'level' || r.kind === 'stone') && level >= r.level) return branchPick(id, o);
  if (r.kind === 'counter' && r.levelFallback && level >= r.levelFallback) return branchPick(id, o);
  return null;
}

/** itens segurados que antecipam a evolução no início da próxima batalha */
export const TRINKET_EVO: Record<string, [number, number][]> = {
  electirizer: [[125, 466]],
  magmarizer: [[126, 467]],
  protector: [[112, 464]],
  'dubious-disc': [[233, 474]],
  'metal-coat': [[95, 208], [123, 212]],
  'kings-rock': [[79, 199], [61, 186]],
};

const EVO_TEXT: Record<number, string> = {
  236: 'Evolui no Lv. 3: na coluna da frente vira Hitmonlee, no meio Hitmontop, atrás Hitmonchan.',
  61: "Evolui no Lv. 3 em Poliwrath, ou em Politoed se você tiver o item segurado King's Rock. Pedra d'Água evolui antes.",
  133: 'Pedras (Água, Trovão, Fogo, Folha, Gelo); 3 vitórias = Espeon; 2 derrotas = Umbreon; 15 de Bênção no time = Sylveon; no Lv. 3 vira a evolução do tipo mais comum do time (empate: sorteio).',
  44: 'Evolui no Lv. 3 em Vileplume. Pedra da Folha evolui antes; Pedra do Sol vira Bellossom.',
  123: 'Evolui no Lv. 3 em Scizor (Revestimento Metálico antecipa). Augurita Negra vira Kleavor.',
  112: 'Evolui no Lv. 3 em Rhyperior (o item segurado Protetor antecipa).',
  125: 'Evolui no Lv. 3 em Electivire (o item segurado Eletrizador antecipa).',
  126: 'Evolui no Lv. 3 em Magmortar (o item segurado Magmarizador antecipa).',
  233: 'Evolui no Lv. 3 em Porygon-Z (o item segurado Disco Duvidoso antecipa).',
  122: 'Evolui no Lv. 3 em Mr. Rime.',
};

export const STONE_NAME: Record<string, string> = {
  'fire-stone': 'Pedra de Fogo', 'water-stone': "Pedra d'Água", 'thunder-stone': 'Pedra do Trovão',
  'leaf-stone': 'Pedra da Folha', 'moon-stone': 'Pedra da Lua', 'sun-stone': 'Pedra do Sol',
  'ice-stone': 'Pedra do Gelo', 'black-augurite': 'Augurita Negra',
};

/** evoluções por item da loja: [espécie, item, destino] */
export const STONE_EVO: [number, string, number][] = [
  [133, 'water-stone', 134], [133, 'thunder-stone', 135], [133, 'fire-stone', 136], [133, 'leaf-stone', 470], [133, 'ice-stone', 471],
  [37, 'fire-stone', 38], [58, 'fire-stone', 59], [90, 'water-stone', 91], [120, 'water-stone', 121], [102, 'leaf-stone', 103],
  [25, 'thunder-stone', 26], [35, 'moon-stone', 36], [39, 'moon-stone', 40], [30, 'moon-stone', 31], [33, 'moon-stone', 34],
  [44, 'leaf-stone', 45], [44, 'sun-stone', 182], [61, 'water-stone', 62], [123, 'black-augurite', 900],
];

export function evoRuleText(id: number): string | null {
  if (EVO_TEXT[id]) return EVO_TEXT[id];
  const r = evoRule(id);
  const s = DEX[id];
  const next = [...new Set(s.evolvesTo.map((e) => DEX[e.id].name))].join(' / ');
  if (r.kind === 'none') return null;
  const stones = [...new Set(STONE_EVO.filter(([sp]) => sp === id).map(([, it]) => STONE_NAME[it]))];
  if (r.kind === 'level') return `Evolui para ${next} no Lv. ${r.level}${stones.length ? ` (${stones.join(', ')} evolui antes)` : ''}`;
  if (r.kind === 'stone') return `Evolui para ${next} com ${stones.join(', ')} (ou sozinho no Lv. ${r.level})`;
  return `${r.text} → ${next}`;
}

export function unitTypes(u: { species: number; extraTypes: PType[] }): PType[] {
  const base = DEX[u.species].types;
  return [...base, ...u.extraTypes.filter((t) => !base.includes(t))].slice(0, 3);
}
