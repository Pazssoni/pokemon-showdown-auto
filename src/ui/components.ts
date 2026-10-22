import { abilityOf, hasShinyVariant, scaler } from '../game/abilities';
import { DEX, evoRuleText, spriteUrl } from '../game/dex';
import { RARITY_COLOR, RARITY_NAME, type Unit } from '../game/model';
import { sellValue, type EvoNote } from '../game/run';
import { computeStats, effCd, type StatCtx, type UnitStats } from '../game/stats';
import { markSeen } from '../game/storage';
import { TRINKET } from '../game/trinkets';
import { TYPE_COLOR, TYPE_EFFECT, TYPE_NAME, type PType } from '../game/types';
import { h, img, itemImg, stage, wait } from './dom';
import { cry, sfx } from './sfx';

/** números grandes (seção 5): K / M / B / T e notação científica acima de 1e15 */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '0';
  const neg = n < 0;
  const a = Math.abs(n);
  let out: string;
  if (a < 10000) out = String(Math.round(a));
  else if (a >= 1e15) out = a.toExponential(2).replace('e+', 'e');
  else {
    const units: [number, string][] = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
    const [d, u] = units.find(([d2]) => a >= d2)!;
    const v = a / d;
    out = `${v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(1).replace(/\.0$/, '') : v.toFixed(2).replace(/\.?0+$/, '')}${u}`;
  }
  return neg ? `-${out}` : out;
}
/** número decimal curto (stats percentuais como Crescimento, Eco) */
const fmtD = (n: number) => (Math.abs(n) >= 100 ? fmt(n) : String(Math.round(n * 10) / 10));

export function typeChip(t: PType, small = false) {
  return h('span', { class: `tchip${small ? ' sm' : ''}`, style: { background: TYPE_COLOR[t] } }, TYPE_NAME[t]);
}

export function chips(st: UnitStats, max = 3) {
  const list: [string, string][] = [];
  if (st.dmg) list.push(['dmg', fmt(st.dmg)]);
  if (st.spectral) list.push(['spectral', fmt(st.spectral)]);
  if (st.heal) list.push(['heal', fmt(st.heal)]);
  if (st.shield) list.push(['shield', fmt(st.shield)]);
  if (st.armor) list.push(['armor', fmt(st.armor)]);
  if (st.burn) list.push(['burn', fmt(st.burn)]);
  if (st.poison) list.push(['poison', fmt(st.poison)]);
  if (st.shock) list.push(['shock', fmt(st.shock)]);
  if (st.cold) list.push(['cold', fmt(st.cold)]);
  if (st.growth) list.push(['growth', `${fmtD(st.growth)}%`]);
  if (st.echo) list.push(['echo', `${fmtD(st.echo)}%`]);
  if (st.blessing) list.push(['blessing', fmt(st.blessing)]);
  if (st.charge) list.push(['charge', fmtD(st.charge)]);
  if (st.punish) list.push(['punish', `${fmtD(st.punish)}%`]);
  if (st.crit) list.push(['crit', `${fmtD(st.crit)}%`]);
  if (st.casts > 1) list.push(['multi', `x${st.casts}`]);
  return h('div', { class: 'chips' }, list.slice(0, max).map(([k, v]) => h('span', { class: `chip c-${k}` }, v)));
}

export function lvLabel(level: number) {
  return h('div', { class: `lv lv${level}` }, h('span', null, 'LV.'), ` ${level}`);
}

export function unitInner(u: Unit, st: UnitStats, opts: { flip?: boolean } = {}) {
  return [
    lvLabel(u.level),
    u.shiny ? h('div', { class: 'shiny-star' }, '★') : null,
    h('div', { class: 'spr' }, img(spriteUrl(u.species, u.shiny), `mon${opts.flip ? ' flip' : ''}`)),
    chips(st),
  ];
}

// ---------- tooltip ----------

let tipEl: HTMLElement | null = null;

export function showTip(anchor: HTMLElement, content: (Node | string | null)[]) {
  hideTip();
  const st = stage();
  tipEl = h('div', { class: 'tip' }, content);
  st.append(tipEl);
  const scale = st.getBoundingClientRect().width / 1280;
  const a = anchor.getBoundingClientRect();
  const s = st.getBoundingClientRect();
  const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
  let x = (a.right - s.left) / scale + 8;
  let y = (a.top - s.top) / scale;
  if (x + tw > 1270) x = (a.left - s.left) / scale - tw - 8;
  if (y + th > 710) y = 710 - th;
  tipEl.style.left = `${Math.max(6, x)}px`;
  tipEl.style.top = `${Math.max(6, y)}px`;
}

export function hideTip() {
  tipEl?.remove();
  tipEl = null;
}

export function bindTip(el: HTMLElement, content: () => (Node | string | null)[]) {
  el.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse' && !document.body.classList.contains('dragging')) showTip(el, content());
  });
  el.addEventListener('pointerleave', hideTip);
}


export function rarityTag(r: number) {
  return h('span', { class: 'tier-tag', style: { color: RARITY_COLOR[r] } }, RARITY_NAME[r]);
}

export function abilityBox(species: number, level: number, shiny = false) {
  const ab = abilityOf(species, shiny);
  return h('div', { class: `tip-ability${shiny ? ' shiny' : ''}` }, h('b', null, ab.name), h('br'), ab.desc(scaler(level, shiny ? 1.2 : 1)));
}

