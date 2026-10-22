// Itens segurados: itens segurados permanentes, ganhos em presentes (escolha 1 de 3)
import { unitTypes } from './dex';
import type { Unit } from './model';
import type { StatCtx, UnitStats } from './stats';
import type { PType } from './types';

export interface TrinketDef {
  id: string;
  name: string;
  icon: string;
  rarity: number;
  desc: string;
  unique?: boolean;
  income?: number;
  hp?: number;
}

const plate = (id: string, name: string, t: PType, stat: string): TrinketDef => ({ id, name, icon: id, rarity: 3, desc: `Seus Pokémon ${TYPE_NAME_PL[t]} têm ×1,25 de ${stat}.` });
const TYPE_NAME_PL: Record<PType, string> = {
  normal: 'Normais', fire: 'de Fogo', water: 'de Água', electric: 'Elétricos', grass: 'de Planta', ice: 'de Gelo', fighting: 'Lutadores',
  poison: 'de Veneno', ground: 'de Terra', flying: 'Voadores', psychic: 'Psíquicos', bug: 'Inseto', rock: 'de Pedra', ghost: 'Fantasma',
  dragon: 'Dragão', steel: 'de Aço', dark: 'Sombrios', fairy: 'Fada',
};

export const TRINKETS: TrinketDef[] = [
  // Comuns
  { id: 'silk-scarf', name: 'Lenço de Seda', icon: 'silk-scarf', rarity: 1, desc: 'Seus Pokémon têm +5 Dano.' },
  { id: 'macho-brace', name: 'Macho Brace', icon: 'macho-brace', rarity: 1, desc: '+200 de HP máximo para o time.', hp: 200 },
  { id: 'nugget', name: 'Nugget', icon: 'nugget', rarity: 1, desc: '+₽3 de renda por dia.', income: 3 },
  { id: 'amulet-coin', name: 'Amulet Coin', icon: 'amulet-coin', rarity: 1, desc: 'Na vitória, ganhe ₽8.' },
  { id: 'quick-claw', name: 'Garra Rápida', icon: 'quick-claw', rarity: 1, desc: 'Seus Pokémon da coluna de trás têm +6% de vel. de recarga.' },
  { id: 'muscle-band', name: 'Faixa Muscular', icon: 'muscle-band', rarity: 1, desc: 'Na vitória, seu time ganha +4 Dano permanentemente.' },
  { id: 'oran-berry', name: 'Fruta Oran', icon: 'oran-berry', rarity: 1, desc: 'Seus Pokémon têm +4 Dano para cada tipo diferente no time.' },
  { id: 'soothe-bell', name: 'Sino Calmante', icon: 'soothe-bell', rarity: 1, desc: 'Início da batalha: um Pokémon aleatório ganha +4% de vel. de recarga permanentemente.' },
  { id: 'smoke-ball', name: 'Bola de Fumaça', icon: 'smoke-ball', rarity: 1, desc: 'Na próxima derrota, ganhe um prêmio de item segurado. (some depois)' },
  { id: 'big-root', name: 'Raiz Grande', icon: 'big-root', rarity: 1, desc: 'Seus Pokémon têm +10% de Cura.' },
  { id: 'bicycle', name: 'Bicicleta', icon: 'bicycle', rarity: 1, desc: '1 reroll grátis por dia.', unique: true },
  // Incomuns: um por mecânica de tipo
  { id: 'charcoal', name: 'Carvão', icon: 'charcoal', rarity: 2, desc: 'Seus Pokémon de Fogo têm +3 Queimadura.' },
  { id: 'mystic-water', name: 'Água Mística', icon: 'mystic-water', rarity: 2, desc: 'Seus Pokémon de Água têm +12 Cura e +5 Limpeza.' },
  { id: 'miracle-seed', name: 'Semente Milagrosa', icon: 'miracle-seed', rarity: 2, desc: 'Seus Pokémon de Planta têm +3 Crescimento.' },
  { id: 'magnet', name: 'Ímã', icon: 'magnet', rarity: 2, desc: 'Seus Pokémon Elétricos têm +2 Choque.' },
  { id: 'poison-barb', name: 'Farpa Venenosa', icon: 'poison-barb', rarity: 2, desc: 'Seus Pokémon de Veneno têm +3 Veneno.' },
  { id: 'hard-stone', name: 'Pedra Dura', icon: 'hard-stone', rarity: 2, desc: 'Seus Pokémon de Pedra têm +25 Escudo.' },
  { id: 'black-belt', name: 'Faixa Preta', icon: 'black-belt', rarity: 2, desc: 'Seus Pokémon Lutadores têm +15 Crítico.' },
  { id: 'sharp-beak', name: 'Bico Afiado', icon: 'sharp-beak', rarity: 2, desc: 'Seus Pokémon Voadores têm +3 Carga.' },
  { id: 'soft-sand', name: 'Areia Macia', icon: 'soft-sand', rarity: 2, desc: 'Seus Pokémon de Terra perfuram 3x (em vez de 2x).' },
  { id: 'spell-tag', name: 'Etiqueta Maldita', icon: 'spell-tag', rarity: 2, desc: 'Seus Pokémon Fantasma têm ×1,25 de Dano Espectral e +5% por nocaute na batalha.' },
  { id: 'never-melt-ice', name: 'Gelo Eterno', icon: 'never-melt-ice', rarity: 2, desc: 'Seus Pokémon de Gelo têm +4 Frio.' },
  { id: 'twisted-spoon', name: 'Colher Torta', icon: 'twisted-spoon', rarity: 2, desc: 'Seus Pokémon Psíquicos têm +30 Eco.' },
  { id: 'silver-powder', name: 'Pó Prateado', icon: 'silver-powder', rarity: 2, desc: 'Seus Pokémon Inseto têm +1 Multicast.' },
  { id: 'dragon-fang', name: 'Presa de Dragão', icon: 'dragon-fang', rarity: 3, desc: 'Seus Pokémon Dragão têm ×1,3 de Dano.' },
  { id: 'silk-normal', name: 'Seda Normal', icon: 'silk-scarf', rarity: 2, desc: 'Seus Pokémon Normais têm +10 Dano e +100 HP.' },
  { id: 'metal-coat', name: 'Revestimento Metálico', icon: 'metal-coat', rarity: 2, desc: 'Seus Pokémon de Aço têm +8 Armadura. Onix e Scyther evoluem no início da próxima batalha.' },
  { id: 'black-glasses', name: 'Óculos Escuros', icon: 'black-glasses', rarity: 2, desc: 'Seus Pokémon Sombrios têm +5 Punir.' },
  { id: 'fairy-feather', name: 'Pena Fada', icon: 'fairy-feather', rarity: 2, desc: 'Seus Pokémon Fada têm +4 Bênção.' },
  { id: 'coin-case', name: 'Coin Case', icon: 'coin-case', rarity: 2, desc: 'Juros em dobro: +₽1 a cada ₽10 guardados, além dos juros normais.', unique: true },
  { id: 'exp-share', name: 'Exp. Share', icon: 'exp-share', rarity: 2, desc: 'Quando um Pokémon sobe de nível por fusão, ganha +10% de vel. de recarga permanentemente.' },
  { id: 'choice-band', name: 'Faixa de Escolha', icon: 'choice-band', rarity: 2, desc: 'O Pokémon do meio da linha de cima tem +25 Dano.' },
  { id: 'leftovers', name: 'Restos', icon: 'leftovers', rarity: 2, desc: 'A cada 3s de batalha, o time cura 2% do HP máximo.' },
  { id: 'card-key', name: 'Cartão-Chave', icon: 'card-key', rarity: 2, desc: 'Você pode usar +1 item por dia.' },
  { id: 'silph-scope', name: 'Silph Scope', icon: 'silph-scope', rarity: 2, desc: 'Revela o time do próximo rival.', unique: true },
  { id: 'dubious-disc', name: 'Disco Duvidoso', icon: 'dubious-disc', rarity: 2, desc: 'O próximo item segurado que você ganhar vem em dobro. Porygon2 evolui no início da próxima batalha.' },
  { id: 'zoom-lens', name: 'Lente de Zoom', icon: 'zoom-lens', rarity: 2, desc: 'Início da batalha: seus Pokémon da coluna de trás ganham +6 Dano permanentemente.' },
  { id: 'protector', name: 'Protetor', icon: 'protector', rarity: 2, desc: 'Início da batalha: o time ganha Escudo igual a 8% do HP máximo. Rhydon evolui no início da próxima batalha.' },
  // Raros
  { id: 'thick-club', name: 'Osso Grosso', icon: 'thick-club', rarity: 3, desc: 'Seus Pokémon com recarga de 4s ou mais têm ×1,4 de Dano.' },
  { id: 'wide-lens', name: 'Lente Ampla', icon: 'wide-lens', rarity: 3, desc: 'Início da batalha: seus Pokémon da coluna da frente ganham +10 Escudo e +10 Cura permanentemente.' },
  { id: 'reaper-cloth', name: 'Pano Sinistro', icon: 'reaper-cloth', rarity: 3, desc: 'Quando qualquer Pokémon é nocauteado: seus Pokémon ganham +5% de Dano nesta batalha.' },
  { id: 'electirizer', name: 'Eletrizador', icon: 'electirizer', rarity: 3, desc: 'Seus Pokémon Elétricos têm +15% de vel. de recarga. Electabuzz evolui no início da próxima batalha.' },
  { id: 'magmarizer', name: 'Magmarizador', icon: 'magmarizer', rarity: 3, desc: 'Seus Pokémon de Fogo têm ×1,3 de Queimadura. Magmar evolui no início da próxima batalha.' },
  { id: 'sea-incense', name: 'Incenso do Mar', icon: 'sea-incense', rarity: 3, desc: 'As próximas 5 lojas só terão Pokémon Raros.' },
  { id: 'life-orb', name: 'Life Orb', icon: 'life-orb', rarity: 3, desc: 'Início da batalha: seus Pokémon ganham +8 Dano permanentemente.' },
  { id: 'scope-lens', name: 'Lente de Mira', icon: 'scope-lens', rarity: 3, desc: 'Seus Pokémon com recarga de 3.5s ou mais têm ×1,25 de Dano.' },
  { id: 'shell-bell', name: 'Sino de Concha', icon: 'shell-bell', rarity: 3, desc: 'Você recebe +25% de Cura.' },
  { id: 'topaz', name: 'Pedaço de Estrela', icon: 'star-piece', rarity: 3, desc: 'Você recebe +25% de Escudo.' },
  { id: 'focus-band', name: 'Faixa de Foco', icon: 'focus-band', rarity: 3, desc: 'Na próxima derrota, ganhe ₽40. (some depois)' },
  { id: 'linking-cord', name: 'Cabo de Troca', icon: 'linking-cord', rarity: 3, desc: 'Todos os Pokémon do time contam como adjacentes entre si.', unique: true },
  { id: 'choice-scarf', name: 'Lenço de Escolha', icon: 'choice-scarf', rarity: 3, desc: 'Seus Pokémon da coluna da frente têm +15% de vel. de recarga.' },
  { id: 'expert-belt', name: 'Cinto Especialista', icon: 'expert-belt', rarity: 3, desc: 'Pokémon que não compartilham tipo com nenhum aliado têm +25% de vel. de recarga.' },
  { id: 'big-nugget', name: 'Nugget Grande', icon: 'big-nugget', rarity: 3, desc: '+₽10 de renda por dia.', income: 10 },
  plate('flame-plate', 'Placa Chama', 'fire', 'Queimadura'),
  plate('splash-plate', 'Placa Respingo', 'water', 'Cura'),
  plate('zap-plate', 'Placa Raio', 'electric', 'Choque'),
  plate('meadow-plate', 'Placa Prado', 'grass', 'Crescimento'),
  plate('icicle-plate', 'Placa Gelo', 'ice', 'Frio'),
  plate('fist-plate', 'Placa Punho', 'fighting', 'Crítico'),
  plate('toxic-plate', 'Placa Tóxica', 'poison', 'Veneno'),
  plate('earth-plate', 'Placa Terra', 'ground', 'Dano'),
  plate('sky-plate', 'Placa Céu', 'flying', 'Carga'),
  plate('mind-plate', 'Placa Mente', 'psychic', 'Eco'),
  plate('insect-plate', 'Placa Inseto', 'bug', 'Enxame'),
  plate('stone-plate', 'Placa Pedra', 'rock', 'Escudo'),
  plate('spooky-plate', 'Placa Assombrada', 'ghost', 'Dano Espectral'),
  plate('draco-plate', 'Placa Draco', 'dragon', 'Dano'),
  plate('iron-plate', 'Placa Ferro', 'steel', 'Armadura'),
  plate('dread-plate', 'Placa Medo', 'dark', 'Punir'),
  plate('pixie-plate', 'Placa Fada', 'fairy', 'Bênção'),
  plate('blank-plate', 'Placa Branca', 'normal', 'Dano e HP'),
  // Super Raros
  { id: 'member-card', name: 'Cartão de Sócio', icon: 'member-card', rarity: 4, desc: 'A loja não vende mais Pokémon Comuns nem Incomuns.', unique: true },
  { id: 'quick-powder', name: 'Pó Veloz', icon: 'quick-powder', rarity: 4, desc: 'O Pokémon do meio da linha de cima tem +25% de vel. de recarga.' },
  { id: 'dragon-scale', name: 'Escama de Dragão', icon: 'dragon-scale', rarity: 4, desc: 'Seus Pokémon Dragão têm ×1,6 de Dano.' },
  { id: 'pure-incense', name: 'Incenso Puro', icon: 'pure-incense', rarity: 4, desc: 'As próximas 5 lojas só terão Pokémon Super Raros.' },
  { id: 'kings-rock', name: "King's Rock", icon: 'kings-rock', rarity: 4, desc: 'Seus Pokémon Voadores têm +1 Multicast. Slowpoke e Poliwhirl evoluem (Slowking/Politoed) no início da próxima batalha.' },
  { id: 'choice-specs', name: 'Óculos de Escolha', icon: 'choice-specs', rarity: 4, desc: 'Seus Pokémon têm +10% de vel. de recarga.' },
  { id: 'lucky-egg', name: 'Ovo da Sorte', icon: 'lucky-egg', rarity: 4, desc: 'O próximo Pokémon que você comprar sobe 1 nível. (some depois)' },
  { id: 'amulet-hp', name: 'Pérola Grande', icon: 'big-pearl', rarity: 4, desc: '+25% de HP máximo.', unique: true },
  { id: 'light-ball', name: 'Light Ball', icon: 'light-ball', rarity: 4, desc: 'Seus Pokémon Elétricos têm ×1,5 de Choque.' },
  // Lendários
  { id: 'razor-fang', name: 'Presa Afiada', icon: 'razor-fang', rarity: 5, desc: 'O Pokémon do meio da linha de cima tem +1 Multicast.', unique: true },
  { id: 'luck-incense', name: 'Incenso da Sorte', icon: 'luck-incense', rarity: 5, desc: 'As próximas 5 lojas só terão Pokémon Lendários.' },
  { id: 'metronome', name: 'Metrônomo', icon: 'metronome', rarity: 5, desc: 'Quando seus Pokémon atacam, ganham +8 Dano nesta batalha.' },
  { id: 'master-ball', name: 'Master Ball', icon: 'master-ball', rarity: 5, desc: 'Antes de cada batalha, seus Pokémon Comuns e Incomuns sobem para o Lv. 3.', unique: true },
  { id: 'comet-shard', name: 'Fragmento de Cometa', icon: 'comet-shard', rarity: 5, desc: '+2000 de HP máximo.', hp: 2000 },
  { id: 'relic-gold', name: 'Ouro Antigo', icon: 'relic-gold', rarity: 5, desc: '+₽25 de renda por dia.', income: 25 },
  { id: 'research', name: 'Anotações de Pesquisa', icon: 'odd-keystone', rarity: 5, desc: 'Pokémon Lendários aparecem muito mais na loja.', unique: true },
  { id: 'expert-gem', name: 'Joia Misteriosa', icon: 'red-shard', rarity: 5, desc: 'Seus Pokémon têm ×1,2 de Dano.' },
];
export const TRINKET = Object.fromEntries(TRINKETS.map((t) => [t.id, t])) as Record<string, TrinketDef>;

