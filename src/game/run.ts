import { abilityOf, addPerm, type ShopApi } from './abilities';
import { EVENT, EVENTS, ITEM, ITEMS, TRAINER, type TrainerDef } from './content';
import {
  ALL_IDS, DEX, RARITY_PRICE, SHOP_BY_RARITY, STONE_EVO, TRINKET_EVO, baseOf, branchPick, copiesFor, copiesNeeded, evoRule,
  levelEvolution, unitTypes, type EvoCtx,
} from './dex';
import {
  ABS_MAX_LEVEL, BENCH_SIZE, MAX_HEARTS, TEAM_SIZE, WINS_TO_WIN,
  type Gift, type Perm, type RunState, type ShopSlot, type StatKey, type Unit,
} from './model';
import { genOpponent } from './opponent';
import { makeRng, pick, shuffle, weighted, type Rng } from './rng';
import { TRINKET, TRINKETS, trinketIncome } from './trinkets';
import { getMeta, saveMeta } from './storage';
import { TYPES, TYPE_NAME, type PType } from './types';

export const RANK_ODDS: number[][] = [
  [100, 0, 0, 0, 0, 0],
  [100, 0, 0, 0, 0, 0],
  [75, 25, 0, 0, 0, 0],
  [60, 32, 8, 0, 0, 0],
  [48, 35, 15, 2, 0, 0],
  [38, 35, 20, 6, 1, 0],
  [30, 32, 25, 10, 3, 0],
  [22, 30, 28, 14, 5, 1],
  [16, 26, 30, 18, 8, 2],
  [12, 22, 30, 22, 11, 3],
  [8, 18, 30, 26, 14, 4],
];

export interface EvoNote { from: number; to: number; shiny: boolean }
export interface ActionResult { error?: string; evos?: EvoNote[]; msg?: string; merged?: boolean }

export const trainerOf = (run: RunState): TrainerDef => TRAINER[run.trainer];
const owns = (run: RunState, id: string) => run.trinkets.includes(id);

/** rng derivado do estado: cada chamada avança a seed salva */
function rngFor(run: RunState): Rng {
  const r = makeRng(run.seed);
  run.seed = (r() * 2 ** 32) >>> 0;
  return makeRng(run.seed);
}

export function rankOf(run: RunState) {
  return Math.max(1, Math.min(10, run.day + run.rankBonus + (trainerOf(run).rankBonus ?? 0) + run.rankToday));
}

export function shopOdds(run: RunState): number[] {
  const o: number[] = [...RANK_ODDS[rankOf(run)]];
  if (owns(run, 'member-card')) { o[0] = 0; o[1] = 0; if (!o.some((x) => x > 0)) o[2] = 100; }
  if (run.trainer === 'gentleman' && run.day >= 4) {
    o[0] = 0;
    o[1] = 0;
    if (!o.some((x) => x > 0)) o[2] = 100;
  }
  if (owns(run, 'research')) o[4] *= 3;
  return o;
}

export function monPrice(run: RunState, species: number, shiny: boolean) {
  if (run.trainer === 'bugcatcher' && !run.flags.bugFree && DEX[species].types.includes('bug')) return 0;
  return Math.max(1, RARITY_PRICE[DEX[species].rarity] + (shiny ? 5 : 0) - run.shopDiscount);
}

export function sellValue(u: Unit) {
  if (u.noSell) return 0;
  return Math.max(1, Math.floor(RARITY_PRICE[DEX[u.species].rarity] * 0.5 * copiesFor(u.species, u.level)) + (u.shiny ? 3 : 0));
}

export const rerollCost = (run: RunState) => (run.freeRerolls > 0 ? 0 : run.trainer === 'biker' ? 1 : 3);

export function newUnit(run: RunState, species: number, shiny = false, level = 1): Unit {
  const u: Unit = { uid: run.nextUid++, species, level, shiny, extraTypes: [], perm: {}, prog: {} };
  evolveByLevel(u, run);
  return u;
}

const ADJ = (i: number) => [i % 3 > 0 ? i - 1 : -1, i % 3 < 2 ? i + 1 : -1, i < 3 ? i + 3 : i - 3].filter((x) => x >= 0);

/** tipo mais comum do time (empate: sorteio pela seed) */
export function commonTeamType(run: RunState, rng: () => number = Math.random): PType | null {
  const count: Partial<Record<PType, number>> = {};
  for (const x of run.team) if (x) for (const t of unitTypes(x)) count[t] = (count[t] ?? 0) + 1;
  const max = Math.max(0, ...Object.values(count));
  if (!max) return null;
  const tied = (Object.keys(count) as PType[]).filter((t) => count[t] === max);
  return tied[Math.floor(rng() * tied.length)];
}

/** contexto da evolução: posição, King's Rock, tipo mais comum, vizinho de Aço */
export function evoCtx(u: Unit, run?: RunState): EvoCtx {
  if (!run) return { uid: u.uid };
  const slot = run.team.indexOf(u);
  return {
    uid: u.uid,
    kingsRock: run.trinkets.includes('kings-rock'),
    slot: slot >= 0 ? slot : null,
    commonType: commonTeamType(run, makeRng(run.seed ^ u.uid)),
    steelAdjacent: slot >= 0 && ADJ(slot).some((j) => run.team[j] && unitTypes(run.team[j]!).includes('steel')),
  };
}

export function evolveByLevel(u: Unit, run?: RunState): EvoNote[] {
  const notes: EvoNote[] = [];
  for (let guard = 0; guard < 3; guard++) {
    const next = levelEvolution(u.species, u.level, evoCtx(u, run));
    if (next == null) break;
    notes.push({ from: u.species, to: next, shiny: u.shiny });
    u.species = next;
  }
  return notes;
}

// ---------- criação da run ----------

