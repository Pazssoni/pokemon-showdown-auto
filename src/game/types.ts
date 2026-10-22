export const TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
  'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'steel', 'dark', 'fairy',
] as const;
export type PType = (typeof TYPES)[number];

export const TYPE_NAME: Record<PType, string> = {
  normal: 'Normal', fire: 'Fogo', water: 'Água', electric: 'Elétrico', grass: 'Planta',
  ice: 'Gelo', fighting: 'Lutador', poison: 'Veneno', ground: 'Terra', flying: 'Voador',
  psychic: 'Psíquico', bug: 'Inseto', rock: 'Pedra', ghost: 'Fantasma', dragon: 'Dragão', steel: 'Aço', dark: 'Sombrio', fairy: 'Fada',
};

export const TYPE_COLOR: Record<PType, string> = {
  normal: '#a8a77a', fire: '#ee8130', water: '#6390f0', electric: '#f7d02c', grass: '#7ac74c',
  ice: '#96d9d6', fighting: '#c22e28', poison: '#a33ea1', ground: '#e2bf65', flying: '#a98ff3',
  psychic: '#f95587', bug: '#a6b91a', rock: '#b6a136', ghost: '#735797', dragon: '#6f35fc', steel: '#8f95b2', dark: '#5a4636', fairy: '#d685ad',
};

/** Stat que cada tipo dá (OS v2, seção 1) */
export const TYPE_EFFECT: Record<PType, string> = {
  normal: 'Dano + HP do time. O tipo que mais dá HP.',
  fire: 'Queimadura: a cada 0,5s causa dano igual aos acúmulos e perde 1.',
  poison: 'Veneno: a cada 1s causa dano igual aos acúmulos. Não decai.',
  electric: 'Choque: cada golpe direto recebido pelo inimigo causa +acúmulos de dano. Não decai.',
  water: 'Cura + Limpeza: cura o time e remove N% dos status negativos do próprio time a cada ativação.',
  grass: 'Crescimento: ao atacar, ganha +N% em todos os seus stats nesta batalha (acumula).',
  ice: 'Frio: acúmulos no inimigo deixam a recarga dele mais lenta (÷(1 + 2% por acúmulo)). Perde 1 por segundo.',
  fighting: 'Dano + Crítico: N% de chance de causar 2x (acima de 100%, o multiplicador sobe).',
  ground: 'Dano + Perfurar: causa 2x contra Escudo e ignora Armadura.',
  rock: 'Escudo para o time.',
  steel: 'Armadura (reduz cada golpe direto e de Choque recebido) + um pouco de Escudo.',
  flying: 'Carga: ao atacar, adianta a recarga do aliado atrás em Carga×0,1s (e a própria pela metade).',
  bug: 'Multicast + Enxame: +N de Dano por Inseto no time; muitos golpes pequenos.',
  psychic: 'Eco: N% de chance de ativar um aliado aleatório ao atacar (cada 100% garante 1).',
  ghost: 'Dano Espectral: ignora Escudo e Armadura.',
  dragon: 'Dano muito alto, recarga lenta. Todo bônus % de Dano de um Dragão é MULTIPLICATIVO.',
  dark: 'Dano + Punir: +N% de dano por golpe para cada 10 acúmulos de status no inimigo.',
  fairy: 'Bênção: início da batalha, os aliados adjacentes ganham +N em todos os stats que já têm, PERMANENTEMENTE.',
};

const SE: Partial<Record<PType, PType[]>> = {
  fire: ['grass', 'ice', 'bug'],
  water: ['fire', 'ground', 'rock'],
  electric: ['water', 'flying'],
  grass: ['water', 'ground', 'rock'],
  ice: ['grass', 'ground', 'flying', 'dragon'],
  fighting: ['normal', 'ice', 'rock'],
  poison: ['grass', 'bug'],
  ground: ['fire', 'electric', 'poison', 'rock'],
  flying: ['grass', 'fighting', 'bug'],
  psychic: ['fighting', 'poison'],
  bug: ['grass', 'psychic', 'poison'],
  rock: ['fire', 'ice', 'flying', 'bug'],
  ghost: ['ghost', 'psychic'],
  dragon: ['dragon'],
};
const NVE: Partial<Record<PType, PType[]>> = {
  normal: ['rock'],
  fire: ['fire', 'water', 'rock', 'dragon'],
  water: ['water', 'grass', 'dragon'],
  electric: ['electric', 'grass', 'dragon'],
  grass: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon'],
  ice: ['water', 'ice'],
  fighting: ['poison', 'flying', 'psychic', 'bug'],
  poison: ['poison', 'ground', 'rock', 'ghost'],
  ground: ['grass', 'bug'],
  flying: ['electric', 'rock'],
  psychic: ['psychic'],
  bug: ['fire', 'fighting', 'flying', 'ghost'],
  rock: ['fighting', 'ground'],
};
const IMM: Partial<Record<PType, PType[]>> = {
  normal: ['ghost'],
  electric: ['ground'],
  fighting: ['ghost'],
  ground: ['flying'],
  ghost: ['normal'],
};

/** Multiplicador de efetividade (suavizado para o auto battler: 1.5 / 0.7 / 0.4) */
export function effectiveness(atk: PType, def: PType[]): number {
  let m = 1;
  for (const d of def) {
    if (IMM[atk]?.includes(d)) m *= 0.4;
    else if (SE[atk]?.includes(d)) m *= 1.5;
    else if (NVE[atk]?.includes(d)) m *= 0.7;
  }
  return Math.min(2.25, Math.max(0.3, m));
}

export function superEffectiveAgainst(atk: PType): PType[] {
  return SE[atk] ?? [];
}
