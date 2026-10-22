// Habilidades (OS v2): cada uma reforça ou conecta as mecânicas dos tipos do Pokémon.
// Todo número de habilidade é multiplicado pelo multiplicador de nível (c.v / v).
import type { Battle, Fighter } from './battle';
import { DEX, unitTypes } from './dex';
import { LEVEL_MULT, type RunState, type StatKey, type Unit } from './model';
import { RATE, type StatCtx, type UnitStats } from './stats';
import { TYPE_NAME, type PType } from './types';

export interface Ctx {
  b: Battle;
  f: Fighter;
  lv: number;
  v: (x: number) => number;
  depth: number;
  lastDmg: number;
}

export interface CastExtra {
  dmg?: number;
  mult?: number;
  burn?: number;
  poison?: number;
  shock?: number;
  cold?: number;
}

export interface ShopApi {
  addUnit(species: number, opts?: { level?: number; shiny?: boolean }): string;
  gold(n: number): void;
  rng(): number;
}

type ShopHook = (u: Unit, run: RunState, api: ShopApi) => string | void;

export interface Ability {
  name: string;
  /** texto com os números já escalados pelo nível */
  desc: (v: (x: number) => number) => string;
  self?: (st: UnitStats, u: Unit, ctx: StatCtx) => void;
  ongoing?: (c: Ctx) => void;
  start?: (c: Ctx) => void;
  pre?: (c: Ctx) => CastExtra | void;
  cast?: (c: Ctx) => void;
  allyCast?: (c: Ctx, ally: Fighter) => void;
  ko?: (c: Ctx) => void;
  anyKo?: (c: Ctx, victim: Fighter) => void;
  every?: number;
  tick?: (c: Ctx) => void;
  bought?: ShopHook;
  allyBought?: (u: Unit, run: RunState, bought: Unit, api: ShopApi) => string | void;
  dayStart?: ShopHook;
  victory?: ShopHook;
  defeat?: ShopHook;
  /** gatilho "Quando você usa um item" */
  itemUsed?: ShopHook;
  /** gatilho "Quando você ganha um item segurado" */
  trinketGained?: ShopHook;
  /** sem habilidade (só stats), como os primeiros estágios do Batomon */
  none?: boolean;
  /** roda antes das habilidades Contínuas (ex.: desativar) */
  early?: (c: Ctx) => void;
  /** o aliado atrás aplica suas habilidades Contínuas +N vezes */
  amplifyBehind?: number;
  /** quando o time recebe Escudo */
  onShield?: (c: Ctx, amount: number) => void;
  /** a Bênção deste vale para todos os aliados */
  blessAll?: boolean;
  /** enquanto este estiver de pé, o Frio do inimigo não diminui */
  coldLock?: boolean;
}

export const STAT_NAME: Record<StatKey, string> = {
  dmg: 'Dano', spectral: 'Dano Espectral', heal: 'Cura', cleanse: 'Limpeza', shield: 'Escudo', armor: 'Armadura',
  burn: 'Queimadura', poison: 'Veneno', shock: 'Choque', cold: 'Frio', growth: 'Crescimento', crit: 'Crítico',
  charge: 'Carga', swarm: 'Enxame', echo: 'Eco', punish: 'Punir', blessing: 'Bênção',
  casts: 'Multicast', cdSpeed: 'Vel. de recarga', hp: 'HP',
};
/** stat principal de cada tipo (para habilidades que dão "o stat do tipo") */
export const MAIN_STAT: Record<PType, StatKey> = {
  normal: 'dmg', fire: 'burn', poison: 'poison', electric: 'shock', water: 'heal', grass: 'growth', ice: 'cold',
  fighting: 'crit', ground: 'dmg', rock: 'shield', steel: 'armor', flying: 'charge', bug: 'swarm', psychic: 'echo',
  ghost: 'spectral', dragon: 'dmg', dark: 'punish', fairy: 'blessing',
};

export const scaler = (lv: number, mult = 1) => (x: number) => Math.max(1, Math.round(x * LEVEL_MULT[Math.min(5, lv)] * mult));
/** shiny: por padrão, +20% nos números da habilidade (além da versão shiny própria de algumas espécies) */
export const abilityScale = (u: { level: number; shiny: boolean }) => scaler(u.level, u.shiny ? 1.2 : 1);
const isPct = (k: StatKey) => k === 'cdSpeed';
const amt = (k: StatKey, base: number, v: (x: number) => number) => (isPct(k) || k === 'casts' ? base : v(base));
const fs = (k: StatKey, n: number) => (isPct(k) ? `+${Math.round(n * 100)}% ${STAT_NAME[k]}` : `+${n} ${STAT_NAME[k]}`);
const tn = (t?: PType) => (t ? ` de ${TYPE_NAME[t]}` : '');
const has = (f: Fighter, t?: PType) => !t || f.st.types.includes(t);

export function addPerm(u: Unit, k: StatKey, n: number) {
  u.perm ??= {};
  u.perm[k] = Math.round(((u.perm[k] ?? 0) + n) * 1000) / 1000;
}

// ---------- fábricas ----------
const castGrow = (name: string, k: StatKey, base: number): Ability => ({
  name, desc: (v) => `Ao atacar: ${fs(k, amt(k, base, v))} nesta batalha.`,
  cast: (c) => c.b.buff(c.f, k, amt(k, base, c.v), false),
});
const startFoe = (name: string, k: 'burn' | 'poison' | 'shock' | 'cold', base: number): Ability => ({
  name, desc: (v) => `Início da batalha: aplica ${v(base)} de ${STAT_NAME[k]} no time inimigo.`,
  start: (c) => c.b.inflict(c.f, k, c.v(base)),
});
const delay = (name: string, sec: number, when: 'start' | 'cast', scope: 'opp' | 'row' | 'all'): Ability => ({
  name,
  desc: () => `${when === 'start' ? 'Início da batalha' : 'Ao atacar'}: atrasa ${scope === 'opp' ? 'o inimigo oposto' : scope === 'row' ? 'os inimigos da mesma linha' : 'todos os inimigos'} em ${sec}s.`,
  [when]: (c: Ctx) => {
    const list = scope === 'opp' ? [c.b.opposite(c.f)] : scope === 'row' ? c.b.enemyRow(c.f) : c.b.enemies(c.f);
    for (const e of list) if (e) c.b.delay(e, sec);
  },
});
const victoryGrow = (name: string, k: StatKey, base: number, scope: 'self' | PType = 'self'): Ability => ({
  name, desc: (v) => `Na vitória: ${scope === 'self' ? 'ganha' : `este e os aliados${tn(scope)} ganham`} ${fs(k, amt(k, base, v))} permanentemente.`,
  victory: (u, run) => {
    const list = scope === 'self' ? [u] : run.team.filter((x): x is Unit => !!x && (x === u || unitTypes(x).includes(scope)));
    for (const x of list) addPerm(x, k, base);
    return `${DEX[u.species].name}: ${fs(k, amt(k, base, abilityScale(u)))}`;
  },
});
const allyBoughtGrow = (name: string, type: PType, k: StatKey, base: number): Ability => ({
  name, desc: (v) => `Depois que você compra um Pokémon${tn(type)}: ganha ${fs(k, amt(k, base, v))} permanentemente.`,
  allyBought: (u, _run, b) => { if (unitTypes(b).includes(type)) addPerm(u, k, base); },
});
const fromEnemy = (name: string, status: 'poison' | 'burn', pct: number, out: 'dmg' | 'shield' | 'burn'): Ability => ({
  name,
  desc: () => `Contínuo: tem ${out === 'dmg' ? 'Dano' : out === 'shield' ? 'Escudo' : 'Queimadura'} extra igual a ${Math.round(pct * 100)}% da ${status === 'poison' ? 'Veneno' : 'Queimadura'} no inimigo.`,
  pre: (c) => {
    const n = Math.round(c.b.foe(c.f)[status] * pct);
    if (out === 'dmg') return { dmg: n };
    if (out === 'burn') return { burn: n };
    if (n) c.b.addShield(c.f, n);
  },
});
const startTrigger = (name: string): Ability => ({ name, desc: () => 'Início da batalha: ataca imediatamente.', start: (c) => c.b.trigger(c.f, 0) });
const payday = (name: string, max: number): Ability => ({
  name, desc: () => `Ao atacar: ganha ₽1 (máx. ₽${max} por batalha).`,
  cast: (c) => {
    if ((c.f.mem.gold ?? 0) >= max) return;
    c.f.mem.gold = (c.f.mem.gold ?? 0) + 1;
    c.b.gold(c.f, 1);
  },
});
const plain = (name: string, text: string): Ability => ({ name, desc: () => text });
const merge = (a: Ability, b: Partial<Ability>, desc?: (v: (x: number) => number) => string): Ability => ({
  ...a, ...b, name: b.name ?? a.name, desc: desc ?? ((v) => `${a.desc(v)} ${b.desc?.(v) ?? ''}`.trim()),
});

