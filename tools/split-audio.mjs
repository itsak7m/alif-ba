// Cuts the user's recordings into audio/clips/<id>.mp3 (spec §9).
//   node tools/split-audio.mjs --detect <file> [--noise -35dB] [--min-silence 0.3]
//       prints voiced segments (index, start, duration) to help build a cut list
//   node tools/split-audio.mjs audio/raw/cuts.json
//       cuts.json: { "source": "audio/raw/take1.m4a", "clips": [{ "id": "n2", "start": 0.89, "dur": 0.33 }, ...] }
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PAD_BEFORE = 0.08;
const PAD_AFTER = 0.15;
const FADE = 0.015;

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr.slice(-500)}`);
  return r.stderr;
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
}

export function voicedSegments(log, total, minLen = 0.12) {
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  const segs = [];
  let prev = 0;
  starts.forEach((s, i) => {
    if (s - prev > minLen) segs.push([prev, s - prev]);
    prev = ends[i] ?? s;
  });
  if (total - prev > minLen) segs.push([prev, total - prev]);
  return segs;
}

function detect(file) {
  const log = ffmpeg(['-i', file, '-af', `silencedetect=noise=${arg('--noise', '-35dB')}:d=${arg('--min-silence', '0.3')}`, '-f', 'null', '-']);
  const [, h, m, s] = log.match(/Duration: (\d+):(\d+):([\d.]+)/);
  voicedSegments(log, +h * 3600 + +m * 60 + +s).forEach(([start, dur], i) => console.log(i, start.toFixed(2), dur.toFixed(2)));
}

function cut(cutsFile) {
  const { source, clips } = JSON.parse(readFileSync(cutsFile, 'utf8'));
  const norm = join(mkdtempSync(join(tmpdir(), 'dukkana-')), 'norm.wav');
  ffmpeg(['-y', '-i', source, '-ac', '1', '-ar', '44100', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', norm]);
  mkdirSync('audio/clips', { recursive: true });
  for (const { id, start, dur } of clips) {
    const s = Math.max(0, start - PAD_BEFORE);
    const d = dur + PAD_BEFORE + PAD_AFTER;
    ffmpeg(['-y', '-ss', s.toFixed(3), '-t', d.toFixed(3), '-i', norm,
      '-af', `afade=t=in:d=${FADE},afade=t=out:st=${(d - FADE).toFixed(3)}:d=${FADE}`,
      '-ac', '1', '-b:a', '64k', `audio/clips/${id}.mp3`]);
  }
  console.log(`wrote ${clips.length} clips to audio/clips/`);
}

if (process.argv[2] === '--detect') detect(process.argv[3]);
else if (process.argv[2]) cut(process.argv[2]);
else console.error('usage: split-audio.mjs --detect <file> | <cuts.json>');
