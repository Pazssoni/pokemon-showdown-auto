# Kanto Showdown

Auto battler de navegador com os 151 Pokémon originais, inspirado no layout e nas mecânicas de
[Batomon Showdown](https://berrymint.itch.io/batomon-showdown).

Projeto fã, sem fins lucrativos. Pokémon © Nintendo / Game Freak / The Pokémon Company.
Sprites: [PokéAPI/sprites](https://github.com/PokeAPI/sprites) (Gen 5 animados) e Pokémon Showdown (treinadores Gen 3).

## Rodar

```bash
npm install
npm run dev
```

Os dados (`src/data/pokemon.json`) e os sprites (`public/sprites`) já estão no repositório.
Para baixar de novo: `npm run fetch-data` e `npm run fetch-sprites`.

## Como funciona (v2)

As regras completas estão em [DESIGN.md](DESIGN.md). Resumo:

- **Loja:** só vende o primeiro estágio de cada linha. Cada run sorteia uma "região" (~37 linhas) para que as fusões sejam viáveis.
- **Fusão:** 3 cópias Lv1 viram um Lv2 e 2 cópias Lv2 viram um Lv3, automaticamente.
- **Evolução:** linhas de 3 estágios evoluem no Lv2 e no Lv3. As de 2 estágios evoluem no Lv3, com variações: pedras, contadores (Meowth, Mankey, Psyduck, Cubone, Slowpoke) e Magikarp com 5 cópias.
- **Habilidades:** todas as 151 espécies têm uma, com gatilhos no estilo Batomon (ao atacar, início da batalha, vitória, ao comprar, contínuo…).
- **Batalha:** Queimadura a cada 0.5s perdendo 1 acúmulo, Veneno que não diminui, Choque, Multicast, Nocaute.
- **Berloques:** ~50 itens segurados. Cada vitória dá um presente (escolha 1 de 3).
- **Itens:** usados na hora, 1 por dia.
- **Encontros:** nos dias 3, 6 e 9, mais a Segunda Chance (Enfermeira Joy) e o Planalto Indigo.
- **Treinadores:** adaptados do Batomon (Youngster, Fisherman, Twins, Burglar…), e os Líderes são liberados vencendo runs.

## Estrutura

- `src/game/` — regras puras (dex, stats, batalha, loja/run, oponentes, conteúdo).
- `src/ui/` — telas em DOM + CSS (palco fixo 1280×720 escalado), cenários de batalha desenhados proceduralmente em canvas.