export function newRun(trainer: string): RunState {
  const t = TRAINER[trainer];
  const run: RunState = {
    version: 2, seed: (Math.random() * 2 ** 32) >>> 0, day: 1, hearts: MAX_HEARTS, wins: 0, losses: 0,
    gold: 30 + (t.startGold ?? 0), trainer, bench: Array(BENCH_SIZE).fill(null), team: Array(TEAM_SIZE).fill(null),
    shop: [], locked: false, trinkets: [], hpBonus: 0, freeRerolls: 0, nextUid: 1, rankBonus: 0, rankToday: 0,
    itemsUsed: 0, itemLimit: 1, shopDiscount: 0, winChip: 0, flags: {}, opponent: null, queue: [], phase: 'shop',
    lastResult: null, eggs: [], log: [], pool: [], shopBuff: [], nextBuy: null,
  };
  // cada run usa uma "região" menor de Kanto, para as fusões de 3 cópias serem viáveis
  const prng = rngFor(run);
  const POOL_SIZE = [0, 7, 12, 10, 5, 3, 1];
  run.pool = SHOP_BY_RARITY.map((list, r) => shuffle(prng, list).slice(0, POOL_SIZE[r]));
  if (trainer === 'fisherman' && !run.pool[1].includes(129)) run.pool[1].push(129);
  if (trainer === 'pokemonranger') {
    const rng = rngFor(run);
    const sp = pick(rng, run.pool[2]);
    run.flags.ranger = sp;
    run.team[1] = newUnit(run, sp);
  }
  beginDay(run, true);
  return run;
}

// ---------- loja ----------

function rollRarity(run: RunState, rng: Rng, shift = 0) {
  const r = weighted(rng, [1, 2, 3, 4, 5, 6], shopOdds(run));
  return Math.min(6, r + shift);
}

function rollMon(run: RunState, rng: Rng, rarity?: number): { species: number; shiny: boolean } {
  const t = trainerOf(run);
  const shiny = rng() < (t.shinyChance ?? 0.04);
  // 25%: oferece uma linha que você já tem (se a raridade estiver liberada)
  if (rarity == null && rng() < 0.25) {
    const odds = shopOdds(run);
    const maxR = odds.reduce((m, o, i) => (o > 0 ? i + 1 : m), 1);
    const owned = [...new Set(allUnits(run).map((u) => baseOf(u.species)))].filter((id) => DEX[id].rarity <= maxR && run.pool.some((l) => l.includes(id)));
    if (owned.length) return { species: pick(rng, owned), shiny };
  }
  let r = rarity ?? rollRarity(run, rng);
  const src = run.pool?.length ? run.pool : SHOP_BY_RARITY;
  while (r > 1 && !src[r].length) r--;
  const pool = src[r].length ? src[r] : SHOP_BY_RARITY[r];
  const weights = pool.map((id) => DEX[id].types.reduce((w, ty) => w * (t.typeWeight?.[ty] ?? 1), 1));
  return { species: weighted(rng, pool, weights), shiny };
}

function rollShop(run: RunState) {
  const rng = rngFor(run);
  const slots: ShopSlot[] = [];
  // incensos: as próximas lojas só têm uma raridade
  const forced = run.flags.incenseLeft ? run.flags.incense : 0;
  if (forced) run.flags.incenseLeft--;
  for (let i = 0; i < 4; i++) {
    const m = rollMon(run, rng, forced || undefined);
    slots.push({ kind: 'mon', ...m, price: 0 });
  }
  const ir = rollRarity(run, rng);
  const pool = ITEMS.filter((it) => it.rarity <= ir);
  const top = Math.max(...pool.map((it) => it.rarity));
  const it = pick(rng, pool.filter((x) => x.rarity >= top - 1));
  slots.push({ kind: 'item', item: it.id, price: it.price });
  run.shop = slots;
  refreshPrices(run);
}

export function refreshPrices(run: RunState) {
  for (const s of run.shop) if (s?.kind === 'mon') s.price = monPrice(run, s.species, s.shiny);
}

export function income(run: RunState) {
  const t = trainerOf(run);
  const interest = Math.min(5, Math.floor(run.gold / 10)) + (owns(run, 'coin-case') ? Math.floor(run.gold / 10) : 0);
  return {
    base: Math.min(55, 25 + 3 * run.day),
    interest,
    extra: (t.income ?? 0) + trinketIncome(run.trinkets),
  };
}

export function reroll(run: RunState): string | null {
  const c = rerollCost(run);
  if (run.gold < c) return 'Dinheiro insuficiente';
  run.gold -= c;
  if (run.freeRerolls > 0) run.freeRerolls--;
  if (run.trainer === 'biker') {
    const us = allUnits(run);
    if (us.length) addPerm(us[Math.floor(rngFor(run)() * us.length)], 'dmg', 2);
  }
  rollShop(run);
  run.locked = false;
  return null;
}

// ---------- unidades, espaço e fusão ----------

type Zone = 'bench' | 'team';
export type { Zone };
const zoneArr = (run: RunState, z: Zone) => (z === 'bench' ? run.bench : run.team);
const allUnits = (run: RunState) => [...run.team, ...run.bench].filter((u): u is Unit => !!u);

function mergePerm(a: Perm, b: Perm): Perm {
  const out: Perm = { ...a };
  for (const [k, v] of Object.entries(b) as [StatKey, number][]) out[k] = Math.max(out[k] ?? 0, v);
  return out;
}