// ---------- tabela ----------
export const ABILITY: Record<number, Ability> = {};
const A = (id: number, a: Ability) => (ABILITY[id] = a);
const ally = (c: Ctx) => c.b.allies(c.f);
const typed = (list: Fighter[], t: PType) => list.filter((a) => has(a, t));
const noAbility = (extra?: Partial<Ability>, text = ''): Ability => ({ name: '—', none: true, desc: () => text || 'Sem habilidade.', ...extra });

// primeiros estágios e bebês: sem habilidade (só stats)
for (const id of [84, 1, 4, 7, 10, 13, 16, 19, 21, 23, 27, 29, 32, 37, 41, 43, 46, 48, 50, 56, 58, 60, 66, 69, 72, 74, 77, 81, 86, 88, 96, 98, 100, 109, 111, 116, 118, 120, 138, 140, 172, 173, 174, 236, 238, 239, 240, 439, 440, 446]) A(id, noAbility());
A(85, noAbility({ self: (st) => { st.casts += 1; } }, 'Sem habilidade. Multicast +1.'));

// ===== Planta / Veneno =====
A(2, { name: 'Semente Sanguessuga', desc: () => 'Ao atacar: cura o time em 30% do Veneno no inimigo.', cast: (c) => { const n = Math.round(c.b.foe(c.f).poison * 0.3); if (n) c.b.heal(c.f, n); } });
A(3, { name: 'Fotossíntese', desc: (v) => `A cada 3s: o time cura ${v(30)} e este ganha +${v(4)} Crescimento nesta batalha.`, every: 3, tick: (c) => { c.b.heal(c.f, c.v(30)); c.b.buff(c.f, 'growth', c.v(4), false); } });
A(44, { name: 'Odor', desc: (v) => `Ao atacar: aliados de Veneno adjacentes ganham +${v(2)} Veneno nesta batalha.`, cast: (c) => { for (const a of typed(c.b.adjacent(c.f), 'poison')) c.b.buff(a, 'poison', c.v(2), false); } });
A(45, fromEnemy('Pétalas Tóxicas', 'poison', 1, 'dmg'));
A(182, { name: 'Dança das Pétalas', desc: (v) => `Ao atacar: aliados de Planta ganham +${v(3)} Crescimento nesta batalha.`, cast: (c) => { for (const a of typed(ally(c), 'grass')) c.b.buff(a, 'growth', c.v(3), false); } });
A(47, { name: 'Cogumelo Parasita', desc: (v) => `Quando qualquer Pokémon é nocauteado: +${v(2)} Veneno permanentemente.`, anyKo: (c) => c.b.buff(c.f, 'poison', c.v(2), true) });
A(70, castGrow('Chicote de Vinha', 'growth', 3));
A(71, { name: 'Engolir', desc: (v) => `Quando qualquer Pokémon é nocauteado: +${v(15)} Dano permanentemente.`, anyKo: (c) => c.b.buff(c.f, 'dmg', c.v(15), true) });
A(102, {
  name: 'Ovos Psíquicos', desc: () => 'Ao comprar: o próximo Pokémon que você comprar vira tipo Planta e ganha +4 Crescimento.',
  bought: (_u, run) => { run.nextBuy = { type: 'grass', perm: { growth: 4 } }; return 'O próximo Pokémon comprado vira Planta!'; },
});
A(103, { name: 'Bomba de Sementes', desc: () => 'Ao atacar: ativa o aliado de Planta acima/abaixo.', cast: (c) => { const a = c.b.above(c.f) ?? c.b.below(c.f); if (a && has(a, 'grass')) c.b.trigger(a, c.depth); } });
A(114, { name: 'Constrição', desc: () => 'Início da batalha: inimigos da mesma linha têm +1s de recarga.', start: (c) => { for (const e of c.b.enemyRow(c.f)) e.st.cd += 1; } });
A(465, { name: 'Vinhas Gigantes', desc: (v) => `Ao atacar: aliados de Planta adjacentes ganham +${v(3)} Crescimento nesta batalha.`, cast: (c) => { for (const a of typed(c.b.adjacent(c.f), 'grass')) c.b.buff(a, 'growth', c.v(3), false); } });
A(470, { name: 'Lâmina de Folha', desc: (v) => `Início da batalha: começa com +${v(15)}% de Crescimento acumulado.`, start: (c) => { c.f.growthPct += c.v(15); } });
A(30, {
  name: 'Ponto Venenoso', desc: () => 'Ao comprar: Pokémon de Veneno na loja ganham +1 Veneno pelo resto da run.',
  bought: (_u, run) => { run.shopBuff.push({ type: 'poison', perm: { poison: 1 } }); return 'Loja: Veneno +1 para Pokémon de Veneno'; },
});
A(31, { name: 'Rainha do Veneno', desc: () => 'Início da batalha: ganha Veneno igual ao Veneno somado dos aliados.', start: (c) => c.b.buff(c.f, 'poison', ally(c).reduce((s2, a) => s2 + a.st.poison, 0), false) });
A(33, { name: 'Chifre Venenoso', desc: () => 'Quando um aliado com Veneno ataca: ganha +1 Dano permanentemente.', allyCast: (c, a) => { if (a.st.poison > 0) c.b.buff(c.f, 'dmg', 1, true); } });
A(34, { name: 'Rei Tóxico', desc: () => 'Quando um aliado com Veneno ataca: carrega este em 0.5s.', allyCast: (c, a) => { if (a.st.poison > 0) c.b.charge(c.f, 0.5); } });
A(49, { name: 'Pó Alucinógeno', desc: () => 'Quando um aliado de Veneno ataca: ele ganha +5% vel. de recarga nesta batalha.', allyCast: (_c, a) => { if (has(a, 'poison')) a.st.cdSpeed += 0.05; } });
A(73, { name: 'Tentáculos', desc: () => 'Quando um aliado de Veneno adjacente ataca: ataca também.', allyCast: (c, a) => { if (a.unit.species !== 73 && has(a, 'poison') && c.b.adjacent(c.f).includes(a)) c.b.trigger(c.f, c.depth); } });
A(89, fromEnemy('Lodo Tóxico', 'poison', 1, 'shield'));
A(110, merge(startFoe('Nuvem Tóxica', 'poison', 10), { ko: (c) => c.b.inflict(c.f, 'poison', c.v(20)) },
  (v) => `Início da batalha: aplica ${v(10)} de Veneno no inimigo. Ao ser nocauteado: aplica mais ${v(20)}.`));
A(24, {
  name: 'Olhar Paralisante', desc: (v) => `Início da batalha: Desativa o inimigo oposto por 3s e ganha +${v(10)} Punir nesta batalha.`,
  start: (c) => { const e = c.b.opposite(c.f); if (e) c.b.disable(e, 3); c.b.buff(c.f, 'punish', c.v(10), false); },
});

// ===== Fogo =====
A(5, castGrow('Brasa', 'burn', 1));
A(6, {
  name: 'Asas de Fogo', desc: (v) => `Ao atacar: o aliado atrás ganha +${v(2)} Queimadura nesta batalha e é carregado em 0.5s.`,
  cast: (c) => { const a = c.b.behind(c.f); if (a) { c.b.buff(a, 'burn', c.v(2), false); c.b.charge(a, 0.5); } },
});
A(38, {
  name: 'Fogo Interior', desc: (v) => `Contínuo: Dano extra igual a 8x a sua Queimadura. Quando um aliado de Fogo ataca: +${v(1)} Queimadura nesta batalha.`,
  pre: (c) => ({ dmg: c.f.st.burn * 8 }),
  allyCast: (c, a) => { if (has(a, 'fire')) c.b.buff(c.f, 'burn', c.v(1), false); },
});
A(59, { name: 'Lealdade', desc: (v) => `Início da batalha: aliados de Fogo ganham +${v(1)} Queimadura permanentemente.`, start: (c) => { for (const a of typed(ally(c), 'fire')) c.b.buff(a, 'burn', c.v(1), true); } });
A(78, castGrow('Galope', 'cdSpeed', 0.06));
A(126, { name: 'Corpo de Chamas', desc: (v) => `Início da batalha: aplica ${v(8)} Queimadura no inimigo, +${v(4)} por aliado de Fogo.`, start: (c) => c.b.inflict(c.f, 'burn', c.v(8) + c.v(4) * typed(ally(c), 'fire').length) });
A(467, { name: 'Canhão de Lava', desc: (v) => `Contínuo: aliados de Fogo adjacentes têm +${v(4)} Queimadura.`, ongoing: (c) => { for (const a of typed(c.b.adjacent(c.f), 'fire')) a.st.burn += c.v(4); } });
A(136, fromEnemy('Labareda', 'burn', 1.5, 'dmg'));
A(146, { name: 'Fênix', desc: () => 'Contínuo: tem Queimadura extra igual a 30% da Queimadura no inimigo.', pre: (c) => ({ burn: Math.round(c.b.foe(c.f).burn * 0.3) }) });

