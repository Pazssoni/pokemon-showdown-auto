// Gera docs/compendio.html (e o PDF via `npm run compendio`) direto dos dados do jogo.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { ABILITY, SHINY, abilityOf, scaler } from '../src/game/abilities';
import { EVENTS, ITEMS, TRAINERS, type TrainerDef } from '../src/game/content';
import { ALL_IDS, DEX, RARITY_PRICE, SHOP_BY_RARITY, STONE_EVO, STONE_NAME, TRINKET_EVO, copiesNeeded, evoRuleText, lineMembers } from '../src/game/dex';
import { LEVEL_MULT, RARITY_COLOR, RARITY_NAME, type Unit } from '../src/game/model';
import { HP_CURVE } from '../src/game/opponent';
import { RANK_ODDS } from '../src/game/run';
import { RATE, TYPE_SHARE, TYPE_TUNE, computeStats, effCd, makeCtx } from '../src/game/stats';
import { TRINKET, TRINKETS } from '../src/game/trinkets';
import { TYPES, TYPE_COLOR, TYPE_EFFECT, TYPE_NAME, type PType } from '../src/game/types';

const S = '../public/sprites';
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const NEUTRAL: TrainerDef = { id: 'none', title: '', sprite: '', desc: '' };
const chip = (t: PType) => `<span class="tc" style="background:${TYPE_COLOR[t]}">${TYPE_NAME[t]}</span>`;
const rar = (r: number) => `<span class="rar" style="color:${RARITY_COLOR[r]}">${RARITY_NAME[r]}</span>`;
const unit = (id: number, level = 1, shiny = false): Unit => ({ uid: 1, species: id, level, shiny, extraTypes: [], perm: {}, prog: {} });
const fmtN = (n: number) => (n >= 1e15 ? n.toExponential(2) : n >= 1e12 ? `${+(n / 1e12).toFixed(1)}T` : n >= 1e9 ? `${+(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${+(n / 1e3).toFixed(1)}K` : String(Math.round(n)));
const spr = (id: number, shiny = false) => `${S}/pokemon/${shiny ? 'shiny/' : ''}${id}.${DEX[id].anim === false ? 'png' : 'gif'}`;

function statLine(id: number, level = 1) {
  const u = unit(id, level);
  const st = computeStats(u, makeCtx([u], NEUTRAL, []));
  const parts: string[] = [];
  const P = (k: string, label: string, v: number, suf = '') => { if (v) parts.push(`<b class="k-${k}">${label} ${suf ? Math.round(v * 10) / 10 : fmtN(v)}${suf}</b>`); };
  P('dmg', 'Dano', st.dmg); P('dmg', 'Espectral', st.spectral); P('heal', 'Cura', st.heal); P('heal', 'Limpeza', st.cleanse, '%');
  P('shield', 'Escudo', st.shield); P('shield', 'Armadura', st.armor); P('burn', 'Queim.', st.burn); P('poison', 'Veneno', st.poison);
  P('shock', 'Choque', st.shock); P('shock', 'Frio', st.cold); P('heal', 'Cresc.', st.growth, '%'); P('dmg', 'Crít.', st.crit, '%');
  P('multi', 'Carga', st.charge); P('dmg', 'Enxame', st.swarm); P('multi', 'Eco', st.echo, '%'); P('poison', 'Punir', st.punish, '%'); P('heal', 'Bênção', st.blessing);
  if (st.pierce) parts.push(`<b class="k-dmg">Perfurar ${st.pierce}x</b>`);
  if (st.casts > 1) parts.push(`<b class="k-multi">Multicast ${st.casts}</b>`);
  return `${parts.join(' · ')}<br><small>Orçamento ${DEX[id].budget} · Recarga ${effCd(st).toFixed(1)}s · HP do time +${fmtN(st.hp)}</small>`;
}

const abText = (id: number, shiny = false) => {
  const a = abilityOf(id, shiny);
  return a.none ? '<i>Sem habilidade</i>' : `<b>${esc(a.name)}</b> — ${esc(a.desc(scaler(1, shiny ? 1.2 : 1)))}`;
};

// ---------- seções ----------
const html: string[] = [];
const sec = (id: string, title: string, body: string) => html.push(`<section id="${id}"><h2>${title}</h2>${body}</section>`);

const total = ALL_IDS.length;
const withAb = ALL_IDS.filter((i) => !ABILITY[i]?.none).length;

