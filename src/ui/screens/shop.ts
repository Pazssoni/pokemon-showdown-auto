import { ITEM } from '../../game/content';
import { DEX, spriteUrl, trainerSprite } from '../../game/dex';
import { RARITY_COLOR, WINS_TO_WIN, type Unit } from '../../game/model';
import { TYPE_EFFECT } from '../../game/types';
import {
  TARGETED_ITEMS, buyItem, buyMon, canUseItem, preBattle, copiesProgress, income, itemsLeft, moveUnit, rankOf, reroll, rerollCost, sellUnit,
  sellValue, shopOdds, trainerOf, wouldMerge, type ActionResult, type Zone,
} from '../../game/run';
import { computeStats, makeCtx, teamMaxHp, typeCounts } from '../../game/stats';
import { divisionOf, getMeta, markSeen, saveMeta } from '../../game/storage';
import type { PType } from '../../game/types';
import { app } from '../app';
import {
  bindTip, chips, fmt, hideTip, playEvolutions, rarityTag, trinketIcon, trinketTip, typeChip, unitInner,
} from '../components';
import { h, icon, img, itemImg, stage, toast } from '../dom';
import { cry, sfx } from '../sfx';
import { openSheet, unitPanel } from '../sheet';
import { music } from '../music';

type Src = { from: 'shop' | 'bench' | 'team'; i: number };
type Dst = { to: 'bench' | 'team' | 'sell'; i: number };

