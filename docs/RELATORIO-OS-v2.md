# Kanto Showdown — Relatório da Ordem de Serviço v2

Entrega da §12: código, compêndio regenerado (`docs/Kanto-Showdown-Compendio.pdf`, 46 páginas, e `docs/compendio.html`) e este relatório.
Os dados brutos da simulação estão em `docs/balanco.json`.

## 1. Taxas de câmbio (§2, §11)

**Método.**
- Um Pokémon "puro" de cada tipo (sem habilidade, orçamento 150) entra num time com 2 Normais e luta contra 3 Normais.
- A taxa do tipo é ajustada por busca binária até a vitória ficar em 50%.
- O resultado é a média de três cenários: Lv1 no meio, Lv2 na frente e Lv3 atrás.
- O Sombrio foi medido com um aliado de Fogo, porque Punir não vale nada sem status no inimigo.
- Uma segunda passada confirmou todos os tipos em ×1,00 ± 0,02.

**Ajuste fino por tipo.** Depois, um multiplicador por tipo (`TYPE_TUNE`) foi afinado com runs completas. Ele multiplica o orçamento gasto no stat do tipo.

| Stat | Por ponto de orçamento | Tipo | Ajuste fino |
|---|---|---|---|
| Dano | 0,35 | Normal | ×1,9 |
| HP | 6,4 (Normal: 12) | Fogo | ×3,0 |
| Queimadura | 0,026 | Água | ×0,6 |
| Veneno | 0,012 | Elétrico | ×0,64 |
| Choque | 0,0265 | Planta | ×3,0 |
| Cura | 0,546 | Gelo | ×0,4 |
| Limpeza | 0,06 %/pt | Lutador | ×1,95 |
| Crescimento | 0,058 %/pt | Veneno | ×3,0 |
| Frio | 0,022 | Terra | ×3,0 |
| Crítico | 0,52 %/pt | Voador | ×0,2 |
| Escudo | 0,428 | Psíquico | ×0,6 |
| Armadura | 0,14 | Inseto | ×0,3 |
| Carga | 0,057 | Pedra | ×2,8 |
| Enxame | 0,167 | Fantasma | ×2,5 |
| Eco | 0,27 %/pt | Dragão | ×1,9 |
| Dano Espectral | 0,33 | Aço | ×2,0 |
| Punir | 0,30 %/pt | Sombrio | ×1,9 |
| Bênção | 0,162 | Fada | ×0,4 |

As taxas são para uma recarga de 3s; os stats "por golpe" são proporcionais à recarga.

## 2. Taxa de vitória por arquétipo (2.000 runs cada, 52.000 no total)

**Como o bot joga.**
- Prioriza o tipo do arquétipo na loja, funde cópias, usa itens e escolhe itens segurados do tipo.
- Usa 9 treinadores sorteados.
- A run vale até 10 vitórias e depois segue no Modo Infinito.

| Arquétipo | Vitória | Maior número | Golpe máximo | Dia 10 (mediana) | Dias no Infinito |
|---|---|---|---|---|---|
| Normal | 32,0% | 36,6B | 28,1B | 37,5K | 6,0 |
| Fogo | 28,7% | 31,1B | 160M | 23,0K | 5,1 |
| Água | 38,2% | 18,2B | 554M | 23,3K | 6,9 |
| Elétrico | 38,4% | 33,1B | 1,1B | 22,8K | 6,3 |
| Planta | 26,7% | 18,6B | 580M | 23,9K | 5,2 |
| Gelo | 45,1% | 37,3B | 5,5B | 22,9K | 9,9 |
| Lutador | 29,5% | 37,1B | 3,2B | 23,6K | 5,5 |
| Veneno | 26,0% | 820M | 140M | 25,3K | 4,1 |
| Terra | 27,1% | 33,5B | 238M | 23,2K | 5,1 |
| Voador | 48,6% | 41,0B | 10,8B | 29,8K | 9,0 |
| Psíquico | 34,9% | 40,8B | 14,0B | 22,9K | 11,5 |
| Inseto | 37,4% | 30,0B | 1,0B | 24,5K | 5,8 |
| Pedra | 27,7% | 40,0B | 3,1B | 23,9K | 5,5 |
| Fantasma | 26,4% | 49,1B | 27,4B | 23,7K | 6,3 |
| Dragão | 29,7% | 37,6B | 8,2B | 23,8K | 5,8 |
| Aço | 28,3% | 286B | 262B | 23,2K | 6,3 |
| Sombrio | 29,2% | **321T** | 321T | 23,0K | 6,8 |
| Fada | 42,1% | 36,4B | 7,9B | 28,1K | 7,4 |
| Fogo + Veneno | 20,8% | 480M | 27,8M | 23,3K | 4,2 |
| Água + Elétrico | 39,9% | 21,1B | 4,3B | 22,0K | 6,6 |
| Pedra + Terra | 25,9% | 34,0B | 982M | 22,9K | 4,9 |
| Psíquico + Fada | 45,9% | 45,2B | 17,3B | 26,1K | 11,4 |
| Elétrico + Aço | 37,8% | 39,1B | 8,8B | 23,2K | 6,5 |
| Fantasma + Lutador | 26,9% | 33,8B | 3,8B | 23,9K | 5,3 |
| Inseto + Voador | 50,3% | 28,7B | 2,5B | 27,2K | 7,3 |
| Livre (sem tipo) | 45,6% | 39,2B | 2,2B | 30,4K | 6,9 |

