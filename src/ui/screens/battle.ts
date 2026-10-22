import { Battle, FATIGUE_START, type BEvent, type Fighter } from '../../game/battle';
import { TRAINER } from '../../game/content';
import { spriteUrl, trainerSprite } from '../../game/dex';
import type { Unit } from '../../game/model';
import { applyBattle, trainerOf } from '../../game/run';
import { playEvolutions } from '../components';
import { getMeta, markSeen, saveGhost, saveMeta } from '../../game/storage';
import { TYPE_COLOR } from '../../game/types';
import { app } from '../app';
import { SCENE_NAME, drawScene, sceneAnimator, sceneForDay } from '../bg';
import { openSheet } from '../sheet';
import { makeCtx } from '../../game/stats';
import { chips, fmt, lvLabel } from '../components';
import { h, icon, img, wait } from '../dom';
import { cry, sfx } from '../sfx';
import { music } from '../music';

const COLS = [330, 450, 570];
function pos(side: number, slot: number) {
  const c = slot % 3, r = Math.floor(slot / 3);
  const x = COLS[c] - (r ? 50 : 0);
  return { x: side === 0 ? x : 1280 - x, y: r ? 565 : 425 };
}

/** medidor de dano pós-batalha (seção 10) */
function damageMeter(fs: Fighter[], best: number, runBest: number) {
  const list = fs.slice().sort((a, b) => b.meter.dmg - a.meter.dmg);
  const top = Math.max(1, ...list.map((f) => f.meter.dmg));
  return h('div', { class: 'meter' },
    h('div', { class: 'meter-row head' }, h('span'), h('span', null, 'Dano'), h('span', null, ''), h('span', null, 'Cura'), h('span', null, 'Escudo'), h('span', null, 'Status')),
    list.map((f) => h('div', { class: 'meter-row' },
      img(spriteUrl(f.unit.species, f.unit.shiny), ''),
      h('div', { class: 'meter-bar', style: { width: `${(f.meter.dmg / top) * 100}%` } }),
      h('b', null, fmt(f.meter.dmg)),
      h('span', null, fmt(f.meter.heal)), h('span', null, fmt(f.meter.shield)), h('span', null, fmt(f.meter.status)))),
    h('div', { class: 'meter-best' }, `Maior golpe: ${fmt(best)} nesta batalha · ${fmt(runBest)} na run`),
  );
}

export function renderVs(root: HTMLElement) {
  const run = app.run!;
  const me = trainerOf(run);
  const opp = run.opponent!;
  const ot = TRAINER[opp.trainer];
  sfx.vs();
  const el = h('div', { class: 'vs-screen' },
    h('div', { class: 'vs-half vs-left' }, h('div', { class: 'vs-lines' }), img(trainerSprite(me.sprite), 'vs-trainer')),
    h('div', { class: 'vs-half vs-right' }, h('div', { class: 'vs-lines' }), img(trainerSprite(ot.sprite), 'vs-trainer flip')),
    h('div', { class: 'vs-logo' }, 'VS'),
    h('div', { class: 'vs-name left' }, me.title),
    h('div', { class: 'vs-name right' }, opp.name),
    h('div', { class: 'vs-sub' }, `DIA ${run.day} · ${SCENE_NAME[sceneForDay(run.day)]}`),
  );
  root.append(el);
  let gone = false;
  const go = () => { if (!gone) { gone = true; app.go('battle'); } };
  el.addEventListener('click', go);
  const t = setTimeout(go, 2300);
  return () => clearTimeout(t);
}