export function renderShop(root: HTMLElement) {
  const run = app.run!;
  let sel: Src | null = null;
  let busy = false;
  let warnedIdle = false;
  /** item com alvo manual (TM de Tipo) esperando o clique num Pokémon */
  let aim: number | null = null;

  const draw = () => {
    hideTip();
    root.replaceChildren(build());
    markSeen(run.shop.flatMap((s) => (s?.kind === 'mon' ? [s.species] : [])));
  };

  const unitAt = (z: Zone, i: number): Unit | null => (z === 'bench' ? run.bench : run.team)[i];
  const ctxFor = (slot: number | null) => makeCtx(run.team, trainerOf(run), run.trinkets, slot, run.flags.nerd ?? 0, run.gold, run.wins, run.losses);

  async function handle(res: ActionResult, okSound: () => void, cryId?: number) {
    if (res.error) {
      sfx.error();
      toast(res.error, 'error');
      return;
    }
    sel = null;
    app.save();
    draw();
    if (cryId) cry(cryId);
    if (res.merged) sfx.levelUp();
    if (res.evos?.length) {
      busy = true;
      await playEvolutions(res.evos);
      busy = false;
      draw();
    } else if (!res.merged) okSound();
    if (res.msg) toast(res.msg, 'good');
    // prêmio de fusão (Lv. 3) abre na hora
    if (run.queue.length && run.queue[0].kind === 'gift') { app.save(); setTimeout(() => app.go('pending'), 500); }
  }

  function onDrop(src: Src, dst: Dst) {
    if (busy) return;
    if (src.from === 'shop') {
      const slot = run.shop[src.i];
      if (!slot) return;
      if (slot.kind === 'mon') {
        if (dst.to === 'bench' || dst.to === 'team') {
          const empty = !unitAt(dst.to, dst.i);
          return handle(empty ? buyMon(run, src.i, dst.to, dst.i) : buyMon(run, src.i), sfx.buy, slot.species);
        }
        return;
      }
      if (TARGETED_ITEMS.has(slot.item)) {
        if (dst.to === 'sell') return;
        aim = null;
        return handle(buyItem(run, src.i, { zone: dst.to, idx: dst.i }), sfx.buy);
      }
      return handle(buyItem(run, src.i), sfx.buy);
    }
    if (dst.to === 'sell') return handle(sellUnit(run, src.from, src.i), sfx.sell);
    return handle(moveUnit(run, src.from, src.i, dst.to, dst.i), sfx.click);
  }

  function onClick(src: Src) {
    if (busy) return;
    if (aim != null && src.from !== 'shop') {
      const i = aim;
      aim = null;
      return handle(buyItem(run, i, { zone: src.from, idx: src.i }), sfx.buy);
    }
    if (sel && src.from !== 'shop' && !(sel.from === src.from && sel.i === src.i) && sel.from !== 'shop') {
      return onDrop(sel, { to: src.from, i: src.i });
    }
    if (src.from === 'shop') {
      const slot = run.shop[src.i];
      // clique na loja compra direto (vai para o primeiro espaço livre)
      if (slot?.kind === 'item' && TARGETED_ITEMS.has(slot.item)) {
        const err = canUseItem(run, slot.item) ?? (run.gold < slot.price ? 'Dinheiro insuficiente' : null);
        if (err) { sfx.error(); toast(err, 'error'); return; }
        aim = aim === src.i ? null : src.i;
        sfx.click();
        draw();
        if (aim != null) toast('Escolha o Pokémon que vai aprender o tipo', 'good');
        return;
      }
      if (slot?.kind === 'item') return handle(buyItem(run, src.i), sfx.buy);
      if (slot?.kind === 'mon') return handle(buyMon(run, src.i), sfx.buy, slot.species);
      return;
    }
    sel = sel && sel.from === src.from && sel.i === src.i ? null : src;
    sfx.click();
    draw();
  }

  // ---------- arrastar ----------

  function draggable(el: HTMLElement, src: Src, ghostSrc: string) {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || busy) return;
      e.stopPropagation();
      const sx = e.clientX, sy = e.clientY;
      let ghost: HTMLElement | null = null;
      let over: Element | null = null;
      el.setPointerCapture(e.pointerId);
      const st = stage();
      const move = (ev: PointerEvent) => {
        if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
          ghost = img(ghostSrc, 'drag-ghost');
          st.append(ghost);
          document.body.classList.add('dragging');
          root.dataset.drag = src.from;
          if (src.from !== 'shop') {
            const u = unitAt(src.from, src.i);
            if (u) root.querySelector('.sell-zone b')!.textContent = `+₽${sellValue(u)}`;
          }
          el.classList.add('lifted');
          hideTip();
        }
        if (!ghost) return;
        const r = st.getBoundingClientRect();
        const sc = r.width / 1280;
        ghost.style.left = `${(ev.clientX - r.left) / sc}px`;
        ghost.style.top = `${(ev.clientY - r.top) / sc}px`;
        const t = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-drop]') ?? null;
        if (t !== over) {
          over?.classList.remove('hover');
          t?.classList.add('hover');
          over = t;
        }
      };
      const end = (ev: PointerEvent) => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', end);
        el.removeEventListener('pointercancel', end);
        if (ghost) {
          const t = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('[data-drop]');
          ghost.remove();
          document.body.classList.remove('dragging');
          delete root.dataset.drag;
          el.classList.remove('lifted');
          over?.classList.remove('hover');
          if (t && ev.type === 'pointerup') {
            const [to, i] = t.dataset.drop!.split(':');
            onDrop(src, { to: to as Dst['to'], i: Number(i) });
          } else if (src.from === 'shop' && ev.type === 'pointerup' && run.shop[src.i]?.kind === 'item') {
            onDrop(src, { to: 'bench', i: 0 });
          }
        } else if (ev.type === 'pointerup') onClick(src);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    });
  }

  function dropTarget(el: HTMLElement, dst: Dst) {
    el.dataset.drop = `${dst.to}:${dst.i}`;
    el.addEventListener('click', (e) => {
      if (sel && !(e.target as Element).closest('.card')) {
        e.stopPropagation();
        onDrop(sel, dst);
      }
    });
    return el;
  }

  // ---------- ficha lateral (estilo Batomon) ----------
  let sidePanel: HTMLElement | null = null;
  const sheetOn = (el: HTMLElement, panel: () => HTMLElement, full: () => void) => {
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || document.body.classList.contains('dragging')) return;
      sidePanel?.replaceChildren(panel());
      sidePanel?.classList.add('show');
    });
    el.addEventListener('pointerleave', () => {
      if (!el.matches('.selected')) sidePanel?.classList.remove('show');
    });
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); hideTip(); full(); });
    if (el.matches('.selected')) setTimeout(() => { sidePanel?.replaceChildren(panel()); sidePanel?.classList.add('show'); });
  };

  // ---------- construção ----------

  function build() {
    const t = trainerOf(run);
    const counts = typeCounts(run.team);
    const maxHp = teamMaxHp(run.team, t, run.hpBonus, run.trinkets, run.flags.nerd ?? 0);

    const slotEl = (z: Zone, i: number) => {
      const u = unitAt(z, i);
      const slot = dropTarget(h('div', { class: 'slot' }), { to: z, i });
      if (u) {
        const ctx = z === 'team' ? ctxFor(i) : ctxFor(null);
        const st = computeStats(u, ctx);
        const card = h('div', { class: `card${sel?.from === z && sel.i === i ? ' selected' : ''}${u.shiny ? ' is-shiny' : ''}`, style: { '--rar': RARITY_COLOR[DEX[u.species].rarity] } }, unitInner(u, st));
        if (u.level === 1) {
          const p = copiesProgress(run, u.species);
          card.append(h('div', { class: 'copies' }, Array.from({ length: p.need }, (_, k) => h('i', { class: k < p.have ? 'on' : '' }))));
        }
        draggable(card, { from: z, i }, spriteUrl(u.species, u.shiny));
        sheetOn(card, () => unitPanel(u, ctx, { sell: true }), () => openSheet(u.species, ctx, { shiny: u.shiny, unit: u }));
        slot.append(card);
      }
      return slot;
    };

    // barra do topo
    const meta = getMeta();
    const left = itemsLeft(run);
    const top = h('div', { class: 'topbar' },
      h('div', { class: 'item-uses', title: 'Itens que você ainda pode usar hoje' }, icon('bag', 5), h('span', { class: 'bag-count' }, left)),
      h('div', { class: 'top-center' },
        h('div', { class: 'top-stat' }, icon('heart', 5), h('span', null, `${run.hearts}`)),
        h('div', { class: 'day' }, `DIA ${run.day}`),
        h('div', { class: 'top-stat', title: 'Vitórias (insígnias)' }, icon('badge', 5), h('span', null, `${run.wins}/${WINS_TO_WIN}`))),
      h('div', { class: 'top-right' },
        h('button', { class: 'icon-btn', title: 'Pokédex', onclick: () => app.go('dex', 'shop') }, icon('dex', 5)),
        h('button', { class: `icon-btn${meta.musicMuted ? ' off' : ''}`, title: 'Música', onclick: () => { meta.musicMuted = !meta.musicMuted; saveMeta(); if (meta.musicMuted) music.stop(); else music.play('shop'); draw(); } }, icon('note', 5)),
        h('button', { class: 'icon-btn', title: 'Som', onclick: () => { meta.muted = !meta.muted; saveMeta(); if (meta.muted) music.stop(); else music.play('shop'); draw(); } }, icon(meta.muted ? 'mute' : 'sound', 5)),
        h('button', { class: 'icon-btn', title: 'Sair (progresso salvo)', onclick: () => { app.save(); app.go('title'); } }, icon('exit', 5))),
    );

    const trainerCol = h('div', { class: 'trainer-col' },
      h('div', { class: 'panel trainer-card' },
        h('div', { class: 'panel-head yellow' }, t.title),
        h('div', { class: 'portrait' }, img(trainerSprite(t.sprite), 'trainer-img')),
        h('div', { class: 'passive' }, t.desc)),
      h('div', { class: 'hp-box' }, h('span', { class: 'hp-label' }, 'HP'), h('div', { class: 'hp-bar' }, h('div', { class: 'hp-fill', style: { width: '100%' } }), h('span', { class: 'hp-text' }, fmt(maxHp)))),
    );

    const bench = h('div', { class: 'panel bench' }, h('div', { class: 'panel-head yellow' }, 'PC'),
      h('div', { class: 'bench-slots' }, [0, 1, 2, 3].map((i) => slotEl('bench', i))));
    const team = h('div', { class: 'panel team' }, h('div', { class: 'panel-head pink' }, 'EQUIPE'),
      h('div', { class: 'team-grid' }, [0, 1, 2, 3, 4, 5].map((i) => slotEl('team', i))),
      h('div', { class: 'front-hint' }, 'frente ▶'));

    // itens segurados (agrupados)
    const grouped = new Map<string, number>();
    for (const id of run.trinkets) grouped.set(id, (grouped.get(id) ?? 0) + 1);
    const trinkets = h('div', { class: 'panel trinkets' }, h('div', { class: 'panel-head teal' }, `ITENS SEGURADOS${run.trinkets.length ? ` (${run.trinkets.length})` : ''}`),
      h('div', { class: 'trinket-grid' },
        grouped.size ? [...grouped].map(([id, n]) => {
          const el = h('div', { class: 'trinket' }, trinketIcon(id), n > 1 ? h('span', { class: 'tcount' }, `x${n}`) : null);
          bindTip(el, () => trinketTip(id, n));
          return el;
        }) : h('div', { class: 'empty-note' }, 'Vença batalhas para ganhar prêmios de itens segurados (escolha 1 de 3).')));

    // tipos na equipe (sem sinergia: cada tipo tem a sua mecânica) + rival
    const active = (Object.entries(counts) as [PType, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    const opp = run.opponent;
    const scope = run.trinkets.includes('silph-scope');
    const div = divisionOf(meta.mmr ?? 1000);
    const synergy = h('div', { class: 'panel synergy' }, h('div', { class: 'panel-head blue' }, 'TIPOS NA EQUIPE'),
      h('div', { class: 'syn-list' },
        active.length ? active.map(([ty, n]) => {
          const row = h('div', { class: 'syn-row on' }, typeChip(ty, true), h('span', { class: 'syn-bonus' }, `x${n}`));
          bindTip(row, () => [h('div', { class: 'tip-name' }, typeChip(ty)), h('div', { class: 'tip-eff' }, TYPE_EFFECT[ty])]);
          return row;
        }) : h('div', { class: 'empty-note' }, 'Cada tipo dá uma mecânica própria ao Pokémon. Passe o mouse para ver.')),
      h('div', { class: 'rank-badge', title: 'Ranked: o MMR sobe ao vencer times fantasmas' }, itemImg(div.icon, ''), `${div.name} · ${meta.mmr ?? 1000}`),
      opp ? h('div', { class: 'rival' },
        h('div', { class: 'rival-head' }, 'PRÓXIMO RIVAL', opp.ghost ? h('span', { class: 'ghost-tag' }, 'time salvo') : null),
        h('div', { class: 'rival-body' },
          img(trainerSprite(opp.trainer), 'rival-img'),
          h('div', null,
            h('div', { class: 'rival-name' }, opp.name),
            h('div', { class: 'rival-team' }, opp.team.filter(Boolean).map((u) => scope
              ? img(spriteUrl(u!.species, u!.shiny), 'mini')
              : h('span', { class: 'mini-q' }, '?'))))),
      ) : null,
    );

    // rank + ouro + lock
    const rank = rankOf(run);
    const odds = shopOdds(run);
    const tot = odds.reduce((a, b) => a + b, 0);
    const rankRow = h('div', { class: 'rank-row' }, h('span', { class: 'rank-label' }, `Mart Nv. ${rank}`),
      odds.slice(0, 5).map((o, i) => h('span', { class: 'odd' }, h('i', { style: { background: RARITY_COLOR[i + 1] } }), `${Math.round((o / tot) * 100)}%`)));
    bindTip(rankRow, () => [h('div', { class: 'tip-name' }, 'Chance por raridade'), h('div', { class: 'tip-eff' }, 'O Rank sobe a cada dia. Comum, Incomum, Raro, Super Raro e Lendário (Mítico é raríssimo). A loja só vende o primeiro estágio de cada linha.')]);
    const inc = income(run);
    const gold = h('div', { class: 'gold' }, `₽${run.gold}`);
    bindTip(gold, () => [h('div', { class: 'tip-name' }, 'Renda de amanhã'),
      h('div', { class: 'tip-eff' }, `Base +₽${inc.base} · Juros +₽${inc.interest}${inc.extra ? ` · Extra +₽${inc.extra}` : ''}`),
      h('div', { class: 'tip-foot' }, 'Juros: +₽1 a cada ₽10 guardados (máx. ₽5)')]);
    const lock = h('button', { class: `btn lock${run.locked ? ' on' : ''}`, onclick: () => { run.locked = !run.locked; sfx.click(); app.save(); draw(); } },
      run.locked ? [icon('lock', 3), ' TRAVADA'] : 'TRAVAR');

    // loja
    const shopCards = run.shop.map((slot, i) => {
      if (!slot) return h('div', { class: 'scard empty' });
      const afford = run.gold >= slot.price;
      let el: HTMLElement;
      if (slot.kind === 'mon') {
        const s = DEX[slot.species];
        const fake: Unit = { uid: 0, species: slot.species, level: 1, shiny: slot.shiny, extraTypes: [], perm: {}, prog: {} };
        for (const b of run.shopBuff ?? []) if (!b.type || DEX[slot.species].types.includes(b.type)) for (const [k, v] of Object.entries(b.perm)) fake.perm[k as keyof typeof fake.perm] = (fake.perm[k as keyof typeof fake.perm] ?? 0) + v;
        const st = computeStats(fake, ctxFor(null));
        const merge = wouldMerge(run, slot.species);
        const prog = copiesProgress(run, slot.species);
        el = h('div', { class: 'scard', style: { '--tier': RARITY_COLOR[s.rarity] } },
          slot.shiny ? h('div', { class: 'shiny-tag' }, 'SHINY') : null,
          merge ? h('div', { class: 'merge-tag' }, '⬆ LV2') : prog.have ? h('div', { class: 'have-tag' }, `${prog.have}/${prog.need}`) : null,
          h('div', { class: 'scard-art' }, img(spriteUrl(s.id, slot.shiny), 'mon'), chips(st, 2)),
          h('div', { class: 'scard-foot' }, h('span', { class: 'sname' }, s.name), h('span', { class: `sprice${afford ? '' : ' no'}` }, slot.price ? `₽${slot.price}` : 'GRÁTIS')));
        draggable(el, { from: 'shop', i }, spriteUrl(s.id, slot.shiny));
        sheetOn(el, () => unitPanel(fake, ctxFor(null), { price: slot.price, progress: prog.have ? `Você tem ${prog.have}/${prog.need} cópias Lv. 1` : undefined }), () => openSheet(slot.species, ctxFor(null), { shiny: slot.shiny }));
      } else {
        const def = ITEM[slot.item];
        const err = canUseItem(run, slot.item);
        el = h('div', { class: `scard item-card${err ? ' blocked' : ''}${aim === i ? ' selected' : ''}` },
          h('div', { class: 'item-tag' }, 'ITEM'),
          h('div', { class: 'scard-art' }, itemImg(def.icon, 'item-big')),
          h('div', { class: 'scard-foot' }, h('span', { class: 'sname' }, def.name), h('span', { class: `sprice${afford ? '' : ' no'}` }, def.price ? `₽${slot.price}` : 'GRÁTIS')));
        draggable(el, { from: 'shop', i }, `${import.meta.env.BASE_URL}sprites/items/${def.icon}.png`);
        bindTip(el, () => [h('div', { class: 'tip-head' }, h('span', { class: 'tip-name' }, def.name)), h('div', { class: 'tip-row' }, rarityTag(def.rarity)),
          h('div', { class: 'tip-eff' }, def.desc),
          h('div', { class: 'tip-foot' }, err ? `⚠ ${err}` : `Clique para usar agora · ${itemsLeft(run)} uso(s) hoje`)]);
      }
      return el;
    });
    const selUnit = sel && sel.from !== 'shop' ? unitAt(sel.from, sel.i) : null;
    const sellZone = dropTarget(h('div', { class: `sell-zone${selUnit ? ' show' : ''}` }, 'VENDER ', h('b', null, selUnit ? `+₽${sellValue(selUnit)}` : '')), { to: 'sell', i: 0 });
    const shop = h('div', { class: 'shop-strip' }, shopCards, sellZone);

    const rc = rerollCost(run);
    const rerollBtn = h('button', { class: 'btn reroll', onclick: () => {
      const err = reroll(run);
      if (err) { sfx.error(); toast(err, 'error'); return; }
      sfx.click(); sel = null; app.save(); draw();
    } }, h('span', null, 'RENOVAR'), h('span', null, rc === 0 ? `GRÁTIS${run.freeRerolls > 1 ? ` x${run.freeRerolls}` : ''}` : `₽${rc}`));

    const battleBtn = h('button', { class: 'btn battle', onclick: async () => {
      if (busy) return;
      if (!run.team.some(Boolean)) { sfx.error(); toast('Coloque pelo menos um Pokémon no time!', 'error'); return; }
      // aviso: vaga na equipe com Pokémon parado no PC (clique de novo para confirmar)
      const idle = run.bench.filter(Boolean).length;
      const free = run.team.filter((x) => !x).length;
      if (idle && free && !warnedIdle) {
        warnedIdle = true;
        sfx.error();
        toast(`${Math.min(idle, free)} Pokémon no PC não vão lutar. Clique de novo para batalhar assim.`, 'error');
        return;
      }
      const evos = preBattle(run);
      app.save();
      if (evos.length) { busy = true; await playEvolutions(evos); busy = false; }
      app.go('vs');
    } }, 'BATALHAR!');

    sidePanel = h('div', { class: 'side-sheet' });
    const wrap = h('div', { class: 'shop-screen', oncontextmenu: (e: Event) => e.preventDefault(), onclick: (e: Event) => {
      if (sel && e.target === e.currentTarget) { sel = null; draw(); }
    } }, top, trainerCol, bench, team, trinkets, synergy, rankRow, gold, lock, shop, rerollBtn, battleBtn, sidePanel);
    if (run.hearts <= 3) wrap.classList.add('danger');
    if (aim != null) wrap.classList.add('target-mode');
    return wrap;
  }

  draw();
  // mensagens do início do dia (ovos, treinador...)
  run.log.forEach((m, i) => setTimeout(() => toast(m, 'good'), 400 + i * 1800));
  run.log = [];
  app.save();
}