// ===== Água =====
A(8, { name: 'Casco Firme', desc: () => 'Início da batalha: o time ganha Escudo igual a 2x a Cura dos aliados adjacentes.', start: (c) => c.b.addShield(c.f, 2 * c.b.adjacent(c.f).reduce((s2, a) => s2 + a.st.heal, 0)) });
A(9, { name: 'Hidro Canhão', desc: (v) => `Contínuo: aliados de Água adjacentes têm +${v(20)} Cura e +5 Limpeza.`, ongoing: (c) => { for (const a of typed(c.b.adjacent(c.f), 'water')) { a.st.heal += c.v(20); a.st.cleanse += 5; } } });
A(54, { name: 'Dor de Cabeça', desc: () => 'A cada 5s: +1 Multicast nesta batalha.', every: 5, tick: (c) => c.b.buff(c.f, 'casts', 1, false) });
A(55, { name: 'Mente Aguçada', desc: (v) => `Contínuo: aliados Psíquicos adjacentes têm +${v(25)} Eco.`, ongoing: (c) => { for (const a of typed(c.b.adjacent(c.f), 'psychic')) a.st.echo += c.v(25); } });
A(61, delay('Hipnose', 0.8, 'cast', 'opp'));
A(62, { name: 'Punho Dinâmico', desc: () => 'Na vitória: sobe de nível (pode passar do Lv. 4, até o 5).', victory: (u) => { if (u.level < 5) { u.level++; return `Poliwrath subiu para o Lv. ${u.level}!`; } } });
A(186, { name: 'Garoa', desc: () => 'Contínuo: aliados de Água da mesma linha têm +1 Multicast.', ongoing: (c) => { const row = Math.floor(c.f.slot / 3); for (const a of typed(ally(c), 'water')) if (Math.floor(a.slot / 3) === row) a.st.casts += 1; } });
A(79, { name: 'Desligado', desc: () => 'Contínuo: +60% em todos os stats, recarga 50% mais lenta.', self: (st) => { st.dmgPcts.push(0.6); st.allPct += 0.6; st.cd *= 1.5; } });
A(80, { name: 'Shellder Mordedor', desc: () => 'Contínuo: o aliado à frente tem +1 Multicast.', ongoing: (c) => { const a = c.b.front(c.f); if (a) a.st.casts += 1; } });
A(199, { name: 'Sabedoria Real', desc: () => 'Ao atacar: ativa o aliado Psíquico com mais Eco.', cast: (c) => { const best = typed(ally(c), 'psychic').sort((a, b) => b.st.echo - a.st.echo)[0]; if (best && best.unit.species !== 199) c.b.trigger(best, c.depth); } });
A(87, { name: 'Raio Aurora', desc: (v) => `Ao atacar: aliados de Gelo ganham +${v(2)} Frio nesta batalha.`, cast: (c) => { for (const a of typed(ally(c), 'ice')) c.b.buff(a, 'cold', c.v(2), false); } });
A(90, { name: 'Concha Protetora', desc: (v) => `Início da batalha: o aliado atrás ganha +${v(8)} Cura permanentemente.`, start: (c) => { const a = c.b.behind(c.f); if (a) c.b.buff(a, 'heal', c.v(8), true); } });
A(91, { name: 'Espinhos de Gelo', desc: (v) => `Contínuo: Multicast +1. Aliados de Gelo adjacentes têm +${v(3)} Frio.`, self: (st) => { st.casts += 1; }, ongoing: (c) => { for (const a of typed(c.b.adjacent(c.f), 'ice')) a.st.cold += c.v(3); } });
A(99, { name: 'Martelo Caranguejo', desc: () => 'A cada 3 ataques: causa Dano extra igual a 4x a sua Cura.', pre: (c) => ((c.f.mem.casts ?? 0) % 3 === 2 ? { dmg: c.f.st.heal * 4 } : undefined) });
A(117, { name: 'Correnteza', desc: (v) => `Ao atacar: o aliado atrás ganha +${v(6)} Cura nesta batalha (se for Dragão, +${v(6)} Dano também).`, cast: (c) => { const a = c.b.behind(c.f); if (a) { c.b.buff(a, 'heal', c.v(6), false); if (a.st.dragon) c.b.buff(a, 'dmg', c.v(6), false); } } });
A(230, { name: 'Rei dos Mares', desc: () => 'Ao atacar: o aliado à frente ganha +1 Multicast nesta batalha (+2 se for Dragão) e a recarga deste aumenta 5s.', cast: (c) => { const a = c.b.front(c.f); if (a) { c.b.buff(a, 'casts', a.st.dragon ? 2 : 1, false); c.f.st.cd += 5; } } });
A(119, { name: 'Chifre Aquático', desc: (v) => `Na vitória: +${v(10)} Dano e +${v(10)} Cura permanentemente. Quando você ganha um item segurado: +${v(8)} Cura permanentemente.`, victory: (u) => { addPerm(u, 'dmg', 10); addPerm(u, 'heal', 10); }, trinketGained: (u) => { addPerm(u, 'heal', 8); } });
A(121, { name: 'Núcleo Cósmico', desc: () => 'Ao atacar: ativa os aliados de Água adjacentes (exceto outro Starmie).', cast: (c) => { for (const a of typed(c.b.adjacent(c.f), 'water')) if (a.unit.species !== 121) c.b.trigger(a, c.depth); } });
A(129, merge(plain('Splash', ''), { victory: (u, _r, api) => { api.gold(1); return `${DEX[u.species].name}: +₽1`; } }, () => 'Na vitória: +₽1. Precisa de 5 cópias para evoluir em Gyarados.'));
A(130, merge({ name: 'Fúria do Dragão', desc: () => '' }, {
  start: (c) => { for (const e of c.b.enemyRow(c.f)) c.b.delay(e, 1); for (const a of typed(ally(c), 'dragon')) c.b.pct(a, 0.1); },
  pre: (c) => ({ dmg: c.f.st.heal * 3 }),
  cast: (c) => c.b.buff(c.f, 'heal', c.v(10), false),
}, (v) => `Início da batalha: atrasa os inimigos da linha em 1s e os aliados Dragão ganham +10% de Dano (multiplicativo). Contínuo: causa Dano extra igual a 3x a sua Cura. Ao atacar: +${v(10)} Cura nesta batalha.`));
A(131, { name: 'Canto Antigo', desc: () => 'Ao atacar: os aliados adjacentes sobem 1 nível nesta batalha (máx. Lv. 3).', cast: (c) => { for (const a of c.b.adjacent(c.f)) c.b.levelUpBattle(a); } });
A(134, { name: 'Absorver Água', desc: (v) => `Contínuo: aliados de Água têm +${v(15)} Cura e +5 Limpeza.`, ongoing: (c) => { for (const a of typed(ally(c), 'water')) { a.st.heal += c.v(15); a.st.cleanse += 5; } } });

