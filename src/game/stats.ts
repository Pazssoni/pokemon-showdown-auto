// Stats por orçamento (OS v2, seção 2): o tipo define QUAIS stats existem; o orçamento define QUANTO.
import { abilityOf } from './abilities';
import type { TrainerDef } from './content';
import { DEX, unitTypes } from './dex';
import { LEVEL_MULT, type Unit } from './model';
import { trinketHp, trinketStats } from './trinkets';
import { TYPES, type PType } from './types';

export { unitTypes };

/**
 * Taxas de câmbio: quanto de cada stat 1 ponto de orçamento compra
 * (stats "por golpe" são para uma recarga de 3s). Calibradas com o bot (seção 11):
 * um Pokémon puro de cada tipo entra num time de Normais e a taxa é ajustada até a vitória dar 50%.
 */
export const RATE = {
  dmg: 0.35,
  hp: 6.4,
  hpNormal: 12,
  burn: 0.026,
  poison: 0.012,
  shock: 0.0265,
  heal: 0.546,
  cleanse: 0.06,
  growth: 0.058,
  cold: 0.022,
  crit: 0.52,
  shield: 0.428,
  armor: 0.14,
  charge: 0.057,
  swarm: 0.167,
  echo: 0.27,
  spectral: 0.33,
  punish: 0.3,
  blessing: 0.162,
};
export type RateKey = keyof typeof RATE;

/** ajuste fino por tipo (seção 11): multiplica o orçamento gasto no tipo; afinado com 2.000 runs por arquétipo */
export const TYPE_TUNE: Record<PType, number> = {
  normal: 1.9, fire: 3, water: 0.6, electric: 0.64, grass: 3, ice: 0.4,
  fighting: 1.95, poison: 3, ground: 3, flying: 0.2, psychic: 0.6, bug: 0.3,
  rock: 2.8, ghost: 2.5, dragon: 1.9, steel: 2, dark: 1.9, fairy: 0.4,
};

/** divisão do orçamento entre os tipos nativos */
export const TYPE_SHARE = [[1], [0.65, 0.35], [0.5, 0.3, 0.2]];
/** um tipo ganho (TM, treinador, evento) vale 35% do orçamento, sem tirar nada */
export const EXTRA_TYPE_SHARE = 0.35;

export interface UnitStats {
  types: PType[];
  hp: number;
  cd: number;
  cdSpeed: number;
  dmg: number;
  spectral: number;
  heal: number;
  cleanse: number;
  shield: number;
  armor: number;
  burn: number;
  poison: number;
  shock: number;
  cold: number;
  growth: number;
  crit: number;
  critMult: number;
  charge: number;
  swarm: number;
  echo: number;
  punish: number;
  blessing: number;
  casts: number;
  /** multiplicador contra Escudo (0 = não perfura) */
  pierce: number;
  dragon: boolean;
  /** percentuais aditivos de Dano (Dragão: multiplicam entre si) */
  dmgPcts: number[];
  /** multiplicadores de Dano (fatores separados) */
  dmgMult: number;
  /** percentual aditivo e multiplicador dos outros stats */
  allPct: number;
  allMult: number;
  healMult: number;
  /** multiplicadores específicos (Placas, Etiqueta Maldita, Magmarizador, Light Ball) */
  spectralMult: number;
  burnMult: number;
  shockMult: number;
  statMult: Partial<Record<string, number>>;
  /** compatibilidade */
  critChance: number;
  shieldBreak: boolean;
  /** decomposição da fórmula (para a ficha) */
  parts: { budget: number; level: number; base: Partial<Record<string, number>>; perm: Partial<Record<string, number>>; pct: number; mult: number };
}

export interface StatCtx {
  trainer: TrainerDef;
  counts: Record<PType, number>;
  trinkets: string[];
  team: (Unit | null)[];
  /** posição no time (null = banco/loja) */
  slot: number | null;
  /** bônus de Veneno acumulado do Super Nerd */
  nerd: number;
  gold: number;
  wins: number;
  losses: number;
}

export function typeCounts(team: (Unit | null)[]): Record<PType, number> {
  const c = Object.fromEntries(TYPES.map((t) => [t, 0])) as Record<PType, number>;
  for (const u of team) if (u) for (const t of unitTypes(u)) c[t]++;
  return c;
}

