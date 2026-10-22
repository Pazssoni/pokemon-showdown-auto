import { writeFileSync } from 'node:fs';
import { ABILITY, SHINY, abilityOf, scaler } from '../../src/game/abilities';
import type { TrainerDef } from '../../src/game/content';
import { ALL_IDS, BABIES, DEX, RARITY_PRICE, SHOP_BY_RARITY, evoRuleText, lineMembers, stageFactor } from '../../src/game/dex';
import { RARITY_NAME } from '../../src/game/model';
import { RATE, TYPE_TUNE, TYPE_SHARE, computeStats, effCd, makeCtx } from '../../src/game/stats';
import { HP_CURVE } from '../../src/game/opponent';
import { TRINKETS } from '../../src/game/trinkets';
import { ITEMS, TRAINERS } from '../../src/game/content';
import { TYPES, TYPE_NAME, TYPE_EFFECT, TYPE_COLOR } from '../../src/game/types';
const NEUTRAL: TrainerDef = { id: 'none', title: '', sprite: '', desc: '' };
const KEYS = ['dmg', 'spectral', 'heal', 'cleanse', 'shield', 'armor', 'burn', 'poison', 'shock', 'cold', 'growth', 'crit', 'charge', 'swarm', 'echo', 'punish', 'blessing'] as const;
const HOOKS = ['self', 'ongoing', 'start', 'early', 'pre', 'cast', 'allyCast', 'ko', 'anyKo', 'tick', 'bought', 'allyBought', 'dayStart', 'victory', 'defeat', 'itemUsed', 'trinketGained', 'onShield', 'blessAll', 'coldLock', 'amplifyBehind'] as const;
const stats = (id: number, lv: number, shiny = false) => {
  const u = { uid: 1, species: id, level: lv, shiny, extraTypes: [], perm: {}, prog: {} };
  const st = computeStats(u, makeCtx([u], NEUTRAL, []));
  const o: Record<string, number> = { cd: Math.round(effCd(st) * 10) / 10, hp: st.hp, casts: st.casts, pierce: st.pierce, critMult: st.critMult };
  for (const k of KEYS) if (st[k]) o[k] = st[k];
  return o;
};
const ab = (id: number, shiny: boolean) => {
  const a = abilityOf(id, shiny);
  return { name: a.name, none: !!a.none, desc: a.desc(scaler(1, shiny ? 1.2 : 1)), descLv3: a.desc(scaler(3, shiny ? 1.2 : 1)), hooks: HOOKS.filter((h) => (a as Record<string, unknown>)[h]) };
};
const shop = new Set(SHOP_BY_RARITY.flat());
const species = ALL_IDS.map((id) => {
  const s = DEX[id];
  const maxLv = lineMembers(id)[0] === 60 ? 5 : 4;
  return {
    id, name: s.name, types: s.types, rarity: s.rarity, rarityName: RARITY_NAME[s.rarity], budget: s.budget, bst: s.bst, stage: s.stage,
    stageFactor: stageFactor(id), baby: BABIES.has(id), line: lineMembers(id), base: lineMembers(id)[0], inShop: shop.has(id), price: RARITY_PRICE[s.rarity],
    evo: evoRuleText(id), evolvesTo: s.evolvesTo.map((e) => e.id), anim: s.anim !== false,
    stats: Array.from({ length: maxLv }, (_, i) => stats(id, i + 1)),
    ability: ab(id, false), shiny: SHINY[id] ? ab(id, true) : null, hasShinyVariant: !!SHINY[id],
  };
});
writeFileSync(process.argv[2], JSON.stringify({
  species, RATE, TYPE_TUNE, TYPE_SHARE, HP_CURVE,
  types: TYPES.map((t) => ({ id: t, name: TYPE_NAME[t], effect: TYPE_EFFECT[t], color: TYPE_COLOR[t] })),
  trinkets: TRINKETS, items: ITEMS, trainers: TRAINERS.map((t) => ({ title: t.title, desc: t.desc })),
}, null, 1));
console.log('ok', species.length, Object.keys(ABILITY).length);
