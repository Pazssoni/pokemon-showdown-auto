// Motor de batalha (OS v2): mecânicas por tipo, teia de contras, sem tetos de combate.
import { abilityOf, abilityScale, addPerm, type Ability, type CastExtra, type Ctx } from './abilities';
import type { TrainerDef } from './content';
import { DEX } from './dex';
import { LEVEL_MULT, type StatKey, type Unit } from './model';
import { makeRng, type Rng } from './rng';
import { OUTPUT, computeStats, effCd, makeCtx, overflowCasts, teamMaxHp, type UnitStats } from './stats';

export interface Meter { dmg: number; heal: number; shield: number; status: number; best: number }

export interface Fighter {
  unit: Unit;
  st: UnitStats;
  slot: number;
  side: number;
  timer: number;
  ko: boolean;
  everyAcc: number;
  ability: Ability;
  mem: Record<string, number>;
  /** percentuais de Dano ganhos nesta batalha (Dragão: multiplicam) */
  buffs: number[];
  /** compatibilidade: soma dos percentuais */
  buff: number;
  /** Crescimento acumulado (%) — aumenta TODOS os stats deste Pokémon */
  growthPct: number;
  meter: Meter;
}

export interface Side {
  fighters: Fighter[];
  hp: number;
  maxHp: number;
  shield: number;
  armor: number;
  burn: number;
  poison: number;
  shock: number;
  cold: number;
  gold: number;
  trinkets: string[];
  healMult: number;
  shieldMult: number;
  trainerId: string;
  /** contadores para evoluções por status do time */
  counts: { burn: number; poison: number; shock: number; cold: number; shieldRecv: number; blessing: number };
}

export type BEvent =
  | { k: 'act'; side: number; slot: number; target: number; dmg: number; eff: number; crit: boolean; multi: boolean }
  | { k: 'heal'; side: number; slot: number; amount: number }
  | { k: 'shield'; side: number; slot: number; amount: number }
  | { k: 'status'; side: number; burn: number; poison: number }
  | { k: 'fatigue'; side: number; amount: number }
  | { k: 'charge'; side: number; slot: number }
  | { k: 'freeze'; side: number; slot: number }
  | { k: 'ability'; side: number; slot: number; text: string }
  | { k: 'ko'; side: number; slot: number }
  | { k: 'revive'; side: number; slot: number }
  | { k: 'gold'; side: number; slot: number; amount: number };

export interface SideInput {
  team: (Unit | null)[];
  trainer: TrainerDef;
  hpBonus: number;
  startShield: number;
  trinkets: string[];
  nerd?: number;
  gold?: number;
  wins?: number;
  losses?: number;
  /** escala de poder dos rivais gerados (curva da seção 5.7) */
  scale?: number;
}

/** o poder ofensivo dos rivais cresce mais devagar que o HP (expoente sobre a escala de HP) */
export let POWER_EXP = 0.75;
export const setPowerExp = (x: number) => { POWER_EXP = x; };
export const FATIGUE_START = 30;
export const DRAIN_START = 45;
export const TIME_LIMIT = 75;
const DT = 0.05;
const STATUS = ['burn', 'poison', 'shock', 'cold'] as const;

export class Battle {
  t = 0;
  sides: [Side, Side];
  over = false;
  winner = -1;
  events: BEvent[] = [];
  /** registro de gatilhos (log expansível) */
  log: string[] = [];
  /** aliados nocauteados vistos por cada uid (para evoluções) */
  koSeen: Record<number, number> = {};
  /** críticos e ataques por uid (Farfetch'd, Primeape) */
  crits: Record<number, number> = {};
  attacks: Record<number, number> = {};
  bestHit = 0;
  private rng_: Rng;
  private burnAcc = 0;
  private secAcc = 0;
  private started = false;
  private acc = 0;

  constructor(a: SideInput, b: SideInput, seed: number) {
    this.rng_ = makeRng(seed);
    this.sides = [this.makeSide(a, 0), this.makeSide(b, 1)];
  }