export function makeCtx(team: (Unit | null)[], trainer: TrainerDef, trinkets: string[], slot: number | null = null, nerd = 0, gold = 0, wins = 0, losses = 0): StatCtx {
  return { trainer, counts: typeCounts(team), trinkets, team, slot, nerd, gold, wins, losses };
}

/** recarga base pela Velocidade (Dragão mais lento) */
export function baseCooldown(species: number, types: PType[]) {
  const s = DEX[species];
  let cd = Math.min(4.6, Math.max(1.4, 4.6 - s.stats.spe * 0.024));
  if (types.includes('dragon')) cd *= 1.6;
  return cd;
}

export const OUTPUT = ['dmg', 'spectral', 'heal', 'shield', 'burn', 'poison', 'shock', 'cold', 'swarm'] as const;

/** aplica o orçamento `p` de um tipo nos stats daquele tipo */
function spend(st: UnitStats, t: PType, p: number, cdf: number, boost: number) {
  p *= boost * TYPE_TUNE[t];
  switch (t) {
    case 'normal': st.dmg += p * 0.7 * RATE.dmg * cdf; st.hp += p * 0.3 * RATE.hpNormal; break;
    case 'fire': st.burn += p * RATE.burn * cdf; break;
    case 'poison': st.poison += p * RATE.poison * cdf; break;
    case 'electric': st.shock += p * RATE.shock * cdf; break;
    case 'water': st.heal += p * 0.8 * RATE.heal * cdf; st.cleanse += p * RATE.cleanse; break;
    case 'grass': st.growth += p * RATE.growth; break;
    case 'ice': st.cold += p * RATE.cold * cdf; break;
    case 'fighting': st.dmg += p * 0.6 * RATE.dmg * cdf; st.crit += p * 0.4 * RATE.crit; break;
    case 'ground': st.dmg += p * RATE.dmg * cdf; st.pierce = Math.max(st.pierce, 2); break;
    case 'rock': st.shield += p * RATE.shield * cdf; break;
    case 'steel': st.armor += p * 0.7 * RATE.armor; st.shield += p * 0.3 * RATE.shield * cdf; break;
    case 'flying': st.charge += p * RATE.charge; break;
    case 'bug': st.swarm += p * RATE.swarm * cdf; break;
    case 'psychic': st.echo += p * RATE.echo; break;
    case 'ghost': st.spectral += p * RATE.spectral * cdf; break;
    case 'dragon': st.dmg += p * RATE.dmg * cdf; break;
    case 'dark': st.dmg += p * 0.5 * RATE.dmg * cdf; st.punish += p * 0.5 * RATE.punish; break;
    case 'fairy': st.blessing += p * RATE.blessing; break;
  }
}

