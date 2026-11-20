// Leonida Grid — entry program (Node 22, standard library only).
//
// The app itself is the static site under app/ (index.html plus its ES
// modules, fonts and sample photos; no build step, no network). This
// program hands it in: it empties the output directory's contents (never
// the directory itself — it may be a mount point), copies app/ and
// screenshots/ across, and writes dossier.json with the vendored
// make.fun library so the judge reads exactly the tree that ships.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Two runs over the same tree produce byte-identical output.

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// Copy a directory tree entry by entry in sorted name order, so the copy
// order never depends on filesystem enumeration order.
function copyDirSorted(srcDir, dstDir) {
  mkdirSync(dstDir, { recursive: true });
  const entries = readdirSync(srcDir, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const src = join(srcDir, entry.name);
    const dst = join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyDirSorted(src, dst);
    } else {
      copyFileSync(src, dst);
    }
  }
}

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Clear only the contents of the output directory, keeping the directory.
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}

copyDirSorted(join(repoDir, 'app'), join(outDir, 'app'));
if (existsSync(join(repoDir, 'screenshots'))) {
  copyDirSorted(join(repoDir, 'screenshots'), join(outDir, 'screenshots'));
}

// The gate's caps, passed whole so this program refuses exactly what the
// scorer would refuse: at most 4 screenshots of 256 KiB each, at most 993
// app entries and 48 MiB of app files, no app path over 1000 bytes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
