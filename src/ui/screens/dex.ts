import { TRAINER } from '../../game/content';
import { ALL_IDS, DEX, evoRuleText, lineMembers, spriteUrl } from '../../game/dex';
import { RARITY_COLOR, RARITY_NAME } from '../../game/model';
import type { Unit } from '../../game/model';
import { computeStats, effCd, makeCtx } from '../../game/stats';
import { getMeta } from '../../game/storage';
import { TYPES, TYPE_COLOR, TYPE_EFFECT, TYPE_NAME, superEffectiveAgainst } from '../../game/types';
import { app } from '../app';
import { abilityBox, chips, fmt, typeChip } from '../components';
import { openSheet } from '../sheet';
import { h, img } from '../dom';

export function renderDex(root: HTMLElement, back: unknown) {
  const meta = getMeta();
  const seen = new Set(meta.seen);
  const used = new Set(meta.used);
  let tab: 'dex' | 'types' = 'dex';
  let current = ALL_IDS.find((id) => seen.has(id)) ?? 1;

  const detail = (id: number) => {
    const s = DEX[id];
    if (!seen.has(id)) return h('div', { class: 'dex-detail panel' }, h('div', { class: 'panel-head pink' }, `#${String(id).padStart(3, '0')} ???`),
      h('div', { class: 'dex-big' }, img(spriteUrl(id), 'mon silhouette')), h('p', { class: 'empty-note' }, 'Ainda não visto. Encontre-o na loja ou em batalha!'));
    const u: Unit = { uid: 0, species: id, level: 1, shiny: false, extraTypes: [], perm: {}, prog: {} };
    const st = computeStats(u, makeCtx([u], TRAINER.youngster, []));
    const bar = (label: string, v: number) => h('div', { class: 'sbar' }, h('span', null, label), h('div', null, h('i', { style: { width: `${Math.min(100, (v / 160) * 100)}%` } })), h('b', null, v));
    const evo = evoRuleText(id);
    const shop = s.stage === 0 && ![138, 140, 142].includes(id);
    return h('div', { class: 'dex-detail panel' },
      h('div', { class: 'panel-head pink' }, `#${String(id).padStart(3, '0')} ${s.name}`),
      h('button', { class: 'btn plain dex-sheet-btn', onclick: () => openSheet(id, makeCtx([u], TRAINER.youngster, [])) }, 'FICHA COMPLETA'),
      h('div', { class: 'dex-top' },
        h('div', { class: 'dex-big' }, img(spriteUrl(id), 'mon'), img(spriteUrl(id, true), 'mon shiny-prev')),
        h('div', { class: 'dex-info' },
          h('div', { class: 'tip-row' }, s.types.map((t) => typeChip(t))),
          h('div', { class: 'tier-tag', style: { color: RARITY_COLOR[s.rarity] } }, `${RARITY_NAME[s.rarity]} `),
          h('div', { class: 'dex-chips' }, 'Lv. 1:', chips(st, 4), h('span', { class: 'cdtxt' }, `${effCd(st).toFixed(1)}s · HP +${fmt(st.hp)}`)),
          used.has(id) ? h('div', { class: 'used-tag' }, '✔ Já usado em batalha') : null)),
      h('div', { class: 'sbars' }, bar('HP', s.stats.hp), bar('Atq', s.stats.atk), bar('Def', s.stats.def), bar('At.Esp', s.stats.spa), bar('Def.Esp', s.stats.spd), bar('Vel', s.stats.spe)),
      abilityBox(id, 1),
      abilityBox(id, 1, true),
      s.types.map((t) => h('div', { class: 'tip-eff' }, h('b', { style: { color: TYPE_COLOR[t] } }, `${TYPE_NAME[t]}: `), TYPE_EFFECT[t])),
      h('div', { class: 'dex-line' }, lineMembers(id).map((m, i) => [
        i ? h('span', { class: 'arrow' }, '▸') : null,
        h('button', { class: `line-mon${m === id ? ' on' : ''}`, onclick: () => { current = m; draw(); } },
          img(spriteUrl(m), `mon${seen.has(m) ? '' : ' silhouette'}`)),
      ])),
      evo ? h('div', { class: 'tip-evo' }, evo) : null,
      h('div', { class: 'tip-foot dark' }, shop ? 'Aparece na loja.' : s.stage > 0 ? 'Só por evolução (não aparece na loja).' : 'Só por eventos.'),
    );
  };

  const typesTab = () => h('div', { class: 'types-tab' }, TYPES.map((t) =>
    h('div', { class: 'type-row' }, typeChip(t), h('span', { class: 'type-eff' }, TYPE_EFFECT[t]),
      h('span', { class: 'type-se' }, superEffectiveAgainst(t).length ? ['forte contra ', superEffectiveAgainst(t).map((x) => typeChip(x, true))] : ''))));

  const draw = () => {
    root.replaceChildren(h('div', { class: 'dex-screen' },
      h('div', { class: 'dex-top-bar' },
        h('button', { class: 'btn plain', onclick: () => app.go(back === 'shop' ? 'shop' : 'title') }, '◂ VOLTAR'),
        h('div', { class: 'big-title small' }, 'POKÉDEX'),
        h('div', { class: 'dex-tabs' },
          h('button', { class: `tab${tab === 'dex' ? ' on' : ''}`, onclick: () => { tab = 'dex'; draw(); } }, `${ALL_IDS.length} · vistos ${seen.size}`),
          h('button', { class: `tab${tab === 'types' ? ' on' : ''}`, onclick: () => { tab = 'types'; draw(); } }, 'TIPOS'))),
      tab === 'dex'
        ? h('div', { class: 'dex-body' },
            h('div', { class: 'dex-grid panel' }, ALL_IDS.map((id) => h('button', {
              class: `dex-cell${id === current ? ' on' : ''}`, style: seen.has(id) ? { '--tier': RARITY_COLOR[DEX[id].rarity] } : {},
              onclick: () => { current = id; draw(); },
            }, h('small', null, id), img(spriteUrl(id), `mon${seen.has(id) ? '' : ' silhouette'}`)))),
            detail(current))
        : typesTab(),
    ));
    root.querySelector('.dex-cell.on')?.scrollIntoView({ block: 'nearest' });
  };
  draw();
}