  rng() {
    return this.rng_();
  }

  private makeSide(inp: SideInput, side: number): Side {
    const fighters: Fighter[] = [];
    const scale = inp.scale ?? 1;
    const sScale = scale ** POWER_EXP;
    let armor = 0;
    inp.team.forEach((u, slot) => {
      if (!u) return;
      const st = computeStats(u, makeCtx(inp.team, inp.trainer, inp.trinkets, slot, inp.nerd ?? 0, inp.gold ?? 0, inp.wins ?? 0, inp.losses ?? 0));
      if (scale !== 1) for (const k of [...OUTPUT, 'armor', 'blessing'] as const) st[k] = Math.round(st[k] * sScale);
      armor += st.armor;
      fighters.push({
        unit: u, st, slot, side, ko: false, everyAcc: 0, mem: {}, buffs: [], buff: 0, growthPct: 0,
        timer: effCd(st) * this.rng_() * 0.15,
        ability: abilityOf(u.species, u.shiny),
        meter: { dmg: 0, heal: 0, shield: 0, status: 0, best: 0 },
      });
    });
    // Pokémon com Enxame: +N de Dano por Inseto no time
    const bugs = fighters.filter((f) => f.st.types.includes('bug')).length;
    for (const f of fighters) if (f.st.swarm) f.st.dmg += f.st.swarm * bugs;
    const maxHp = Math.round(teamMaxHp(inp.team, inp.trainer, inp.hpBonus, inp.trinkets, inp.nerd ?? 0, inp.gold ?? 0, inp.wins ?? 0, inp.losses ?? 0) * scale);
    return {
      fighters, hp: maxHp, maxHp, shield: Math.round(maxHp * inp.startShield), armor,
      burn: 0, poison: 0, shock: 0, cold: 0, gold: 0, trinkets: inp.trinkets,
      healMult: inp.trinkets.includes('shell-bell') ? 1.25 : 1, shieldMult: inp.trinkets.includes('topaz') ? 1.25 : 1,
      trainerId: inp.trainer.id,
      counts: { burn: 0, poison: 0, shock: 0, cold: 0, shieldRecv: 0, blessing: 0 },
    };
  }

  // ---------- geometria (coluna 2 = frente) ----------
  side(f: Fighter) { return this.sides[f.side]; }
  foe(f: Fighter) { return this.sides[1 - f.side]; }
  private at(side: number, slot: number) {
    return this.sides[side].fighters.find((x) => x.slot === slot && !x.ko) ?? null;
  }
  front(f: Fighter) { return f.slot % 3 < 2 ? this.at(f.side, f.slot + 1) : null; }
  behind(f: Fighter) { return f.slot % 3 > 0 ? this.at(f.side, f.slot - 1) : null; }
  above(f: Fighter) { return f.slot >= 3 ? this.at(f.side, f.slot - 3) : null; }
  below(f: Fighter) { return f.slot < 3 ? this.at(f.side, f.slot + 3) : null; }
  adjacent(f: Fighter): Fighter[] {
    if (this.side(f).trinkets.includes('linking-cord')) return this.allies(f);
    return [this.front(f), this.behind(f), this.above(f), this.below(f)].filter((x): x is Fighter => !!x);
  }
  allies(f: Fighter) { return this.side(f).fighters.filter((x) => x !== f && !x.ko); }
  enemies(f: Fighter) { return this.foe(f).fighters.filter((x) => !x.ko); }
  enemyRow(f: Fighter) {
    const row = Math.floor(f.slot / 3);
    return this.enemies(f).filter((e) => Math.floor(e.slot / 3) === row);
  }
  /** inimigo oposto; sem ele: o mais próximo na mesma linha; depois qualquer inimigo vivo */
  opposite(f: Fighter) {
    const same = this.at(1 - f.side, f.slot);
    if (same) return same;
    const row = this.enemyRow(f).sort((a, b) => Math.abs((a.slot % 3) - (f.slot % 3)) - Math.abs((b.slot % 3) - (f.slot % 3)));
    return row[0] ?? this.enemies(f)[0] ?? null;
  }

