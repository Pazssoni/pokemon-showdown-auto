# Kanto Showdown v2.1: especificação

Esta versão aproxima o jogo das regras reais do Batomon Showdown (estudadas no Batodex e no wiki da comunidade) e as adapta para os 151 Pokémon.

## 1. Loja e raridade
- A loja só vende o **primeiro estágio** de cada linha (Charmander, nunca Charmeleon) e os Pokémon sem evolução.
- A raridade de um Pokémon de primeiro estágio vem do **potencial da linha**, medido pelo BST do último estágio.
- São 6 raridades: Comum, Incomum, Raro, Super Raro, Lendário e Mítico.

| Raridade | Preço |
|---|---|
| Comum | $10 |
| Incomum | $18 |
| Raro | $28 |
| Super Raro | $40 |
| Lendário | $60 |
| Mítico | $80 |

- **Rank da loja:** sobe 1 por dia, mais bônus de itens, berloques ou treinador. Cada rank tem uma tabela de chances para as 6 raridades.
- **Slots:** a loja tem 5 slots, sendo 4 de Pokémon e 1 de item. Há reroll ($3) e trava.
- **Shiny:** 4% de chance. Rende +20% nos stats e custa +$5.

## 2. Fusão e nível (como no Batomon)
- **3 cópias Lv1 → 1 Lv2.** **2 cópias Lv2 → 1 Lv3.** A fusão é automática ao comprar ou receber a cópia que completa o grupo, e conta time + banco.
- O resultado fica na posição do time (ou a primeira do banco). Ele fica shiny se qualquer ingrediente for shiny, mantém o **maior** bônus permanente de cada stat e herda os tipos extras.
- O **Lv4** só vem de efeitos especiais: Ultra Candy, Prof. Oak e eventos.
- A loja mostra o selo "⬆" quando a compra vai completar uma fusão, além do progresso de cópias (ex.: 2/3).
- A fusão nunca exige espaço livre.

## 3. Evolução (regra por linha)
A evolução troca a espécie **sem mudar o nível**.

- **3 estágios:** Lv2 → 2º estágio e Lv3 → 3º estágio. Ou seja: 3 Charmander = Charmeleon, e 2 Charmeleon = Charizard.
- **2 estágios:** evoluem no **Lv3** por padrão.
- **Variações temáticas:**
  - **Lv2:** Rattata (fraco e rápido), Diglett (3 Diglett = Dugtrio), Magnemite (3 = Magneton) e Koffing (Weezing tem duas cabeças).
  - **Magikarp:** precisa de **5 cópias** para subir ao Lv2, e ao subir evolui direto para Gyarados.
  - **Pedras (item da loja):** Pikachu, Clefairy, Jigglypuff, Vulpix, Growlithe, Shellder, Staryu, Exeggcute e Eevee (o ramo depende da pedra). A pedra escolhe sozinha o Pokémon compatível de maior nível.
  - **Contadores no estilo Batomon:**
    - Meowth evolui depois de ganhar $12 com Pay Day.
    - Mankey evolui depois de uma derrota do time.
    - Psyduck evolui depois de 4 batalhas no time.
    - Cubone evolui depois de 3 nocautes de aliados.
    - Slowpoke evolui se começar uma batalha ao lado de um Shellder (ou no Lv3).
    - Omanyte e Kabuto evoluem no Lv3.

## 4. Habilidades (uma por espécie)
- **Gatilhos:**
  - Ao comprar
  - Depois de comprar um tipo X
  - Início do dia
  - Início da batalha
  - Ao atacar
  - Quando um aliado ataca
  - Ao ser nocauteado
  - Quando qualquer Pokémon é nocauteado
  - A cada N segundos
  - Contínuo
  - Na vitória
  - Na derrota
- **Alvos:**
  - Si mesmo
  - Aliado à frente, atrás, acima ou abaixo
  - Adjacentes
  - Mesma linha
  - Inimigo oposto
  - Time inteiro
  - Aliados de um tipo
- **Efeitos:**
  - +stat nesta batalha ou permanente
  - Carregar recarga
  - Atrasar inimigo
  - Ativar aliado
  - Nocautear
  - Reviver
  - Ganhar ouro
  - Copiar stats
  - Escudo e cura
- **Escala:** os números crescem com o nível (×1 / ×1.6 / ×2.4 / ×3.4).

## 5. Batalha
- O HP é compartilhado pelo time. O dano direto passa primeiro pelo escudo.
- **Queimadura:** a cada 0.5s causa dano igual aos acúmulos e perde 1.
- **Veneno:** a cada 1s causa dano igual aos acúmulos e não diminui.
- **Choque:** cada golpe direto recebido causa +acúmulos de dano. Não diminui.
- **Multicast:** número de golpes por ataque.
- **Velocidade de recarga:** +100% significa recarga na metade do tempo.
- **Nocaute:** só acontece por habilidade. O Pokémon para de agir.
- **Fadiga:** começa aos 30s. A batalha termina aos 75s, e vence quem tiver mais HP%.
- **Efeito de cada tipo:**
  - Fogo queima.
  - Água cura.
  - Planta cura e fortalece os vizinhos.
  - Elétrico aplica Choque.
  - Gelo atrasa.
  - Lutador acerta crítico.
  - Veneno envenena.
  - Terra quebra escudo.
  - Voador é rápido.
  - Psíquico tem chance de golpe extra.
  - Inseto é rápido e escala com outros Insetos.
  - Pedra dá escudo.
  - Fantasma amaldiçoa.
  - Dragão dá golpes fortes e lentos.

