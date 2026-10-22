import type { PType } from './types';

export interface TrainerDef {
  id: string;
  title: string;
  sprite: string;
  desc: string;
  unlock?: number; // nº de runs vencidas para liberar
  hpFlat?: number;
  /** multiplica o orçamento gasto no stat daquele tipo (líderes de ginásio mexem na mecânica do tipo) */
  typeBoost?: Partial<Record<PType, number>>;
  typeWeight?: Partial<Record<PType, number>>;
  income?: number;
  shinyChance?: number;
  startShield?: number;
  freeRerolls?: number;
  rankBonus?: number;
  startGold?: number;
}

export const TRAINERS: TrainerDef[] = [
  { id: 'youngster', title: 'Youngster', sprite: 'youngster', desc: 'Ganha 3 rerolls grátis todo dia.', freeRerolls: 3 },
  { id: 'bugcatcher', title: 'Bug Catcher', sprite: 'bugcatcher', desc: 'O primeiro Pokémon Inseto que você compra no dia é grátis.' },
  { id: 'fisherman', title: 'Fisherman', sprite: 'fisherman', desc: 'Ganha um Magikarp todo dia. (5 Magikarp = Gyarados!)' },
  { id: 'swimmer', title: 'Swimmer', sprite: 'swimmer', desc: 'Ganha um Pokémon de Água aleatório todo dia.' },
  { id: 'gentleman', title: 'Gentleman', sprite: 'gentleman', desc: 'A partir do dia 4, a loja não tem mais Pokémon Comuns nem Incomuns.' },
  { id: 'beauty', title: 'Beauty', sprite: 'beauty', desc: 'Pokémon SHINY aparecem 4x mais.', shinyChance: 0.16 },
  { id: 'lady', title: 'Lady', sprite: 'lady', desc: 'Rank da loja +2 e +₽10 no início.', rankBonus: 2, startGold: 10 },
  { id: 'burglar', title: 'Burglar', sprite: 'burglar', desc: 'Prêmios de itens segurados oferecem só 2 opções, mas você leva as duas.' },
  { id: 'ruinmaniac', title: 'Ruin Maniac', sprite: 'ruinmaniac', desc: 'Prêmios de itens segurados vêm 1 raridade acima.' },
  { id: 'twins', title: 'Twins', sprite: 'twins', desc: 'Quando uma fusão chega ao Lv. 3, ganha uma cópia exata (que vende por ₽0).' },
  { id: 'scientist', title: 'Scientist', sprite: 'scientist', desc: 'No dia 7, transforma o time ativo em Pokémon Lendários Lv. 1 aleatórios.' },
  { id: 'gambler', title: 'Gambler', sprite: 'gambler', desc: 'No dia 9, ganha um Mew e ₽30.' },
  { id: 'pokemonranger', title: 'Pokémon Ranger', sprite: 'pokemonranger', desc: 'Começa com um Pokémon Incomum e ganha outra cópia dele a cada 2 dias.' },
  { id: 'rocker', title: 'Rocker', sprite: 'rocker', desc: 'Se você tiver exatamente 1 Pokémon Elétrico no time, ele tem +150% de Choque.' },
  { id: 'supernerd', title: 'Super Nerd', sprite: 'supernerd', desc: 'Seus Pokémon de Veneno têm +3 Veneno. Aumenta +1 sempre que um Pokémon sobe de nível.' },
  { id: 'blackbelt', title: 'Black Belt', sprite: 'blackbelt', desc: 'Se você tiver exatamente 1 Lutador no time, ele tem +100% de Dano.' },
  { id: 'channeler', title: 'Channeler', sprite: 'channeler', desc: 'Quando um aliado é nocauteado, o resto do time ganha +12% de Dano nesta batalha.' },
  { id: 'tamer', title: 'Domador', sprite: 'tamer', desc: 'Seus Pokémon SEM habilidade têm +40% de Dano e de HP.' },
  { id: 'biker', title: 'Biker', sprite: 'biker', desc: 'Renovar a loja custa ₽1 e dá +2 Dano permanente a um Pokémon aleatório.' },
  { id: 'aromalady', title: 'Aroma Lady', sprite: 'aromalady', desc: 'Crescimento dos Pokémon de Planta +50% e o time tem +300 de HP.', hpFlat: 300, typeBoost: { grass: 1.5 } },
  { id: 'breeder', title: 'Criador Pokémon', sprite: 'breeder', desc: 'Quando um Pokémon chega ao Lv. 3, ganha o tipo primário de um aliado adjacente (até 3 tipos).' },
  { id: 'chef', title: 'Chef de Celadon', sprite: 'chef', desc: 'Início do dia: um Pokémon aleatório do time ganha um tipo aleatório (até 3 tipos).' },
  // líderes de ginásio: liberados ao vencer runs; cada um reforça a mecânica do seu tipo
  { id: 'brock', title: 'Líder Brock', sprite: 'brock', desc: 'Começa a batalha com Escudo de 15% do HP. Escudo dos Pokémon de Pedra +40%.', unlock: 1, startShield: 0.15, typeBoost: { rock: 1.4 } },
  { id: 'misty', title: 'Líder Misty', sprite: 'misty', desc: 'Cura e Limpeza dos Pokémon de Água +40%.', unlock: 2, typeBoost: { water: 1.4 } },
  { id: 'ltsurge', title: 'Líder Lt. Surge', sprite: 'ltsurge', desc: 'Choque dos Pokémon Elétricos +40%.', unlock: 3, typeBoost: { electric: 1.4 } },
  { id: 'erika', title: 'Líder Erika', sprite: 'erika', desc: 'Crescimento dos Pokémon de Planta +40%; Planta aparece 2x mais.', unlock: 4, typeBoost: { grass: 1.4 }, typeWeight: { grass: 2 } },
  { id: 'koga', title: 'Líder Koga', sprite: 'koga', desc: 'Veneno dos Pokémon de Veneno +40%.', unlock: 5, typeBoost: { poison: 1.4 } },
  { id: 'sabrina', title: 'Líder Sabrina', sprite: 'sabrina', desc: 'Eco dos Pokémon Psíquicos +40%.', unlock: 6, typeBoost: { psychic: 1.4 } },
  { id: 'blaine', title: 'Líder Blaine', sprite: 'blaine', desc: 'Queimadura dos Pokémon de Fogo +40%.', unlock: 7, typeBoost: { fire: 1.4 } },
  { id: 'giovanni', title: 'Líder Giovanni', sprite: 'giovanni', desc: '+₽8 por dia. Pokémon de Terra perfuram 3x e têm +25% de Dano.', unlock: 8, income: 8, typeBoost: { ground: 1.25 } },
];
export const TRAINER = Object.fromEntries(TRAINERS.map((t) => [t.id, t])) as Record<string, TrainerDef>;