sec('visao', '1. Visão geral', `
<p><b>Kanto Showdown</b> é um auto battler de navegador inspirado no <i>Batomon Showdown</i>, adaptado aos Pokémon:
os <b>151 de Kanto</b>, a <b>família de Johto</b> ligada a eles e as <b>evoluções e bebês das gerações seguintes</b> (Magnezone, Rhyperior, Sylveon, Kleavor, Annihilape…), totalizando <b>${total} espécies</b>.
Cada <b>tipo tem uma mecânica própria</b> (Queimadura, Choque, Frio, Eco, Bênção…) e os números escalam sem teto: no Modo Infinito eles chegam aos milhões.
Você monta uma equipe na loja, posiciona num grid 2×3 e assiste à batalha automática contra times de outros treinadores (gerados ou "fantasmas" de runs suas).</p>
<div class="cards">
  <div class="card"><b>Objetivo</b><br>10 vitórias antes de perder os 10 corações. Depois disso, opcionalmente, Modo Infinito.</div>
  <div class="card"><b>Equipe</b><br>6 vagas na Equipe (grid 2×3, coluna da direita = frente) e 4 no PC (banco, não luta).</div>
  <div class="card"><b>Conteúdo</b><br>${total} espécies · ${withAb} habilidades únicas · ${Object.keys(SHINY).length} versões shiny especiais · ${TRINKETS.length} itens segurados · ${ITEMS.length} itens · ${TRAINERS.length} treinadores · ${EVENTS.length} encontros.</div>
</div>`);

sec('ciclo', '2. Ciclo de gameplay (um dia)', `
<ol class="flow">
<li><b>Início do dia</b> — renda entra (base + juros + bônus), ovos chocam, efeitos de treinador e de "início do dia" disparam (Chef de Celadon dá um tipo aleatório), a loja é sorteada (se não estava travada) e o rival do dia é gerado.</li>
<li><b>Fila de telas</b> — antes da loja aparecem, em ordem: prêmios de itens segurados pendentes, Segunda Chance (Enfermeira Joy), Planalto Indigo, o encontro do dia (dias 3, 6 e 9) e a escolha da Infusão de Tipo.</li>
<li><b>Loja</b> — comprar/vender Pokémon, usar 1 item por dia, renovar (reroll) a loja, travar a loja para o dia seguinte, posicionar a equipe. Fusões acontecem automaticamente.</li>
<li><b>Pré-batalha</b> — Master Ball, itens segurados de evolução (Eletrizador, Magmarizador, Protetor, Disco Duvidoso, King's Rock, Revestimento Metálico) e evoluções por contador.</li>
<li><b>VS → Batalha automática</b> — cada Pokémon ataca quando sua recarga enche; o dano vai para o HP compartilhado do time inimigo.</li>
<li><b>Resultado</b> — vitória: +1 insígnia e um <b>prêmio de item segurado (escolha 1 de 3)</b>. Derrota: perde corações (1 nos dias 1–3, 2 nos dias 4–6, 3 a partir do 7). Medidor de dano (dano, cura, escudo, status, maior golpe da batalha e da run) e log expansível. Contadores de evolução avançam (batalhas, vitórias, derrotas, ouro, nocautes, críticos, ataques, Queimadura/Choque/Frio/Veneno aplicados e Escudo recebido pelo time).</li>
<li><b>Próximo dia</b>.</li>
</ol>
<h3>Eventos especiais</h3>
<ul>
<li><b>Encontros</b> nos dias 3, 6 e 9: um evento temático com 3 escolhas.</li>
<li><b>Segunda Chance</b> (1× por run): ao cair para ≤3 corações após uma derrota, a Enfermeira Joy dá +1 ❤ e um prêmio.</li>
<li><b>Planalto Indigo</b>: com 9 vitórias, escolha um reforço para a batalha final.</li>
<li><b>Prêmio de fusão</b>: sempre que um Pokémon chega ao Lv3, ganha-se um prêmio de item segurado da raridade dele.</li>
<li><b>Modo Infinito</b>: após ser campeão, continua com o mesmo time até perder todos os corações; o HP dos rivais cresce ×1,6 por dia.</li>
<li><b>Ranked</b>: vencer um time fantasma dá +25 de MMR e perder tira 20. Divisões: Poké Ball (&lt;1100) → Grande (1100) → Ultra (1300) → Master (1500). Os fantasmas são escolhidos com peso para MMR próximo do seu.</li>
<li><b>Resumo da run</b>: ao fim, o botão "Salvar imagem" gera um PNG com o time, as vitórias, o maior golpe e a divisão.</li>
</ul>`);

