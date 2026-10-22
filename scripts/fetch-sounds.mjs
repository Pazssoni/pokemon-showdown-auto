// Baixa os gritos (cries) clássicos dos 151 Pokémon do repositório da PokéAPI
import { mkdir, writeFile, access } from 'node:fs/promises';

const BASE = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy';
const dir = new URL('../public/sounds/cries/', import.meta.url);
await mkdir(dir, { recursive: true });
let ok = 0;
const fail = [];
const IDS = [...Array.from({ length: 151 }, (_, i) => i + 1), 169, 172, 173, 174, 182, 186, 196, 197, 199, 208, 212, 230, 233, 236, 237, 238, 239, 240, 242, 439, 440, 446, 462, 463, 464, 465, 466, 467, 470, 471, 474, 700, 863, 865, 866, 900, 979];
let i = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (i < IDS.length) {
    const id = IDS[i++];
    const target = new URL(`${id}.ogg`, dir);
    try { await access(target); ok++; continue; } catch {}
    let r = await fetch(`${BASE}/${id}.ogg`);
    if (!r.ok) r = await fetch(`${BASE.replace('legacy', 'latest')}/${id}.ogg`);
    if (!r.ok) { fail.push(id); continue; }
    await writeFile(target, Buffer.from(await r.arrayBuffer()));
    ok++;
  }
}));
console.log('ok', ok, 'falhas', fail);