/** aplica fusões automáticas (3 Lv1 → Lv2, 2 Lv2 → Lv3). `overflow` são unidades ainda sem lugar */
function settle(run: RunState, overflow: Unit[] = []): { evos: EvoNote[]; msgs: string[]; merged: boolean } {
  const evos: EvoNote[] = [];
  const msgs: string[] = [];
  let merged = false;
  for (let guard = 0; guard < 20; guard++) {
    type Ref = { u: Unit; z: Zone | 'over'; i: number };
    const refs: Ref[] = [
      ...run.team.map((u, i) => ({ u: u!, z: 'team' as const, i })).filter((r) => r.u),
      ...run.bench.map((u, i) => ({ u: u!, z: 'bench' as const, i })).filter((r) => r.u),
      ...overflow.map((u, i) => ({ u, z: 'over' as const, i })),
    ];
    let did = false;
    for (const lvl of [1, 2, 3]) {
      const groups = new Map<number, Ref[]>();
      for (const r of refs) if (r.u.level === lvl) {
        const key = DEX[r.u.species].line;
        groups.set(key, [...(groups.get(key) ?? []), r]);
      }
      for (const g of groups.values()) {
        const need = copiesNeeded(baseOf(g[0].u.species), lvl);
        if (g.length < need) continue;
        const parts = g.slice(0, need);
        const target = parts[0].u;
        for (const p of parts.slice(1)) {
          target.shiny ||= p.u.shiny;
          target.perm = mergePerm(target.perm, p.u.perm);
          for (const t of p.u.extraTypes) if (!target.extraTypes.includes(t)) target.extraTypes.push(t);
          for (const [k, v] of Object.entries(p.u.prog)) target.prog[k] = Math.max(target.prog[k] ?? 0, v);
          if (DEX[p.u.species].stage > DEX[target.species].stage) target.species = p.u.species;
          if (p.z === 'over') overflow.splice(overflow.indexOf(p.u), 1);
          else zoneArr(run, p.z)[p.i] = null;
        }
        target.level = lvl + 1;
        target.noSell = false;
        msgs.push(`${DEX[target.species].name} subiu para o Lv. ${target.level}!`);
        evos.push(...evolveByLevel(target, run));
        onLevelUp(run, target);
        if (target.level === 3) {
          // prêmio de fusão: item segurado da raridade do Pokémon
          run.queue.push({ kind: 'gift', gift: makeGift(run, `Prêmio: ${DEX[target.species].name} Lv. 3`, Math.min(5, Math.max(1, DEX[target.species].rarity))) });
          if (run.phase === 'shop') run.phase = 'pending';
        }
        if (target.level === 3 && run.trainer === 'breeder') {
          const slot = run.team.indexOf(target);
          const nb = slot >= 0 ? ADJ(slot).map((j) => run.team[j]).filter((x): x is Unit => !!x) : [];
          const src = nb.find((x) => !unitTypes(target).includes(DEX[x.species].types[0]));
          if (src && gainType(run, target, DEX[src.species].types[0])) msgs.push(`Criador: ${DEX[target.species].name} ganhou o tipo ${TYPE_NAME[DEX[src.species].types[0]]}!`);
        }
        if (target.level === 3 && run.trainer === 'twins') {
          const copy: Unit = { ...structuredClone(target), uid: run.nextUid++, noSell: true };
          const free = run.bench.findIndex((x) => !x);
          if (free >= 0) { run.bench[free] = copy; msgs.push('Twins: ganhou uma cópia exata!'); }
        }
        if (parts[0].z === 'over') {
          // o alvo ainda está sem lugar: tenta achar um
          overflow.splice(overflow.indexOf(target), 1);
          if (!place(run, target)) overflow.push(target);
        }
        merged = did = true;
        break;
      }
      if (did) break;
    }
    if (!did) break;
  }
  return { evos, msgs, merged };
}

function onLevelUp(run: RunState, u: Unit) {
  if (owns(run, 'exp-share')) addPerm(u, 'cdSpeed', 0.1 * run.trinkets.filter((t) => t === 'exp-share').length);
  if (run.trainer === 'supernerd') run.flags.nerd = (run.flags.nerd ?? 0) + 1;
}

/** um Pokémon ganha um tipo (máx. 3); o stat do tipo novo vale +35% do orçamento */
export function gainType(_run: RunState, u: Unit, t: PType): boolean {
  const types = unitTypes(u);
  if (types.includes(t) || types.length >= 3) return false;
  u.extraTypes.push(t);
  return true;
}

/** coloca na equipe primeiro (frente → trás) e depois no PC */
function place(run: RunState, u: Unit): boolean {
  const t = [2, 5, 1, 4, 0, 3].find((i) => !run.team[i]);
  if (t != null) { run.team[t] = u; return true; }
  const b = run.bench.findIndex((x) => !x);
  if (b >= 0) { run.bench[b] = u; return true; }
  return false;
}

/** daria fusão se essa espécie entrasse agora? */
export function wouldMerge(run: RunState, species: number): boolean {
  const line = DEX[species].line;
  const lv1 = allUnits(run).filter((u) => u.level === 1 && DEX[u.species].line === line).length;
  return lv1 + 1 >= copiesNeeded(baseOf(species), 1);
}

export function copiesProgress(run: RunState, species: number): { have: number; need: number } {
  const line = DEX[species].line;
  return {
    have: allUnits(run).filter((u) => u.level === 1 && DEX[u.species].line === line).length,
    need: copiesNeeded(baseOf(species), 1),
  };
}

function shopApi(run: RunState, rng: Rng, out: { evos: EvoNote[]; msgs: string[] }): ShopApi {
  return {
    addUnit: (species, opts) => {
      const r = addUnit(run, species, opts?.level ?? 1, opts?.shiny ?? false);
      out.evos.push(...r.evos);
      return r.msg;
    },
    gold: (n) => { run.gold += n; },
    rng,
  };
}

/** adiciona um Pokémon ganho (evento, item, treinador) e resolve fusões */
export function addUnit(run: RunState, species: number, level = 1, shiny = false): { msg: string; evos: EvoNote[] } {
  const u = newUnit(run, species, shiny, level);
  const pre = u.species !== species ? [{ from: species, to: u.species, shiny }] : [];
  const over: Unit[] = [];
  if (!place(run, u)) over.push(u);
  const r = settle(run, over);
  if (over.length) {
    const v = sellValue(over[0]);
    run.gold += v;
    return { msg: `Sem espaço: ${DEX[over[0].species].name} foi vendido por ₽${v}`, evos: [...pre, ...r.evos] };
  }
  return { msg: `${DEX[u.species].name} entrou para o time!${r.msgs.length ? ' ' + r.msgs.join(' ') : ''}`, evos: [...pre, ...r.evos] };
}

export function buyMon(run: RunState, shopIdx: number, zone?: Zone, idx?: number): ActionResult {
  const slot = run.shop[shopIdx];
  if (!slot || slot.kind !== 'mon') return { error: 'Nada aqui' };
  if (run.gold < slot.price) return { error: 'Dinheiro insuficiente' };
  const u = newUnit(run, slot.species, slot.shiny);
  // buffs de loja (Nidorina) e da próxima compra (Exeggcute)
  for (const b of run.shopBuff ?? []) if (!b.type || unitTypes(u).includes(b.type)) for (const [k, v] of Object.entries(b.perm)) addPerm(u, k as StatKey, v);
  if (run.nextBuy) {
    if (run.nextBuy.type && !unitTypes(u).includes(run.nextBuy.type)) u.extraTypes.push(run.nextBuy.type);
    for (const [k, v] of Object.entries(run.nextBuy.perm)) addPerm(u, k as StatKey, v);
    run.nextBuy = null;
  }
  const lucky = owns(run, 'lucky-egg');
  const over: Unit[] = [];
  if (zone != null && idx != null && !zoneArr(run, zone)[idx]) zoneArr(run, zone)[idx] = u;
  else if (!place(run, u)) {
    if (!wouldMerge(run, slot.species)) return { error: 'Sem espaço no banco nem no time' };
    over.push(u);
  }
  run.gold -= slot.price;
  if (slot.price === 0 && run.trainer === 'bugcatcher' && DEX[slot.species].types.includes('bug')) run.flags.bugFree = 1;
  run.shop[shopIdx] = null;
  const out = { evos: [] as EvoNote[], msgs: [] as string[] };
  const rng = rngFor(run);
  const api = shopApi(run, rng, out);
  const m1 = abilityOf(u.species, u.shiny).bought?.(u, run, api);
  if (m1) out.msgs.push(m1);
  for (const o of allUnits(run)) if (o !== u) abilityOf(o.species, o.shiny).allyBought?.(o, run, u, api);
  if (lucky) {
    run.trinkets.splice(run.trinkets.indexOf('lucky-egg'), 1);
    u.level = Math.min(ABS_MAX_LEVEL, u.level + 1);
    out.evos.push(...evolveByLevel(u, run));
    out.msgs.push(`Ovo da Sorte: ${DEX[u.species].name} subiu de nível!`);
  }
  const r = settle(run, over);
  refreshPrices(run);
  return { evos: [...out.evos, ...r.evos], msg: [...out.msgs, ...r.msgs].join(' ') || undefined, merged: r.merged };
}