// ===== Elétrico =====
A(25, castGrow('Estática', 'shock', 1));
A(26, { name: 'Para-raios', desc: () => 'Contínuo: o aliado atrás tem +100% de Choque.', ongoing: (c) => { const a = c.b.behind(c.f); if (a) a.st.shock *= 2; } });
A(82, { name: 'Campo Magnético', desc: () => 'Ao atacar: carrega os aliados Elétricos adjacentes em 1s.', cast: (c) => { for (const a of typed(c.b.adjacent(c.f), 'electric')) c.b.charge(a, 1); } });
A(462, {
  name: 'Ímã Polar', desc: (v) => `Contínuo: o time tem +${v(2)} Armadura por Pokémon Elétrico; aliados de Aço adjacentes têm +${v(2)} Choque.`,
  ongoing: (c) => { const s = c.b.side(c.f); s.armor += c.v(2) * typed(s.fighters, 'electric').length; for (const a of typed(c.b.adjacent(c.f), 'steel')) a.st.shock += c.v(2); },
});
A(101, { name: 'Autodestruição', desc: (v) => `Ao atacar: aplica +${v(30)} Choque no inimigo e se nocauteia.`, cast: (c) => { c.b.inflict(c.f, 'shock', c.v(30)); c.b.knockout(c.f); } });
A(125, { name: 'Punho Trovão', desc: () => 'Ao atacar: carrega os aliados Elétricos em 0.5s.', cast: (c) => { for (const a of typed(ally(c), 'electric')) c.b.charge(a, 0.5); } });
A(466, { name: 'Motor Elétrico', desc: (v) => `Contínuo: +${v(2)} Choque para cada Pokémon Elétrico na equipe.`, self: (st, _u, ctx) => { st.shock += 2 * ctx.counts.electric; } });
A(135, { name: 'Agulhas', desc: (v) => `Contínuo: Multicast +1. Cada golpe aplica +${v(2)} Choque.`, self: (st) => { st.casts += 1; st.shock += 2; } });
A(145, { name: 'Trovão', desc: (v) => `Ao atacar: +50% vel. de recarga e +${v(2)} Choque nesta batalha.`, cast: (c) => { c.b.buff(c.f, 'cdSpeed', 0.5, false); c.b.buff(c.f, 'shock', c.v(2), false); } });

// ===== Terra / Pedra / Aço =====
A(28, { name: 'Areia Afiada', desc: () => 'Quando o time recebe Escudo: ganha Dano igual a 15% do escudo nesta batalha.', onShield: (c, n) => c.b.buff(c.f, 'dmg', Math.round(n * 0.15), false) });
A(51, { name: 'Três Cabeças', desc: () => 'Contínuo: Multicast +2. Aliados de Terra adjacentes perfuram 3x.', self: (st) => { st.casts += 2; }, ongoing: (c) => { for (const a of typed(c.b.adjacent(c.f), 'ground')) a.st.pierce = 3; } });
A(104, { name: 'Osso Bumerangue', desc: (v) => `Contínuo: Multicast +1 e +${v(8)} Dano por Pokémon de Terra na equipe.`, self: (st, _u, ctx) => { st.casts += 1; st.dmg += 8 * ctx.counts.ground; } });
A(105, { name: 'Vingança', desc: () => 'Quando um aliado é nocauteado: ganha 70% do Dano dele nesta batalha.', anyKo: (c, victim) => { if (victim.side === c.f.side && victim !== c.f) c.b.buff(c.f, 'dmg', Math.round((victim.st.dmg + victim.st.spectral) * 0.7), false); } });
A(75, { name: 'Robustez', desc: (v) => `Contínuo: aliados de Pedra adjacentes têm +${v(15)} Escudo.`, ongoing: (c) => { for (const a of typed(c.b.adjacent(c.f), 'rock')) a.st.shield += c.v(15); } });
A(76, { name: 'Explosão', desc: () => 'Primeiro ataque: causa 7x de Dano e se nocauteia.', pre: (c) => (c.f.mem.casts ? undefined : { mult: 7 }), cast: (c) => { if (c.f.mem.casts === 1) c.b.knockout(c.f); } });
A(95, { name: 'Corpo de Rocha', desc: (v) => `Início da batalha: o time ganha ${v(50)} de Escudo por aliado de Pedra ou Terra.`, start: (c) => c.b.addShield(c.f, c.v(50) * c.b.side(c.f).fighters.filter((a) => has(a, 'rock') || has(a, 'ground')).length) });
A(208, { name: 'Corpo de Aço', desc: (v) => `Início da batalha: o time ganha Escudo igual a 12% do HP máximo. Aliados de Terra ganham +${v(2)} Armadura.`, start: (c) => { c.b.addShield(c.f, Math.round(c.b.side(c.f).maxHp * 0.12)); for (const a of typed(ally(c), 'ground')) c.b.buff(a, 'armor', c.v(2), false); } });
A(112, { name: 'Chifre Broca', desc: () => 'Contínuo: +25% de Dano e perfura 3x.', self: (st) => { st.dmgPcts.push(0.25); st.pierce = 3; } });
A(464, { name: 'Rocha Armada', desc: () => 'Contínuo: tem Dano extra igual a 20% do Escudo atual do time.', pre: (c) => ({ dmg: Math.round(c.b.side(c.f).shield * 0.2) }) });
A(139, { name: 'Concha Espiral', desc: () => 'Início da batalha: o time ganha Escudo igual ao Escudo somado dos aliados adjacentes.', start: (c) => c.b.addShield(c.f, c.b.adjacent(c.f).reduce((s2, a) => s2 + a.st.shield, 0)) });
A(141, { name: 'Lâmina Antiga', desc: (v) => `Ao atacar: +1 Dano permanentemente. Quando você ganha um item segurado: +${v(6)} Dano permanente.`, cast: (c) => c.b.buff(c.f, 'dmg', 1, true), trinketGained: (u) => { addPerm(u, 'dmg', 6); } });
A(142, {
  name: 'Rocha Ancestral', desc: (v) => `Início da batalha: +${v(20)} Escudo por aliado de Pedra e +1 Multicast se houver outro Voador.`,
  start: (c) => {
    const list = c.b.side(c.f).fighters.filter((a) => !a.ko);
    c.b.addShield(c.f, c.v(20) * list.filter((a) => has(a, 'rock')).length);
    if (list.some((a) => a !== c.f && has(a, 'flying'))) c.b.buff(c.f, 'casts', 1, false);
  },
});
A(900, { name: 'Machado de Pedra', desc: () => 'Ao atacar: o time ganha Escudo igual ao dano deste golpe. Aliados de Pedra ganham +5% de Dano.', cast: (c) => { if (c.lastDmg) c.b.addShield(c.f, c.lastDmg); for (const a of typed(ally(c), 'rock')) c.b.pct(a, 0.05); } });
A(212, { name: 'Punho Projétil', desc: (v) => `Contínuo: na coluna da frente, tem +50% Dano e +25% vel. de recarga. Aliados de Aço adjacentes têm +${v(3)} Armadura.`, self: (st, _u, ctx) => { if (ctx.slot != null && ctx.slot % 3 === 2) { st.dmgPcts.push(0.5); st.cdSpeed += 0.25; } }, ongoing: (c) => { for (const a of typed(c.b.adjacent(c.f), 'steel')) { a.st.armor += c.v(3); c.b.side(c.f).armor += c.v(3); } } });
A(863, { name: 'Garras de Aço', desc: (v) => `Contínuo: +${v(1)} Armadura para cada ₽10 que você tem (máx. ₽100).`, self: (st, _u, ctx) => { st.armor += Math.min(10, Math.floor(ctx.gold / 10)); } });

// ===== Voador / Inseto =====
A(11, castGrow('Endurecer', 'shield', 8));
A(12, { name: 'Pó do Sono', desc: (v) => `Ao atacar: atrasa os inimigos da linha em 0.5s. Contínuo: aliados Inseto têm +${v(2)} Carga.`, cast: (c) => { for (const e of c.b.enemyRow(c.f)) c.b.delay(e, 0.5); }, ongoing: (c) => { for (const a of typed(ally(c), 'bug')) a.st.charge += c.v(2); } });
A(14, { name: 'Casulo', desc: (v) => `Início da batalha: o time ganha ${v(30)} de Escudo por aliado Inseto.`, start: (c) => c.b.addShield(c.f, c.v(30) * typed(c.b.side(c.f).fighters, 'bug').length) });
A(15, { name: 'Agulha Dupla', desc: (v) => `Contínuo: Multicast +1. Cada golpe aplica +${v(2)} Veneno.`, self: (st) => { st.casts += 1; st.poison += 2; } });
A(17, startTrigger('Ataque Rápido'));
A(18, { name: 'Vendaval', desc: () => 'Ao atacar: carrega todos os aliados Voadores em 0.2s.', cast: (c) => { for (const a of typed(ally(c), 'flying')) c.b.charge(a, 0.2); } });
A(20, allyBoughtGrow('Hiper Presa', 'normal', 'dmg', 5));
A(22, { name: 'Bando', desc: (v) => `Contínuo: +${v(2)} Carga para cada Voador na equipe.`, self: (st, _u, ctx) => { st.charge += 2 * ctx.counts.flying; } });
A(42, { name: 'Sugar Sangue', desc: () => 'Ao atacar: cura o time em 30% do dano causado.', cast: (c) => { if (c.lastDmg) c.b.heal(c.f, Math.round(c.lastDmg * 0.3)); } });
A(169, { name: 'Voo Silencioso', desc: () => 'Contínuo: este e o aliado atrás têm +15% vel. de recarga.', ongoing: (c) => { c.f.st.cdSpeed += 0.15; const a = c.b.behind(c.f); if (a) a.st.cdSpeed += 0.15; } });
A(123, { name: 'Lâminas Gêmeas', desc: (v) => `Contínuo: Multicast +1 e +${v(4)} Enxame por Inseto na equipe.`, self: (st, _u, ctx) => { st.casts += 1; st.swarm += 4 * ctx.counts.bug; } });
A(127, { name: 'Guilhotina', desc: () => 'Ao atacar: 8% de chance (+2% por Inseto na equipe) de nocautear o inimigo oposto.', cast: (c) => { if (c.b.rng() < 0.08 + 0.02 * typed(c.b.side(c.f).fighters, 'bug').length) { const e = c.b.opposite(c.f); if (e) c.b.knockout(e); } } });