## 6. Economia
- **Dia 1:** $30.
- **Renda diária:** $25 + $3 × dia (máx. $55), mais juros de $1 a cada $10 guardados (máx. $5), mais berloques e treinador.
- **Venda:** metade do preço × cópias (Lv1 = 1, Lv2 = 3, Lv3 = 6, Lv4 = 12).
- **Itens:** em geral baratos ou grátis, mas só **1 item por dia** (alguns liberam +1). O item é aplicado na hora, com alvo automático (aleatório, por tipo, o time todo…).

## 7. Vidas, vitória e encontros
- **10 corações e 10 vitórias.** A derrota custa 1 coração (dias 1–3), 2 (dias 4–6) ou 3 (dia 7+).
- **Vitória:** dá um **presente de berloque** (escolha 1 de 3, raridade pelo rank).
- **Encontros nos dias 3, 6 e 9:** um evento temático com 3 escolhas (ex.: Mt. Moon com fósseis, Safari Zone, Domador de Dragões, Prof. Oak, Aves Lendárias).
- **Segunda Chance:** uma vez por run, quando os corações chegam a 3 ou menos depois de uma derrota, a Enfermeira Joy aparece. Dá +1 coração e mais um entre: berloque Super Raro, Pokémon Super Raro Lv2 ou Amuleto (+25% HP).
- **Liga Pokémon:** com 9 vitórias, o evento de preparação final oferece algo forte.

## 8. Berloques (itens segurados, ~40)
- **Tipos:** dão bônus a um tipo (Charcoal, Mystic Water, Miracle Seed, Magnet…).
- **Posição:** dão bônus a uma coluna ou slot (Quick Claw, Choice Band…).
- **Economia:** Nugget, Amulet Coin, Coin Case.
- **Derrota:** dão recompensa ao perder (Focus Band, Smoke Ball).
- **Escala:** Muscle Band, Life Orb, Metronome.
- **Especiais:** Link Cable, King's Rock, Master Ball.

## 9. Treinadores (adaptados do Batomon)
- **Youngster:** 3 rerolls grátis por dia.
- **Bug Catcher:** o 1º Inseto do dia é grátis.
- **Fisherman:** ganha um Magikarp por dia.
- **Swimmer:** ganha um Pokémon de Água por dia.
- **Gentleman:** a partir do dia 4, a loja não tem Comum nem Incomum.
- **Beauty:** shinies aparecem mais.
- **Lady:** rank +2 e +$10.
- **Burglar:** o presente oferece 2 opções e você leva as duas.
- **Ruin Maniac:** presentes 1 raridade acima.
- **Twins:** fundir até Lv3 gera uma cópia extra.
- **Scientist:** no dia 7, transforma o time em lendários Lv1.
- **Gambler:** ganha um Mew e $30 no dia 9.
- **Pokémon Ranger:** começa com um Incomum e ganha outra cópia dele a cada 2 dias.
- **Rocker:** se tiver exatamente 1 Elétrico no time, ele ganha +150% de Choque.
- **Super Nerd:** Veneno +3, e +1 a cada vez que um Pokémon sobe de nível.
- **Black Belt:** se tiver exatamente 1 Lutador no time, ele ganha +100% de dano.
- **Líderes de Ginásio:** liberados vencendo runs.

## 10. v2.1: polimento
- **Nomes Pokémon:**

| Antes | Agora |
|---|---|
| $ | ₽ (Pokédólar) |
| Berloques | Itens Segurados |
| Presente | Prêmio |
| Banco | PC |
| Time | Equipe |
| Rank | Mart Nv. |
| Reroll | Renovar |
| Troféu | Insígnia |

- **Fonte:** Jersey 15 no texto e nos números (dígitos legíveis). A Pixelify Sans fica só nos títulos.
- **Shiny:** +20% em todos os stats, e a habilidade usa os números de 1 nível acima.
- **Força por raridade:** raridades altas rendem mais no mesmo nível (×1 → ×1.6).
- **Multicast:** divide o dano entre os golpes (total +30% por golpe extra) e combina com Choque e status.
- **Velocidade de recarga:** limitada a +150%.
- **Linhas de pedra:** evoluem sozinhas no Lv3 se faltar a pedra.
- **Modo Infinito:** depois das 10 vitórias.
- **Velocidade 8x** na batalha.
- **Encontros novos:** Game Corner, Day Care e Equipe Rocket.

## 11. v2.2: shiny, balanceamento e som
- **Shiny (como no Batomon):** cada espécie tem sua versão aprimorada. Por padrão, +20% nos stats e nos números da habilidade.
  - ~45 espécies têm aprimoramento próprio: explosão que não nocauteia, Multicast maior, recarga 20% mais rápida, alcance maior (todos os aliados em vez de só os adjacentes), revive a si mesmo, Chansey dá +2 ❤ etc.