export function computeStats(u: Unit, ctx: StatCtx): UnitStats {
  const s = DEX[u.species];
  const types = unitTypes(u);
  const native = s.types.slice(0, 3);
  const extra = types.filter((t) => !native.includes(t));
  const { trainer } = ctx;
  const budget = s.budget * (u.shiny ? 1.2 : 1);
  const cd = baseCooldown(u.species, types);
  const cdf = cd / 3;
  const lvl = LEVEL_MULT[Math.min(5, u.level)];

  const st: UnitStats = {
    types, hp: budget * RATE.hp, cd, cdSpeed: 0,
    dmg: 0, spectral: 0, heal: 0, cleanse: 0, shield: 0, armor: 0, burn: 0, poison: 0, shock: 0, cold: 0,
    growth: 0, crit: 0, critMult: 2, charge: 0, swarm: 0, echo: 0, punish: 0, blessing: 0,
    casts: types.includes('bug') ? 2 : 1, pierce: 0, dragon: types.includes('dragon'),
    dmgPcts: [], dmgMult: 1, allPct: 0, allMult: 1, healMult: 1, spectralMult: 1, burnMult: 1, shockMult: 1, statMult: {}, critChance: 0, shieldBreak: false,
    parts: { budget, level: lvl, base: {}, perm: {}, pct: 0, mult: 1 },
  };

  const shares = TYPE_SHARE[native.length - 1];
  native.forEach((t, i) => spend(st, t, budget * shares[i], cdf, trainer.typeBoost?.[t] ?? 1));
  for (const t of extra) spend(st, t, budget * EXTRA_TYPE_SHARE, cdf, trainer.typeBoost?.[t] ?? 1);
  // quem não tem nenhum stat de efeito (só Crescimento, Eco, Carga, Bênção) recebe Dano com 40% do orçamento do 1º tipo
  if (!OUTPUT.some((k) => st[k] > 0)) st.dmg += budget * shares[0] * 0.4 * RATE.dmg * cdf;
  if (trainer.id === 'giovanni' && st.pierce) st.pierce = 3;
  for (const k of OUTPUT) if (st[k]) st.parts.base[k] = Math.round(st[k] * 10) / 10;

  // bônus permanentes (entram ANTES do multiplicador de nível)
  const p = u.perm ?? {};
  for (const [k, v] of Object.entries(p)) {
    if (!v) continue;
    if (k === 'casts') st.casts += v;
    else if (k === 'cdSpeed') st.cdSpeed += v;
    else if (k in st) (st as unknown as Record<string, number>)[k] += v;
    st.parts.perm[k] = v;
  }

  abilityOf(u.species, u.shiny).self?.(st, u, ctx);
  trinketStats(st, u, ctx);
  trainerStats(st, u, ctx);

  // ordem de cálculo (seção 5.3): (base + aditivos) × (1 + %aditivos) × multiplicadores × nível
  const pctFactor = st.dragon ? st.dmgPcts.reduce((a, x) => a * (1 + x), 1) : 1 + st.dmgPcts.reduce((a, x) => a + x, 0);
  const dmgF = pctFactor * st.dmgMult * lvl;
  // os multiplicadores (Raro+, Dragão) valem para todos os números de efeito, não só para o Dano
  const allF = (1 + st.allPct) * st.allMult * st.dmgMult * lvl;
  st.parts.pct = pctFactor - 1;
  st.parts.mult = st.dmgMult;
  st.dmg *= dmgF;
  st.spectral *= dmgF;
  st.swarm *= dmgF;
  for (const k of ['heal', 'shield', 'burn', 'poison', 'shock', 'cold'] as const) st[k] *= allF;
  st.heal *= st.healMult;
  st.spectral *= st.spectralMult;
  st.burn *= st.burnMult;
  st.shock *= st.shockMult;
  for (const k of ['armor', 'blessing', 'charge', 'crit', 'echo', 'growth', 'punish', 'cleanse'] as const) st[k] *= lvl;
  st.hp *= lvl;
  for (const [k, m] of Object.entries(st.statMult)) if (m && k in st) (st as unknown as Record<string, number>)[k] *= m;
  st.critChance = st.crit / 100;
  st.shieldBreak = st.pierce > 0;
  for (const k of [...OUTPUT, 'hp', 'armor', 'blessing'] as const) st[k] = Math.round(st[k]);
  for (const k of ['crit', 'echo', 'growth', 'punish', 'cleanse', 'charge'] as const) st[k] = Math.round(st[k] * 10) / 10;
  return st;
}

function trainerStats(st: UnitStats, u: Unit, ctx: StatCtx) {
  const { trainer, counts } = ctx;
  const types = st.types;
  if (trainer.id === 'supernerd' && types.includes('poison')) st.poison += 3 + ctx.nerd;
  if (trainer.id === 'rocker' && types.includes('electric') && counts.electric === 1) st.shock *= 2.5;
  if (trainer.id === 'blackbelt' && types.includes('fighting') && counts.fighting === 1) st.dmgPcts.push(1);
  if (trainer.id === 'tamer' && abilityOf(u.species, u.shiny).none) { st.dmgPcts.push(0.4); st.allPct += 0.4; st.hp *= 1.4; }
}

/** recarga efetiva (piso global 0,2s) */
export const effCd = (st: UnitStats) => Math.max(0.2, st.cd / (1 + Math.max(-0.9, st.cdSpeed)));
/** cada +100% de velocidade que passaria do piso vira +1 Multicast */
export function overflowCasts(st: UnitStats) {
  const need = st.cd / 0.2 - 1;
  return st.cdSpeed > need ? Math.floor(st.cdSpeed - need) : 0;
}

export function teamMaxHp(team: (Unit | null)[], trainer: TrainerDef, hpBonus: number, trinkets: string[], nerd = 0, gold = 0, wins = 0, losses = 0) {
  let hp = 150 + (trainer.hpFlat ?? 0) + hpBonus + trinketHp(trinkets);
  team.forEach((u, slot) => {
    if (u) hp += computeStats(u, makeCtx(team, trainer, trinkets, slot, nerd, gold, wins, losses)).hp;
  });
  if (trinkets.includes('amulet-hp')) hp *= 1.25;
  return Math.round(hp);
}
