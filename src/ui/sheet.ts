// Fichas no estilo Batomon: painel simples ao lado e ficha completa (clique direito)
import { STAT_NAME, abilityOf, hasShinyVariant, scaler } from '../game/abilities';
import { DEX, RARITY_PRICE, copiesNeeded, baseOf, evoRule, evoRuleText, levelEvolution, spriteUrl } from '../game/dex';
import { RARITY_COLOR, RARITY_NAME, type Unit } from '../game/model';
import { sellValue } from '../game/run';
import { computeStats, effCd, type StatCtx, type UnitStats } from '../game/stats';
import { h, img, stage } from './dom';
import { sfx } from './sfx';
import { typeChip, fmt } from './components';

const STAT_ROWS: [keyof UnitStats, string, string, string?][] = [
  ['dmg', 'Dano', 'c-dmg'], ['spectral', 'Espectral', 'c-dmg'], ['heal', 'Cura', 'c-heal'], ['cleanse', 'Limpeza', 'c-heal', '%'],
  ['shield', 'Escudo', 'c-shield'], ['armor', 'Armadura', 'c-shield'],
  ['burn', 'Queimadura', 'c-burn'], ['poison', 'Veneno', 'c-poison'], ['shock', 'Choque', 'c-shock'], ['cold', 'Frio', 'c-shock'],
  ['growth', 'Crescimento', 'c-heal', '%'], ['crit', 'Crítico', 'c-dmg', '%'], ['charge', 'Carga', 'c-multi'], ['swarm', 'Enxame', 'c-dmg'],
  ['echo', 'Eco', 'c-multi', '%'], ['punish', 'Punir', 'c-poison', '%'], ['blessing', 'Bênção', 'c-heal'],
];

/** contadores de evolução (seção 9) */
const COUNTER_LABEL: Record<string, string> = {
  gold: '₽ com Pay Day', losses: 'derrotas', attacks: 'ataques', battles: 'batalhas', allyKo: 'aliados nocauteados', shellder: 'ao lado de Shellder',
  crits: 'críticos', teamBurn: 'Queimaduras do time', teamShock: 'Choques do time', teamCold: 'Frios do time', teamPoison: 'Venenos do time',
  teamShield: 'Escudos recebidos', wins: 'vitórias', teamBless: 'Bênção do time',
};
function counterLine(u: Unit): string | null {
  const r = evoRule(u.species);
  const parts: string[] = [];
  if (r.kind === 'counter') parts.push(`${Math.min(r.need, u.prog[r.key] ?? 0)}/${r.need} ${COUNTER_LABEL[r.key] ?? r.key}`);
  if (u.species === 133) parts.push(`${u.prog.wins ?? 0}/3 vitórias`, `${u.prog.losses ?? 0}/2 derrotas`, `${u.prog.teamBless ?? 0}/15 Bênção`);
  return parts.length ? `Contador: ${parts.join(' · ')}` : null;
}


/** destaca gatilhos ("Ao atacar:") e palavras-chave de stats no texto da habilidade */
export function richAbility(text: string): Node[] {
  const out: Node[] = [];
  // separa em sentenças mantendo o ponto
  const parts = text.split(/(?<=\.)\s+/);
  parts.forEach((sent, i) => {
    if (i) out.push(document.createTextNode(' '));
    const m = sent.match(/^([^:]{3,70}):\s*(.*)$/);
    if (m) {
      out.push(h('span', { class: 'kw-trigger' }, m[1]), document.createElement('br'));
      out.push(...keywords(m[2]));
    } else out.push(...keywords(sent));
  });
  return out;
}

const KW: [RegExp, string][] = [
  [/(\+?\d+%?\s*)?(Queimadura)/g, 'kw-burn'], [/(\+?\d+%?\s*)?(Veneno)/g, 'kw-poison'], [/(\+?\d+%?\s*)?(Choque)/g, 'kw-shock'],
  [/(\+?\d+%?\s*)?(Escudo)/g, 'kw-shield'], [/(\+?\d+%?\s*)?(Cura)/g, 'kw-heal'], [/(\+?\d+%?\s*)?(Dano)/g, 'kw-dmg'],
  [/(\+?\d+\s*)?(Multicast(?:\s\d)?)/g, 'kw-multi'], [/(\+?\d+%?\s*)?(vel\. de recarga|Recarga)/g, 'kw-cd'],
];
function keywords(text: string): Node[] {
  // marca trechos com tokens e depois monta os nós
  let html = text.replace(/[<>&]/g, '');
  for (const [re, cls] of KW) html = html.replace(re, (all) => `\u0001${cls}\u0002${all}\u0003`);
  const nodes: Node[] = [];
  for (const chunk of html.split('\u0003')) {
    const [plain, rest] = chunk.split('\u0001');
    if (plain) nodes.push(document.createTextNode(plain));
    if (rest) {
      const [cls, t] = rest.split('\u0002');
      nodes.push(h('span', { class: cls }, t));
    }
  }
  return nodes;
}

function statBlock(st: UnitStats) {
  const rows = STAT_ROWS.filter(([k]) => (st[k] as number) > 0).map(([k, label, cls, suf]) => h('div', { class: `srow ${cls}-t` }, `${label} ${suf ? Math.round((st[k] as number) * 10) / 10 : fmt(st[k] as number)}${suf ?? ''}`));
  if (st.pierce) rows.push(h('div', { class: 'srow c-dmg-t' }, `Perfurar ${st.pierce}x`));
  if (st.casts > 1) rows.push(h('div', { class: 'srow c-multi-t' }, `Multicast: ${st.casts}`));
  if (!rows.length) rows.push(h('div', { class: 'srow muted' }, 'Sem stats de combate'));
  return h('div', { class: 'sheet-stats' },
    h('div', { class: 'cd-box' }, h('b', null, effCd(st).toFixed(1)), h('span', null, 'seg')),
    h('div', { class: 'srows' }, rows));
}