/** Placas: ×1,25 no stat do tipo */
const PLATE: Record<string, [PType, (keyof UnitStats)[]]> = {
  'flame-plate': ['fire', ['burn']], 'splash-plate': ['water', ['heal']], 'zap-plate': ['electric', ['shock']], 'meadow-plate': ['grass', ['growth']],
  'icicle-plate': ['ice', ['cold']], 'fist-plate': ['fighting', ['crit']], 'toxic-plate': ['poison', ['poison']], 'earth-plate': ['ground', ['dmg']],
  'sky-plate': ['flying', ['charge']], 'mind-plate': ['psychic', ['echo']], 'insect-plate': ['bug', ['swarm']], 'stone-plate': ['rock', ['shield']],
  'spooky-plate': ['ghost', ['spectral']], 'draco-plate': ['dragon', ['dmg']], 'iron-plate': ['steel', ['armor']], 'dread-plate': ['dark', ['punish']],
  'pixie-plate': ['fairy', ['blessing']], 'blank-plate': ['normal', ['dmg', 'hp']],
};

const count = (list: string[], id: string) => list.filter((x) => x === id).length;

/**
 * efeitos estáticos dos itens segurados nos stats (aparecem na loja e na batalha).
 * Aditivos somam na base; "×" de Dano (Raro+) entra em dmgMult, que multiplica (seção 5.3).
 */
