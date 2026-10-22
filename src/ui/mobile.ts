// Celular: escala o palco para ocupar a tela, tela cheia no toque e toque longo = clique direito
type FsDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };

export const isTouch = () => window.matchMedia('(any-pointer: coarse)').matches || navigator.maxTouchPoints > 0;
const isFullscreen = () => !!(document.fullscreenElement || (document as FsDoc).webkitFullscreenElement);

/** o jogo é desenhado em 1280x720 e escalado (sem distorcer) para o maior tamanho que cabe na tela */
export function fitStage(stage: HTMLElement) {
  const fit = () => {
    const vv = window.visualViewport;
    const w = vv?.width ?? window.innerWidth;
    const h = vv?.height ?? window.innerHeight;
    stage.style.transform = `scale(${Math.min(w / 1280, h / 720)})`;
  };
  window.addEventListener('resize', fit);
  window.visualViewport?.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 250));
  document.addEventListener('fullscreenchange', fit);
  document.addEventListener('webkitfullscreenchange', fit);
  fit();
}

/** entra em tela cheia (e trava na horizontal, onde o navegador deixa) no próximo toque */
async function goFullscreen() {
  if (isFullscreen()) return;
  const el = document.documentElement as FsEl;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else await el.webkitRequestFullscreen?.();
  } catch {
    return; // iPhone não tem tela cheia no navegador: o atalho na tela inicial abre em tela cheia
  }
  try { await (screen.orientation as LockableOrientation).lock?.('landscape'); } catch { /* nem todo navegador deixa travar */ }
}

export function setupMobile() {
  if (isTouch()) {
    // tela cheia a cada toque enquanto não estiver (o navegador só permite a partir de um gesto do usuário)
    document.addEventListener('click', () => { void goFullscreen(); }, true);
    document.addEventListener('touchend', () => { void goFullscreen(); }, { capture: true, passive: true });
  }

  // toque longo (0,5s parado) abre a ficha completa, como o clique direito no PC
  let timer = 0;
  let start: { x: number; y: number; target: EventTarget | null } | null = null;
  let fired = false;
  let synthetic = false;
  document.addEventListener('contextmenu', (e) => {
    if (synthetic) return;
    // Android já dispara o clique direito no toque longo: usa o dele e cancela o nosso
    if (fired) { e.stopImmediatePropagation(); e.preventDefault(); return; }
    if (start) { clearTimeout(timer); fired = true; }
  }, true);
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    fired = false;
    start = { x: e.clientX, y: e.clientY, target: e.target };
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!start || document.body.classList.contains('dragging')) return;
      fired = true;
      synthetic = true;
      start.target?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: start.x, clientY: start.y, button: 2 }));
      synthetic = false;
      // depois do toque longo, o "soltar" não deve virar um clique
      const swallow = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
      document.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => document.removeEventListener('click', swallow, true), 600);
    }, 500);
  }, true);
  const cancel = (e: PointerEvent) => {
    if (!start) return;
    if (e.type === 'pointermove' && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 10) return;
    clearTimeout(timer);
    start = null;
  };
  document.addEventListener('pointermove', cancel, true);
  document.addEventListener('pointerup', cancel, true);
  document.addEventListener('pointercancel', cancel, true);
}
