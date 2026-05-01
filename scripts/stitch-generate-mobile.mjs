/**
 * Google Stitch mobile design generation + save artifacts for review.
 *
 * API key (first match wins):
 * 1. process.env.STITCH_API_KEY
 * 2. frontend/.env.stitch — line STITCH_API_KEY=...
 * 3. frontend/.env.local — line STITCH_API_KEY=...
 *
 * Browser localStorage is not visible to Node. Copy the key from DevTools → Application →
 * Local Storage (if Stitch stores it there) into .env.stitch as STITCH_API_KEY=...
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadKeyFromEnvFile(filename) {
  try {
    const text = readFileSync(join(root, filename), 'utf8');
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const m = t.match(/^STITCH_API_KEY\s*=\s*(.*)$/);
      if (m) {
        let v = m[1].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (v) return v;
      }
    }
  } catch {
    /* missing file */
  }
  return null;
}

if (!process.env.STITCH_API_KEY) {
  process.env.STITCH_API_KEY =
    loadKeyFromEnvFile('.env.stitch') || loadKeyFromEnvFile('.env.local') || '';
}

const promptPath = join(root, 'design', 'STITCH_MOBILE_DESIGN_PROMPT.md');

const raw = readFileSync(promptPath, 'utf8');
const START = '<!-- STITCH_PROMPT_START -->';
const END = '<!-- STITCH_PROMPT_END -->';
const i0 = raw.indexOf(START);
const i1 = raw.indexOf(END);
if (i0 === -1 || i1 === -1 || i1 <= i0) {
  console.error('Could not find STITCH prompt markers in design/STITCH_MOBILE_DESIGN_PROMPT.md');
  process.exit(1);
}
const prompt = raw.slice(i0 + START.length, i1).trim();

if (!process.env.STITCH_API_KEY?.trim()) {
  console.error('Missing STITCH_API_KEY.');
  console.error('Add to frontend/.env.stitch (gitignored): STITCH_API_KEY=your_key');
  console.error('Or export STITCH_API_KEY in the shell. Browser localStorage cannot be read by this script.');
  process.exit(1);
}

const { stitch } = await import('@google/stitch-sdk');

const title = process.argv[2] || 'Obelisk Company Portal — Mobile UX';
console.log('Creating Stitch project:', title);
const project = await stitch.createProject(title);

console.log('Generating MOBILE screen (this may take a minute)…');
const screen = await project.generate(prompt, 'MOBILE');

const htmlUrl = await screen.getHtml();
const imageUrl = await screen.getImage();

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = join(root, 'design', 'stitch-output', stamp);
mkdirSync(outDir, { recursive: true });

const meta = {
  generatedAt: new Date().toISOString(),
  projectId: project.projectId,
  screenId: screen.screenId,
  title,
  htmlUrl,
  imageUrl,
};
writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');

async function downloadToFile(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url.slice(0, 80)}…`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(filepath, buf);
}

console.log('Downloading HTML + screenshot…');
await downloadToFile(htmlUrl, join(outDir, 'screen.html'));
await downloadToFile(imageUrl, join(outDir, 'screen.png'));

writeFileSync(
  join(outDir, 'README.txt'),
  [
    'Stitch mobile generation output',
    '===============================',
    '',
    `Generated: ${meta.generatedAt}`,
    `projectId: ${meta.projectId}`,
    `screenId: ${meta.screenId}`,
    '',
    'Files:',
    '  screen.html — generated UI (open in browser)',
    '  screen.png  — screenshot',
    '  meta.json   — IDs and remote URLs',
    '',
    'Remote URLs in meta.json may expire; local files are the snapshot for review.',
    '',
  ].join('\n'),
  'utf8'
);

console.log('\nDone. Saved to:', outDir);
console.log('  screen.html, screen.png, meta.json, README.txt');
