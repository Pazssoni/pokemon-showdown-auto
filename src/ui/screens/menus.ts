import { EVENT, TRAINERS, type TrainerDef } from '../../game/content';
import { ALL_IDS, DEX, SHOP_BY_RARITY, spriteUrl, trainerSprite } from '../../game/dex';
import { RARITY_COLOR, RARITY_NAME } from '../../game/model';
import { TRINKET } from '../../game/trinkets';
import { fmt, playEvolutions, typeChip } from '../components';
import { beginDay, eventOptionOk, newRun, pickType, runEvent, takeGift, trainerOf, type EvoNote } from '../../game/run';
import { divisionOf, getMeta, loadRun, saveMeta } from '../../game/storage';
import { TYPE_COLOR, TYPE_EFFECT, TYPE_NAME } from '../../game/types';
import type { RunState } from '../../game/model';
import { app } from '../app';
import { drawScene, sceneAnimator } from '../bg';
import { h, img, itemImg, toast } from '../dom';
import { sfx } from '../sfx';
import { music } from '../music';

const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function renderTitle(root: HTMLElement) {
  const saved = loadRun();
  const canvas = h('canvas', { class: 'scene' });
  drawScene(canvas, 'forest', Math.floor(Math.random() * 1000));
  const fx = h('canvas', { class: 'scene' });
  const animate = sceneAnimator(fx, 'forest', 11);
  let raf = 0;
  const loop = (t: number) => { animate(t / 1000); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  const parade = [rand([1, 4, 7]), 25, rand(SHOP_BY_RARITY[3]), rand(SHOP_BY_RARITY[4]), rand([144, 145, 146, 149, 150, 151])];
  const meta = getMeta();
  const help = () => {
    const ov = h('div', { class: 'modal-bg', onclick: (e: Event) => e.target === e.currentTarget && ov.remove() },
      h('div', { class: 'modal panel' },
        h('div', { class: 'panel-head yellow' }, 'COMO JOGAR'),
        h('div', { class: 'help' },
          h('p', null, '🛒 ', h('b', null, 'Loja:'), ' só vende o primeiro estágio (Charmander, nunca Charmeleon). Clique ou arraste para comprar. Cada run usa uma região diferente de Kanto.'),
          h('p', null, '⬆️ ', h('b', null, 'Fusão:'), ' 3 cópias Lv1 viram um Lv2, 2 Lv2 viram um Lv3 e 2 Lv3 viram um Lv4 (cada nível dobra os números). Linhas de 3 estágios evoluem no Lv2 e no Lv3 (3 Charmander = Charmeleon, 2 Charmeleon = Charizard). Outras têm regras próprias: pedras, contadores… e Magikarp precisa de 5!'),
          h('p', null, '🔥 ', h('b', null, 'Tipos:'), ' cada tipo dá uma mecânica própria (Queimadura, Veneno, Choque, Frio, Cura, Escudo, Armadura, Eco, Bênção…). Passe o mouse num tipo para ver. Um Pokémon pode ter até 3 tipos.'),
          h('p', null, '✨ ', h('b', null, 'Habilidades:'), ' evoluídos e espécies especiais têm uma (passe o mouse). Posição importa: frente, atrás, acima, adjacentes.'),
          h('p', null, '⚔️ ', h('b', null, 'Batalha:'), ' automática, com HP compartilhado. Depois de 30s vem a fadiga; aos 75s vence quem tiver mais HP%.'),
          h('p', null, '🎁 ', h('b', null, 'Itens segurados:'), ' cada vitória dá um presente (escolha 1 de 3). Itens da loja são usados na hora: 1 por dia.'),
          h('p', null, '📱 ', h('b', null, 'Celular:'), ' jogue com a tela deitada. O primeiro toque abre a tela cheia; toque longo num Pokémon abre a ficha completa (como o clique direito). No iPhone, use "Adicionar à Tela de Início" para abrir em tela cheia.'),
          h('p', null, '❤️ ', h('b', null, 'Vidas:'), ' derrotas custam 1/2/3 corações conforme o dia. Com 3 ou menos, a Enfermeira Joy aparece uma vez. Encontros especiais nos dias 3, 6 e 9. Objetivo: 10 vitórias.'),
        ),
        h('button', { class: 'btn battle small', onclick: () => ov.remove() }, 'ENTENDI')));
    root.append(ov);
  };
  root.append(h('div', { class: 'title-screen' },
    canvas, fx,
    h('div', { class: 'logo' }, h('div', { class: 'logo-top' }, 'KANTO'), h('div', { class: 'logo-bottom' }, 'SHOWDOWN')),
    h('div', { class: 'logo-sub' }, `auto battler · ${ALL_IDS.length} Pokémon · cada tipo, uma mecânica`),
    h('div', { class: 'parade' }, parade.map((id, i) => img(spriteUrl(id, Math.random() < 0.1), `mon parade-${i}`))),
    h('div', { class: 'menu' },
      saved ? h('button', { class: 'btn battle', onclick: () => { app.run = saved; sfx.click(); app.go(saved.phase === 'pending' ? 'pending' : 'shop'); } }, `CONTINUAR · DIA ${saved.day}`) : null,
      h('button', { class: `btn ${saved ? 'reroll' : 'battle'}`, onclick: () => { sfx.click(); app.go('trainer'); } }, 'NOVA RUN'),
      h('div', { class: 'menu-row' },
        h('button', { class: 'btn plain', onclick: () => app.go('dex', 'title') }, 'POKÉDEX'),
        h('button', { class: 'btn plain', onclick: help }, 'COMO JOGAR'))),
    h('div', { class: 'title-stats' }, `Runs vencidas: ${meta.runsWon} · Pokédex: ${meta.seen.length}/${ALL_IDS.length}`),
    h('div', { class: 'disclaimer' }, 'Projeto fã, sem fins lucrativos, inspirado em Batomon Showdown. Pokémon © Nintendo / Game Freak / The Pokémon Company.'),
  ));
  return () => cancelAnimationFrame(raf);
}

export function renderTrainer(root: HTMLElement) {
  const meta = getMeta();
  const unlocked = TRAINERS.filter((t) => !t.unlock || meta.runsWon >= t.unlock);
  const locked = TRAINERS.filter((t) => t.unlock && meta.runsWon < t.unlock);
  let options = pick3();
  function pick3() {
    return [...unlocked].sort(() => Math.random() - 0.5).slice(0, 3);
  }
  const card = (t: TrainerDef) =>
    h('button', { class: 'tcard panel', onclick: () => {
      const start = () => {
        sfx.buy();
        app.run = newRun(t.id);
        app.save();
        app.go(app.run.phase === 'pending' ? 'pending' : 'shop');
      };
      const saved = loadRun();
      if (!saved) return start();
      // confirmação dentro do jogo (o confirm() nativo é bloqueado em alguns navegadores embutidos)
      const ov = h('div', { class: 'modal-bg' },
        h('div', { class: 'modal panel' },
          h('div', { class: 'panel-head yellow' }, 'NOVA RUN'),
          h('p', { class: 'confirm-text' }, `Você tem uma run salva no dia ${saved.day} (${saved.wins} vitórias). Começar uma nova vai apagá-la.`),
          h('div', { class: 'menu-row' },
            h('button', { class: 'btn battle small', onclick: () => { ov.remove(); start(); } }, 'COMEÇAR'),
            h('button', { class: 'btn plain', onclick: () => ov.remove() }, 'CANCELAR'))));
      root.append(ov);
    } },
      h('div', { class: 'panel-head yellow' }, t.title),
      h('div', { class: 'portrait' }, img(trainerSprite(t.sprite), 'trainer-img')),
      h('div', { class: 'passive' }, t.desc));
  const draw = () => {
    root.replaceChildren(h('div', { class: 'trainer-screen' },
      h('div', { class: 'big-title' }, 'ESCOLHA SEU TREINADOR'),
      h('div', { class: 'tcards' }, options.map(card)),
      h('div', { class: 'trainer-actions' },
        h('button', { class: 'btn plain', onclick: () => app.go('title') }, '◂ VOLTAR'),
        unlocked.length > 3 ? h('button', { class: 'btn reroll small', onclick: () => { options = pick3(); sfx.click(); draw(); } }, 'OUTROS') : null),
      locked.length ? h('div', { class: 'locked-row' },
        h('span', null, 'Líderes de Ginásio:'),
        locked.map((t) => h('div', { class: 'locked', title: `Vença ${t.unlock} run(s) para liberar` }, img(trainerSprite(t.sprite), 'locked-img'), h('small', null, `${t.unlock}🏆`)))) : null,
    ));
  };
  draw();
}

export function renderPending(root: HTMLElement) {
  const run = app.run!;
  const p = run.queue[0];
  if (!p) { run.phase = 'shop'; app.go('shop'); return; }
  const next = () => app.go(run.phase === 'pending' ? 'pending' : 'shop');
  const resultModal = (title: string, art: Node, msg: string, evos: EvoNote[] = []) => {
    app.save();
    const ov = h('div', { class: 'modal-bg' },
      h('div', { class: 'modal panel' },
        h('div', { class: 'panel-head yellow' }, title),
        h('div', { class: 'event-result' }, art, h('p', null, msg)),
        h('button', { class: 'btn battle small', onclick: async () => { ov.remove(); if (evos.length) await playEvolutions(evos); next(); } }, 'CONTINUAR')));
    root.append(ov);
  };

  if (p.kind === 'gift') {
    const g = p.gift;
    root.append(h('div', { class: 'event-screen' },
      h('div', { class: 'big-title' }, g.reason.toUpperCase()),
      h('div', { class: 'event-sub' }, g.takeAll ? 'Burglar: você leva todos!' : 'Escolha um item segurado'),
      h('div', { class: 'events' }, g.choices.map((id, i) => {
        const t = TRINKET[id];
        return h('button', { class: 'ecard panel gift-card', style: { '--tier': RARITY_COLOR[t.rarity] }, onclick: () => {
          sfx.buy();
          const msg = takeGift(run, i);
          resultModal('Prêmio', itemImg(t.icon, 'event-ico item'), msg);
        } },
          h('div', { class: 'panel-head', style: { background: RARITY_COLOR[t.rarity], color: '#fff' } }, t.name),
          h('div', { class: 'ecard-art' }, itemImg(t.icon, 'event-ico item')),
          h('div', { class: 'ecard-desc' }, t.desc),
          h('div', { class: 'ecard-cost', style: { color: RARITY_COLOR[t.rarity] } }, RARITY_NAME[t.rarity] + (t.unique ? ' · Único' : '')));
      })),
    ));
    return;
  }

  if (p.kind === 'typepick') {
    root.append(h('div', { class: 'event-screen' },
      h('div', { class: 'big-title' }, 'INFUSÃO DE TIPO'),
      h('div', { class: 'event-sub' }, 'Escolha o tipo: um Pokémon aleatório do seu time (com menos de 3 tipos) ganha esse tipo.'),
      h('div', { class: 'events' }, p.types.map((t, i) => h('button', { class: 'ecard panel gift-card', style: { '--tier': TYPE_COLOR[t] }, onclick: () => {
        sfx.merge();
        resultModal('Infusão de Tipo', typeChip(t), pickType(run, i));
      } },
        h('div', { class: 'panel-head', style: { background: TYPE_COLOR[t], color: '#fff' } }, TYPE_NAME[t]),
        h('div', { class: 'ecard-art' }, typeChip(t)),
        h('div', { class: 'ecard-desc' }, TYPE_EFFECT[t])))),
    ));
    return;
  }

  const e = EVENT[p.id];
  const art = () => (e.icon.kind === 'item' ? itemImg(e.icon.name, 'event-ico item')
    : e.icon.kind === 'mon' ? img(spriteUrl(Number(e.icon.name)), 'event-ico mon') : img(trainerSprite(e.icon.name), 'event-ico'));
  root.append(h('div', { class: 'event-screen' },
    h('div', { class: 'big-title' }, e.day ? `DIA ${run.day} · ${e.name.toUpperCase()}` : e.name.toUpperCase()),
    h('div', { class: 'event-story panel' }, h('div', { class: 'story-art' }, art()), h('p', null, e.text)),
    h('div', { class: 'choices' }, e.options.map((o, i) => {
      const ok = eventOptionOk(run, e.id, i);
      return h('button', { class: `choice${ok ? '' : ' disabled'}`, onclick: () => {
        if (!eventOptionOk(run, e.id, i)) { sfx.error(); return; }
        sfx.merge();
        const r = runEvent(run, e.id, i);
        resultModal(e.name, art(), r.msg ?? '', r.evos);
      } },
        h('b', null, o.label), h('span', null, '→ ' + o.result), o.cost ? h('em', null, `₽${o.cost}`) : null);
    })),
    h('div', { class: 'event-foot' }, h('span', { class: 'gold' }, `₽${run.gold}`)),
  ));
}

export function renderEnd(root: HTMLElement, result: unknown) {
  const run = app.run!;
  const meta = getMeta();
  const won = result === 'win';
  if (!run.flags.endless) meta.runsPlayed++;
  let unlockMsg = '';
  if (won) {
    meta.runsWon++;
    const newly = TRAINERS.find((t) => t.unlock === meta.runsWon);
    if (newly) unlockMsg = `Novo treinador liberado: ${newly.title}!`;
  }
  meta.bestMmr = Math.max(meta.bestMmr ?? 1000, meta.mmr ?? 1000);
  saveMeta();
  app.run = null;
  app.save();
  const div = divisionOf(meta.mmr ?? 1000);
  root.append(h('div', { class: `end-screen ${won ? 'win' : 'lose'}` },
    h('div', { class: 'big-title' }, won ? (run.flags.endless ? 'FIM DO MODO INFINITO' : 'CAMPEÃO DE KANTO!') : (run.flags.endless ? 'FIM DO MODO INFINITO' : 'FIM DA JORNADA')),
    h('div', { class: 'end-stats' }, `${run.wins} vitórias · ${run.losses} derrotas · ${run.day} dias · maior golpe ${fmt(run.flags.bestHit ?? 0)}`),
    h('div', { class: 'end-stats rank-badge' }, itemImg(div.icon, ''), `Ranked: ${div.name} · MMR ${meta.mmr ?? 1000}`),
    h('div', { class: 'end-team' }, run.team.filter(Boolean).map((u) =>
      h('div', { class: 'end-mon' }, img(spriteUrl(u!.species, u!.shiny), 'mon'), h('small', null, `${DEX[u!.species].name} Lv.${u!.level}`)))),
    unlockMsg ? h('div', { class: 'unlock' }, unlockMsg) : null,
    h('div', { class: 'menu-row' },
      won && !run.flags.endless ? h('button', { class: 'btn reroll', onclick: () => {
        // modo infinito: continua a mesma run depois do título
        run.flags.endless = 1;
        run.day++;
        beginDay(run);
        app.run = run;
        app.save();
        app.go(run.phase === 'pending' ? 'pending' : 'shop');
      } }, 'MODO INFINITO') : null,
      h('button', { class: 'btn plain', onclick: () => void shareRun(run, won, `${div.name} · MMR ${meta.mmr ?? 1000}`) }, 'SALVAR IMAGEM'),
      h('button', { class: 'btn battle', onclick: () => app.go('trainer') }, 'NOVA RUN'),
      h('button', { class: 'btn plain', onclick: () => app.go('title') }, 'MENU')),
    won && !run.flags.endless ? h('div', { class: 'end-hint' }, 'Modo Infinito: continue com o mesmo time contra rivais cada vez mais fortes, até perder os corações.') : null,
  ));
  music.play(won ? 'victory' : 'defeat');
  void toast;
}

/** resumo da run como imagem PNG (seção 10) */
async function shareRun(run: RunState, won: boolean, rank: string) {
  const W = 960, H = 540;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, won ? '#2e86d6' : '#5a4a6e');
  grad.addColorStop(1, '#1b1726');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#ffd84a';
  g.font = 'bold 44px sans-serif';
  g.textAlign = 'center';
  g.fillText(won ? (run.flags.endless ? 'MODO INFINITO' : 'CAMPEÃO DE KANTO!') : 'FIM DA JORNADA', W / 2, 70);
  g.fillStyle = '#fff';
  g.font = '22px sans-serif';
  g.fillText(`${trainerOf(run).title} · ${run.wins} vitórias · ${run.losses} derrotas · dia ${run.day}`, W / 2, 110);
  g.fillText(`Maior golpe: ${fmt(run.flags.bestHit ?? 0)} · ${rank}`, W / 2, 142);
  const load = (src: string) => new Promise<HTMLImageElement | null>((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  const team = run.team.filter(Boolean);
  for (let i = 0; i < team.length; i++) {
    const u = team[i]!;
    const x = 110 + (i % 3) * 300, y = 180 + Math.floor(i / 3) * 170;
    const im = await load(spriteUrl(u.species, u.shiny));
    g.imageSmoothingEnabled = false;
    if (im) g.drawImage(im, x - 60, y, 120, 120);
    g.fillStyle = '#fff';
    g.font = 'bold 18px sans-serif';
    g.textAlign = 'left';
    g.fillText(`${u.shiny ? '★ ' : ''}${DEX[u.species].name}`, x + 66, y + 50);
    g.font = '15px sans-serif';
    g.fillText(`Lv. ${u.level} · ${[...DEX[u.species].types, ...u.extraTypes].slice(0, 3).map((t) => TYPE_NAME[t]).join('/')}`, x + 66, y + 74);
  }
  g.textAlign = 'center';
  g.font = '14px sans-serif';
  g.fillStyle = 'rgba(255,255,255,.6)';
  g.fillText('Kanto Showdown', W / 2, H - 16);
  const a = document.createElement('a');
  a.download = `kanto-showdown-run-${Date.now()}.png`;
  a.href = c.toDataURL('image/png');
  a.click();
}