sec('economia', '3. Economia e loja', `
<table class="t">
<tr><th>Item</th><th>Regra</th></tr>
<tr><td>Dinheiro inicial</td><td>₽30 (+₽10 com a Lady)</td></tr>
<tr><td>Renda diária</td><td>₽25 + ₽3 × dia (máx. ₽55) + juros + bônus de itens/treinador</td></tr>
<tr><td>Juros</td><td>+₽1 a cada ₽10 guardados (máx. ₽5). Coin Case dobra.</td></tr>
<tr><td>Renovar loja</td><td>₽3 (rerolls grátis: Youngster 3/dia, Bicicleta 1/dia, Refrigerante, Pokémaníaco)</td></tr>
<tr><td>Travar</td><td>Mantém a loja atual para o dia seguinte</td></tr>
<tr><td>Itens</td><td>1 item por dia (Cartão-Chave e alguns itens liberam mais). Usados na hora, com alvo automático — exceto o <b>TM de Tipo</b>, o único item com alvo escolhido.</td></tr>
<tr><td>Venda</td><td>Metade do preço × cópias equivalentes (Lv1 = 1, Lv2 = 3, Lv3 = 6, Lv4 = 12, Lv5 = 24; Magikarp conta 5 cópias no Lv2) + bônus de shiny</td></tr>
<tr><td>Slots da loja</td><td>4 Pokémon + 1 item</td></tr>
<tr><td>Shiny na loja</td><td>4% de chance (16% com a Beauty), +₽5</td></tr>
<tr><td>Região</td><td>Cada run sorteia ~38 linhas (7 Comuns, 12 Incomuns, 10 Raras, 5 Super Raras, 3 Lendárias, 1 Mítica) para que as fusões sejam viáveis. 25% das vezes a loja oferece uma linha que você já tem.</td></tr>
</table>
<h3>Preço por raridade (só primeiros estágios são vendidos)</h3>
<table class="t"><tr>${[1, 2, 3, 4, 5, 6].map((r) => `<th>${rar(r)}</th>`).join('')}</tr>
<tr>${[1, 2, 3, 4, 5, 6].map((r) => `<td>₽${RARITY_PRICE[r]}<br><small>${SHOP_BY_RARITY[r].length} linhas</small></td>`).join('')}</tr></table>
<h3>Chances por nível do Mart (sobe 1 por dia, mais bônus)</h3>
<table class="t"><tr><th>Mart Nv.</th>${[1, 2, 3, 4, 5, 6].map((r) => `<th>${rar(r)}</th>`).join('')}</tr>
${RANK_ODDS.slice(1).map((row, i) => `<tr><td>${i + 1}</td>${row.map((o) => `<td>${o}%</td>`).join('')}</tr>`).join('')}</table>`);

sec('fusao', '4. Fusão, níveis e evolução', `
<ul>
<li><b>3 cópias Lv1 → 1 Lv2</b>; <b>2 Lv2 → 1 Lv3</b>; <b>2 Lv3 → 1 Lv4</b>. Automático ao comprar/receber (conta Equipe + PC). Magikarp precisa de <b>5</b> cópias. <b>Nível máximo 4</b>; só o Poliwrath chega ao Lv5 (sobe a cada vitória).</li>
<li><b>Multiplicador por nível</b> (stats e todos os números de habilidade): ${LEVEL_MULT.slice(1, 6).map((m, i) => `Lv${i + 1} ×${m}`).join(' · ')}.</li>
<li>A fusão herda shiny, <b>todos os tipos extras</b> e o maior bônus permanente de cada stat.</li>
<li><b>Evolução troca a espécie sem mudar o nível.</b> Linhas de 3 estágios evoluem no Lv2 e no Lv3; linhas de 2 estágios no Lv3 (Magmar, Electabuzz e Rhydon evoluem no Lv2 e chegam à forma da Gen 4 no Lv3).</li>
<li><b>Bebês</b> (Pichu, Cleffa, Igglybuff, Tyrogue, Smoochum, Elekid, Magby, Mime Jr., Happiny, Munchlax) entram na loja como primeiro estágio.</li>
<li><b>Contadores do time</b> (mostrados na ficha): Magby ×25 Queimaduras, Elekid ×25 Choques, Smoochum ×25 Frios, Grimer ×40 Venenos, Geodude e Onix ×20 Escudos recebidos. Outros: Meowth ₽12 de Pay Day (Perrserker se estiver ao lado de um Aço), Mankey 60 ataques → Annihilape, Farfetch'd 20 críticos → Sirfetch'd, Psyduck 4 batalhas, Cubone 3 aliados nocauteados, Slowpoke ao lado de Shellder.</li>
<li><b>Eevee</b>: pedras (Água, Trovão, Fogo, Folha → Leafeon, Gelo → Glaceon), 3 vitórias (Espeon), 2 derrotas (Umbreon), 15 de Bênção no time (Sylveon); no Lv3 vira a evolução do <b>tipo mais comum do time</b> (empate: sorteio).</li>
<li><b>Tyrogue</b>: frente → Hitmonlee, meio → Hitmontop, trás → Hitmonchan. <b>Mr. Mime</b> → Mr. Rime no Lv3.</li>
<li><b>Itens segurados de evolução</b> (antecipam no início da próxima batalha): ${Object.entries(TRINKET_EVO).map(([it, pairs]) => `${TRINKET[it]?.name ?? it} (${pairs.map(([a2, b2]) => `${DEX[a2].name} → ${DEX[b2].name}`).join(', ')})`).join(' · ')}.</li>
<li><b>Pedras</b>: ${[...new Set(STONE_EVO.map(([, it]) => it))].map((it) => `${STONE_NAME[it] ?? it}: ${STONE_EVO.filter(([, i2]) => i2 === it).map(([a2, , b2]) => `${DEX[a2].name}→${DEX[b2].name}`).join(', ')}`).join(' · ')}.</li>
</ul>`);

