// Writes precache.json: every file the service worker stores for offline use, plus a
// content hash so a changed file gets a fresh cache.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const walk = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? walk(`${dir}/${d.name}`) : [`${dir}/${d.name}`]));

const files = ['index.html', 'manifest.webmanifest', ...['css', 'js', 'data', 'audio/clips', 'icons'].flatMap(walk)].sort();
const hash = createHash('sha256');
for (const f of files) hash.update(f).update(readFileSync(f));
const version = hash.digest('hex').slice(0, 10);
writeFileSync('precache.json', JSON.stringify({ version, files: ['./', ...files] }, null, 1) + '\n');
console.log(`wrote precache.json: ${files.length + 1} files, version ${version}`);