  // ---------- ações usadas pelas habilidades ----------
  buff(f: Fighter, k: StatKey, n: number, perm: boolean) {
    if (k === 'casts') f.st.casts += n;
    else if (k === 'cdSpeed') f.st.cdSpeed += n;
    else if (k === 'hp') this.addMaxHp(f, n);
    else (f.st as unknown as Record<string, number>)[k] += n;
    if (k === 'armor') this.side(f).armor += n;
    if (perm) addPerm(f.unit, k, k === 'casts' || k === 'cdSpeed' ? n : n / LEVEL_MULT[Math.min(5, f.unit.level)]);
  }
  /** +X% de Dano nesta batalha (para Dragões, multiplicativo) */
  pct(f: Fighter, p: number) {
    f.buffs.push(p);
    f.buff += p;
  }
  disable(f: Fighter, sec: number) {
    f.mem.disabledUntil = Math.max(f.mem.disabledUntil ?? 0, this.t + sec);
    this.label(f, 'Desativado!');
  }
  isDisabled(f: Fighter) {
    return !!f.mem.disabled || (f.mem.disabledUntil ?? 0) > this.t;
  }
  charge(f: Fighter, sec: number) {
    f.timer += sec;
    this.events.push({ k: 'charge', side: f.side, slot: f.slot });
  }
  delay(f: Fighter, sec: number) {
    f.timer = Math.max(-2, f.timer - sec);
    this.events.push({ k: 'freeze', side: f.side, slot: f.slot });
  }
  heal(f: Fighter, n: number) {
    const s = this.side(f);
    const amount = Math.round(n * s.healMult);
    if (amount <= 0) return;
    s.hp = Math.min(s.maxHp, s.hp + amount);
    f.meter.heal += amount;
    this.events.push({ k: 'heal', side: f.side, slot: f.slot, amount });
  }
  addShield(f: Fighter, n: number) {
    const s = this.side(f);
    const amount = Math.round(n * s.shieldMult);
    if (amount <= 0) return;
    s.shield += amount;
    s.counts.shieldRecv++;
    f.meter.shield += amount;
    this.events.push({ k: 'shield', side: f.side, slot: f.slot, amount });
    for (const a of s.fighters) if (!a.ko && a.ability.onShield && !this.isDisabled(a)) a.ability.onShield(this.ctx(a), amount);
  }
  stealShield(f: Fighter, n: number) {
    const foe = this.foe(f);
    const got = Math.min(foe.shield, n);
    if (got <= 0) return;
    foe.shield -= got;
    this.addShield(f, got);
  }
  /** sobe o nível só nesta batalha (escala os stats) */
  levelUpBattle(f: Fighter, max = 3) {
    const cur = f.mem.lvl ?? f.unit.level;
    if (cur >= max || f.ko) return;
    const r = LEVEL_MULT[cur + 1] / LEVEL_MULT[cur];
    for (const k of OUTPUT) f.st[k] = Math.round(f.st[k] * r);
    f.mem.lvl = cur + 1;
    this.label(f, `Lv. ${cur + 1}!`);
  }
  ctxOf(f: Fighter, depth = 0) {
    return this.ctx(f, depth);
  }
  addMaxHp(f: Fighter, n: number) {
    const s = this.side(f);
    s.maxHp += n;
    s.hp += n;
  }
  inflict(f: Fighter, k: 'burn' | 'poison' | 'shock' | 'cold', n: number) {
    if (n <= 0) return;
    const foe = this.foe(f);
    foe[k] += n;
    this.side(f).counts[k]++;
    f.meter.status += n;
  }
  /** Limpeza: remove N% (arredondado para cima) de cada status do próprio time */
  cleansePct(f: Fighter, pct: number) {
    const s = this.side(f);
    for (const k of STATUS) if (s[k] > 0) s[k] = Math.max(0, s[k] - Math.ceil(s[k] * Math.min(100, pct) / 100));
  }
  /** Limpeza fixa (habilidades) */
  cleanse(f: Fighter, n: number) {
    const s = this.side(f);
    for (const k of STATUS) s[k] = Math.max(0, s[k] - n);
  }
  gold(f: Fighter, n: number) {
    this.side(f).gold += n;
    this.events.push({ k: 'gold', side: f.side, slot: f.slot, amount: n });
  }
  label(f: Fighter, text: string) {
    this.events.push({ k: 'ability', side: f.side, slot: f.slot, text });
    if (this.log.length < 600) this.log.push(`${this.t.toFixed(1)}s · ${f.side === 0 ? 'Você' : 'Rival'} · ${DEX[f.unit.species].name} · ${text}`);
  }
  /** nocauteia; devolve false se o alvo estava protegido (Proteger vence o nocaute) */
  knockout(f: Fighter): boolean {
    if (f.ko) return false;
    if (f.mem.protected) { this.label(f, 'Protegido!'); return false; }
    f.ko = true;
    this.events.push({ k: 'ko', side: f.side, slot: f.slot });
    if (this.log.length < 600) this.log.push(`${this.t.toFixed(1)}s · nocaute: ${DEX[f.unit.species].name} (${f.side === 0 ? 'seu' : 'rival'})`);
    if (!this.isDisabled(f)) f.ability.ko?.(this.ctx(f));
    for (const s of this.sides) if (s.trinkets.includes('reaper-cloth')) for (const x of s.fighters) this.pct(x, 0.05);
    for (const s of this.sides) if (s.trinkets.includes('spell-tag')) for (const x of s.fighters) if (x.st.spectral) x.mem.spellKo = (x.mem.spellKo ?? 0) + 1;
    const own = this.side(f);
    if (own.trainerId === 'channeler') for (const x of own.fighters) if (x !== f) this.pct(x, 0.12);
    for (const s of this.sides) for (const x of s.fighters) {
      if (x !== f && x.side === f.side) this.koSeen[x.unit.uid] = (this.koSeen[x.unit.uid] ?? 0) + 1;
      if (!x.ko && x.ability.anyKo && !this.isDisabled(x)) x.ability.anyKo(this.ctx(x), f);
    }
    return true;
  }
  revive(f: Fighter) {
    if (!f.ko) return;
    f.ko = false;
    f.timer = 0;
    this.events.push({ k: 'revive', side: f.side, slot: f.slot });
  }
  trigger(f: Fighter, depth: number) {
    if (depth > 4 || f.ko || this.over) return;
    this.cast(f, depth + 1);
  }