export function unitTipContent(u: Unit, ctx: StatCtx, extra?: { price?: number; sell?: boolean; progress?: string }) {
  const s = DEX[u.species];
  const st = computeStats(u, ctx);
  const lines: (Node | string | null)[] = [];
  lines.push(
    h('div', { class: 'tip-head' },
      h('span', { class: 'tip-name' }, `${u.shiny ? '★ ' : ''}${s.name}`),
      h('span', { class: 'tip-lv' }, `Lv. ${u.level}`)),
    h('div', { class: 'tip-row' }, st.types.map((t) => typeChip(t, true)), rarityTag(s.rarity)),
  );
  lines.push(abilityBox(u.species, u.level, u.shiny));
  const stat = (cls: string, label: string, val: string) => h('div', { class: 'tip-stat' }, h('span', { class: `dot c-${cls}` }), label, h('b', null, val));
  const stats = h('div', { class: 'tip-stats' });
  if (st.dmg) stats.append(stat('dmg', 'Dano', fmt(st.dmg)));
  if (st.spectral) stats.append(stat('spectral', 'Dano Espectral', fmt(st.spectral)));
  stats.append(stat('cd', 'Recarga', `${effCd(st).toFixed(1)}s`));
  if (st.heal) stats.append(stat('heal', 'Cura', fmt(st.heal)));
  if (st.cleanse) stats.append(stat('heal', 'Limpeza', `${fmtD(st.cleanse)}%`));
  if (st.shield) stats.append(stat('shield', 'Escudo', fmt(st.shield)));
  if (st.armor) stats.append(stat('armor', 'Armadura', fmt(st.armor)));
  if (st.burn) stats.append(stat('burn', 'Queimadura', `+${fmt(st.burn)}`));
  if (st.poison) stats.append(stat('poison', 'Veneno', `+${fmt(st.poison)}`));
  if (st.shock) stats.append(stat('shock', 'Choque', `+${fmt(st.shock)}`));
  if (st.cold) stats.append(stat('cold', 'Frio', `+${fmt(st.cold)}`));
  if (st.growth) stats.append(stat('growth', 'Crescimento', `+${fmtD(st.growth)}%`));
  if (st.crit) stats.append(stat('crit', 'Crítico', `${fmtD(st.crit)}% ×${st.critMult}`));
  if (st.pierce) stats.append(stat('dmg', 'Perfurar', `${st.pierce}x`));
  if (st.charge) stats.append(stat('charge', 'Carga', fmtD(st.charge)));
  if (st.swarm) stats.append(stat('swarm', 'Enxame', `+${fmt(st.swarm)}/Inseto`));
  if (st.echo) stats.append(stat('echo', 'Eco', `${fmtD(st.echo)}%`));
  if (st.punish) stats.append(stat('punish', 'Punir', `${fmtD(st.punish)}%`));
  if (st.blessing) stats.append(stat('blessing', 'Bênção', `+${fmt(st.blessing)}`));
  if (st.casts > 1) stats.append(stat('multi', 'Multicast', `x${st.casts}`));
  stats.append(stat('hp', 'HP do time', `+${fmt(st.hp)}`));
  lines.push(stats);
  lines.push(h('div', { class: 'tip-eff' }, st.types.map((t) => h('div', null, h('b', { style: { color: TYPE_COLOR[t] } }, `${TYPE_NAME[t]}: `), TYPE_EFFECT[t]))));
  const evo = evoRuleText(u.species);
  if (evo) lines.push(h('div', { class: 'tip-evo' }, evo));
  if (extra?.progress) lines.push(h('div', { class: 'tip-evo' }, extra.progress));
  if (u.shiny) lines.push(h('div', { class: 'tip-shiny' }, hasShinyVariant(u.species) ? '★ SHINY: +20% nos stats e versão aprimorada da habilidade.' : '★ SHINY: +20% nos stats e nos números da habilidade.'));
  if (extra?.price != null) lines.push(h('div', { class: 'tip-foot' }, `₽${extra.price} · 3 cópias Lv1 → Lv2 · 2 Lv2 → Lv3 · 2 Lv3 → Lv4`));
  if (extra?.sell) lines.push(h('div', { class: 'tip-foot' }, `Vende por ₽${sellValue(u)}`));
  return lines;
}

export function trinketTip(id: string, count = 1) {
  const t = TRINKET[id];
  return [
    h('div', { class: 'tip-head' }, h('span', { class: 'tip-name' }, t.name), count > 1 ? h('span', { class: 'tip-lv' }, `x${count}`) : null),
    h('div', { class: 'tip-row' }, rarityTag(t.rarity), t.unique ? h('span', { class: 'tip-foot' }, ' Único') : null),
    h('div', { class: 'tip-eff' }, t.desc),
  ];
}

export function trinketIcon(id: string) {
  return itemImg(TRINKET[id].icon, 'item-ico');
}

// ---------- evolução ----------

export async function playEvolutions(evos: EvoNote[]) {
  markSeen(evos.map((e) => e.to), true);
  for (const e of evos) {
    sfx.evolve();
    const from = img(spriteUrl(e.from, e.shiny), 'mon evo-from');
    const to = img(spriteUrl(e.to, e.shiny), 'mon evo-to');
    const text = h('div', { class: 'evo-text' }, `O quê? ${DEX[e.from].name} está evoluindo!`);
    const ov = h('div', { class: 'evo-overlay' }, h('div', { class: 'evo-box' }, h('div', { class: 'evo-sprites' }, from, to), text));
    stage().append(ov);
    let skip = false;
    ov.addEventListener('pointerdown', () => (skip = true));
    for (let i = 0; i < 14 && !skip; i++) await wait(110);
    ov.classList.add('done');
    cry(e.to, 0.4);
    text.textContent = `${DEX[e.from].name} evoluiu para ${DEX[e.to].name}!`;
    skip = false;
    for (let i = 0; i < 12 && !skip; i++) await wait(100);
    ov.remove();
  }
}