export function moveUnit(run: RunState, fz: Zone, fi: number, tz: Zone, ti: number): ActionResult {
  const from = zoneArr(run, fz), to = zoneArr(run, tz);
  if (fz === tz && fi === ti) return {};
  [from[fi], to[ti]] = [to[ti], from[fi]];
  return {};
}

export function sellUnit(run: RunState, z: Zone, i: number): ActionResult {
  const arr = zoneArr(run, z);
  const u = arr[i];
  if (!u) return {};
  const v = sellValue(u);
  run.gold += v;
  arr[i] = null;
  return { msg: `+₽${v}` };
}

// ---------- itens ----------

export function itemsLeft(run: RunState) {
  return run.itemLimit - run.itemsUsed;
}

function stoneTarget(run: RunState, stone: string): Unit | null {
  // pedras evoluem antes (ou escolhem o ramo) qualquer Pokémon compatível
  const cands = allUnits(run).filter((u) => STONE_EVO.some(([sp, it]) => sp === u.species && it === stone));
  return cands.sort((a, b) => b.level - a.level)[0] ?? null;
}
const isStone = (id: string) => STONE_EVO.some(([, it]) => it === id);
/** itens com alvo escolhido pelo jogador */
export const TARGETED_ITEMS = new Set(['tm-type']);

export function canUseItem(run: RunState, id: string): string | null {
  if (itemsLeft(run) <= 0) return 'Você já usou o item de hoje';
  const it = ITEM[id];
  if (isStone(id) && !stoneTarget(run, id)) return `Nenhum Pokémon evolui com ${it.name}`;
  if (id === 'tm-type' && !allUnits(run).some((u) => unitTypes(u).length < 3)) return 'Todos os seus Pokémon já têm 3 tipos';
  const units = allUnits(run);
  if (id === 'rare-candy' && !units.some((u) => u.level === 1 && DEX[u.species].rarity <= 2)) return 'Nenhum Pokémon Lv. 1 Comum/Incomum';
  if (id === 'old-gateau' && !units.some((u) => u.level === 3)) return 'Nenhum Pokémon Lv. 3';
  if ((id === 'lava-cookie' || id === 'protein' || id === 'shiny-stone') && !units.length) return 'Você não tem Pokémon';
  if (id === 'moomoo-milk' && !run.team[5]) return 'Não há Pokémon no canto de baixo à direita';
  if (id === 'poke-ball' && !run.shop.some((s) => s?.kind === 'mon')) return 'A loja não tem Pokémon';
  return null;
}

export function buyItem(run: RunState, shopIdx: number, target?: { zone: Zone; idx: number }): ActionResult {
  const slot = run.shop[shopIdx];
  if (!slot || slot.kind !== 'item') return { error: 'Nada aqui' };
  if (run.gold < slot.price) return { error: 'Dinheiro insuficiente' };
  const err = canUseItem(run, slot.item);
  if (err) return { error: err };
  const tu = target ? zoneArr(run, target.zone)[target.idx] : null;
  if (TARGETED_ITEMS.has(slot.item)) {
    if (!tu) return { error: 'Escolha um Pokémon para usar o item' };
    if (unitTypes(tu).length >= 3) return { error: 'Esse Pokémon já tem 3 tipos' };
  }
  run.gold -= slot.price;
  run.shop[shopIdx] = null;
  run.itemsUsed++;
  const it = ITEM[slot.item];
  if (it.extraUse) run.itemLimit += it.extraUse;
  const res = applyItem(run, slot.item, tu);
  // gatilho "Quando você usa um item"
  const out = { evos: [] as EvoNote[], msgs: [] as string[] };
  const api = shopApi(run, rngFor(run), out);
  for (const u of allUnits(run)) { const m = abilityOf(u.species, u.shiny).itemUsed?.(u, run, api); if (m) out.msgs.push(m); }
  refreshPrices(run);
  return { ...res, evos: [...(res.evos ?? []), ...out.evos], msg: [res.msg, ...out.msgs].filter(Boolean).join(' ') || undefined };
}