// ---------- itens (usados na hora, 1 por dia) ----------

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  price: number;
  rarity: number;
  /** libera usos extras hoje */
  extraUse?: number;
}

export const ITEMS: ItemDef[] = [
  { id: 'repel', name: 'Repelente', icon: 'repel', price: 0, rarity: 1, desc: 'Abaixa o rank da loja em 1 por hoje e rerrola a loja.' },
  { id: 'lava-cookie', name: 'Biscoito de Lava', icon: 'lava-cookie', price: 0, rarity: 1, desc: 'Dá +5 Dano permanente a 2 Pokémon aleatórios.' },
  { id: 'coupon', name: 'Cupom', icon: 'coupon-1', price: 0, rarity: 1, desc: 'Os Pokémon da loja custam ₽3 a menos hoje.' },
  { id: 'soda-pop', name: 'Refrigerante', icon: 'soda-pop', price: 0, rarity: 1, desc: 'Ganhe 1 reroll grátis.' },
  { id: 'lemonade', name: 'Limonada', icon: 'lemonade', price: 0, rarity: 1, desc: 'Se você vencer a próxima batalha, ganhe ₽15.' },
  { id: 'poke-ball', name: 'Poké Ball', icon: 'poke-ball', price: 5, rarity: 1, desc: 'Captura de graça um Pokémon aleatório da loja.' },
  { id: 'lure', name: 'Isca', icon: 'lure', price: 20, rarity: 2, desc: 'Sobe o rank da loja em 1 permanentemente.' },
  { id: 'protein', name: 'Proteína', icon: 'protein', price: 0, rarity: 2, desc: 'Seus Pokémon ganham +5 Dano permanentemente.' },
  { id: 'moomoo-milk', name: 'Leite Moomoo', icon: 'moomoo-milk', price: 1, rarity: 2, desc: 'O Pokémon de baixo à direita ganha +8 Dano. Você pode usar +1 item hoje.', extraUse: 1 },
  { id: 'fire-stone', name: 'Pedra de Fogo', icon: 'fire-stone', price: 5, rarity: 2, desc: 'Evolui Vulpix, Growlithe ou Eevee (Flareon).' },
  { id: 'water-stone', name: "Pedra d'Água", icon: 'water-stone', price: 5, rarity: 2, desc: 'Evolui Shellder, Staryu, Eevee (Vaporeon) ou Poliwhirl antes da hora.' },
  { id: 'thunder-stone', name: 'Pedra do Trovão', icon: 'thunder-stone', price: 5, rarity: 2, desc: 'Evolui Eevee (Jolteon) ou Pikachu antes da hora.' },
  { id: 'leaf-stone', name: 'Pedra da Folha', icon: 'leaf-stone', price: 5, rarity: 2, desc: 'Evolui Exeggcute, Gloom (Vileplume) ou Eevee (Leafeon) antes da hora.' },
  { id: 'ice-stone', name: 'Pedra do Gelo', icon: 'ice-stone', price: 5, rarity: 2, desc: 'Evolui Eevee em Glaceon.' },
  { id: 'black-augurite', name: 'Augurita Negra', icon: 'black-augurite', price: 5, rarity: 2, desc: 'Evolui Scyther em Kleavor.' },
  { id: 'tm-type', name: 'TM de Tipo', icon: 'tm-normal', price: 8, rarity: 2, desc: 'Escolha um Pokémon: ele ganha um tipo aleatório que ainda não tem (até 3 tipos) e o stat dele.', },
  { id: 'moon-stone', name: 'Pedra da Lua', icon: 'moon-stone', price: 5, rarity: 2, desc: 'Evolui Clefairy, Jigglypuff ou Nidorina/Nidorino antes da hora.' },
  { id: 'sun-stone', name: 'Pedra do Sol', icon: 'sun-stone', price: 5, rarity: 2, desc: 'Evolui Gloom em Bellossom.' },
  { id: 'hp-up', name: 'HP Up', icon: 'hp-up', price: 0, rarity: 3, desc: '+200 de HP máximo para o time (permanente).' },
  { id: 'iron', name: 'Ferro', icon: 'iron', price: 0, rarity: 3, desc: 'Seus Pokémon de Pedra ganham +20 Escudo.' },
  { id: 'calcium', name: 'Cálcio', icon: 'calcium', price: 0, rarity: 3, desc: 'Seus Pokémon de Água ganham +10 Cura.' },
  { id: 'zinc', name: 'Zinco', icon: 'zinc', price: 0, rarity: 3, desc: 'Seus Pokémon de Veneno ganham +1 Veneno.' },
  { id: 'carbos', name: 'Carbos', icon: 'carbos', price: 0, rarity: 3, desc: 'Seus Pokémon de Fogo ganham +1 Queimadura.' },
  { id: 'pp-up', name: 'PP Up', icon: 'pp-up', price: 0, rarity: 3, desc: 'Seus Pokémon Elétricos ganham +1 Choque.' },
  { id: 'rare-candy', name: 'Doce Raro', icon: 'rare-candy', price: 30, rarity: 3, desc: 'Sobe de nível um Pokémon Lv. 1 aleatório (Comum ou Incomum).' },
  { id: 'great-ball', name: 'Great Ball', icon: 'great-ball', price: 35, rarity: 4, desc: 'Ganhe um Pokémon Super Raro aleatório.' },
  { id: 'old-gateau', name: 'Bolo Antigo', icon: 'old-gateau', price: 60, rarity: 5, desc: 'Sobe um Pokémon Lv. 3 aleatório para o Lv. 4.' },
  { id: 'ultra-ball', name: 'Ultra Ball', icon: 'ultra-ball', price: 60, rarity: 5, desc: 'Ganhe um Pokémon Lendário aleatório.' },
  { id: 'shiny-stone', name: 'Pedra Brilhante', icon: 'shiny-stone', price: 1, rarity: 6, desc: 'Torna um Pokémon aleatório SHINY. Você pode usar +1 item hoje.', extraUse: 1 },
];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<string, ItemDef>;