sec('batalha', '5. Batalha e escalonamento', `
<table class="t">
<tr><th>Conceito</th><th>Como funciona</th></tr>
<tr><td>HP do time</td><td>Compartilhado: 150 base + HP de cada Pokémon da equipe + bônus. Perde quem zerar primeiro.</td></tr>
<tr><td>Recarga</td><td>Cada Pokémon ataca quando a barra enche. Sem teto de velocidade: o piso é 0,2s e cada +100% de velocidade além do piso vira +1 Multicast.</td></tr>
<tr><td>Multicast</td><td>Golpes por ataque, todos com dano cheio. Efeitos "ao atacar" disparam 1 vez por ativação.</td></tr>
<tr><td class="k-burn">Queimadura</td><td>A cada 0,5s causa dano igual aos acúmulos e perde 1.</td></tr>
<tr><td class="k-poison">Veneno</td><td>A cada 1s causa dano igual aos acúmulos, sem diminuir. Não ignora mais o Escudo.</td></tr>
<tr><td class="k-shock">Choque</td><td>Cada golpe direto recebido causa +acúmulos de dano. Não diminui.</td></tr>
<tr><td class="k-shock">Frio</td><td>A velocidade de recarga inimiga é multiplicada por 1/(1+0,02×Frio). Perde 1 por segundo.</td></tr>
<tr><td class="k-shield">Escudo</td><td>Absorve dano antes do HP, sem teto. Status perde 15% ao bater no Escudo. Perfurar (Terra) causa 2x contra Escudo.</td></tr>
<tr><td class="k-shield">Armadura</td><td>Reduz cada golpe direto e de Choque (mínimo 1). Não afeta Queimadura e Veneno. Perfurar e Dano Espectral ignoram.</td></tr>
<tr><td>Nocaute</td><td>Só por habilidade. <b>Proteger</b> anula um nocaute. Nocaute sem alvo cai no inimigo mais próximo da linha e depois em qualquer inimigo.</td></tr>
<tr><td>Desativar</td><td>Um Pokémon desativado não ativa habilidades pelo tempo indicado.</td></tr>
<tr><td>Fadiga</td><td>Após 30s o dano cresce 8%/s. Após 45s cada time perde 2% do HP máximo por segundo (+1% a cada 5s), ignorando Escudo e Armadura. Aos 75s vence quem tiver mais HP%.</td></tr>
<tr><td>Posições</td><td>Frente = coluna da direita. "Atrás" = coluna anterior; "acima/abaixo" = mesma coluna na outra linha; adjacentes = frente+trás+acima/abaixo; "oposto" = o inimigo espelhado.</td></tr>
</table>
<h3>Ordem de cálculo (sem teto)</h3>
<p class="formula"><b>(base + aditivos permanentes + aditivos da batalha) × (1 + Σ%) × Π multiplicadores × nível</b></p>
<p>São <b>multiplicadores</b> (não somam entre si): itens Raros ou melhores de "×X" (Lente de Mira, Osso Grosso, Placas), Presa de Dragão (×1,3), Escama de Dragão (×1,6), Joia Misteriosa (×1,2), todos os % de Dano recebidos por Dragões e o Crítico. Os multiplicadores de item valem para o Dano e para os números de efeito (Cura, Escudo, status). Os números aparecem como K / M / B / T e, acima de 1e15, em notação científica.</p>
<h3>Três camadas de crescimento</h3>
<ol><li><b>Permanente</b> (entre batalhas): fusão e nível ×2, bônus permanentes de habilidades/itens, Bênção da Fada.</li>
<li><b>Na batalha</b>: buffs "nesta batalha", Crescimento (Planta), Multicast extra, Carga.</li>
<li><b>Multiplicadores</b>: itens Raros+, Dragão, Crítico, Punir e fadiga.</li></ol>
<h3>Gatilhos de habilidade</h3>
<p>Ao atacar · Início da batalha · Contínuo · Na vitória · Na derrota · Ao comprar · Depois de comprar um Pokémon X · Início do dia · Quando um aliado ataca · Ao ser nocauteado · Quando qualquer Pokémon é nocauteado · A cada N segundos · Quando o time recebe Escudo · <b>Quando você usa um item</b> · <b>Quando você ganha um item segurado</b> · Primeiro ataque / a cada N ataques. Palavras-chave: <b>Proteger</b>, <b>Desativar</b>.</p>
<h3>Shiny</h3>
<p>Todo shiny tem +20% no orçamento e nos números da habilidade. ${Object.keys(SHINY).length} espécies têm uma <b>versão ★ aprimorada própria</b>, incluindo todas as das gerações 4 em diante.</p>
<h3>Rivais</h3>
<p>O HP dos rivais gerados segue uma curva por dia (${HP_CURVE.slice(1).map((v, i) => `d${i + 1} ${fmtN(v)}`).join(' · ')}; ×1,6 por dia no Infinito) e o poder ofensivo escala com a mesma curva elevada a 0,75.</p>`);