**Leitura dos resultados.**
- **Limites duros:** nenhum arquétipo passa de 55% nem fica abaixo de 20%. O mínimo é 20,8% e o máximo 50,3%.
- **Faixa-alvo (30–45%):** 8 arquétipos estão dentro, 13 ficam entre 20,8% e 29,7% e 5 ficam entre 45,1% e 50,3% (ver §4). Cinco dos que estão fora passam a menos de 1 ponto dela: Gelo, Dragão, Lutador, Livre e Psíquico + Fada.
- **Dia 10:** o HP do time fica entre 22K e 37K, e os golpes chegam a centenas de milhares. Está dentro da faixa pedida, de 10 mil a 1 milhão.
- **Infinito:** os números chegam a 3,2 × 10¹⁴ sem NaN nem Infinity. A formatação K/M/B/T e a notação científica acima de 1e15 estão no jogo.

**Combos de referência** (time montado contra rivais gerados do dia 8, 1.000 lutas cada):

| Combo | Vitória |
|---|---|
| Magnezone | 63% |
| Rhyperior | 85% |
| Annihilape | 100% |
| Sylveon/Fada | 57% |

## 3. O que mudou (resumo)

- **§1:** 18 tipos com mecânica própria; Fada é novo. A tipagem Gen 6+ foi aplicada. O Veneno não ignora mais o Escudo, e todo status perde 15% contra Escudo.
- **§2:** orçamento por raridade × estágio × BST e divisão 100 / 65-35 / 50-30-20. 188 espécies; os primeiros estágios e os bebês ficam sem habilidade. As 14 habilidades pedidas foram mantidas e as 4 renomeadas.
- **§3:**
  - A sinergia foi removida do código, da UI e do compêndio.
  - Cada tipo tem pelo menos 4 habilidades e 2 itens que o referenciam (verificado por script).
  - Há fontes de tipo: TM de Tipo (único item com alvo manual), Criador Pokémon, Chef de Celadon, Infusão de Tipo (Cinnabar), Conversão, Adaptável e Ancestral.
- **§4:** níveis ×1/2/4/8/16; nível máximo 4 (Poliwrath 5); venda por cópias 1/3/6/12/24 (Magikarp com 5 cópias).
- **§5:**
  - Sem teto de Escudo nem de velocidade; piso de 0,2s, com o excesso virando Multicast.
  - Multicast com dano cheio e a ordem de cálculo pedida.
  - Fadiga de 8%/s após 30s, drenagem após 45s e decisão por HP% aos 75s.
- **§6:** renomes; Proteger vence o Haunter; nocaute sem alvo usa o fallback; Eevee no Lv3 vira o tipo mais comum do time; Tyrogue evolui pela coluna; Seda Normal; os 13 itens de +20% foram substituídos.
- **§7:**
  - Itens por mecânica.
  - Placas Raras (×1,25) para os 18 tipos.
  - Pena Fada.
  - Itens de evolução antecipam no início da próxima batalha.
  - Pedra do Gelo, Augurita Negra e TM de Tipo na loja.