// ===== Normal / Fada =====
A(35, {
  name: 'Dedo Mágico', desc: (v) => `Ao atacar: efeito aleatório (+${v(8)} Dano; Cura ou Escudo ${v(24)}; ${v(2)} Queimadura/Veneno/Choque/Frio; ou +${v(2)} permanente nos stats de um aliado).`,
  cast: (c) => {
    const n = c.v(8), m = c.v(2);
    const r = Math.floor(c.b.rng() * 8);
    if (r === 0) c.b.buff(c.f, 'dmg', n, false);
    else if (r === 1) c.b.heal(c.f, n * 3);
    else if (r === 2) c.b.addShield(c.f, n * 3);
    else if (r === 3) c.b.inflict(c.f, 'burn', m);
    else if (r === 4) c.b.inflict(c.f, 'poison', m);
    else if (r === 5) c.b.inflict(c.f, 'shock', m);
    else if (r === 6) c.b.inflict(c.f, 'cold', m);
    else { const l = ally(c); const a = l[Math.floor(c.b.rng() * l.length)]; if (a) for (const k of ['dmg', 'heal', 'shield', 'burn', 'poison', 'shock'] as const) if (a.st[k] > 0) c.b.buff(a, k, m, true); }
  },
});
A(36, { name: 'Dança da Lua', desc: (v) => `Quando você usa um item: ganha +${v(2)} Bênção permanentemente.`, itemUsed: (u) => { addPerm(u, 'blessing', 2); return 'Clefable: +Bênção'; } });
A(39, delay('Canção de Ninar', 1.5, 'start', 'all'));
A(40, { name: 'Fofura', desc: (v) => `Contínuo: o time tem +${v(80)} de HP por Pokémon Normal ou Fada na equipe.`, ongoing: (c) => c.b.addMaxHp(c.f, c.v(80) * c.b.side(c.f).fighters.filter((a) => has(a, 'normal') || has(a, 'fairy')).length) });
A(52, payday('Pay Day', 3));
A(53, {
  name: 'Elegância', desc: (v) => `Contínuo: +${v(4)} Dano para cada ₽10 que você tem (máx. ₽100). Quando você usa um item: +₽1.`,
  self: (st, _u, ctx) => { st.dmg += 4 * Math.min(10, Math.floor(ctx.gold / 10)); },
  itemUsed: (_u, _r, api) => { api.gold(1); },
});
A(108, { name: 'Lambida', desc: (v) => `Ao atacar: rouba até ${v(30)} de Escudo do inimigo.`, cast: (c) => c.b.stealShield(c.f, c.v(30)) });
A(463, { name: 'Língua Gulosa', desc: (v) => `Quando você usa um item: +${v(6)} Dano e +${v(40)} HP permanentemente.`, itemUsed: (u) => { addPerm(u, 'dmg', 6); addPerm(u, 'hp', 40); return 'Lickilicky comeu bem!'; } });
A(113, merge({ name: 'Ovo Sortudo', desc: () => '', every: 2, tick: (c) => c.b.heal(c.f, c.v(25)) }, {
  bought: (_u, run) => { if (run.hearts < 10) { run.hearts++; return 'Chansey: +1 ❤'; } },
}, (v) => `Ao comprar: +1 ❤. A cada 2s: o time cura ${v(25)}.`));
A(242, { name: 'Felicidade', desc: () => 'Contínuo: o time recebe +40% de Cura.', ongoing: (c) => { c.b.side(c.f).healMult += 0.4; } });
A(115, { name: 'Laço Parental', desc: (v) => `Contínuo: Multicast +1; aliados Normais adjacentes têm +${v(10)} Dano; o time tem +${v(150)} de HP.`, self: (st) => { st.casts += 1; }, ongoing: (c) => { c.b.addMaxHp(c.f, c.v(150)); for (const a of typed(c.b.adjacent(c.f), 'normal')) a.st.dmg += c.v(10); } });
A(128, {
  name: 'Fúria do Touro', desc: (v) => `Na derrota: +${v(20)} Dano permanentemente. Na vitória: +${v(8)} para este e +${v(4)} para os aliados Normais.`,
  defeat: (u) => { addPerm(u, 'dmg', 20); return 'Tauros ficou furioso!'; },
  victory: (u, run) => { addPerm(u, 'dmg', 8); for (const x of run.team) if (x && x !== u && unitTypes(x).includes('normal')) addPerm(x, 'dmg', 4); },
});
A(132, {
  name: 'Transformar', desc: () => 'Início da batalha: copia 80% dos stats e os tipos do inimigo mais forte.',
  start: (c) => {
    const best = c.b.enemies(c.f).sort((a, b) => pow(b) - pow(a))[0];
    if (!best) return;
    for (const k of ['dmg', 'spectral', 'heal', 'shield', 'burn', 'poison', 'shock', 'cold'] as const) c.f.st[k] = Math.round(best.st[k] * 0.8);
    c.f.st.types = [...best.st.types];
    c.b.label(c.f, 'Transformou!');
  },
});
A(133, {
  name: 'Adaptável', desc: (v) => `Contínuo: +${v(6)} Dano por tipo diferente na equipe. Início da batalha: ganha o tipo mais comum do time (e o stat dele) nesta batalha.`,
  self: (st, _u, ctx) => { st.dmg += 6 * Object.values(ctx.counts).filter((n) => n > 0).length; },
  start: (c) => gainTypeBattle(c, commonType(c)),
});
A(137, { name: 'Upgrade', desc: (v) => `Contínuo: +${v(12)} Dano e HP por item segurado. Quando você usa um item: +${v(3)} Dano permanentemente.`, self: (st, _u, ctx) => { st.dmg += 12 * ctx.trinkets.length; st.hp += 12 * ctx.trinkets.length; }, itemUsed: (u) => { addPerm(u, 'dmg', 3); } });
A(233, { name: 'Upgrade 2.0', desc: (v) => `Quando você ganha um item segurado: +${v(20)} Dano e +${v(20)} HP permanentemente.`, trinketGained: (u) => { addPerm(u, 'dmg', 20); addPerm(u, 'hp', 20); return 'Porygon2 atualizou!'; } });
A(474, {
  name: 'Conversão', desc: () => 'Início da batalha: ganha os tipos primários dos aliados adjacentes (e os stats deles) nesta batalha. Quando você ganha um item segurado: +1 Multicast permanente (máx. 3 pela habilidade).',
  start: (c) => { for (const a of c.b.adjacent(c.f)) gainTypeBattle(c, a.st.types[0], true); },
  trinketGained: (u) => { if ((u.prog.pzCasts ?? 0) < 3) { u.prog.pzCasts = (u.prog.pzCasts ?? 0) + 1; addPerm(u, 'casts', 1); } },
});
A(143, { name: 'Gordura', desc: (v) => `Contínuo: o time tem +${v(300)} de HP, +${v(100)} por Pokémon Normal. A cada 6s: cura 3% do HP do time.`, ongoing: (c) => c.b.addMaxHp(c.f, c.v(300) + c.v(100) * typed(c.b.side(c.f).fighters, 'normal').length), every: 6, tick: (c) => c.b.heal(c.f, Math.round(c.b.side(c.f).maxHp * 0.03)) });
A(700, { name: 'Laço de Fada', desc: () => 'Contínuo: a Bênção deste vale para TODOS os aliados, não só os adjacentes.', blessAll: true });
A(122, {
  name: 'Barreira', desc: (v) => `Início da batalha: o time ganha ${v(120)} de Escudo e os aliados adjacentes recebem Proteger. Contínuo: aliados Fada adjacentes têm +${v(2)} Bênção. Quando você usa um item: +${v(10)} Escudo permanente.`,
  start: (c) => { c.b.addShield(c.f, c.v(120)); for (const a of c.b.adjacent(c.f)) a.mem.protected = 1; },
  ongoing: (c) => { for (const a of typed(c.b.adjacent(c.f), 'fairy')) a.st.blessing += c.v(2); },
  itemUsed: (u) => { addPerm(u, 'shield', 10); },
});

