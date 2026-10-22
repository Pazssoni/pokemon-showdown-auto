import type { RunState } from '../game/model';
import { saveRun } from '../game/storage';
import { hideTip } from './components';
import { music } from './music';

const TRACK: Partial<Record<ScreenName, string>> = { title: 'title', trainer: 'title', dex: 'shop', shop: 'shop', pending: 'shop', vs: 'battle', battle: 'battle' };

export type ScreenName = 'title' | 'trainer' | 'pending' | 'shop' | 'vs' | 'battle' | 'end' | 'dex';
type Render = (root: HTMLElement, arg?: unknown) => void | (() => void);

const screens: Partial<Record<ScreenName, Render>> = {};
let cleanup: void | (() => void);

export const app = {
  run: null as RunState | null,
  root: null as unknown as HTMLElement,
  current: 'title' as ScreenName,
  register(name: ScreenName, fn: Render) {
    screens[name] = fn;
  },
  go(name: ScreenName, arg?: unknown) {
    hideTip();
    if (cleanup) cleanup();
    app.root.replaceChildren();
    app.root.className = `screen screen-${name}`;
    app.current = name;
    if (TRACK[name]) music.play(TRACK[name]!);
    cleanup = screens[name]!(app.root, arg);
  },
  save() {
    saveRun(app.run);
  },
};
