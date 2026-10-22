type Child = Node | string | number | null | undefined | false | Child[];
type Props = Record<string, unknown> & { class?: string; style?: string | Record<string, string | number> };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v as string;
      else if (k === 'style' && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v as Record<string, string>)) {
          if (sk.startsWith('--')) el.style.setProperty(sk, sv);
          else (el.style as unknown as Record<string, string>)[sk] = sv;
        }
      }
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (k === 'html') el.innerHTML = v as string;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}

function append(el: Element, children: Child[]) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : String(c));
  }
}

export const img = (src: string, cls = '', alt = '') => h('img', { src, class: cls, alt, draggable: 'false' });

// ---------- ícones em pixel art (SVG crispEdges) ----------

const PAL: Record<string, string> = {
  K: '#2b1d2b', R: '#e8435a', r: '#a92a42', W: '#ffffff', Y: '#ffd23f', o: '#d68a12',
  O: '#f08a24', G: '#b8bcc8', g: '#7d8294', B: '#3a9be0', P: '#9b5bd6', E: '#5cd65c',
};

const ICONS: Record<string, string[]> = {
  badge: ['...KKK...', '..KYYYK..', '.KYWYYoK.', 'KYWYYYYoK', 'KYYYKYYoK', 'KYYKRKYoK', '.KYYKYoK.', '..KooooK.', '...KKKK..'],
  note: ['....KKKK.', '....KWWK.', '....KKKK.', '....K..K.', '....K..K.', '.KKKK.KK.', 'KWWWKKWWK', 'KWWWKKWWK', '.KKK..KK.'],
  heart: ['.KK...KK.', 'KRWRKRRRK', 'KWRRRRRRK', 'KRRRRRRrK', '.KRRRRrK.', '..KRRrK..', '...KrK...', '....K....'],
  trophy: ['KKKKKKKKK', 'KYWYYYYoK', 'KYWYYYYoK', '.KYYYYoK.', '..KYYoK..', '...KYK...', '...KoK...', '..KYYYK..', '.KKKKKKK.'],
  coin: ['..KKKKK..', '.KYYYYYK.', 'KYYWYYYoK', 'KYWYYYYoK', 'KYYYYYYoK', 'KYYYYYYoK', 'KYYYYYooK', '.KoooooK.', '..KKKKK..'],
  bag: ['...KKKK...', '..KK..KK..', '.KKKKKKKK.', 'KOOOOOOOOK', 'KOWOOOOOoK', 'KOOKKKKOoK', 'KOOKWWKOoK', 'KOOKKKKOoK', 'KOOOOOOooK', '.KKKKKKKK.'],
  gear: ['...KKK...', '.KKGGGKK.', '.KGGGGGK.', 'KGGKKKGGK', 'KGGK.KGgK', 'KGGKKKGgK', '.KGGGGgK.', '.KKGggKK.', '...KKK...'],
  exit: ['KKKKKKK..', 'KRRRRRK..', 'KRRRRRK.K', 'KRRRRRKKK', 'KRRRWRKKK', 'KRRRRRK.K', 'KRRRRRK..', 'KRRRRRK..', 'KKKKKKK..'],
  dex: ['KKKKKKKK.', 'KRRRRRRKK', 'KRWWRRRKK', 'KRWBWRRKK', 'KRWWRRRKK', 'KRRRRRRKK', 'KrrrrrrKK', 'KKKKKKKK.'],
  sound: ['....K....', '...KK..K.', 'KKKWK.K..', 'KWWWK.K.K', 'KWWWK.K.K', 'KKKWK.K..', '...KK..K.', '....K....'],
  mute: ['....K....', '...KK....', 'KKKWK.R.R', 'KWWWK..R.', 'KWWWK.R.R', 'KKKWK....', '...KK....', '....K....'],
  lock: ['..KKKK..', '.KK..KK.', '.K....K.', 'KKKKKKKK', 'KYYYYYoK', 'KYYKKYoK', 'KYYKKYoK', 'KYYYYYoK', 'KKKKKKKK'],
  shield: ['KKKKKKKKK', 'KPPPPPPPK', 'KPWPPPPPK', 'KPWPPPPPK', 'KPPPPPPPK', '.KPPPPPK.', '..KPPPK..', '...KKK...'],
  flame: ['...K.....', '..KOK.K..', '..KOOKOK.', '.KOOYOOK.', '.KOYYYOK.', 'KOYYWYOK.', 'KOYWWYOK.', '.KOYYOK..', '..KKKK...'],
  skull: ['.KKKKKK.', 'KPPPPPPK', 'KPKPPKPK', 'KPKPPKPK', 'KPPPPPPK', '.KPKKPK.', '.KPPPPK.', '..KKKK..'],
  ghost: ['..KKKK..', '.KPPPPK.', 'KPWPPWPK', 'KPKPPKPK', 'KPPPPPPK', 'KPPPPPPK', 'KPKPPKPK', 'KK.KK.KK'],
  star: ['....K....', '...KYK...', 'KKKKYKKKK', 'KYYYWYYYK', '.KYYYYYK.', '..KYYYK..', '.KYYKYYK.', 'KYK...KYK', 'KK.....KK'],
};

export function icon(name: keyof typeof ICONS | string, px = 4): SVGSVGElement {
  const rows = ICONS[name] ?? ICONS.star;
  const w = Math.max(...rows.map((r) => r.length));
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${rows.length}`);
  svg.setAttribute('width', String(w * px));
  svg.setAttribute('height', String(rows.length * px));
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.classList.add('picon');
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', String(x));
      r.setAttribute('y', String(y));
      r.setAttribute('width', '1');
      r.setAttribute('height', '1');
      r.setAttribute('fill', PAL[ch] ?? '#000');
      svg.append(r);
    });
  });
  return svg;
}

// ---------- toasts ----------

let stageEl: HTMLElement;
export const setStage = (el: HTMLElement) => (stageEl = el);
export const stage = () => stageEl;

export function toast(msg: string, kind: 'info' | 'error' | 'good' = 'info') {
  const t = h('div', { class: `toast ${kind}` }, msg);
  stageEl.append(t);
  setTimeout(() => t.classList.add('out'), 1600);
  setTimeout(() => t.remove(), 2000);
}

export function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** ícone de item com fallback para a Poké Ball se o sprite não existir */
export function itemImg(name: string, cls = '') {
  const el = img(`${import.meta.env.BASE_URL}sprites/items/${name}.png`, cls);
  el.addEventListener('error', () => { el.src = `${import.meta.env.BASE_URL}sprites/items/poke-ball.png`; }, { once: true });
  return el;
}
