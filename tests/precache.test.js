import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const listed = new Set(JSON.parse(readFileSync(new URL('../precache.json', import.meta.url))).files);
const walk = (dir) => readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? walk(`${dir}/${d.name}`) : [`${dir}/${d.name}`]));

test('precache lists every app file', () => {
  const needed = ['./', 'index.html', 'manifest.webmanifest', ...walk('css'), ...walk('js'), ...walk('data'), ...walk('audio/clips'), ...walk('icons')];
  assert.deepEqual(needed.filter((f) => !listed.has(f)), []);
});

test('sw.js carries the precache version so a content change installs a new worker', () => {
  const { version } = JSON.parse(readFileSync(new URL('../precache.json', import.meta.url)));
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes(`const VERSION = '${version}';`), 'sw.js VERSION matches precache.json');
});
