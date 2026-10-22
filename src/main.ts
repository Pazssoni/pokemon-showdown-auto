import './style.css';
import { app } from './ui/app';
import { setStage } from './ui/dom';
import { music } from './ui/music';
import { audioCtx, sfx } from './ui/sfx';
import { renderBattle, renderVs } from './ui/screens/battle';
import { renderDex } from './ui/screens/dex';
import { renderEnd, renderPending, renderTitle, renderTrainer } from './ui/screens/menus';
import { renderShop } from './ui/screens/shop';

const stage = document.getElementById('stage')!;
setStage(stage);
app.root = document.getElementById('root')!;

// o jogo é desenhado em 1280x720 e escalado para caber na janela
function fit() {
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  stage.style.transform = `scale(${s})`;
}
window.addEventListener('resize', fit);
fit();

app.register('title', renderTitle);
app.register('trainer', renderTrainer);
app.register('pending', renderPending);
app.register('shop', renderShop);
app.register('vs', renderVs);
app.register('battle', renderBattle);
app.register('end', (root, arg) => renderEnd(root, arg));
app.register('dex', (root, arg) => renderDex(root, arg));

// o navegador só libera áudio depois do primeiro clique
document.addEventListener('pointerdown', () => {
  audioCtx();
  if (!music.playing) music.play(app.current === 'battle' || app.current === 'vs' ? 'battle' : app.current === 'title' || app.current === 'trainer' ? 'title' : 'shop');
}, { once: true });

// "bip" de menu em todos os botões que não têm som próprio
document.addEventListener('pointerdown', (e) => {
  const b = (e.target as Element).closest('.btn.plain, .icon-btn, .tab, .spd, .choice, .tcard, .ecard');
  if (b && e.button === 0) sfx.click();
});

app.go('title');