function applyItem(run: RunState, id: string, target: Unit | null = null): ActionResult {
  const rng = rngFor(run);
  const units = allUnits(run);
  const ofType = (t: string) => units.filter((u) => unitTypes(u).includes(t as never));
  const evos: EvoNote[] = [];
  switch (id) {
    case 'repel': run.rankToday--; rollShop(run); return { msg: 'Rank da loja -1 hoje' };
    case 'lava-cookie': {
      const picked = shuffle(rng, units).slice(0, 2);
      for (const u of picked) addPerm(u, 'dmg', 5);
      return { msg: `+5 Dano: ${picked.map((u) => DEX[u.species].name).join(' e ')}` };
    }
    case 'coupon': run.shopDiscount += 3; refreshPrices(run); return { msg: 'Pokémon ₽3 mais baratos hoje' };
    case 'soda-pop': run.freeRerolls++; return { msg: '+1 reroll grátis' };
    case 'lemonade': run.winChip += 15; return { msg: 'Vença a próxima batalha para ganhar ₽15' };
    case 'poke-ball': {
      const idxs = run.shop.map((s, i) => (s?.kind === 'mon' ? i : -1)).filter((i) => i >= 0);
      const i = pick(rng, idxs);
      const s = run.shop[i] as Extract<ShopSlot, { kind: 'mon' }>;
      const price = s.price;
      s.price = 0;
      run.gold += 0;
      const r = buyMon(run, i);
      if (r.error) { s.price = price; return r; }
      return { ...r, msg: `Capturou ${DEX[s.species].name}! ${r.msg ?? ''}` };
    }
    case 'lure': run.rankBonus++; return { msg: 'Rank da loja +1' };
    case 'protein': for (const u of units) addPerm(u, 'dmg', 5); return { msg: 'Seus Pokémon ganharam +5 Dano' };
    case 'moomoo-milk': addPerm(run.team[5]!, 'dmg', 8); return { msg: '+8 Dano e +1 item hoje' };
    case 'hp-up': run.hpBonus += 200; return { msg: '+200 HP máximo' };
    case 'iron': for (const u of ofType('rock')) addPerm(u, 'shield', 20); return { msg: 'Pedra +20 Escudo' };
    case 'calcium': for (const u of ofType('water')) addPerm(u, 'heal', 10); return { msg: 'Água +10 Cura' };
    case 'zinc': for (const u of ofType('poison')) addPerm(u, 'poison', 1); return { msg: 'Veneno +1' };
    case 'carbos': for (const u of ofType('fire')) addPerm(u, 'burn', 1); return { msg: 'Fogo +1 Queimadura' };
    case 'pp-up': for (const u of ofType('electric')) addPerm(u, 'shock', 1); return { msg: 'Elétrico +1 Choque' };
    case 'rare-candy': {
      const u = pick(rng, units.filter((x) => x.level === 1 && DEX[x.species].rarity <= 2));
      u.level++;
      evos.push(...evolveByLevel(u, run));
      onLevelUp(run, u);
      const r = settle(run);
      return { evos: [...evos, ...r.evos], msg: `${DEX[u.species].name} subiu para o Lv. ${u.level}!` };
    }
    case 'old-gateau': {
      const u = pick(rng, units.filter((x) => x.level === 3));
      u.level = 4;
      return { msg: `${DEX[u.species].name} chegou ao Lv. 4!` };
    }
    case 'great-ball': { const r = addUnit(run, pick(rng, SHOP_BY_RARITY[4])); return { msg: r.msg, evos: r.evos }; }
    case 'ultra-ball': { const r = addUnit(run, pick(rng, SHOP_BY_RARITY[5])); return { msg: r.msg, evos: r.evos }; }
    case 'tm-type': {
      const u = target!;
      const opts = TYPES.filter((t) => !unitTypes(u).includes(t));
      const t = pick(rng, opts);
      gainType(run, u, t);
      return { msg: `${DEX[u.species].name} aprendeu o tipo ${TYPE_NAME[t]}!` };
    }
    case 'shiny-stone': {
      const u = pick(rng, units.filter((x) => !x.shiny).length ? units.filter((x) => !x.shiny) : units);
      u.shiny = true;
      return { msg: `${DEX[u.species].name} ficou SHINY! (+1 item hoje)` };
    }
  }
  if (isStone(id)) {
    const u = stoneTarget(run, id)!;
    const to = STONE_EVO.find(([sp, it]) => sp === u.species && it === id)![2];
    evos.push({ from: u.species, to, shiny: u.shiny });
    u.species = to;
    return { evos };
  }
  return {};
}

// ---------- dia ----------

export function beginDay(run: RunState, first = false) {
  const rng = rngFor(run);
  const t = trainerOf(run);
  run.log = [];
  if (!first) {
    const inc = income(run);
    run.gold += inc.base + inc.interest + inc.extra;
  }
  run.itemsUsed = 0;
  run.itemLimit = 1 + run.trinkets.filter((x) => x === 'card-key').length;
  run.rankToday = 0;
  run.shopDiscount = 0;
  run.flags.bugFree = 0;
  run.freeRerolls = (t.freeRerolls ?? 0) + (owns(run, 'bicycle') ? 1 : 0);

  const out = { evos: [] as EvoNote[], msgs: [] as string[] };
  // ovos
  for (const e of run.eggs) e.days--;
  for (const e of run.eggs.filter((x) => x.days <= 0)) {
    const shiny = !!run.flags.shinyEgg;
    run.flags.shinyEgg = 0;
    run.log.push('Um ovo chocou! ' + addUnit(run, e.species, e.level, shiny).msg);
  }
  if (run.flags.bonusRerolls) { run.freeRerolls += run.flags.bonusRerolls; run.flags.bonusRerolls = 0; }
  run.eggs = run.eggs.filter((x) => x.days > 0);
  // treinador
  if (run.trainer === 'fisherman' && !first) run.log.push('Fisherman: ' + addUnit(run, 129).msg);
  if (run.trainer === 'swimmer') {
    const water = ALL_IDS.filter((id) => DEX[id].stage === 0 && DEX[id].types.includes('water') && DEX[id].rarity <= Math.min(4, 1 + Math.floor(run.day / 3)));
    run.log.push('Swimmer: ' + addUnit(run, pick(rng, water)).msg);
  }
  if (run.trainer === 'pokemonranger' && !first && run.day % 2 === 1 && run.flags.ranger) run.log.push('Ranger: ' + addUnit(run, run.flags.ranger).msg);
  if (run.trainer === 'scientist' && run.day === 7) {
    run.team = run.team.map((u) => (u ? newUnit(run, pick(rng, SHOP_BY_RARITY[5])) : null));
    run.log.push('Scientist: seu time virou Pokémon Lendários!');
  }
  if (run.trainer === 'gambler' && run.day === 9) {
    run.gold += 30;
    run.log.push('Gambler: +₽30. ' + addUnit(run, 151).msg);
  }
  if (run.trainer === 'chef') {
    const cands = allUnits(run).filter((u) => unitTypes(u).length < 3);
    if (cands.length) {
      const u = pick(rng, cands);
      const t = pick(rng, TYPES.filter((x) => !unitTypes(u).includes(x)));
      gainType(run, u, t);
      run.log.push(`Chef de Celadon: ${DEX[u.species].name} ganhou o tipo ${TYPE_NAME[t]}!`);
    }
  }
  const api = shopApi(run, rng, out);
  for (const u of allUnits(run)) {
    const m = abilityOf(u.species, u.shiny).dayStart?.(u, run, api);
    if (m) run.log.push(m);
  }
  if (!run.locked || run.shop.length === 0) rollShop(run);
  else refreshPrices(run);
  run.locked = false;
  run.opponent = genOpponent(run.day, rng, getMeta().mmr ?? 1000);
  if (run.day === 3 || run.day === 6 || run.day === 9) {
    const pool = EVENTS.filter((e) => e.day === run.day);
    run.queue.push({ kind: 'event', id: pick(rng, pool).id });
  }
  run.phase = run.queue.length ? 'pending' : 'shop';
}

