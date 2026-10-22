// Baixa da PokéAPI os dados dos 151 Pokémon da Gen 1 e gera src/data/pokemon.json
import { writeFile } from 'node:fs/promises';

const API = 'https://pokeapi.co/api/v2';
const MAX = 151;
// 2ª geração: só bebês e evoluções novas de Pokémon de Kanto
const GEN2 = [169, 172, 173, 174, 182, 186, 196, 197, 199, 208, 212, 230, 233, 236, 237, 238, 239, 240, 242];
// evoluções/pré-evoluções de linhas de Kanto em gerações posteriores
const LATER = [439, 440, 446, 462, 463, 464, 465, 466, 467, 470, 471, 474, 700, 863, 865, 866, 900, 979];
// sem sprite animado de DS (Gen 6+): usa o sprite estático estilo DS do Showdown
export const STATIC = { 700: 'sylveon', 863: 'perrserker', 865: 'sirfetchd', 866: 'mrrime', 900: 'kleavor', 979: 'annihilape' };
const ALLOWED = new Set([...Array.from({ length: MAX }, (_, i) => i + 1), ...GEN2, ...LATER]);

async function get(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  throw new Error('falhou: ' + url);
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

const idFromUrl = (u) => Number(u.split('/').filter(Boolean).pop());
const ids = [...ALLOWED];

const pokes = await pool(ids, 12, (id) => get(`${API}/pokemon/${id}`));
const species = await pool(ids, 12, (id) => get(`${API}/pokemon-species/${id}`));
const chainIds = [...new Set(species.map((s) => idFromUrl(s.evolution_chain.url)))];
const chains = await pool(chainIds, 12, (id) => get(`${API}/evolution-chain/${id}`));

// evolução: id -> lista de { id, method, item }
const evo = {};
const stage = {};
const lineOf = {};
const lineLen = {};
for (const c of chains) {
  const members = [];
  const walk = (node, depth) => {
    const id = idFromUrl(node.species.url);
    // bebês de gerações futuras (Pichu, Cleffa...): pula e segue para os filhos
    if (!ALLOWED.has(id)) {
      for (const next of node.evolves_to) walk(next, depth);
      return;
    }
    members.push(id);
    stage[id] = depth;
    lineOf[id] = c.id;
    evo[id] = [];
    for (const next of node.evolves_to) {
      const nid = idFromUrl(next.species.url);
      if (!ALLOWED.has(nid)) continue;
      const d = next.evolution_details[0] || {};
      const trig = d.trigger?.name;
      const method = trig === 'use-item' ? 'stone' : trig === 'trade' ? 'trade' : 'level';
      evo[id].push({ id: nid, method, item: d.item?.name ?? null });
      walk(next, depth + 1);
    }
  };
  walk(c.chain, 0);
  const depthMax = Math.max(...members.map((m) => stage[m]));
  for (const m of members) lineLen[m] = depthMax + 1;
}

const data = ids.map((id, i) => {
  const p = pokes[i];
  const s = species[i];
  const types = p.types
    .sort((a, b) => a.slot - b.slot)
    .map((t) => t.type.name);
  const st = Object.fromEntries(p.stats.map((x) => [x.stat.name, x.base_stat]));
  const stats = {
    hp: st.hp,
    atk: st.attack,
    def: st.defense,
    spa: st['special-attack'],
    spd: st['special-defense'],
    spe: st.speed,
  };
  const name = s.names.find((n) => n.language.name === 'en')?.name ?? p.name;
  return {
    id,
    name,
    types,
    stats,
    bst: Object.values(stats).reduce((a, b) => a + b, 0),
    legendary: s.is_legendary || s.is_mythical,
    line: lineOf[id],
    stage: stage[id],
    lineLength: lineLen[id],
    evolvesTo: evo[id],
    anim: !STATIC[id],
  };
});

await writeFile(new URL('../src/data/pokemon.json', import.meta.url), JSON.stringify(data));
console.log('ok', data.length, 'pokémon');