// ===== Psíquico / Gelo =====
A(63, { name: 'Teleporte', desc: () => 'Ao ser nocauteado: teleporta e revive (1x por batalha).', ko: (c) => { if (!c.f.mem.revived) { c.f.mem.revived = 1; c.b.revive(c.f); } } });
A(64, { name: 'Psicocinese', desc: () => 'Ao atacar: o aliado atrás ganha +3% vel. de recarga permanentemente.', cast: (c) => { const a = c.b.behind(c.f); if (a) c.b.buff(a, 'cdSpeed', 0.03, true); } });
A(65, { name: 'Gênio', desc: (v) => `Contínuo: +${v(25)} Eco para cada outro Psíquico na equipe.`, self: (st, _u, ctx) => { st.echo += 25 * Math.max(0, ctx.counts.psychic - 1); } });
A(97, { name: 'Comer Sonhos', trinketGained: (u) => { addPerm(u, 'punish', 3); }, desc: (v) => `Ao atacar: atrasa o inimigo oposto em 0.7s, cura ${v(20)} e ganha +${v(2)} Punir nesta batalha. Quando você ganha um item segurado: +${v(3)} Punir permanente.`, cast: (c) => { const e = c.b.opposite(c.f); if (e) c.b.delay(e, 0.7); c.b.heal(c.f, c.v(20)); c.b.buff(c.f, 'punish', c.v(2), false); } });
A(124, { name: 'Beijo Gelado', desc: () => 'Ao atacar: Desativa o inimigo oposto por 1s.', cast: (c) => { const e = c.b.opposite(c.f); if (e) c.b.disable(e, 1); } });
A(866, { name: 'Sapateado Gelado', desc: (v) => `Ao atacar: aplica +${v(3)} Frio para cada aliado Psíquico.`, cast: (c) => c.b.inflict(c.f, 'cold', c.v(3) * typed(ally(c), 'psychic').length) });
A(144, { name: 'Nevasca', desc: () => 'Início da batalha: desativa as habilidades Contínuas dos inimigos da mesma linha. Aliados de Gelo têm +20% vel. de recarga.', early: (c) => { for (const e of c.b.enemyRow(c.f)) e.mem.disabled = 1; }, ongoing: (c) => { for (const a of typed(ally(c), 'ice')) a.st.cdSpeed += 0.2; } });
A(471, { name: 'Neve Fina', desc: (v) => `Contínuo: enquanto Glaceon estiver de pé, o Frio do inimigo não diminui. Aliados de Gelo têm +${v(2)} Frio.`, coldLock: true, ongoing: (c) => { for (const a of typed(ally(c), 'ice')) a.st.cold += c.v(2); } });
A(196, { name: 'Luz do Dia', desc: (v) => `Contínuo: +${v(10)} Eco para cada vitória da run.`, self: (st, _u, ctx) => { st.echo += 10 * ctx.wins; } });
A(150, { name: 'Pressão', desc: (v) => `Contínuo: todos os inimigos têm -25% de vel. de recarga. Aliados Sombrios ou com Punir têm +${v(8)} Punir.`, ongoing: (c) => { for (const e of c.b.enemies(c.f)) e.st.cdSpeed -= 0.25; for (const a of ally(c)) if (has(a, 'dark') || a.st.punish > 0) a.st.punish += c.v(8); } });
A(151, {
  name: 'Ancestral', desc: () => 'Contínuo: aliados SEM habilidade têm +2 Multicast e +30% de Dano. Mew conta como tendo todos os tipos dos aliados.',
  ongoing: (c) => { for (const a of ally(c)) if (a.ability.none) { a.st.casts += 2; c.b.pct(a, 0.3); } },
  early: (c) => { for (const a of ally(c)) for (const t of a.st.types) if (!c.f.st.types.includes(t)) c.f.st.types.push(t); },
});

// ===== Lutador =====
A(57, { name: 'Fúria', desc: (v) => `Ao atacar: +${v(5)} Crítico e +5% vel. de recarga nesta batalha.`, cast: (c) => { c.b.buff(c.f, 'crit', c.v(5), false); c.b.buff(c.f, 'cdSpeed', 0.05, false); } });
A(979, { name: 'Punho da Raiva', desc: (v) => `Quando qualquer Pokémon é nocauteado: +${v(10)} Dano Espectral permanentemente e +${v(10)} Crítico nesta batalha.`, anyKo: (c) => { c.b.buff(c.f, 'spectral', c.v(10), true); c.b.buff(c.f, 'crit', c.v(10), false); } });
A(67, victoryGrow('Treino', 'dmg', 8, 'fighting'));
A(68, {
  name: 'Quatro Braços', desc: (v) => `Na vitória: este e os aliados Comuns ganham +${v(10)} Dano permanentemente.`,
  victory: (u, run) => { addPerm(u, 'dmg', 10); for (const x of run.team) if (x && x !== u && DEX[x.species].rarity === 1) addPerm(x, 'dmg', 10); return 'Machamp treinou a equipe!'; },
});
A(83, { name: 'Alho-poró', desc: (v) => `Contínuo: +${v(40)} Crítico.`, self: (st) => { st.crit += 40; } });
A(865, { name: 'Golpe de Lança', desc: () => 'Contínuo: os críticos deste e dos aliados Lutadores adjacentes causam 3x.', self: (st) => { st.critMult = 3; }, ongoing: (c) => { for (const a of typed(c.b.adjacent(c.f), 'fighting')) a.st.critMult = Math.max(a.st.critMult, 3); } });
A(106, { name: 'Chute Alto', desc: (v) => `Ao atacar: 30% de chance do golpe causar 3x. Contínuo: +${v(8)} Crítico por Lutador na equipe.`, pre: (c) => (c.b.rng() < 0.3 ? { mult: 3 } : undefined), self: (st, _u, ctx) => { st.crit += 8 * ctx.counts.fighting; } });
A(107, { name: 'Socos Elementais', desc: (v) => `Ao atacar: aplica aleatoriamente ${v(4)} Queimadura, ${v(2)} Choque ou ${v(3)} Frio.`, cast: (c) => { const r = Math.floor(c.b.rng() * 3); if (r === 0) c.b.inflict(c.f, 'burn', c.v(4)); else if (r === 1) c.b.inflict(c.f, 'shock', c.v(2)); else c.b.inflict(c.f, 'cold', c.v(3)); } });
A(237, { name: 'Giro Triplo', desc: (v) => `Contínuo: Multicast +2. Aliados Lutadores adjacentes têm +${v(15)} Crítico.`, self: (st) => { st.casts += 2; }, ongoing: (c) => { for (const a of typed(c.b.adjacent(c.f), 'fighting')) a.st.crit += c.v(15); } });

// ===== Fantasma / Sombrio =====
A(92, { name: 'Maldição', desc: (v) => `Ao ser nocauteado: +1 Multicast permanentemente e aliados Fantasma ganham +${v(10)} Dano Espectral nesta batalha.`, ko: (c) => { c.b.buff(c.f, 'casts', 1, true); for (const a of typed(ally(c), 'ghost')) c.b.buff(a, 'spectral', c.v(10), false); } });
A(93, {
  name: 'Pacto Sombrio', desc: (v) => `Início da batalha: nocauteia os aliados adjacentes e ganha +${v(15)} Dano Espectral por nocaute (Proteger impede e não dá bônus).`,
  start: (c) => { for (const a of c.b.adjacent(c.f)) if (c.b.knockout(a)) c.b.buff(c.f, 'spectral', c.v(15), false); },
});
A(94, { name: 'Destino Sombrio', desc: (v) => `Primeiro ataque: nocauteia o inimigo oposto. Contínuo: aliados Fantasma adjacentes têm +${v(10)} Dano Espectral.`, cast: (c) => { if (c.f.mem.casts === 1) { const e = c.b.opposite(c.f); if (e) c.b.knockout(e); } }, ongoing: (c) => { for (const a of typed(c.b.adjacent(c.f), 'ghost')) a.st.spectral += c.v(10); } });
A(197, { name: 'Luz da Lua', desc: (v) => `Contínuo: +${v(6)} Punir e +${v(80)} HP para cada derrota da run.`, self: (st, _u, ctx) => { st.punish += 6 * ctx.losses; st.hp += 80 * ctx.losses; } });