// ---------- presentes de item segurado ----------

export function makeGift(run: RunState, reason: string, rarity?: number): Gift {
  const rng = rngFor(run);
  const two = run.trainer === 'burglar';
  const n = two ? 2 : 3;
  const shift = run.trainer === 'ruinmaniac' ? 1 : 0;
  const choices: string[] = [];
  for (let k = 0; k < 30 && choices.length < n; k++) {
    let r = rarity ?? Math.min(5, Math.max(1, rollRarity(run, rng) + shift));
    let pool: typeof TRINKETS = [];
    while (r >= 1 && !pool.length) {
      pool = TRINKETS.filter((t) => t.rarity === r && !choices.includes(t.id) && !(t.unique && owns(run, t.id)));
      r--;
    }
    if (pool.length) choices.push(pick(rng, pool).id);
  }
  return { choices, takeAll: two, reason };
}

export function takeGift(run: RunState, idx: number): string {
  const p = run.queue[0];
  if (p?.kind !== 'gift') return '';
  const ids = p.gift.takeAll ? p.gift.choices : [p.gift.choices[idx]];
  run.queue.shift();
  const notes: string[] = [];
  for (const id of ids) {
    gainTrinket(run, id, notes);
    // Disco Duvidoso: o próximo item segurado vem em dobro
    if (run.flags.dupe && !TRINKET[id].unique && id !== 'dubious-disc') { run.flags.dupe--; gainTrinket(run, id, notes); notes.push('Disco Duvidoso: veio em dobro!'); }
  }
  run.phase = run.queue.length ? 'pending' : 'shop';
  return `Ganhou: ${ids.map((i) => TRINKET[i].name).join(' e ')}.${notes.length ? ' ' + notes.join(' ') : ''}`;
}

/** adiciona um item segurado e aplica efeitos imediatos (incensos, Porygon2...) */
export function gainTrinket(run: RunState, id: string, notes: string[] = []) {
  run.trinkets.push(id);
  if (id === 'bicycle') run.freeRerolls++;
  if (id === 'card-key') run.itemLimit++;
  if (id === 'dubious-disc') run.flags.dupe = (run.flags.dupe ?? 0) + 1;
  const inc: Record<string, number> = { 'sea-incense': 3, 'pure-incense': 4, 'luck-incense': 5 };
  if (inc[id]) { run.flags.incense = inc[id]; run.flags.incenseLeft = 5; }
  const rng = makeRng(run.seed + run.trinkets.length);
  const api: ShopApi = { addUnit: (sp, o) => addUnit(run, sp, o?.level ?? 1, o?.shiny ?? false).msg, gold: (n) => { run.gold += n; }, rng };
  for (const u of allUnits(run)) { const m = abilityOf(u.species, u.shiny).trinketGained?.(u, run, api); if (m) notes.push(m); }
}

// ---------- encontros ----------

export function eventOptionOk(run: RunState, id: string, opt: number): boolean {
  const o = EVENT[id].options[opt];
  if (o.cost && run.gold < o.cost) return false;
  if ((id === 'meteor' || id === 'daycare') && opt === 0 && !allUnits(run).some((u) => u.level === 1)) return false;
  if (id === 'rocket' && opt === 1 && run.hearts <= 1) return false;
  if (id === 'cinnabar' && opt === 1) return allUnits(run).some((u) => unitTypes(u).length < 3);
  if ((id === 'berrytree' && opt === 0) || (id === 'cinnabar' && opt < 2) || (id === 'oak' && opt === 0) || (id === 'bill' && opt === 0)) return allUnits(run).length > 0;
  return true;
}

