// main.ts — the program that hands Sizzle & Serve in (Node 22, stdlib only).
// It copies the game and its screenshots beside this file into /output and
// writes /output/dossier.json, the summary the judge reads, with the
// vendored make.fun library. It runs twice in the grader and both runs must
// write the same bytes, so it does nothing but copy and summarize.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-flight: fail loudly with a plain message when the entry is incomplete,
// instead of handing the grader a half-empty /output.
const gameIndex = join(here, 'game', 'index.html');
if (!existsSync(gameIndex)) throw new Error('missing game/index.html — the game was not built');
const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((name) => !name.startsWith('.'))
  : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shots.length}`);
}
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's caps: at most 4 screenshots of 256 KiB, a game/ of at most 993
// files and 48 MiB with paths under 1000 bytes, and a dossier of 160 KiB.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(
  `Sizzle & Serve handed in: ${shots.length} screenshots, `
  + `dossier ${Buffer.byteLength(dossier, 'utf8')} bytes -> ${out}`,
);
