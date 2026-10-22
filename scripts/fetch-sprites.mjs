// Baixa sprites (Gen 5 animados), ícones de itens e treinadores para public/sprites
import { mkdir, writeFile, access } from 'node:fs/promises';

const ROOT = new URL('../public/sprites/', import.meta.url);
const PK = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
const BW = `${PK}/pokemon/versions/generation-v/black-white/animated`;
const TR = 'https://play.pokemonshowdown.com/sprites/trainers';

const ITEMS = [
  'rare-candy', 'fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'hp-up', 'poke-ball',
  'great-ball', 'ultra-ball', 'safari-ball', 'old-amber', 'helix-fossil', 'dome-fossil', 'potion', 'nugget', 'big-nugget',
  'repel', 'lava-cookie', 'coupon-1', 'soda-pop', 'lemonade', 'lure', 'protein', 'moomoo-milk', 'iron', 'calcium',
  'zinc', 'carbos', 'pp-up', 'old-gateau', 'shiny-stone', 'silk-scarf', 'macho-brace', 'amulet-coin', 'quick-claw',
  'muscle-band', 'oran-berry', 'soothe-bell', 'smoke-ball', 'big-root', 'bicycle', 'charcoal', 'mystic-water',
  'miracle-seed', 'magnet', 'poison-barb', 'hard-stone', 'black-belt', 'sharp-beak', 'soft-sand', 'spell-tag',
  'never-melt-ice', 'twisted-spoon', 'silver-powder', 'dragon-fang', 'coin-case', 'exp-share', 'choice-band',
  'leftovers', 'card-key', 'silph-scope', 'life-orb', 'scope-lens', 'shell-bell', 'star-piece', 'focus-band',
  'linking-cord', 'choice-scarf', 'expert-belt', 'kings-rock', 'choice-specs', 'lucky-egg', 'big-pearl', 'light-ball',
  'metronome', 'master-ball', 'comet-shard', 'relic-gold', 'odd-keystone', 'red-shard',
  'metal-coat', 'black-glasses', 'sun-stone', 'sea-incense', 'pure-incense', 'luck-incense', 'thick-club', 'razor-fang', 'quick-powder', 'up-grade', 'dubious-disc', 'member-card', 'dragon-scale', 'rock-incense', 'wave-incense', 'odd-incense', 'lax-incense', 'full-incense', 'rose-incense', 'zoom-lens', 'wide-lens', 'muscle-band', 'reaper-cloth', 'protector', 'electirizer', 'magmarizer', 'ice-stone', 'black-augurite', 'tm-normal', 'fairy-feather', 'pixie-plate', 'dread-plate', 'icicle-plate', 'flame-plate', 'splash-plate', 'zap-plate', 'meadow-plate', 'fist-plate', 'toxic-plate', 'earth-plate', 'sky-plate', 'mind-plate', 'insect-plate', 'stone-plate', 'spooky-plate', 'draco-plate', 'iron-plate', 'blank-plate',
];
const TRAINERS = [
  'youngster', 'bugcatcher', 'fisherman', 'swimmer', 'gentleman', 'beauty', 'lady', 'burglar', 'ruinmaniac', 'twins',
  'scientist', 'gambler', 'pokemonranger', 'rocker', 'supernerd', 'blackbelt', 'hiker', 'lass', 'psychic', 'birdkeeper',
  'juggler', 'brock', 'misty', 'ltsurge', 'erika', 'koga', 'sabrina', 'blaine', 'giovanni', 'red', 'blue', 'oak', 'lance',
  'camper', 'picnicker', 'sailor', ['rocket', 'rocketgrunt'], 'channeler', 'tamer', 'biker', 'aromalady', 'painter', 'pokemaniac', 'bill', ['breeder', 'pokemonbreeder'], ['chef', 'chef'],
];

const jobs = [];
const GEN2 = [169, 172, 173, 174, 182, 186, 196, 197, 199, 208, 212, 230, 233, 236, 237, 238, 239, 240, 242];
const LATER = [439, 440, 446, 462, 463, 464, 465, 466, 467, 470, 471, 474];
const STATIC = { 700: 'sylveon', 863: 'perrserker', 865: 'sirfetchd', 866: 'mrrime', 900: 'kleavor', 979: 'annihilape' };
const SD = 'https://play.pokemonshowdown.com/sprites';
for (const [id, name] of Object.entries(STATIC)) {
  jobs.push([`${SD}/gen5/${name}.png`, `pokemon/${id}.png`]);
  jobs.push([`${SD}/gen5-shiny/${name}.png`, `pokemon/shiny/${id}.png`]);
}
for (const id of [...Array.from({ length: 151 }, (_, i) => i + 1), ...GEN2, ...LATER]) {
  jobs.push([`${BW}/${id}.gif`, `pokemon/${id}.gif`]);
  jobs.push([`${BW}/shiny/${id}.gif`, `pokemon/shiny/${id}.gif`]);
}
// [nome local, nome no repositório] quando diferem
const pair = (x) => (Array.isArray(x) ? x : [x, x]);
for (const it of ITEMS) {
  const [local, remote] = pair(it);
  jobs.push([`${PK}/items/${remote}.png`, `items/${local}.png`]);
}
for (const t of TRAINERS) {
  const [local, remote] = pair(t);
  jobs.push([`${TR}/${remote}-gen3.png`, `trainers/${local}.png`, `${TR}/${remote}.png`]);
}

await mkdir(new URL('pokemon/shiny/', ROOT), { recursive: true });
await mkdir(new URL('items/', ROOT), { recursive: true });
await mkdir(new URL('trainers/', ROOT), { recursive: true });

let ok = 0;
const fail = [];
let i = 0;
await Promise.all(
  Array.from({ length: 10 }, async () => {
    while (i < jobs.length) {
      const [url, dest, fallback] = jobs[i++];
      const target = new URL(dest, ROOT);
      try {
        await access(target);
        ok++;
        continue;
      } catch {}
      let r = await fetch(url);
      if (!r.ok && fallback) r = await fetch(fallback);
      if (!r.ok) {
        fail.push(dest);
        continue;
      }
      await writeFile(target, Buffer.from(await r.arrayBuffer()));
      ok++;
    }
  }),
);
console.log('ok', ok, 'falhas', fail);