const rateTxt: Record<PType, string> = {
  normal: `70% Dano (${RATE.dmg}/pt) + 30% HP (${RATE.hpNormal}/pt)`, fire: `Queimadura ${RATE.burn}/pt`, poison: `Veneno ${RATE.poison}/pt`, electric: `Choque ${RATE.shock}/pt`,
  water: `80% Cura (${RATE.heal}/pt) + Limpeza ${RATE.cleanse}%/pt`, grass: `Crescimento ${RATE.growth}%/pt`, ice: `Frio ${RATE.cold}/pt`, fighting: `60% Dano + 40% Crítico (${RATE.crit}%/pt)`,
  ground: `Dano ${RATE.dmg}/pt + Perfurar 2x`, rock: `Escudo ${RATE.shield}/pt`, steel: `70% Armadura (${RATE.armor}/pt) + 30% Escudo`, flying: `Carga ${RATE.charge}/pt`,
  bug: `Enxame ${RATE.swarm}/pt + Multicast 2`, psychic: `Eco ${RATE.echo}%/pt`, ghost: `Dano Espectral ${RATE.spectral}/pt`, dragon: `Dano ${RATE.dmg}/pt, recarga ×1,6`,
  dark: `50% Dano + 50% Punir (${RATE.punish}%/pt)`, fairy: `Bênção ${RATE.blessing}/pt`,
};
const typeCount = (t: PType) => ALL_IDS.filter((i) => DEX[i].types.includes(t)).length;
sec('tipos', '6. Tipos e orçamento', `
<p><b>Não existe mais sinergia.</b> Cada tipo dá uma <b>mecânica própria</b>; tipos duplos e triplos somam as mecânicas. Muitos Pokémon ficam com Dano 0 e vencem pela mecânica.</p>
<p><b>Orçamento</b> = base da raridade (100 / 130 / 170 / 220 / 300 / 360) × estágio (bebê 0,8 · 1º 1,0 · 2º 1,35 · 3º 1,7 · evolução da Gen 4+ 2,0) × BST / BST médio da raridade. Divisão entre os tipos: ${TYPE_SHARE.map((x) => x.map((y) => `${y * 100}%`).join('/')).join(' · ')}. Recarga e HP (${RATE.hp}/pt) saem do orçamento. Um <b>tipo ganho</b> (TM de Tipo, Criador Pokémon, Chef de Celadon, Infusão de Tipo, Conversão, Adaptável, Ancestral) dá +35% do orçamento no stat daquele tipo; máximo de 3 tipos.</p>
<p><b>Taxas de câmbio</b> calibradas pelo bot: um Pokémon "puro" de cada tipo entra num time de Normais e a taxa é ajustada até a vitória ficar em 50% contra 3 Normais (Lv1, Lv2 e Lv3), ou seja, 1 ponto vale o mesmo numa luta padrão de 30s. Depois, um <b>ajuste fino por tipo</b> (multiplicador do orçamento do tipo) foi afinado com runs completas.</p>
<table class="t"><tr><th>Tipo</th><th>Mecânica</th><th>Taxa (por ponto de orçamento)</th><th>Ajuste</th><th>Espécies</th></tr>
${TYPES.map((t) => `<tr><td>${chip(t)}</td><td>${TYPE_EFFECT[t]}</td><td><small>${rateTxt[t]}</small></td><td>×${TYPE_TUNE[t]}</td><td>${typeCount(t)}</td></tr>`).join('')}
</table>
<h3>Teia de contras</h3>
<p>Água limpa Queimadura, Veneno, Choque e Frio do próprio time · Escudo (Pedra) corta 15% de todo status · Terra perfura Escudo e Armadura · Fantasma ignora Escudo e Armadura · Armadura (Aço) anula golpes pequenos e Multicast · Sombrio pune times que acumulam status · Frio desacelera times de recarga rápida.</p>
<h3>Tipagem moderna (Gen 6+)</h3>
<p>Clefairy, Clefable e Cleffa são Fada; Jigglypuff, Wigglytuff e Igglybuff são Normal/Fada; Mr. Mime e Mime Jr. são Psíquico/Fada; Magnemite e Magneton são Elétrico/Aço; Farfetch'd é Normal/Voador.</p>`);