export function renderBattle(root: HTMLElement) {
  const run = app.run!;
  const meta = getMeta();
  const opp = run.opponent!;
  const myTrainer = trainerOf(run);
  const oppTrainer = TRAINER[opp.trainer];
  const startShield = (t: typeof myTrainer) => t.startShield ?? 0;
  const battle = new Battle(
    { team: run.team, trainer: myTrainer, hpBonus: run.hpBonus, startShield: startShield(myTrainer), trinkets: run.trinkets, nerd: run.flags.nerd ?? 0, gold: run.gold, wins: run.wins, losses: run.losses },
    { team: opp.team, trainer: oppTrainer, hpBonus: opp.hpBonus, startShield: startShield(oppTrainer), trinkets: opp.trinkets ?? [], scale: opp.scale ?? 1 },
    run.seed ^ (run.day * 7919),
  );
  markSeen(opp.team.flatMap((u) => (u ? [u.species] : [])));
  markSeen(run.team.flatMap((u) => (u ? [u.species] : [])), true);

  const canvas = h('canvas', { class: 'scene' });
  drawScene(canvas, sceneForDay(run.day), run.day * 31);
  const fxCanvas = h('canvas', { class: 'scene' });
  const animate = sceneAnimator(fxCanvas, sceneForDay(run.day), run.day * 17);

  // barras de HP
  const bars = [0, 1].map((s) => {
    const fill = h('div', { class: 'hp-fill' });
    const lag = h('div', { class: 'hp-lag' });
    const text = h('span', { class: 'hp-text' });
    const shield = h('div', { class: 'hp-shield' }, icon('shield', 4), h('span'));
    const status = h('div', { class: 'status-row' });
    const name = h('div', { class: 'bar-name' }, s === 0 ? myTrainer.title : opp.name);
    const el = h('div', { class: `bhp side${s}` }, name, h('div', { class: 'hp-box big' }, h('span', { class: 'hp-label' }, 'HP'), h('div', { class: 'hp-bar' }, lag, fill, text)), shield, status);
    return { el, fill, lag, text, shield, status };
  });

  // lutadores
  const fEls = new Map<string, { el: HTMLElement; cd: HTMLElement; f: Fighter }>();
  const field = h('div', { class: 'field' });
  battle.sides.forEach((side, s) => {
    for (const f of side.fighters) {
      const p = pos(s, f.slot);
      const cd = h('div', { class: 'cd-fill' });
      const el = h('div', { class: `fighter side${s}`, style: { left: `${p.x - 64}px`, top: `${p.y - 128}px`, zIndex: String(p.y) } },
        h('div', { class: 'shadow' }),
        lvLabel(f.unit.level),
        h('div', { class: 'spr' }, img(spriteUrl(f.unit.species, f.unit.shiny), `mon${s === 0 ? ' flip' : ''}`)),
        h('div', { class: 'cd-bar' }, cd),
        chips(f.st),
      );
      field.append(el);
      fEls.set(`${s}:${f.slot}`, { el, cd, f });
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const team = s === 0 ? run.team : opp.team;
        openSheet(f.unit.species, makeCtx(team, s === 0 ? myTrainer : oppTrainer, s === 0 ? run.trinkets : opp.trinkets ?? [], f.slot), { shiny: f.unit.shiny, unit: f.unit });
      });
    }
  });

  const timer = h('div', { class: 'btimer' });
  const fx = h('div', { class: 'fx-layer' });
  const speedBtns = [1, 2, 4, 8].map((sp) => h('button', { class: `spd${meta.speed === sp ? ' on' : ''}`, onclick: () => setSpeed(sp) }, `${sp}x`));
  let speed = meta.speed || 1;
  function setSpeed(sp: number) {
    speed = sp;
    meta.speed = sp;
    saveMeta();
    speedBtns.forEach((b, i) => b.classList.toggle('on', [1, 2, 4, 8][i] === sp));
  }
  const skip = h('button', { class: 'spd skip', onclick: () => { skipped = true; battle.runToEnd(); } }, 'PULAR ▸▸');
  const controls = h('div', { class: 'bcontrols' }, speedBtns, skip);

  root.append(h('div', { class: 'battle-screen', oncontextmenu: (e: Event) => e.preventDefault() }, canvas, fxCanvas, bars[0].el, bars[1].el, timer, field, fx, controls));

  // ---------- efeitos ----------
  const center = (s: number, slot: number) => {
    const p = pos(s, slot);
    return { x: p.x, y: p.y - 50 };
  };
  const barPos = (s: number) => ({ x: s === 0 ? 390 : 890, y: 150 });

  function pop(x: number, y: number, text: string, cls: string) {
    if (fx.childElementCount > 60) return;
    const el = h('div', { class: `pop ${cls}`, style: { left: `${x + (Math.random() * 30 - 15)}px`, top: `${y}px` } }, text);
    el.addEventListener('animationend', () => el.remove());
    fx.append(el);
  }

  function flash(s: number, slot: number, cls: string, ms = 300) {
    const e = fEls.get(`${s}:${slot}`)?.el;
    if (!e) return;
    e.classList.remove(cls);
    void e.offsetWidth;
    e.classList.add(cls);
    setTimeout(() => e.classList.remove(cls), ms / speed);
  }

  function projectile(from: { x: number; y: number }, to: { x: number; y: number }, color: string, done: () => void) {
    if (fx.childElementCount > 60) return done();
    const p = h('div', { class: 'proj', style: { background: color, boxShadow: `0 0 10px ${color}` } });
    fx.append(p);
    const anim = p.animate(
      [{ transform: `translate(${from.x}px, ${from.y}px) scale(.6)` }, { transform: `translate(${to.x}px, ${to.y - 20}px) scale(1.2)` }],
      { duration: 260 / speed, easing: 'ease-in' },
    );
    anim.onfinish = () => { p.remove(); done(); };
  }

  function handle(ev: BEvent) {
    switch (ev.k) {
      case 'act': {
        const f = fEls.get(`${ev.side}:${ev.slot}`)!.f;
        // grito quando o Pokémon age (com intervalo para não virar barulho)
        const key = `${ev.side}:${ev.slot}`;
        const nowMs = performance.now();
        if (!ev.multi && nowMs - (lastCryAt.get(key) ?? -1e9) > 2600 / Math.sqrt(speed)) {
          lastCryAt.set(key, nowMs);
          cry(f.unit.species, ev.side === 0 ? 0.16 : 0.12, 1, 260);
        }
        flash(ev.side, ev.slot, 'hop', 220);
        projectile(center(ev.side, ev.slot), center(1 - ev.side, ev.target), TYPE_COLOR[f.st.types[0]], () => {
          const c = center(1 - ev.side, ev.target);
          pop(c.x, c.y - 30, fmt(ev.dmg), `c-dmg${ev.crit ? ' crit' : ''}`);
          if (ev.crit) pop(c.x, c.y - 70, 'CRÍTICO!', 'label');
          if (ev.multi) pop(c.x, c.y - 95, 'MULTICAST', 'label');
          flash(1 - ev.side, ev.target, 'hurt', 260);
          sfx.hit();
        });
        break;
      }
      case 'heal': {
        const c = center(ev.side, ev.slot);
        pop(c.x, c.y - 40, `+${fmt(ev.amount)}`, 'c-heal');
        flash(ev.side, ev.slot, 'glow-heal', 400);
        break;
      }
      case 'shield': {
        const b = barPos(ev.side);
        pop(b.x + 120, b.y + 30, `+${fmt(ev.amount)}`, 'c-shield small');
        flash(ev.side, ev.slot, 'glow-shield', 400);
        break;
      }
      case 'status': {
        const b = barPos(ev.side);
        if (ev.burn) pop(b.x - 60, b.y + 40, fmt(ev.burn), 'c-burn small');
        if (ev.poison) pop(b.x + 20, b.y + 40, fmt(ev.poison), 'c-poison small');
        break;
      }
      case 'fatigue': {
        const b = barPos(ev.side);
        pop(b.x, b.y + 40, fmt(ev.amount), 'c-dmg small');
        break;
      }
      case 'charge':
        flash(ev.side, ev.slot, 'glow-haste', 300);
        break;
      case 'ability': {
        const c = center(ev.side, ev.slot);
        pop(c.x, c.y - 95, ev.text, 'label ability');
        break;
      }
      case 'ko': {
        const e = fEls.get(`${ev.side}:${ev.slot}`)?.el;
        e?.classList.add('ko');
        const kf = fEls.get(`${ev.side}:${ev.slot}`)?.f;
        if (kf) cry(kf.unit.species, 0.22, 0.75);
        sfx.ko();
        const c = center(ev.side, ev.slot);
        pop(c.x, c.y - 60, 'K.O.!', 'label ko-pop');
        sfx.hit();
        break;
      }
      case 'revive': {
        fEls.get(`${ev.side}:${ev.slot}`)?.el.classList.remove('ko');
        const c = center(ev.side, ev.slot);
        pop(c.x, c.y - 60, 'Reviveu!', 'label se');
        break;
      }
      case 'gold': {
        const c = center(ev.side, ev.slot);
        pop(c.x, c.y - 70, `+₽${ev.amount}`, 'label gold-pop');
        break;
      }
      case 'freeze':
        flash(ev.side, ev.slot, 'frozen', 500);
        break;
    }
  }

  function updateUi() {
    battle.sides.forEach((side, s) => {
      const b = bars[s];
      const pct = Math.max(0, side.hp / side.maxHp) * 100;
      b.fill.style.width = `${pct}%`;
      b.fill.classList.toggle('low', pct < 25);
      b.lag.style.width = `${pct}%`;
      b.text.textContent = `${fmt(side.hp)}/${fmt(side.maxHp)}`;
      b.shield.classList.toggle('show', side.shield >= 1);
      b.shield.querySelector('span')!.textContent = fmt(side.shield);
      const st: Node[] = [];
      if (side.burn >= 1) st.push(h('span', { class: 'stat-badge burn' }, icon('flame', 3), fmt(side.burn)));
      if (side.poison >= 1) st.push(h('span', { class: 'stat-badge poison' }, icon('skull', 3), fmt(side.poison)));
      if (side.shock >= 1) st.push(h('span', { class: 'stat-badge shock' }, '⚡', fmt(side.shock)));
      if (side.cold >= 1) st.push(h('span', { class: 'stat-badge cold' }, '❄', fmt(side.cold)));
      if (side.armor >= 1) st.push(h('span', { class: 'stat-badge armor' }, icon('shield', 3), fmt(side.armor)));
      b.status.replaceChildren(...st);
    });
    for (const { cd, f } of fEls.values()) cd.style.height = `${Math.max(0, Math.min(1, f.timer / f.st.cd)) * 100}%`;
    const t = Math.floor(battle.t);
    timer.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    timer.classList.toggle('fatigue', battle.t > FATIGUE_START);
    if (battle.t > FATIGUE_START) timer.textContent += ' · FADIGA';
  }

  // ---------- loop ----------
  let raf = 0;
  let last = performance.now();
  let skipped = false;
  let finished = false;
  const startAt = performance.now() + 500;

  // gritos de entrada: o da frente de cada lado
  setTimeout(() => {
    const front = (s: number) => battle.sides[s].fighters.slice().sort((x, y) => (y.slot % 3) - (x.slot % 3))[0];
    const a = front(0), b2 = front(1);
    if (a) cry(a.unit.species, 0.3);
    if (b2) setTimeout(() => cry(b2.unit.species, 0.3), 450);
  }, 150);
  const lastCryAt = new Map<string, number>();
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    animate(now / 1000);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (now < startAt) return;
    if (!battle.over) {
      const evs = battle.step(dt * speed);
      if (!skipped) for (const e of evs) handle(e);
    }
    updateUi();
    if (battle.over && !finished) {
      finished = true;
      finish();
    }
  };
  raf = requestAnimationFrame(loop);

  async function finish() {
    const won = battle.winner === 0;
    // salva o time como "fantasma" para futuros oponentes do mesmo dia
    saveGhost(run.day, {
      name: `${myTrainer.title} (fantasma)`, trainer: run.trainer,
      team: structuredClone(run.team) as (Unit | null)[], hpBonus: run.hpBonus, trinkets: [...run.trinkets], ghost: true, mmr: meta.mmr ?? 1000,
    });
    // maior golpe da batalha e da run
    run.flags.bestHit = Math.max(run.flags.bestHit ?? 0, battle.bestHit);
    if (battle.bestHit > (meta.bestHit ?? 0)) { meta.bestHit = battle.bestHit; saveMeta(); }
    await wait(skipped ? 100 : 700);
    const goldBy: Record<number, number> = {};
    for (const f of battle.sides[0].fighters) if (f.mem.gold) goldBy[f.unit.uid] = f.mem.gold;
    const out = applyBattle(run, won, { gold: battle.sides[0].gold, goldBy, koSeen: battle.koSeen, team: battle.sides[0].counts, crits: battle.crits, attacks: battle.attacks });
    app.save();
    music.play(won ? 'victory' : 'defeat');
    const overlay = h('div', { class: `result ${won ? 'win' : 'lose'}` },
      h('div', { class: 'result-title' }, won ? 'VITÓRIA!' : 'DERROTA...'),
      h('div', { class: 'result-sub' },
        won ? [icon('badge', 5), ` ${run.wins}/10`] : [icon('heart', 5), ` -${out.heartsLost}  (restam ${run.hearts})`]),
      out.notes.map((n) => h('div', { class: 'result-note' }, n)),
      damageMeter(battle.sides[0].fighters, battle.bestHit, run.flags.bestHit ?? 0),
      h('details', { class: 'blog' }, h('summary', null, `Log da batalha (${battle.log.length})`), h('div', { class: 'blog-list' }, battle.log.map((l) => h('div', null, l)))),
      h('button', { class: 'btn battle small', onclick: async () => {
        if (out.evos.length) await playEvolutions(out.evos);
        if (out.runOver) app.go('end', out.runOver);
        else app.go(run.phase === 'pending' ? 'pending' : 'shop');
      } }, 'CONTINUAR'),
    );
    root.querySelector('.battle-screen')!.append(overlay);
    // anima os sobreviventes do time vencedor
    for (const { el, f } of fEls.values()) {
      const side = el.classList.contains('side0') ? 0 : 1;
      if (side === battle.winner) el.classList.add('cheer');
      void f;
    }
  }

  return () => cancelAnimationFrame(raf);
}