// ---------- encontros ----------

export interface EventOption {
  label: string;
  result: string;
  cost?: number;
}

export interface EventDef {
  id: string;
  name: string;
  day: number; // 0 = especial
  text: string;
  icon: { kind: 'trainer' | 'item' | 'mon'; name: string };
  options: EventOption[];
}

export const EVENTS: EventDef[] = [
  {
    id: 'bugcatcher', name: 'Caçador de Insetos', day: 3, icon: { kind: 'trainer', name: 'bugcatcher' },
    text: 'Um caçador de insetos quer dividir com você um dos insetos que pegou hoje.',
    options: [
      { label: 'Pegar o casulo', result: 'Ganhe um Caterpie Lv. 2 (já vira Metapod)' },
      { label: 'Pegar o besouro', result: 'Ganhe um Pinsir com +20 Dano' },
      { label: 'Pegar o louva-a-deus', result: 'Ganhe um Scyther com +1 Multicast' },
    ],
  },
  {
    id: 'dragonden', name: 'Ninho do Dragão', day: 3, icon: { kind: 'mon', name: '147' },
    text: 'Você encontra o ninho de um dragão. Pegue algo antes que ele volte!',
    options: [
      { label: 'Pegar o ovo', result: 'Um Dratini Lv. 2 choca em 2 dias' },
      { label: 'Pegar a presa', result: 'Ganhe o item segurado Presa de Dragão' },
      { label: 'Pegar as moedas', result: 'Ganhe ₽20' },
    ],
  },
  {
    id: 'berrytree', name: 'Árvore de Frutas', day: 3, icon: { kind: 'item', name: 'oran-berry' },
    text: 'No meio da floresta há uma árvore com uma fruta furta-cor.',
    options: [
      { label: 'Dar a um Pokémon', result: 'Torna um Pokémon aleatório SHINY' },
      { label: 'Guardar', result: 'Ganhe o item segurado Fruta Oran' },
      { label: 'Vender no mercado', result: 'Ganhe ₽20' },
    ],
  },
  {
    id: 'magikarpguy', name: 'Vendedor de Magikarp', day: 3, icon: { kind: 'mon', name: '129' },
    text: 'Um senhor suspeito no Centro Pokémon oferece "um negócio imperdível".',
    options: [
      { label: 'Comprar o lote', result: 'Ganhe 3 Magikarp', cost: 10 },
      { label: 'Comprar o dourado', result: 'Ganhe um Magikarp SHINY', cost: 5 },
      { label: 'Denunciar o golpe', result: 'Ganhe ₽15 de recompensa' },
    ],
  },
  {
    id: 'gamecorner', name: 'Game Corner', day: 3, icon: { kind: 'trainer', name: 'gambler' },
    text: 'As máquinas de Celadon piscam. Um senhor jura que a máquina do canto está "quente".',
    options: [
      { label: 'Apostar', result: '50% de chance de ganhar ₽30', cost: 10 },
      { label: 'Trocar fichas pelo prêmio', result: 'Ganhe um Porygon', cost: 15 },
      { label: 'Procurar fichas no chão', result: 'Ganhe ₽8' },
    ],
  },
  {
    id: 'daycare', name: 'Day Care', day: 6, icon: { kind: 'item', name: 'lucky-egg' },
    text: 'O casal do Day Care oferece ajuda. "Seus Pokémon parecem cheios de energia!"',
    options: [
      { label: 'Deixar treinando', result: 'Um Pokémon Lv. 1 aleatório sobe para o Lv. 2' },
      { label: 'Pegar o ovo achado', result: 'Um Pokémon Raro Lv. 1 choca amanhã' },
      { label: 'Ajudar no trabalho', result: 'Ganhe ₽30' },
    ],
  },
  {
    id: 'rocket', name: 'Equipe Rocket', day: 9, icon: { kind: 'trainer', name: 'rocket' },
    text: '"Prepare-se para encrenca!" Um recruta oferece mercadoria roubada... ou briga.',
    options: [
      { label: 'Comprar a mercadoria', result: 'Ganhe um item segurado Lendário', cost: 40 },
      { label: 'Enfrentar o recruta', result: 'Perca 1 ❤ e ganhe um prêmio Super Raro' },
      { label: 'Correr', result: 'Nada acontece' },
    ],
  },
  {
    id: 'pokemaniac', name: 'Pokémaníaco', day: 3, icon: { kind: 'trainer', name: 'pokemaniac' },
    text: 'Um colecionador fanático quer trocar Pokémon com você. "Eu dou um bem raro!"',
    options: [
      { label: 'Trocar um Pokémon', result: 'Troca um Pokémon Lv. 1 aleatório por um de raridade maior' },
      { label: 'Vender informações', result: 'Ganhe 2 rerolls grátis hoje e amanhã' },
      { label: 'Vender a coleção dele', result: 'Ganhe ₽18' },
    ],
  },
  {
    id: 'bill', name: 'Bill no PC', day: 6, icon: { kind: 'trainer', name: 'bill' },
    text: 'Bill, o criador do PC, deixa você usar a máquina de clonagem experimental.',
    options: [
      { label: 'Clonar', result: 'Ganhe uma cópia Lv. 1 de um Pokémon aleatório seu (ajuda nas fusões)' },
      { label: 'Ajudar na pesquisa', result: 'Ganhe o item segurado Disco Duvidoso' },
      { label: 'Consertar o PC', result: 'Ganhe ₽35' },
    ],
  },
  {
    id: 'johto', name: 'Viajante de Johto', day: 9, icon: { kind: 'trainer', name: 'pokemonranger' },
    text: 'Um treinador vindo de Johto traz ovos e objetos que você nunca viu.',
    options: [
      { label: 'Pegar um ovo', result: 'Um bebê Pokémon SHINY Lv. 2 choca amanhã' },
      { label: 'Revestimento Metálico', result: 'Ganhe o item segurado Revestimento Metálico' },
      { label: 'Pedra do Rei', result: "Ganhe o item segurado King's Rock" },
    ],
  },
  {
    id: 'fossil', name: 'Fósseis de Mt. Moon', day: 6, icon: { kind: 'item', name: 'helix-fossil' },
    text: 'Dois fósseis brilham no fundo da caverna. Um cientista quer reviver um deles.',
    options: [
      { label: 'Fóssil Hélice', result: 'Ganhe um Omanyte Lv. 2' },
      { label: 'Fóssil Domo', result: 'Ganhe um Kabuto Lv. 2' },
      { label: 'Vender os dois', result: 'Ganhe ₽40' },
    ],
  },
  {
    id: 'amber', name: 'Âmbar Antigo', day: 6, icon: { kind: 'item', name: 'old-amber' },
    text: 'O Museu de Pewter encontrou um âmbar com DNA de um Pokémon antigo.',
    options: [
      { label: 'Reviver no laboratório', result: 'Ganhe um Aerodactyl' },
      { label: 'Guardar', result: "Ganhe o item segurado King's Rock" },
      { label: 'Vender', result: 'Ganhe ₽40' },
    ],
  },
  {
    id: 'meteor', name: 'Meteoro em Mt. Moon', day: 6, icon: { kind: 'item', name: 'moon-stone' },
    text: 'Um meteoro caiu perto de Mt. Moon. Clefairies dançam ao redor dele.',
    options: [
      { label: 'Tocar o brilho', result: 'Sobe o nível de um Pokémon Lv. 1' },
      { label: 'Seguir as Clefairies', result: 'Ganhe uma Clefairy SHINY' },
      { label: 'Vender os destroços', result: 'Ganhe ₽40' },
    ],
  },
  {
    id: 'fountain', name: 'Caverna de Cerulean', day: 6, icon: { kind: 'mon', name: '131' },
    text: 'Um Lapras surge das águas e diz que realiza um desejo.',
    options: [
      { label: 'Desejar fama', result: 'Rank da loja +2' },
      { label: 'Desejar riqueza', result: 'Ganhe o item segurado Nugget Grande (+₽10/dia)' },
      { label: 'Capturar o Lapras', result: 'Ganhe um Lapras' },
    ],
  },
  {
    id: 'safari', name: 'Safari Zone', day: 6, icon: { kind: 'item', name: 'safari-ball' },
    text: 'Você tem uma única Safari Ball. Qual Pokémon raro vai tentar pegar?',
    options: [
      { label: 'Chansey', result: 'Ganhe uma Chansey' },
      { label: 'Kangaskhan', result: 'Ganhe uma Kangaskhan' },
      { label: 'Tauros', result: 'Ganhe um Tauros' },
    ],
  },
  {
    id: 'dragontamer', name: 'Domador de Dragões', day: 9, icon: { kind: 'trainer', name: 'lance' },
    text: 'Lance tem dragões demais para cuidar e oferece um para você.',
    options: [
      { label: 'O de chifre', result: 'Ganhe um Gyarados Lv. 2 SHINY' },
      { label: 'O elegante', result: 'Ganhe um Dragonair Lv. 2 SHINY' },
      { label: 'O pré-histórico', result: 'Ganhe um Aerodactyl Lv. 2 SHINY' },
    ],
  },
  {
    id: 'cinnabar', name: 'Laboratório de Cinnabar', day: 9, icon: { kind: 'trainer', name: 'scientist' },
    text: 'Um cientista quer testar suas invenções em você.',
    options: [
      { label: 'Recombinador', result: 'Transforma seu time em Pokémon 1 raridade acima' },
      { label: 'Infusão de Tipo', result: 'Escolha 1 de 3 tipos: um Pokémon aleatório ganha esse tipo' },
      { label: 'Máquina de Ouro', result: 'Ganhe o item segurado Ouro Antigo (+₽25/dia)' },
    ],
  },
  {
    id: 'oak', name: 'Prof. Oak', day: 9, icon: { kind: 'trainer', name: 'oak' },
    text: 'O Prof. Oak está fazendo pesquisa de campo. Precisa de ajuda?',
    options: [
      { label: 'Conselho de treino', result: 'Sobe o nível de um Pokémon (até Lv. 4)' },
      { label: 'Perguntar da pesquisa', result: 'Ganhe o item segurado Anotações de Pesquisa' },
      { label: 'Dicas de investimento', result: 'Ganhe ₽60' },
    ],
  },
  {
    id: 'birds', name: 'Ilhas Seafoam', day: 9, icon: { kind: 'mon', name: '144' },
    text: 'Três aves lendárias foram vistas em Kanto. Você só tem tempo de seguir uma.',
    options: [
      { label: 'Seguir o frio', result: 'Ganhe um Articuno' },
      { label: 'Seguir a tempestade', result: 'Ganhe um Zapdos' },
      { label: 'Seguir o fogo', result: 'Ganhe um Moltres' },
    ],
  },
  {
    id: 'secondchance', name: 'Enfermeira Joy', day: 0, icon: { kind: 'item', name: 'potion' },
    text: '"Não desista agora! Seus Pokémon ainda têm muito potencial. Leve isto."',
    options: [
      { label: '+1 ❤ e um item segurado', result: 'Prêmio de item segurado Super Raro' },
      { label: '+1 ❤ e um Pokémon', result: 'Ganhe um Pokémon Super Raro Lv. 2' },
      { label: '+1 ❤ e um amuleto', result: 'Ganhe a Pérola Grande (+25% HP)' },
    ],
  },
  {
    id: 'league', name: 'Planalto Indigo', day: 0, icon: { kind: 'trainer', name: 'lance' },
    text: 'Falta só uma vitória para o título! Escolha um reforço para a batalha final.',
    options: [
      { label: 'O gigante', result: 'Ganhe um Snorlax Lv. 2 SHINY' },
      { label: 'O mímico', result: 'Ganhe um Mr. Mime Lv. 4 SHINY' },
      { label: 'O amuleto', result: 'Ganhe a Pérola Grande (+25% HP)' },
    ],
  },
];
export const EVENT = Object.fromEntries(EVENTS.map((e) => [e.id, e])) as Record<string, EventDef>;

export const OPP_NAMES = [
  'Joey', 'Rick', 'Ben', 'Liz', 'Anne', 'Dan', 'Kent', 'Robin', 'Mia', 'Lucas', 'Tito', 'Bruna',
  'Rafa', 'Duda', 'Caio', 'Gabi', 'Nina', 'Theo', 'Iris', 'Hugo', 'Lara', 'Otto', 'Vivi', 'Zeca',
];