- **§8:** 18 espécies novas (188 no total), todas com habilidade e versão ★. Evoluções por contador: Sylveon, Sirfetch'd, Perrserker, Annihilape e Mr. Rime.
- **§9:**
  - Contadores do time (Magby, Elekid, Smoochum, Grimer, Geodude, Onix) aparecem na ficha.
  - "Quando você usa um item" em 5 espécies (Clefable, Persian, Lickilicky, Mr. Mime, Porygon) e Munchlax ★.
  - "Quando você ganha um item segurado" em mais 3 espécies (Seaking, Hypno, Kabutops), além de Porygon2 e Porygon-Z.
  - Desativar no Arbok e na Jynx. Proteger no Mr. Mime, Chansey ★, Blissey ★ e Happiny ★.
  - Ranked com divisões Poké Ball → Grande → Ultra → Master, MMR e emparelhamento por MMR.
- **§10:**
  - Medidor de dano pós-batalha, com o maior golpe da batalha e da run.
  - Log de batalha expansível.
  - Resumo da run como imagem PNG.
  - Ficha com a fórmula.
  - Treinadores novos.
  - Líderes passam a mexer na mecânica do seu tipo.

## 4. Regras não implementadas como escritas e o motivo

1. **Curva de HP dos rivais (§5: 1,5k → 6k → 20k → 60k → 200k).**
   - Medi o HP do jogador com o bot. Com as regras de orçamento (§2) e de nível (§4), o jogador cresce cerca de ×12 do dia 1 ao 10 (de 2,0K para 24,5K). A curva da OS cresce ×133.
   - Com a curva literal, a vitória fica perto de 0% a partir do dia 4, porque o HP do rival no dia 7 seria 4× o do jogador.
   - Por isso, os dias 1–10 usam a mediana do HP do jogador × 0,92: 1,9K · 3,7K · 6,1K · 8,1K · 10,2K · 12,8K · 14,8K · 17,3K · 20,9K · 25,2K.
   - O Modo Infinito mantém o ×1,6 por dia, e o poder ofensivo do rival escala com (escala de HP)^0,75.
   - Para chegar aos 200K no dia 10 seria preciso mudar regras da §2 e da §4. Não fiz isso porque a §11 proíbe.
2. **Metas de 30–45% por arquétipo (§11).**
   - Os limites duros (20–55%) foram cumpridos, mas 18 arquétipos ficam fora da faixa ideal. Treze deles estão a menos de 4 pontos dela.
   - **Disponibilidade:** a causa principal não é numérica. Cada run sorteia ~29 linhas comuns a raras, e Fogo aparece em média em 1,3 linha, Fantasma em 0,8 e Dragão em 0,3. Por isso, esses arquétipos dependem da sorte do pool.
   - **Voador:** é forte porque reúne as três aves lendárias, Dragonite, Aerodactyl, Gyarados e Charizard.
   - **Afinador saturado:** o ajuste fino por orçamento parou nos limites (×3 / ×0,2) mexendo pouco na taxa de vitória. O resto foi feito com números de habilidades (Vendaval, Voo Silencioso, Doduo/Dodrio, Cloyster, Golbat).
   - **Próximo passo:** chegar a 30–45% em todos exige mexer no pool por run (por exemplo, garantir pelo menos 2 linhas de cada tipo). Isso é regra de loja, não número, então deixei para você decidir.
3. **Interpretações da OS.**
   - Os multiplicadores Raro+ (`dmgMult`) também multiplicam Cura, Escudo e status. Sem isso, as mecânicas de acúmulo ficavam para trás no fim do jogo, e a §5.3 descreve a ordem de cálculo para os números em geral.
   - O HP base dobrou (taxa 6,4) para as lutas do fim do jogo durarem 15–25s em vez de 5–10s.
   - O Inseto como tipo primário perdeu o bônus de recarga ×0,8.
   - O "Desativar em 2 espécies novas" foi feito em Arbok e Jynx, que são espécies existentes com habilidades novas.
4. **Ranked.** Não há servidor, então os "fantasmas" são os times salvos das suas próprias runs, no navegador. O MMR e o emparelhamento funcionam, mas só contra os seus fantasmas.

## 5. Testes

- O código compila sem erros (`tsc --noEmit`) e o build do Vite passa.
- No navegador, com backup e restauração do save:
  - loja sem sinergia, com a divisão do Ranked;
  - TM de Tipo com alvo (Caterpie aprendeu Água);
  - tela de Infusão de Tipo (Caterpie virou Fada, com 3 tipos);
  - ficha lateral com a fórmula;
  - batalha com o medidor e o log (76 entradas).
- **Não testei no navegador:** o botão "Salvar imagem" do fim da run nem a tela do Modo Infinito. Os dois compilam, mas não foram exercitados.