  private ctx(f: Fighter, depth = 0): Ctx {
    return { b: this, f, lv: f.unit.level, v: abilityScale(f.unit), depth, lastDmg: 0 };
  }

  /** após 30s o dano cresce 8%/s */
  fatigue() {
    return this.t > FATIGUE_START ? 1 + (this.t - FATIGUE_START) * 0.08 : 1;
  }

  step(dt: number): BEvent[] {
    this.acc += dt;
    while (this.acc >= DT && !this.over) {
      this.acc -= DT;
      this.tick();
    }
    const out = this.events;
    this.events = [];
    return out;
  }

  runToEnd(): BEvent[] {
    while (!this.over) this.tick();
    const out = this.events;
    this.events = [];
    return out;
  }

  private begin() {
    this.started = true;
    const all = this.sides.flatMap((s) => s.fighters);
    for (const f of all) f.ability.early?.(this.ctx(f));
    for (const f of all) {
      if (!f.ability.ongoing || this.isDisabled(f)) continue;
      // Dragonair: o aliado atrás aplica as Contínuas mais vezes
      const extra = all.filter((g) => g.side === f.side && g.ability.amplifyBehind && !this.isDisabled(g) && this.behind(g) === f)
        .reduce((n, g) => n + (g.ability.amplifyBehind ?? 0) * (g.unit.level >= 4 ? 2 : 1), 0);
      for (let i = 0; i <= extra; i++) f.ability.ongoing(this.ctx(f));
      if (extra) this.label(f, `Contínua x${extra + 1}`);
    }
    // Fada: Bênção permanente nos aliados adjacentes (em todos os stats que eles já têm)
    for (const f of all) {
      const b = f.st.blessing;
      if (!b) continue;
      for (const a of f.ability.blessAll ? this.allies(f) : this.adjacent(f)) {
        for (const k of [...OUTPUT, 'armor'] as const) if (a.st[k] > 0) this.buff(a, k, b, true);
        this.side(f).counts.blessing += b;
      }
      this.label(f, `Bênção +${b}`);
    }
    for (const s of this.sides) this.startTrinkets(s);
    for (const f of all) {
      if (f.ability.start && !this.isDisabled(f)) {
        this.label(f, f.ability.name);
        f.ability.start(this.ctx(f));
      }
    }
  }