export function trinketStats(st: UnitStats, u: Unit, ctx: StatCtx) {
  const tr = ctx.trinkets;
  if (!tr.length) return;
  const types = st.types.length ? st.types : unitTypes(u);
  const n = (id: string) => count(tr, id);
  const is = (t: PType) => types.includes(t);
  st.dmg += 5 * n('silk-scarf');
  st.healMult += 0.1 * n('big-root');
  if (n('oran-berry')) st.dmg += 4 * n('oran-berry') * Object.values(ctx.counts).filter((x) => x > 0).length;
  if (is('fire')) st.burn += 3 * n('charcoal');
  if (is('water')) { st.heal += 12 * n('mystic-water'); st.cleanse += 5 * n('mystic-water'); }
  if (is('grass')) st.growth += 3 * n('miracle-seed');
  if (is('electric')) st.shock += 2 * n('magnet');
  if (is('poison')) st.poison += 3 * n('poison-barb');
  if (is('rock')) st.shield += 25 * n('hard-stone');
  if (is('fighting')) st.crit += 15 * n('black-belt');
  if (is('flying')) st.charge += 3 * n('sharp-beak');
  if (is('ground') && n('soft-sand')) st.pierce = Math.max(st.pierce, 3);
  if (is('ice')) st.cold += 4 * n('never-melt-ice');
  if (is('psychic')) st.echo += 30 * n('twisted-spoon');
  if (is('bug')) st.casts += n('silver-powder');
  if (is('normal')) { st.dmg += 10 * n('silk-normal'); st.hp += 100 * n('silk-normal'); }
  if (is('steel')) st.armor += 8 * n('metal-coat');
  if (is('dark')) st.punish += 5 * n('black-glasses');
  if (is('fairy')) st.blessing += 4 * n('fairy-feather');
  if (is('flying') && n('kings-rock')) st.casts += 1;
  if (is('electric')) st.cdSpeed += 0.15 * n('electirizer');
  // multiplicadores (Raro+)
  if (is('ghost')) st.spectralMult *= 1.25 ** n('spell-tag');
  if (is('dragon')) st.dmgMult *= 1.3 ** n('dragon-fang') * 1.6 ** n('dragon-scale');
  st.dmgMult *= 1.2 ** n('expert-gem');
  if (st.cd >= 3.5) st.dmgMult *= 1.25 ** n('scope-lens');
  if (st.cd >= 4) st.dmgMult *= 1.4 ** n('thick-club');
  if (is('fire')) st.burnMult *= 1.3 ** n('magmarizer');
  if (is('electric')) st.shockMult *= 1.5 ** n('light-ball');
  for (const [id, [t, keys]] of Object.entries(PLATE)) {
    const k = n(id);
    if (!k || !is(t)) continue;
    for (const key of keys) {
      if (key === 'dmg') st.dmgMult *= 1.25 ** k;
      else (st.statMult[key as string] = (st.statMult[key as string] ?? 1) * 1.25 ** k);
    }
  }
  st.cdSpeed += 0.1 * n('choice-specs');
  if (ctx.slot === 1) { st.cdSpeed += 0.25 * n('quick-powder'); if (n('razor-fang')) st.casts += 1; }
  if (ctx.slot != null) {
    const col = ctx.slot % 3;
    if (col === 0) st.cdSpeed += 0.06 * n('quick-claw');
    if (col === 2) st.cdSpeed += 0.15 * n('choice-scarf');
    if (ctx.slot === 1) st.dmg += 25 * n('choice-band');
    if (n('expert-belt')) {
      const shares = ctx.team.some((o, i) => o && i !== ctx.slot && unitTypes(o).some((t) => types.includes(t)));
      if (!shares) st.cdSpeed += 0.25 * n('expert-belt');
    }
  }
}

export const trinketHp = (list: string[]) => list.reduce((s, id) => s + (TRINKET[id]?.hp ?? 0), 0);
export const trinketIncome = (list: string[]) => list.reduce((s, id) => s + (TRINKET[id]?.income ?? 0), 0);