// Pokédex por linha
const lines = [...new Set(ALL_IDS.map((i) => lineMembers(i)[0]))].sort((a, b) => a - b);
const dexRows = lines.map((base) => {
  const mem = lineMembers(base);
  const r = DEX[base].rarity;
  const evo = evoRuleText(base);
  return `<div class="line" style="border-left-color:${RARITY_COLOR[r]}">
  <div class="line-head">${mem.map((m) => DEX[m].name).join(' → ')} ${rar(r)} <small>₽${RARITY_PRICE[r]}${[138, 140, 142].includes(base) ? ' · só em eventos' : ''} · fusão: ${copiesNeeded(base, 1)} cópias Lv1 → Lv2</small></div>
  ${evo ? `<div class="evo">${esc(evo)}</div>` : ''}
  <table class="dex">${mem.map((m) => `<tr>
    <td class="spr"><img src="${spr(m)}"><img class="sh" src="${spr(m, true)}"></td>
    <td class="nm"><b>#${String(m).padStart(3, '0')} ${DEX[m].name}</b><br>${DEX[m].types.map(chip).join(' ')}</td>
    <td class="st">${statLine(m)}</td>
    <td class="ab">${abText(m)}${SHINY[m] ? `<div class="shab">★ ${abText(m, true)}</div>` : ''}</td>
  </tr>`).join('')}</table></div>`;
}).join('');
sec('pokedex', `7. Pokédex completa (${total} espécies, stats no Lv1)`, `<p>Stats no Lv1, sem bônus. Multiplique por 2 (Lv2), 4 (Lv3), 8 (Lv4) ou 16 (Lv5). Primeira coluna: sprite normal e shiny. ★ = versão shiny aprimorada.</p>${dexRows}`);

sec('itens-seg', `8. Itens segurados (${TRINKETS.length})`, `<p>Permanentes. Vêm de prêmios (vitória, fusão Lv3, eventos). A raridade do prêmio segue as chances do Mart. "Único" = só um por run. Cada tipo tem pelo menos 2 itens que reforçam a sua mecânica (um Incomum e uma Placa Rara ×1,25).</p>
<table class="t">${[1, 2, 3, 4, 5].map((r) => `<tr class="grp"><td colspan="3">${rar(r)}</td></tr>` + TRINKETS.filter((t) => t.rarity === r).map((t) => `<tr><td class="ic"><img src="${S}/items/${t.icon}.png"></td><td><b>${esc(t.name)}</b>${t.unique ? ' <small>(único)</small>' : ''}</td><td>${esc(t.desc)}</td></tr>`).join('')).join('')}</table>`);

sec('itens', `9. Itens da loja (${ITEMS.length})`, `<p>Ocupam o 5º slot da loja. Usados na hora (1 por dia). Usar um item dispara os gatilhos "Quando você usa um item" (Clefable, Persian, Lickilicky, Mr. Mime, Porygon, Munchlax ★).</p>
<table class="t">${ITEMS.map((t) => `<tr><td class="ic"><img src="${S}/items/${t.icon}.png"></td><td><b>${esc(t.name)}</b><br>${rar(t.rarity)}</td><td>${t.price ? `₽${t.price}` : 'Grátis'}</td><td>${esc(t.desc)}</td></tr>`).join('')}</table>`);

sec('treinadores', `10. Treinadores (${TRAINERS.length})`, `<table class="t">${TRAINERS.map((t) => `<tr><td class="ic"><img src="${S}/trainers/${t.sprite}.png" class="tr"></td><td><b>${esc(t.title)}</b>${t.unlock ? `<br><small>libera com ${t.unlock} run(s) vencida(s)</small>` : ''}</td><td>${esc(t.desc)}</td></tr>`).join('')}</table>`);