  private startTrinkets(s: Side) {
    const n = (id: string) => s.trinkets.filter((t) => t === id).length;
    for (let i = 0; i < n('life-orb'); i++) for (const f of s.fighters) this.buff(f, 'dmg', 8 * LEVEL_MULT[f.unit.level], true);
    if (n('protector')) s.shield += Math.round(s.maxHp * 0.08 * n('protector'));
    for (const f of s.fighters) {
      if (f.slot % 3 === 0 && n('zoom-lens')) this.buff(f, 'dmg', 6 * n('zoom-lens') * LEVEL_MULT[f.unit.level], true);
      if (f.slot % 3 === 2 && n('wide-lens')) { this.buff(f, 'shield', 10 * LEVEL_MULT[f.unit.level], true); this.buff(f, 'heal', 10 * LEVEL_MULT[f.unit.level], true); }
    }
    if (n('soothe-bell') && s.fighters.length) this.buff(s.fighters[Math.floor(this.rng() * s.fighters.length)], 'cdSpeed', 0.04, true);
  }

  private tick() {
    if (!this.started) this.begin();
    this.t += DT;
    for (let s = 0; s < 2 && !this.over; s++) {
      const side = this.sides[s];
      // Frio: a recarga do time com Frio anda mais devagar
      const slow = 1 / (1 + 0.02 * side.cold);
      for (const f of side.fighters) {
        if (f.ko) continue;
        f.timer += DT * slow;
        if (f.ability.every && !this.isDisabled(f)) {
          f.everyAcc += DT;
          if (f.everyAcc >= f.ability.every) {
            f.everyAcc -= f.ability.every;
            f.ability.tick?.(this.ctx(f));
          }
        }
        const cd = effCd(f.st);
        if (f.timer >= cd) {
          f.timer -= cd;
          this.cast(f, 0);
          if (this.over) return;
        }
      }
    }
    this.statusTicks();
    if (!this.over && this.t >= TIME_LIMIT) {
      const [a, b] = this.sides;
      this.over = true;
      this.winner = a.hp / a.maxHp >= b.hp / b.maxHp ? 0 : 1;
    }
  }