export function runEvent(run: RunState, id: string, opt: number): ActionResult {
  const rng = rngFor(run);
  const o = EVENT[id].options[opt];
  if (o.cost) run.gold -= o.cost;
  run.queue.shift();
  const units = allUnits(run);
  const evos: EvoNote[] = [];
  const add = (sp: number, level = 1, shiny = false) => { const r = addUnit(run, sp, level, shiny); evos.push(...r.evos); return r.msg; };
  const trinket = (t: string) => { gainTrinket(run, t); return `Ganhou o item segurado ${TRINKET[t].name}!`; };
  let msg = '';
  const lastAdded = () => [...run.team, ...run.bench].filter(Boolean).sort((a, b) => b!.uid - a!.uid)[0]!;
  switch (`${id}:${opt}`) {
    case 'bugcatcher:0': msg = add(10, 2); break;
    case 'bugcatcher:1': msg = add(127); addPerm(lastAdded(), 'dmg', 20); break;
    case 'bugcatcher:2': msg = add(123); addPerm(lastAdded(), 'casts', 1); break;
    case 'dragonden:0': run.eggs.push({ species: 147, days: 2, level: 2 }); msg = 'Você guardou o ovo. Ele vai chocar em 2 dias.'; break;
    case 'dragonden:1': msg = trinket('dragon-fang'); break;
    case 'berrytree:0': { const u = pick(rng, units); u.shiny = true; msg = `${DEX[u.species].name} ficou SHINY!`; break; }
    case 'berrytree:1': msg = trinket('oran-berry'); break;
    case 'magikarpguy:0': msg = [add(129), add(129), add(129)].pop()!; break;
    case 'magikarpguy:1': msg = add(129, 1, true); break;
    case 'magikarpguy:2': run.gold += 15; msg = 'O golpista foi preso. +₽15'; break;
    case 'fossil:0': msg = add(138, 2); break;
    case 'fossil:1': msg = add(140, 2); break;
    case 'amber:0': msg = add(142); break;
    case 'amber:1': msg = trinket('kings-rock'); break;
    case 'meteor:0': {
      const u = pick(rng, units.filter((x) => x.level === 1));
      u.level++;
      evos.push(...evolveByLevel(u, run));
      evos.push(...settle(run).evos);
      msg = `${DEX[u.species].name} subiu para o Lv. ${u.level}!`;
      break;
    }
    case 'meteor:1': msg = add(35, 1, true); break;
    case 'pokemaniac:0': {
      const cands = units.filter((x) => x.level === 1);
      const u = cands.length ? pick(rng, cands) : null;
      if (!u) { msg = 'Você não tinha nenhum Pokémon Lv. 1 para trocar.'; break; }
      for (const arr of [run.team, run.bench]) { const i = arr.indexOf(u); if (i >= 0) arr[i] = null; }
      const r = Math.min(5, DEX[u.species].rarity + 1);
      msg = `Trocou ${DEX[u.species].name}: ` + add(pick(rng, run.pool[r]?.length ? run.pool[r] : SHOP_BY_RARITY[r]));
      break;
    }
    case 'pokemaniac:1': run.freeRerolls += 2; run.flags.bonusRerolls = 2; msg = '+2 rerolls grátis hoje e amanhã.'; break;
    case 'bill:0': { const u = pick(rng, units); msg = 'Clonou! ' + add(baseOf(u.species), 1, u.shiny); break; }
    case 'bill:1': msg = trinket('dubious-disc'); break;
    case 'johto:0': run.eggs.push({ species: pick(rng, [172, 173, 174, 236, 238, 239, 240]), days: 1, level: 2 }); run.flags.shinyEgg = 1; msg = 'Você ganhou um ovo de Johto. Choca amanhã!'; break;
    case 'johto:1': msg = trinket('metal-coat'); break;
    case 'johto:2': msg = trinket('kings-rock'); break;
    case 'gamecorner:0': if (rng() < 0.5) { run.gold += 30; msg = 'JACKPOT! +₽30'; } else msg = 'Não foi dessa vez...'; break;
    case 'gamecorner:1': msg = add(137); break;
    case 'daycare:0': {
      const u = pick(rng, units.filter((x) => x.level === 1));
      u.level = 2;
      evos.push(...evolveByLevel(u, run));
      evos.push(...settle(run).evos);
      msg = `${DEX[u.species].name} subiu para o Lv. 2!`;
      break;
    }
    case 'daycare:1': run.eggs.push({ species: pick(rng, run.pool[3].length ? run.pool[3] : SHOP_BY_RARITY[3]), days: 1, level: 1 }); msg = 'Você ficou com o ovo. Ele choca amanhã!'; break;
    case 'rocket:0': {
      const pool = TRINKETS.filter((t) => t.rarity === 5 && !(t.unique && owns(run, t.id)));
      msg = trinket(pick(rng, pool).id);
      break;
    }
    case 'rocket:1': run.hearts--; run.queue.unshift({ kind: 'gift', gift: makeGift(run, 'Espólio da Equipe Rocket', 4) }); msg = 'A Equipe Rocket decolou de novo! -1 ❤'; break;
    case 'rocket:2': msg = 'Você correu e eles nem perceberam.'; break;
    case 'fountain:0': run.rankBonus += 2; msg = 'Rank da loja +2!'; break;
    case 'fountain:1': msg = trinket('big-nugget'); break;
    case 'fountain:2': msg = add(131); break;
    case 'safari:0': msg = add(113); break;
    case 'safari:1': msg = add(115); break;
    case 'safari:2': msg = add(128); break;
    case 'dragontamer:0': msg = add(129, 2, true); break;
    case 'dragontamer:1': msg = add(147, 2, true); break;
    case 'dragontamer:2': msg = add(142, 2, true); break;
    case 'cinnabar:0': {
      for (const arr of [run.team, run.bench]) arr.forEach((u, i) => {
        if (!u) return;
        const r = Math.min(5, DEX[u.species].rarity + 1);
        const nu = newUnit(run, pick(rng, SHOP_BY_RARITY[r]), u.shiny, u.level);
        nu.perm = u.perm;
        arr[i] = nu;
      });
      msg = 'Seu time foi recombinado!';
      break;
    }
    case 'cinnabar:1': {
      run.queue.unshift({ kind: 'typepick', types: shuffle(rng, [...TYPES]).slice(0, 3) });
      msg = 'Escolha o tipo da infusão!';
      break;
    }
    case 'cinnabar:2': msg = trinket('relic-gold'); break;
    case 'oak:0': {
      const u = units.filter((x) => x.level < ABS_MAX_LEVEL).sort((a, b) => b.level - a.level)[0];
      if (u) { u.level++; evos.push(...evolveByLevel(u, run)); onLevelUp(run, u); msg = `${DEX[u.species].name} subiu para o Lv. ${u.level}!`; }
      evos.push(...settle(run).evos);
      break;
    }
    case 'oak:1': msg = trinket('research'); break;
    case 'birds:0': msg = add(144); break;
    case 'birds:1': msg = add(145); break;
    case 'birds:2': msg = add(146); break;
    case 'secondchance:0': run.hearts++; run.queue.unshift({ kind: 'gift', gift: makeGift(run, 'Enfermeira Joy', 4) }); msg = '+1 ❤ e um presente!'; break;
    case 'secondchance:1': run.hearts++; msg = '+1 ❤. ' + add(pick(rng, SHOP_BY_RARITY[4]), 2); break;
    case 'secondchance:2': run.hearts++; msg = '+1 ❤. ' + trinket('amulet-hp'); break;
    case 'league:0': msg = add(143, 2, true); break;
    case 'league:1': msg = add(122, 4, true); break;
    case 'league:2': msg = trinket('amulet-hp'); break;
    default:
      if (o.result.includes('$')) {
        const n = Number(o.result.match(/₽(\d+)/)?.[1] ?? 0);
        run.gold += n;
        msg = `+₽${n}`;
      }
  }
  run.phase = run.queue.length ? 'pending' : 'shop';
  return { msg, evos };
}

/** Infusão de Tipo (Cinnabar): o tipo escolhido vai para um Pokémon aleatório que ainda tenha espaço */
export function pickType(run: RunState, idx: number): string {
  const p = run.queue[0];
  if (p?.kind !== 'typepick') return '';
  run.queue.shift();
  const t = p.types[idx];
  const cands = allUnits(run).filter((u) => !unitTypes(u).includes(t) && unitTypes(u).length < 3);
  run.phase = run.queue.length ? 'pending' : 'shop';
  if (!cands.length) return 'Nenhum Pokémon pôde receber o tipo.';
  const u = pick(rngFor(run), cands);
  gainType(run, u, t);
  return `${DEX[u.species].name} ganhou o tipo ${TYPE_NAME[t]}!`;
}

// ---------- batalha ----------

/** efeitos antes da batalha (Master Ball, Slowpoke ao lado de Shellder) */
export function preBattle(run: RunState): EvoNote[] {
  const evos: EvoNote[] = [];
  if (owns(run, 'master-ball')) {
    for (const u of allUnits(run)) if (DEX[u.species].rarity <= 2 && u.level < 3) { u.level = 3; evos.push(...evolveByLevel(u, run)); }
  }
  run.team.forEach((u, i) => {
    if (!u || u.species !== 79) return;
    if (ADJ(i).some((j) => run.team[j] && [90, 91].includes(run.team[j]!.species))) u.prog.shellder = 1;
  });
  // itens segurados de evolução (seção 7.1): antecipam no início da próxima batalha
  for (const [item, pairs] of Object.entries(TRINKET_EVO)) {
    if (!owns(run, item)) continue;
    for (const u of allUnits(run)) {
      const hit = pairs.find(([from]) => from === u.species);
      if (hit) { evos.push({ from: u.species, to: hit[1], shiny: u.shiny }); u.species = hit[1]; }
    }
  }
  evos.push(...counterEvolutions(run));
  return evos;
}