sec('encontros', `11. Encontros (${EVENTS.length})`, EVENTS.map((e) => `<div class="ev"><b>${esc(e.name)}</b> <small>${e.day ? `dia ${e.day}` : 'especial'}</small><p><i>${esc(e.text)}</i></p><ul>${e.options.map((o) => `<li><b>${esc(o.label)}</b>${o.cost ? ` (₽${o.cost})` : ''} → ${esc(o.result)}</li>`).join('')}</ul></div>`).join(''));

type Bal = { arch: { name: string; runs: number; wr: number; best: number; d10: number }[]; combos?: { name: string; wr: number; best: number }[] };
const BAL: Bal | null = existsSync('docs/balanco.json') ? JSON.parse(readFileSync('docs/balanco.json', 'utf8')) : null;
const comboWr = (n: string) => { const c = BAL?.combos?.find((x) => x.name === n); return c ? ` <small>(bot: ${(c.wr * 100).toFixed(0)}% de vitória contra o rival do dia 8)</small>` : ''; };
sec('combos', '12. Combos de referência e balanceamento', `
<table class="t">
<tr><th>Combo</th><th>Peças</th><th>Por quê</th></tr>
<tr><td>Fortaleza magnética${comboWr('magnezone')}</td><td>Magnezone + Elétricos (Jolteon, Electivire, Raichu) + Aço (Steelix, Scizor)</td><td>Magnezone dá Armadura ao time por Elétrico e Choque aos Aços adjacentes; Electivire soma Choque por Elétrico; Raichu dobra o Choque do aliado atrás.</td></tr>
<tr><td>Rocha armada${comboWr('rhyperior')}</td><td>Rhyperior + Omastar + Golem + Steelix + Kleavor</td><td>Omastar e Golem empilham Escudo; Rhyperior converte 20% do Escudo atual em Dano; Kleavor devolve o golpe como Escudo.</td></tr>
<tr><td>Fúria espectral${comboWr('annihilape')}</td><td>Annihilape + Haunter + Gengar + Marowak</td><td>Haunter nocauteia vizinhos e Gengar o oposto; cada nocaute dá Dano Espectral permanente e Crítico ao Annihilape (escala sem teto entre batalhas).</td></tr>
<tr><td>Corte de Fada${comboWr('sylveon')}</td><td>Sylveon + Clefable + Wigglytuff + Mr. Mime + Pena Fada</td><td>Sylveon espalha a Bênção para todo o time (permanente, cresce a cada batalha); Clefable ganha Bênção a cada item usado; Mr. Mime dá Proteger.</td></tr>
<tr><td>Para-raios dragão</td><td>Dragonair + Raichu + Elétricos</td><td>Dragonair faz o Raichu aplicar "dobra o Choque do aliado atrás" duas vezes.</td></tr>
<tr><td>Time de chuva</td><td>Politoed + Starmie + Blastoise + Lapras + Golduck</td><td>Politoed dá Multicast à linha de Água; Starmie ativa os vizinhos de Água; Lapras sobe o nível deles; a Limpeza anula os status inimigos.</td></tr>
<tr><td>Veneno acumulado</td><td>Nidoqueen, Venomoth, Vileplume, Muk, Tentacruel, Ivysaur</td><td>Veneno nunca diminui; Vileplume e Muk convertem o Veneno inimigo em Dano/Escudo; Ivysaur cura com ele.</td></tr>
<tr><td>Frio eterno</td><td>Glaceon + Mr. Rime + Jynx + Lapras + Cloyster</td><td>Glaceon impede o Frio inimigo de diminuir; Mr. Rime aplica Frio por Psíquico; Jynx Desativa.</td></tr>
<tr><td>Sem habilidade</td><td>Mew + primeiros estágios + Domador</td><td>Mew dá +2 Multicast e +30% Dano a quem não tem habilidade.</td></tr>
</table>
${BAL ? `<h3>Balanceamento (bot, ${BAL.arch.reduce((s2, a2) => s2 + a2.runs, 0).toLocaleString('pt-BR')} runs)</h3>
<table class="t"><tr><th>Arquétipo</th><th>Runs</th><th>Vitória</th><th>Maior número</th><th>Dia 10 (mediana)</th></tr>
${BAL.arch.map((a2) => `<tr><td>${a2.name}</td><td>${a2.runs}</td><td>${(a2.wr * 100).toFixed(1)}%</td><td>${fmtN(a2.best)}</td><td>${fmtN(a2.d10)}</td></tr>`).join('')}</table>` : ''}`);

const toc = [['visao', 'Visão geral'], ['ciclo', 'Ciclo de gameplay'], ['economia', 'Economia e loja'], ['fusao', 'Fusão e evolução'], ['batalha', 'Batalha e escalonamento'], ['tipos', 'Tipos e orçamento'], ['pokedex', 'Pokédex completa'], ['itens-seg', 'Itens segurados'], ['itens', 'Itens da loja'], ['treinadores', 'Treinadores'], ['encontros', 'Encontros'], ['combos', 'Combos e balanceamento']];