  private statusTicks() {
    const fat = this.fatigue();
    this.burnAcc += DT;
    if (this.burnAcc >= 0.5) {
      this.burnAcc -= 0.5;
      for (let s = 0; s < 2; s++) {
        const side = this.sides[s];
        if (side.burn >= 1) {
          const n = side.burn * fat;
          this.statusDamage(s, n);
          this.events.push({ k: 'status', side: s, burn: Math.round(n), poison: 0 });
          side.burn = Math.max(0, side.burn - 1);
        }
      }
    }
    this.secAcc += DT;
    if (this.secAcc >= 1) {
      this.secAcc -= 1;
      for (let s = 0; s < 2; s++) {
        const side = this.sides[s];
        if (side.poison >= 1) {
          const n = side.poison * fat;
          this.statusDamage(s, n);
          this.events.push({ k: 'status', side: s, burn: 0, poison: Math.round(n) });
        }
        if (side.cold > 0 && !this.sides[1 - s].fighters.some((x) => !x.ko && x.ability.coldLock && !this.isDisabled(x))) side.cold = Math.max(0, side.cold - 1);
        if (side.trinkets.includes('leftovers') && Math.round(this.t) % 3 === 0) side.hp = Math.min(side.maxHp, side.hp + side.maxHp * 0.02);
        if (this.t > DRAIN_START) {
          // fadiga escalável: 2% do HP máximo por segundo, +1% a cada 5s; ignora Escudo e Armadura
          const pct = 0.02 + 0.01 * Math.floor((this.t - DRAIN_START) / 5);
          const amount = side.maxHp * pct;
          side.hp = Math.max(0, side.hp - amount);
          this.events.push({ k: 'fatigue', side: s, amount: Math.round(amount) });
        }
      }
    }
    this.checkEnd();
  }

  /** status (Queimadura/Veneno): perde 15% ao bater no Escudo; não é reduzido por Armadura */
  private statusDamage(side: number, amount: number) {
    const s = this.sides[side];
    let left = amount;
    if (s.shield > 0) {
      const eff = left * 0.85;
      const absorb = Math.min(s.shield, eff);
      s.shield -= absorb;
      left = (eff - absorb) / 0.85;
    }
    s.hp = Math.max(0, s.hp - left);
  }

  /** golpe direto: Armadura reduz (mín. 1), Escudo absorve; Perfurar = Nx contra Escudo e ignora Armadura */
  private hitDamage(side: number, amount: number, pierce: number, isShock = false) {
    const s = this.sides[side];
    let left = amount;
    if (!pierce && s.armor > 0) left = Math.max(1, left - s.armor);
    if (isShock && s.shield > 0) left *= 0.85;
    if (s.shield > 0) {
      const mult = pierce || 1;
      const absorb = Math.min(s.shield, left * mult);
      s.shield -= absorb;
      left = Math.max(0, left - absorb / mult);
    }
    s.hp = Math.max(0, s.hp - left);
    return left;
  }

  private checkEnd() {
    const [a, b] = this.sides;
    if (a.hp <= 0 || b.hp <= 0) {
      this.over = true;
      this.winner = a.hp <= 0 && b.hp <= 0 ? (a.hp >= b.hp ? 0 : 1) : a.hp <= 0 ? 1 : 0;
    }
  }

  /** fator dos percentuais de Dano da batalha (Dragão: multiplicativo) */
  private pctFactor(f: Fighter) {
    let p = f.st.dragon ? f.buffs.reduce((a, x) => a * (1 + x), 1) : 1 + f.buffs.reduce((a, x) => a + x, 0);
    if (f.mem.spellKo) p *= 1 + 0.05 * f.mem.spellKo;
    return p;
  }