- **Balanceamento por simulação:** um bot que monta combos de um tipo vence ~40% das runs, e os combos chegam a golpes de milhares e centenas de acúmulos.
  - A queimadura foi recalibrada (com a regra do Batomon, ela crescia sem limite).
- **Som:**
  - Gritos clássicos dos 151 (PokéAPI) na compra, na evolução, na entrada da batalha e no nocaute.
  - Trilha chiptune original no estilo Game Boy (título, loja, batalha, vitória e derrota), gerada em tempo real.

## 12. v2.3: habilidades únicas e dragões
- **Habilidades únicas:** cada Pokémon tem uma habilidade própria, verificada por script (zero textos repetidos). Só os efeitos de acumular stat podem se repetir.
- **Sem habilidade:** 42 primeiros estágios só têm stats e evolução, como no Batomon. O shiny de alguns ganha uma habilidade simples.
- **Escala por nível:** igual ao Batomon, ×1 / ×2 / ×3, e o Lv4 dá um salto para ×6 (stats e habilidades).
- **Dragões como quebradores de meta (inspirados nos dragões do Batomon):**
  - **Dratini:** carrega o aliado atrás (1/2/3/6s).
  - **Dragonair:** o aliado atrás aplica suas habilidades Contínuas +1 vez.
  - **Dragonite:** reativa as habilidades de Início de Batalha dos vizinhos.
- **Lendários com mecânicas próprias:**
  - **Articuno:** desativa as Contínuas da linha inimiga.
  - **Zapdos:** acelera a cada ataque.
  - **Moltres:** queima a partir da queimadura do inimigo.
  - **Mewtwo:** desacelera todos os inimigos.
  - **Mew:** fortalece quem não tem habilidade.
  - **Lapras:** sobe o nível dos vizinhos durante a batalha.
- **Mecânicas novas:**
  - Roubar escudo (Lickitung).
  - Proteção contra nocaute (Mr. Mime).
  - Buff permanente na loja (Nidorina).
  - Bônus na próxima compra (Exeggcute).
  - Dano por dinheiro guardado (Persian).
  - Subir de nível sem limite na vitória (Poliwrath).
  - Golpe forte a cada N ataques (Kingler).

## 13. v2.4: polimento
- **Retrato do treinador aproximado** (cabeça e tronco), na loja e na escolha de treinador.
- **Cenários animados:** nuvens, raios de luz, folhas, pássaros, gotas, cristais, ondas, gaivotas, estrelas, névoa, fogos-fátuos, poeira e bandeiras. Também na tela de título.
- **Gritos:** o Pokémon solta o grito quando age na batalha, com intervalo por Pokémon para não virar barulho.
- **Resumo da batalha:** mostra os 3 Pokémon que mais causaram dano.
- **Ficha na batalha:** clique direito em um Pokémon abre a ficha completa.
- **Compra:** coloca o Pokémon primeiro na equipe (da frente para trás) e depois no PC.
- **Aviso no BATALHAR:** avisa quando há vaga na equipe e Pokémon parados no PC.

## 14. v2.5: família de Johto e conteúdo do Batomon
- **19 espécies da Gen 2**, só as ligadas a Kanto:
  - **Bebês:** Pichu, Cleffa, Igglybuff, Smoochum, Elekid, Magby e Tyrogue. Agora são eles que aparecem na loja.
  - **Evoluções novas:** Crobat, Bellossom, Politoed, Slowking, Steelix, Scizor, Kingdra, Porygon2, Blissey, Hitmontop, Espeon e Umbreon.
  - **Tipos novos:** Aço e Sombrio.
  - **Dragão novo:** Kingdra, que dá Multicast ao aliado da frente, como o Saberhorn.
- **Evoluções com ramos:**
  - Tyrogue escolhe entre 3 formas.
  - Poliwhirl e Slowpoke viram Politoed/Slowking se você tiver King's Rock.
  - Eevee vira Espeon depois de 3 vitórias e Umbreon depois de 2 derrotas.
  - Pedras evoluem antes da hora (Pikachu, Clefairy, Gloom…). A Pedra do Sol transforma o Gloom em Bellossom.
- **Prêmio de fusão:** chegar ao Lv3 dá um prêmio de item segurado da raridade do Pokémon.
- **Itens segurados novos, adaptados do Batomon:**
  - Incensos que forçam a raridade das próximas 5 lojas.
  - Cartão de Sócio, adaptação do VIP Pass.
  - Pó Veloz e Presa Afiada, adaptações das coroas da posição do meio.
  - Disco Duvidoso, adaptação do Mini Duplicator.
  - Osso Grosso, adaptação do Small Club.
  - Lentes de coluna, Pano Sinistro, boosters de Aço e Sombrio, e outros.
- **Treinadores novos:** Channeler, Domador, Biker e Aroma Lady.
- **Encontros novos:** Pokémaníaco, Bill no PC e Viajante de Johto.
- **Balanceamento:** bot de combos com 700 runs: ~37% de vitórias.