/** painel simples (lado direito da loja) */
export function unitPanel(u: Unit, ctx: StatCtx, extra: { price?: number; sell?: boolean; progress?: string } = {}) {
  const s = DEX[u.species];
  const st = computeStats(u, ctx);
  const ab = abilityOf(u.species, u.shiny);
  const r = s.rarity;
  return h('div', { class: 'sheet panel' },
    h('div', { class: 'sheet-head', style: { background: RARITY_COLOR[r] } }, h('span', null, `${u.shiny ? '★ ' : ''}${s.name}`), h('span', null, `Lv. ${u.level} · ${RARITY_NAME[r]}`)),
    h('div', { class: 'sheet-top' },
      h('div', { class: 'sheet-art' }, img(spriteUrl(u.species, u.shiny), 'mon')),
      h('div', { class: 'sheet-types' }, st.types.map((t) => typeChip(t)))),
    statBlock(st),
    h('div', { class: `sheet-ability${ab.none ? ' none' : ''}` },
      ab.none ? null : h('div', { class: 'ab-name' }, ab.name),
      h('div', { class: 'ab-text' }, richAbility(ab.desc(scaler(u.level, u.shiny ? 1.2 : 1)))),
      ab.none && evoRuleText(u.species) ? h('div', { class: 'ab-evo' }, evoRuleText(u.species)!) : null),
    h('div', { class: 'sheet-foot' },
      counterLine(u) ? h('div', null, counterLine(u)!) : null,
      extra.progress ? h('div', null, extra.progress) : null,
      extra.price != null ? h('div', null, `Preço ₽${extra.price}`) : null,
      extra.sell ? h('div', null, `Vende por ₽${sellValue(u)}`) : null,
      h('div', { class: 'hint' }, 'Clique direito: ficha completa')),
  );
}

/** ficha completa: valores por nível (com evoluções) e versão shiny */
export function openSheet(species: number, ctx: StatCtx, opts: { shiny?: boolean; unit?: Unit } = {}) {
  let shiny = !!opts.shiny;
  const base = baseOf(species);
  const ov = h('div', { class: 'modal-bg sheet-bg', oncontextmenu: (e: Event) => { e.preventDefault(); ov.remove(); }, onclick: (e: Event) => { if (e.target === e.currentTarget) ov.remove(); } });
  const draw = () => {
    const cols = [1, 2, 3, 4, ...(baseOf(species) === 60 ? [5] : [])].map((lv) => {
      let sp = base;
      for (let g = 0; g < 3; g++) { const n = levelEvolution(sp, lv); if (n == null) break; sp = n; }
      // linhas de pedra/contador: mostra a espécie atual se já evoluiu
      if (opts.unit && DEX[opts.unit.species].stage > DEX[sp].stage) sp = opts.unit.species;
      const u: Unit = { uid: 0, species: sp, level: lv, shiny, extraTypes: opts.unit?.extraTypes ?? [], perm: opts.unit?.perm ?? {}, prog: {} };
      const st = computeStats(u, ctx);
      const ab = abilityOf(sp, shiny);
      const current = opts.unit && opts.unit.level === lv;
      const need = lv === 1 ? 'Comprado' : lv === 5 ? 'Vitórias do Poliwrath' : `${copiesNeeded(base, lv - 1)} cópias Lv${lv - 1}`;
      return h('div', { class: `sheet-col${current ? ' current' : ''}` },
        h('div', { class: 'col-head' }, `LV. ${lv}`, h('small', null, need)),
        h('div', { class: 'col-art' }, img(spriteUrl(sp, shiny), 'mon')),
        h('div', { class: 'col-name' }, DEX[sp].name),
        statBlock(st),
        h('div', { class: 'col-ab' }, h('div', { class: 'ab-name' }, ab.name), h('div', { class: 'ab-text' }, richAbility(ab.desc(scaler(lv, shiny ? 1.2 : 1))))));
    });
    const s = DEX[species];
    ov.replaceChildren(h('div', { class: 'sheet-full panel' },
      h('div', { class: 'sheet-head big', style: { background: RARITY_COLOR[s.rarity] } },
        h('span', null, `${shiny ? '★ ' : ''}${DEX[base].name} — linha ${RARITY_NAME[s.rarity]}`),
        h('span', null, `₽${RARITY_PRICE[s.rarity]}`)),
      h('div', { class: 'sheet-tabs' },
        h('button', { class: `tab${!shiny ? ' on' : ''}`, onclick: () => { shiny = false; draw(); } }, 'NORMAL'),
        h('button', { class: `tab${shiny ? ' on' : ''}`, onclick: () => { shiny = true; draw(); } }, `★ SHINY${hasShinyVariant(base) || hasShinyVariant(species) ? ' (habilidade aprimorada)' : ' (+20%)'}`),
        h('span', { class: 'sheet-evo' }, evoRuleText(base) ?? 'Não evolui.'),
        h('button', { class: 'btn plain small-x', onclick: () => ov.remove() }, 'FECHAR')),
      h('div', { class: 'sheet-cols' }, cols),
      opts.unit && Object.keys(opts.unit.perm).length ? h('div', { class: 'sheet-perm' }, 'Bônus permanentes já incluídos: ' +
        (Object.entries(opts.unit.perm) as [keyof typeof STAT_NAME, number][]).map(([k, v]) => (k === 'cdSpeed' ? `+${Math.round(v * 100)}% vel. de recarga` : `+${v} ${STAT_NAME[k]}`)).join(', ')) : null,
    ));
  };
  draw();
  sfx.open();
  stage().append(ov);
}