  private cast(f: Fighter, depth: number) {
    if (f.ko) return;
    const me = this.side(f);
    const foe = this.foe(f);
    const st = f.st;
    const c = this.ctx(f, depth);
    const fat = this.fatigue();
    const disabled = this.isDisabled(f);
    const reps = Math.max(1, Math.round(st.casts)) + overflowCasts(st);
    const g = 1 + f.growthPct / 100;
    const pctF = this.pctFactor(f);
    this.attacks[f.unit.uid] = (this.attacks[f.unit.uid] ?? 0) + 1;
    const m0 = { ...f.meter };
    for (let r = 0; r < reps; r++) {
      const ex: CastExtra = (!disabled && f.ability.pre?.(c)) || {};
      const alive = foe.fighters.filter((x) => !x.ko);
      const target = alive.length ? alive[Math.floor(this.rng() * alive.length)] : null;
      // crítico: N% de chance; acima de 100%, o multiplicador cresce +0,01x por ponto
      const critPct = st.crit;
      const crit = critPct > 0 && (critPct >= 100 || this.rng() < critPct / 100);
      const critM = crit ? st.critMult + Math.max(0, critPct - 100) / 100 : 1;
      if (crit) this.crits[f.unit.uid] = (this.crits[f.unit.uid] ?? 0) + 1;
      const stacks = foe.burn + foe.poison + foe.shock + foe.cold;
      const punish = st.punish ? 1 + (st.punish / 100) * Math.floor(stacks / 10) : 1;
      const common = (ex.mult ?? 1) * pctF * g * critM * punish * fat;
      const base = st.dmg + (ex.dmg ?? 0);
      let total = 0;
      if (base > 0) {
        const dmg = base * common;
        total += this.hitDamage(1 - f.side, dmg, st.pierce);
        if (foe.shock > 0) total += this.hitDamage(1 - f.side, foe.shock, 0, true);
      }
      if (st.spectral > 0) {
        const sp = st.spectral * common;
        foe.hp = Math.max(0, foe.hp - sp);
        total += sp;
      }
      if (total > 0) {
        c.lastDmg = total;
        f.meter.dmg += total;
        f.meter.best = Math.max(f.meter.best, total);
        if (f.side === 0) this.bestHit = Math.max(this.bestHit, total);
        this.events.push({ k: 'act', side: f.side, slot: f.slot, target: target?.slot ?? 2, dmg: Math.round(total), eff: 1, crit, multi: r > 0 });
      }
      this.inflict(f, 'burn', (st.burn + (ex.burn ?? 0)) * g);
      this.inflict(f, 'poison', (st.poison + (ex.poison ?? 0)) * g);
      this.inflict(f, 'shock', (st.shock + (ex.shock ?? 0)) * g);
      this.inflict(f, 'cold', (st.cold + (ex.cold ?? 0)) * g);
      if (st.heal) this.heal(f, st.heal * g);
      if (st.cleanse) this.cleansePct(f, st.cleanse);
      if (st.shield) this.addShield(f, st.shield * g);
      if (me.trinkets.includes('metronome')) st.dmg += 8 * LEVEL_MULT[f.unit.level];
      this.checkEnd();
      if (this.over) break;
    }
    if (this.log.length < 600) {
      const d = (k: keyof Meter) => Math.round(f.meter[k] - m0[k]);
      const parts = [d('dmg') && `${d('dmg')} de dano`, d('heal') && `cura ${d('heal')}`, d('shield') && `escudo ${d('shield')}`, d('status') && `${d('status')} de status`].filter(Boolean);
      this.log.push(`${this.t.toFixed(1)}s · ${f.side === 0 ? 'Você' : 'Rival'} · ${DEX[f.unit.species].name} ataca${reps > 1 ? ` (x${reps})` : ''}: ${parts.join(', ') || 'sem efeito'}`);
    }
    if (this.over) return;
    // Carga: adianta a recarga do aliado atrás (e a própria pela metade)
    if (st.charge > 0) {
      const a = this.behind(f);
      if (a) this.charge(a, st.charge * 0.1);
      f.timer += st.charge * 0.05;
    }
    // Crescimento: +N% em todos os stats deste Pokémon, nesta batalha
    if (st.growth > 0) f.growthPct += st.growth;
    f.mem.casts = (f.mem.casts ?? 0) + 1;
    if (!disabled && f.ability.cast) f.ability.cast(c);
    // Eco: chance de ativar aliados aleatórios (cada 100% garante 1)
    if (st.echo > 0 && depth < 3) {
      let n = Math.floor(st.echo / 100) + (this.rng() < (st.echo % 100) / 100 ? 1 : 0);
      const pool = this.allies(f);
      while (n-- > 0 && pool.length) this.trigger(pool[Math.floor(this.rng() * pool.length)], depth + 1);
    }
    for (const a of me.fighters) if (a !== f && !a.ko && a.ability.allyCast && !this.isDisabled(a)) a.ability.allyCast(this.ctx(a, depth), f);
    this.checkEnd();
  }
}