function counterEvolutions(run: RunState): EvoNote[] {
  const evos: EvoNote[] = [];
  for (const u of allUnits(run)) {
    const r = evoRule(u.species);
    // Eevee: Sylveon com 15 de Bênção no time, Espeon após 3 vitórias, Umbreon após 2 derrotas
    const eevee = u.species === 133 ? ((u.prog.teamBless ?? 0) >= 15 ? 700 : (u.prog.wins ?? 0) >= 3 ? 196 : (u.prog.losses ?? 0) >= 2 ? 197 : 0) : 0;
    if (eevee || (r.kind === 'counter' && u.species !== 133 && (u.prog[r.key] ?? 0) >= r.need)) {
      const to = eevee || branchPick(u.species, evoCtx(u, run));
      evos.push({ from: u.species, to, shiny: u.shiny });
      u.species = to;
    }
  }
  return evos;
}

export function heartsLostFor(day: number) {
  return day <= 3 ? 1 : day <= 6 ? 2 : 3;
}

export interface BattleStats {
  gold: number;
  goldBy: Record<number, number>;
  koSeen: Record<number, number>;
  /** contadores do time (evoluções por contador, seção 9) */
  team?: { burn: number; poison: number; shock: number; cold: number; shieldRecv: number; blessing: number };
  crits?: Record<number, number>;
  attacks?: Record<number, number>;
}
export interface BattleOutcome { won: boolean; heartsLost: number; notes: string[]; runOver: 'win' | 'lose' | null; evos: EvoNote[] }

export function applyBattle(run: RunState, won: boolean, bs: BattleStats): BattleOutcome {
  const rng = rngFor(run);
  const notes: string[] = [];
  let heartsLost = 0;
  const out = { evos: [] as EvoNote[], msgs: [] as string[] };
  const api = shopApi(run, rng, out);
  if (bs.gold) { run.gold += bs.gold; notes.push(`Pay Day: +₽${bs.gold}`); }
  for (const u of run.team) {
    if (!u) continue;
    u.prog.battles = (u.prog.battles ?? 0) + 1;
    if (won) u.prog.wins = (u.prog.wins ?? 0) + 1;
    if (!won) u.prog.losses = (u.prog.losses ?? 0) + 1;
    u.prog.allyKo = (u.prog.allyKo ?? 0) + (bs.koSeen[u.uid] ?? 0);
    u.prog.gold = (u.prog.gold ?? 0) + (bs.goldBy[u.uid] ?? 0);
    u.prog.crits = (u.prog.crits ?? 0) + (bs.crits?.[u.uid] ?? 0);
    u.prog.attacks = (u.prog.attacks ?? 0) + (bs.attacks?.[u.uid] ?? 0);
    if (bs.team) {
      u.prog.teamBurn = (u.prog.teamBurn ?? 0) + bs.team.burn;
      u.prog.teamShock = (u.prog.teamShock ?? 0) + bs.team.shock;
      u.prog.teamCold = (u.prog.teamCold ?? 0) + bs.team.cold;
      u.prog.teamPoison = (u.prog.teamPoison ?? 0) + bs.team.poison;
      u.prog.teamShield = (u.prog.teamShield ?? 0) + bs.team.shieldRecv;
      u.prog.teamBless = Math.max(u.prog.teamBless ?? 0, bs.team.blessing);
    }
  }
  // Ranked: MMR só muda contra fantasmas (times de outros jogadores/runs)
  if (run.opponent?.ghost) {
    const m = getMeta();
    m.mmr = Math.max(0, (m.mmr ?? 1000) + (won ? 25 : -20));
    saveMeta();
  }
  if (won) {
    run.wins++;
    const coins = run.trinkets.filter((t) => t === 'amulet-coin').length * 8 + run.winChip;
    if (coins) { run.gold += coins; notes.push(`+₽${coins}`); }
    const mb = run.trinkets.filter((t) => t === 'muscle-band').length;
    if (mb) for (const u of run.team) if (u) addPerm(u, 'dmg', 4 * mb);
    for (const u of run.team) if (u) { const m = abilityOf(u.species, u.shiny).victory?.(u, run, api); if (m) notes.push(m); }
  } else {
    run.losses++;
    heartsLost = heartsLostFor(run.day);
    run.hearts = Math.max(0, run.hearts - heartsLost);
    for (const u of run.team) if (u) { const m = abilityOf(u.species, u.shiny).defeat?.(u, run, api); if (m) notes.push(m); }
    const fb = run.trinkets.indexOf('focus-band');
    if (fb >= 0) { run.trinkets.splice(fb, 1); run.gold += 40; notes.push('Faixa de Foco: +₽40'); }
  }
  run.winChip = 0;
  notes.push(...out.msgs);
  const evos = [...out.evos, ...counterEvolutions(run)];
  run.lastResult = { won, heartsLost };

  let runOver: BattleOutcome['runOver'] = null;
  if (run.wins >= WINS_TO_WIN && !run.flags.endless) runOver = 'win';
  else if (run.hearts <= 0) runOver = 'lose';
  if (runOver) {
    run.phase = 'over';
    return { won, heartsLost, notes, runOver, evos };
  }
  // fila de telas para antes do próximo dia
  if (won) run.queue.push({ kind: 'gift', gift: makeGift(run, 'Prêmio da vitória') });
  else {
    const sb = run.trinkets.indexOf('smoke-ball');
    if (sb >= 0) { run.trinkets.splice(sb, 1); run.queue.push({ kind: 'gift', gift: makeGift(run, 'Bola de Fumaça') }); }
    if (run.hearts <= 3 && !run.flags.secondChance) {
      run.flags.secondChance = 1;
      run.queue.push({ kind: 'event', id: 'secondchance' });
    }
  }
  if (run.wins === WINS_TO_WIN - 1 && !run.flags.league && !run.flags.endless) {
    run.flags.league = 1;
    run.queue.push({ kind: 'event', id: 'league' });
  }
  run.day++;
  beginDay(run);
  return { won, heartsLost, notes, runOver, evos };
}

export { TYPES };