const page = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Kanto Showdown — Compêndio</title>
<link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@600&family=Jersey+15&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 12mm 11mm; }
body { font-family: 'DejaVu Sans', system-ui, sans-serif; color: #2b1d2b; font-size: 10.5pt; line-height: 1.35; margin: 0 auto; max-width: 1000px; padding: 0 14px; background: #fff; }
h1 { font-family: 'Pixelify Sans', sans-serif; font-size: 34pt; color: #ffd23f; -webkit-text-stroke: 2px #2a4aa8; margin: 0; }
.cover { text-align: center; padding: 26px 0 10px; border-bottom: 4px solid #2b1d2b; margin-bottom: 14px; }
.cover p { margin: 4px 0; color: #555; }
h2 { font-family: 'Pixelify Sans', sans-serif; background: #ff4d6d; color: #fff; padding: 5px 12px; border-radius: 6px; margin: 22px 0 10px; page-break-after: avoid; }
h3 { color: #2a6fc0; margin: 14px 0 6px; page-break-after: avoid; }
.toc { columns: 3; font-size: 11pt; }
.toc a { color: #2a4aa8; text-decoration: none; }
.cards { display: flex; gap: 10px; } .card { flex: 1; border: 2px solid #c3c7d4; border-radius: 6px; padding: 8px; background: #f8f9fc; }
table { border-collapse: collapse; width: 100%; } .t td, .t th { border: 1px solid #d5d8e2; padding: 4px 6px; vertical-align: top; text-align: left; }
.t th { background: #3a3346; color: #fff; } tr { page-break-inside: avoid; }
.grp td { background: #f0f1f6; font-weight: bold; }
.tc { display: inline-block; color: #fff; font-size: 8.5pt; padding: 0 6px; border-radius: 4px; text-shadow: 0 1px 0 #0006; margin: 1px 0; }
.rar { font-weight: bold; }
.ic img { width: 30px; height: 30px; image-rendering: pixelated; } .ic img.tr { width: 56px; height: 56px; }
.line { border: 1px solid #d5d8e2; border-left: 6px solid; border-radius: 6px; margin: 8px 0; padding: 4px 8px; page-break-inside: avoid; }
.line-head { font-weight: bold; font-size: 11pt; } .line-head small { font-weight: normal; color: #6b6f80; }
.evo { color: #2a6fc0; font-size: 9.5pt; }
.dex td { padding: 3px 5px; vertical-align: middle; border-top: 1px dashed #e3e5ee; font-size: 9.5pt; }
.dex .spr { width: 112px; white-space: nowrap; } .dex .spr img { height: 48px; image-rendering: pixelated; } .dex .spr img.sh { height: 34px; opacity: .9; }
.dex .nm { width: 150px; } .dex .st { width: 210px; } .dex .ab .shab { color: #8a6a00; margin-top: 3px; }
.k-dmg { color: #e8435a; } .k-heal { color: #2e86d6; } .k-shield { color: #c98a12; } .k-burn { color: #f07a14; } .k-poison { color: #9b3fc6; } .k-shock { color: #b39400; } .k-multi { color: #5a6fae; }
.formula { font-family: monospace; background: #f0f1f6; padding: 6px 10px; border-radius: 6px; }
.flow li { margin: 4px 0; } .ev { border: 1px solid #d5d8e2; border-radius: 6px; padding: 6px 10px; margin: 6px 0; page-break-inside: avoid; } .ev p { margin: 2px 0; }
small { color: #6b6f80; }
</style></head><body>
<div class="cover"><h1>KANTO SHOWDOWN</h1><p><b>Compêndio completo</b> — gerado automaticamente a partir do código do jogo</p>
<p>${total} espécies · ${withAb} habilidades únicas · ${TRINKETS.length} itens segurados · ${ITEMS.length} itens · ${TRAINERS.length} treinadores · ${EVENTS.length} encontros</p></div>
<div class="toc">${toc.map(([id, t], i) => `<div>${i + 1}. <a href="#${id}">${t}</a></div>`).join('')}</div>
${html.join('\n')}
<p style="margin-top:24px;color:#999;font-size:8pt">Projeto fã, sem fins lucrativos, inspirado em Batomon Showdown. Pokémon © Nintendo / Game Freak / The Pokémon Company. Sprites: PokéAPI e Pokémon Showdown.</p>
</body></html>`;

// roda a partir da raiz do projeto (npm run compendio)
mkdirSync('docs', { recursive: true });
writeFileSync('docs/compendio.html', page);
console.log('docs/compendio.html gerado:', total, 'espécies');