// ===== Dragões: quebradores de meta =====
A(147, { name: 'Fôlego de Dragão', desc: (v) => `Ao atacar: carrega o aliado atrás em ${v(1)}s (2x se for Dragão).`, cast: (c) => { const a = c.b.behind(c.f); if (a) c.b.charge(a, c.v(1) * (a.st.dragon ? 2 : 1)); } });
A(148, { name: 'Aura Serena', desc: () => 'Contínuo: o aliado atrás aplica suas habilidades Contínuas +1 vez (+2 no Lv. 4).', amplifyBehind: 1 });
A(149, {
  name: 'Dragão Supremo', desc: () => 'Ao atacar: ativa as habilidades de Início de Batalha dos aliados adjacentes e aumenta a própria recarga em 4s nesta batalha.',
  cast: (c) => { for (const a of c.b.adjacent(c.f)) if (a.ability.start && !c.b.isDisabled(a)) { c.b.label(a, a.ability.name); a.ability.start(c.b.ctxOf(a, c.depth + 1)); } c.f.st.cd += 4; },
});

function pow(f: Fighter) { return f.st.dmg + f.st.spectral + f.st.heal + f.st.shield + f.st.burn * 5 + f.st.poison * 8 + f.st.shock * 10; }
function commonType(c: Ctx): PType | null {
  const count: Partial<Record<PType, number>> = {};
  for (const a of c.b.side(c.f).fighters) for (const t of a.st.types) count[t] = (count[t] ?? 0) + 1;
  const best = Object.entries(count).sort((a, b) => b[1] - a[1]);
  return (best[0]?.[0] as PType) ?? null;
}
/** stat do tipo comprado por 1 ponto de orçamento (mesmas taxas de stats.ts, recarga padrão de 3s) */
const typePoint = (k: StatKey) => (k in RATE ? RATE[k as keyof typeof RATE] : 0);
/** ganha um tipo nesta batalha, com o stat principal dele (35% do orçamento) */
function gainTypeBattle(c: Ctx, t: PType | null, beyondCap = false) {
  if (!t || c.f.st.types.includes(t)) return;
  if (!beyondCap && c.f.st.types.length >= 3) return;
  c.f.st.types.push(t);
  const k = MAIN_STAT[t];
  const b = DEX[c.f.unit.species].budget * 0.35 * LEVEL_MULT[Math.min(5, c.f.unit.level)];
  c.b.buff(c.f, k, Math.round(b * typePoint(k) * 10) / 10, false);
  c.b.label(c.f, `+tipo ${TYPE_NAME[t]}`);
}

// ---------- versões SHINY (aprimoramento próprio de cada uma; Gen 4+ ganham ★ próprio) ----------
const faster = (a: Ability, pct = 0.2): Ability => ({ ...a, self: (st, u, ctx) => { a.self?.(st, u, ctx); st.cd *= 1 - pct; }, desc: (v) => `${a.desc(v)} Recarga ${Math.round(pct * 100)}% mais rápida.` });
export const SHINY: Record<number, Ability> = {};
const S = (id: number, a: Ability) => (SHINY[id] = { ...a, name: a.name.endsWith('★') ? a.name : `${a.name} ★` });
S(1, castGrow('Semente', 'growth', 2));
S(4, castGrow('Faísca', 'burn', 1));
S(7, castGrow('Bolhas', 'heal', 4));
S(13, castGrow('Ferrão', 'poison', 1));
S(172, castGrow('Choque do Trovão', 'shock', 1));
S(236, faster(noAbility({ none: false, name: 'Treino Livre' })));
S(440, { name: 'Ovo Feliz', desc: () => 'Início da batalha: os aliados adjacentes recebem Proteger.', start: (c) => { for (const a of c.b.adjacent(c.f)) a.mem.protected = 1; } });
S(446, { name: 'Apetite', desc: (v) => `Quando você usa um item: +${v(60)} HP permanente.`, itemUsed: (u) => { addPerm(u, 'hp', 60); } });
S(439, { name: 'Imitação', desc: () => 'Início da batalha: aplica a habilidade Contínua do aliado à frente mais 1 vez.', start: (c) => { const a = c.b.front(c.f); if (a?.ability.ongoing) a.ability.ongoing(c.b.ctxOf(a)); } });
S(25, faster(ABILITY[25]));
S(129, merge(plain('Splash', ''), { victory: (u, _r, api) => { api.gold(3); return `${DEX[u.species].name} ★: +₽3`; } }, () => 'Na vitória: +₽3. Precisa de 5 cópias para evoluir em Gyarados.'));
S(15, { ...ABILITY[15], desc: (v) => `Contínuo: Multicast +3. Cada golpe aplica +${v(1)} Veneno.`, self: (st) => { st.casts += 3; st.poison += 1; } });
S(26, { name: 'Para-raios', desc: () => 'Contínuo: os aliados atrás e à frente têm +100% de Choque.', ongoing: (c) => { for (const a of [c.b.behind(c.f), c.b.front(c.f)]) if (a) a.st.shock *= 2; } });
S(52, merge(payday('Pay Day', 6), { victory: (_u, _r, api) => { api.gold(2); } }, () => 'Ao atacar: ganha ₽1 (máx. ₽6 por batalha). Na vitória: +₽2.'));
S(63, { ...ABILITY[63], desc: () => 'Ao ser nocauteado: revive (2x por batalha).', ko: (c) => { if ((c.f.mem.revived ?? 0) < 2) { c.f.mem.revived = (c.f.mem.revived ?? 0) + 1; c.b.revive(c.f); } } });
S(76, { name: 'Explosão', desc: () => 'Primeiro ataque: causa 4x de Dano (sem se nocautear).', pre: (c) => (c.f.mem.casts ? undefined : { mult: 4 }) });
S(101, { name: 'Autodestruição', desc: (v) => `Ao atacar: aplica +${v(15)} Choque no inimigo (sem se nocautear).`, cast: (c) => c.b.inflict(c.f, 'shock', c.v(15)) });
S(92, { ...ABILITY[92], desc: () => 'Ao ser nocauteado: +1 Multicast permanente e revive (1x por batalha).', ko: (c) => { c.b.buff(c.f, 'casts', 1, true); if (!c.f.mem.revived) { c.f.mem.revived = 1; c.b.revive(c.f); } } });
S(94, { name: 'Destino Sombrio', desc: () => 'A cada 3 ataques: nocauteia o inimigo oposto.', cast: (c) => { if ((c.f.mem.casts ?? 0) % 3 === 1) { const e = c.b.opposite(c.f); if (e) c.b.knockout(e); } } });
S(113, merge(ABILITY[113], { bought: (_u, run) => { run.hearts = Math.min(10, run.hearts + 2); return 'Chansey ★: +2 ❤'; }, start: (c) => { for (const a of c.b.adjacent(c.f)) a.mem.protected = 1; } }, (v) => `Ao comprar: +2 ❤. A cada 2s: o time cura ${v(25)}. Início da batalha: aliados adjacentes recebem Proteger.`));
S(242, { ...ABILITY[242], desc: () => 'Contínuo: o time recebe +70% de Cura. Início da batalha: TODOS os aliados recebem Proteger.', ongoing: (c) => { c.b.side(c.f).healMult += 0.7; }, start: (c) => { for (const a of ally(c)) a.mem.protected = 1; } });
S(121, { name: 'Núcleo Cósmico', desc: () => 'Ao atacar: ativa TODOS os aliados de Água (exceto outro Starmie).', cast: (c) => { for (const a of typed(ally(c), 'water')) if (a.unit.species !== 121) c.b.trigger(a, c.depth); } });
S(122, { ...ABILITY[122], desc: (v) => `Início da batalha: o time ganha ${v(250)} de Escudo e TODOS os aliados recebem Proteger. Contínuo: aliados Fada adjacentes têm +${v(2)} Bênção. Quando você usa um item: +${v(15)} Escudo permanente.`, start: (c) => { c.b.addShield(c.f, c.v(250)); for (const a of ally(c)) a.mem.protected = 1; }, itemUsed: (u) => { addPerm(u, 'shield', 15); } });
S(130, { ...ABILITY[130], name: 'Fúria Vermelha', desc: (v) => `Início da batalha: atrasa TODOS os inimigos em 1s e os aliados Dragão ganham +15% de Dano (multiplicativo). Contínuo: causa Dano extra igual a 4x a sua Cura. Ao atacar: +${v(15)} Cura nesta batalha.`, start: (c) => { for (const e of c.b.enemies(c.f)) c.b.delay(e, 1); for (const a of typed(ally(c), 'dragon')) c.b.pct(a, 0.15); }, pre: (c) => ({ dmg: c.f.st.heal * 4 }), cast: (c) => c.b.buff(c.f, 'heal', c.v(15), false) });
S(131, { ...ABILITY[131], desc: () => 'Ao atacar: os aliados adjacentes sobem 1 nível nesta batalha (máx. Lv. 4).', cast: (c) => { for (const a of c.b.adjacent(c.f)) c.b.levelUpBattle(a, 4); } });
S(132, {
  ...ABILITY[132], desc: () => 'Início da batalha: copia 100% dos stats, os tipos e a habilidade do inimigo mais forte.',
  start: (c) => {
    const best = c.b.enemies(c.f).sort((a, b) => pow(b) - pow(a))[0];
    if (!best) return;
    for (const k of ['dmg', 'spectral', 'heal', 'shield', 'burn', 'poison', 'shock', 'cold', 'casts'] as const) c.f.st[k] = best.st[k];
    c.f.st.types = [...best.st.types];
    c.f.ability = best.ability;
    c.b.label(c.f, 'Transformou!');
  },
});
S(143, { ...ABILITY[143], every: 4, desc: (v) => `Contínuo: o time tem +${v(300)} de HP, +${v(100)} por Pokémon Normal. A cada 4s: cura 4% do HP do time.`, tick: (c) => c.b.heal(c.f, Math.round(c.b.side(c.f).maxHp * 0.04)) });
S(147, faster(ABILITY[147]));
S(148, { ...ABILITY[148], desc: () => 'Contínuo: os aliados atrás E acima/abaixo aplicam suas habilidades Contínuas +1 vez.', ongoing: (c) => { const v2 = c.b.above(c.f) ?? c.b.below(c.f); if (v2 && v2.ability.ongoing && !c.b.isDisabled(v2)) v2.ability.ongoing(c.b.ctxOf(v2, 0)); } });
S(149, { ...ABILITY[149], desc: () => 'Ao atacar: ativa as habilidades de Início de Batalha dos aliados adjacentes (sem aumentar a própria recarga).', cast: (c) => { for (const a of c.b.adjacent(c.f)) if (a.ability.start && !c.b.isDisabled(a)) { c.b.label(a, a.ability.name); a.ability.start(c.b.ctxOf(a, c.depth + 1)); } } });
S(230, { ...ABILITY[230], desc: () => 'Ao atacar: o aliado à frente ganha +1 Multicast nesta batalha (+2 se for Dragão), sem penalidade de recarga.', cast: (c) => { const a = c.b.front(c.f); if (a) c.b.buff(a, 'casts', a.st.dragon ? 2 : 1, false); } });
S(150, { name: 'Pressão', desc: (v) => `Contínuo: todos os inimigos têm -40% de vel. de recarga. Aliados Sombrios ou com Punir têm +${v(12)} Punir.`, ongoing: (c) => { for (const e of c.b.enemies(c.f)) e.st.cdSpeed -= 0.4; for (const a of ally(c)) if (has(a, 'dark') || a.st.punish > 0) a.st.punish += c.v(12); } });
S(151, { ...ABILITY[151], desc: () => 'Contínuo: aliados SEM habilidade têm +3 Multicast e +40% de Dano. Mew conta como tendo todos os tipos dos aliados.', ongoing: (c) => { for (const a of ally(c)) if (a.ability.none) { a.st.casts += 3; c.b.pct(a, 0.4); } } });
// Gen 4+
S(462, { ...ABILITY[462], desc: (v) => `Contínuo: o time tem +${v(4)} Armadura por Pokémon Elétrico; TODOS os aliados de Aço têm +${v(3)} Choque.`, ongoing: (c) => { const s = c.b.side(c.f); s.armor += c.v(4) * typed(s.fighters, 'electric').length; for (const a of typed(ally(c), 'steel')) a.st.shock += c.v(3); } });
S(463, { ...ABILITY[463], desc: (v) => `Quando você usa um item: +${v(10)} Dano e +${v(70)} HP permanentemente.`, itemUsed: (u) => { addPerm(u, 'dmg', 10); addPerm(u, 'hp', 70); } });
S(464, { ...ABILITY[464], desc: () => 'Contínuo: tem Dano extra igual a 35% do Escudo atual do time.', pre: (c) => ({ dmg: Math.round(c.b.side(c.f).shield * 0.35) }) });
S(465, { ...ABILITY[465], desc: (v) => `Ao atacar: TODOS os aliados de Planta ganham +${v(3)} Crescimento nesta batalha.`, cast: (c) => { for (const a of typed(ally(c), 'grass')) c.b.buff(a, 'growth', c.v(3), false); } });
S(466, { ...ABILITY[466], desc: (v) => `Contínuo: +${v(3)} Choque e +5% vel. de recarga por Pokémon Elétrico na equipe.`, self: (st, _u, ctx) => { st.shock += 3 * ctx.counts.electric; st.cdSpeed += 0.05 * ctx.counts.electric; } });
S(467, { ...ABILITY[467], desc: (v) => `Contínuo: TODOS os aliados de Fogo têm +${v(4)} Queimadura.`, ongoing: (c) => { for (const a of typed(ally(c), 'fire')) a.st.burn += c.v(4); } });
S(474, { ...ABILITY[474], desc: () => 'Início da batalha: ganha os tipos primários de TODOS os aliados (e os stats deles) nesta batalha. Quando você ganha um item segurado: +1 Multicast permanente (máx. 3).', start: (c) => { for (const a of ally(c)) gainTypeBattle(c, a.st.types[0], true); } });
S(470, { ...ABILITY[470], desc: (v) => `Início da batalha: começa com +${v(30)}% de Crescimento acumulado.`, start: (c) => { c.f.growthPct += c.v(30); } });
S(471, { ...ABILITY[471], desc: (v) => `Contínuo: enquanto Glaceon estiver de pé, o Frio do inimigo não diminui. TODOS os aliados têm +${v(3)} Frio.`, ongoing: (c) => { for (const a of [c.f, ...ally(c)]) a.st.cold += c.v(3); } });
S(700, { ...ABILITY[700], desc: () => 'Contínuo: a Bênção deste vale para TODOS os aliados e é 50% maior.', self: (st) => { st.blessing *= 1.5; } });
S(900, { ...ABILITY[900], desc: () => 'Ao atacar: o time ganha Escudo igual a 2x o dano deste golpe. Aliados de Pedra ganham +8% de Dano.', cast: (c) => { if (c.lastDmg) c.b.addShield(c.f, c.lastDmg * 2); for (const a of typed(ally(c), 'rock')) c.b.pct(a, 0.08); } });
S(865, { ...ABILITY[865], desc: () => 'Contínuo: os críticos deste e de TODOS os aliados Lutadores causam 3,5x.', self: (st) => { st.critMult = 3.5; }, ongoing: (c) => { for (const a of typed(ally(c), 'fighting')) a.st.critMult = Math.max(a.st.critMult, 3.5); } });
S(866, { ...ABILITY[866], desc: (v) => `Ao atacar: aplica +${v(5)} Frio para cada aliado Psíquico ou de Gelo.`, cast: (c) => c.b.inflict(c.f, 'cold', c.v(5) * ally(c).filter((a) => has(a, 'psychic') || has(a, 'ice')).length) });
S(863, { ...ABILITY[863], desc: () => 'Contínuo: +2 Armadura para cada ₽10 que você tem (máx. ₽100).', self: (st, _u, ctx) => { st.armor += 2 * Math.min(10, Math.floor(ctx.gold / 10)); } });
S(979, { ...ABILITY[979], desc: (v) => `Quando qualquer Pokémon é nocauteado: +${v(18)} Dano Espectral permanentemente e +${v(15)} Crítico nesta batalha.`, anyKo: (c) => { c.b.buff(c.f, 'spectral', c.v(18), true); c.b.buff(c.f, 'crit', c.v(15), false); } });

const NONE: Ability = noAbility();
export const abilityOf = (id: number, shiny = false): Ability => (shiny && SHINY[id]) || ABILITY[id] || NONE;
export const hasShinyVariant = (id: number) => !!SHINY[id];
