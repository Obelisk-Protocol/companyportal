/**
 * Download all screens from a Stitch project into design/stitch-output/catalog/
 *
 * Env: STITCH_API_KEY, optional STITCH_PROJECT_ID (default: 5065106555139887194)
 * Key loading matches stitch-generate-mobile.mjs (.env.stitch, .env.local)
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
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (v) return v;
      }
    }
  } catch {
    /* missing */
  }
  return null;
}

if (!process.env.STITCH_API_KEY) {
  process.env.STITCH_API_KEY = loadKeyFromEnvFile('.env.stitch') || loadKeyFromEnvFile('.env.local') || '';
}

const PROJECT_ID = process.env.STITCH_PROJECT_ID || '5065106555139887194';

if (!process.env.STITCH_API_KEY?.trim()) {
  console.error('Missing STITCH_API_KEY');
  process.exit(1);
}

const { stitch } = await import('@google/stitch-sdk');
const outRoot = join(root, 'design', 'stitch-output', 'catalog');
mkdirSync(outRoot, { recursive: true });

const project = stitch.project(PROJECT_ID);
console.log('Listing screens for project', PROJECT_ID, '…');
const screens = await project.screens();
console.log('Found', screens.length, 'screens');

async function download(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  writeFileSync(filepath, Buffer.from(await res.arrayBuffer()));
}

const manifest = {
  syncedAt: new Date().toISOString(),
  projectId: PROJECT_ID,
  screens: [],
};

for (const s of screens) {
  const id = s.screenId;
  const title = s.data?.title || id;
  const deviceType = s.data?.deviceType || 'UNKNOWN';
  const dir = join(outRoot, id);
  mkdirSync(dir, { recursive: true });

  const htmlUrl = await s.getHtml();
  const imgUrl = await s.getImage();
  console.log('  →', title, id);

  try {
    await download(htmlUrl, join(dir, 'screen.html'));
    await download(imgUrl, join(dir, 'screen.png'));
  } catch (e) {
    console.error('    download failed:', e.message);
  }

  manifest.screens.push({
    screenId: id,
    title,
    deviceType,
    htmlUrl,
    imageUrl: imgUrl,
    paths: { html: `${id}/screen.html`, png: `${id}/screen.png` },
  });
}

writeFileSync(join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
writeFileSync(
  join(outRoot, 'README.txt'),
  [
    'Stitch catalog snapshot',
    '=======================',
    '',
    `Synced: ${manifest.syncedAt}`,
    `Project: ${PROJECT_ID}`,
    `Screens: ${manifest.screens.length}`,
    '',
    'Each folder: screen.html + screen.png',
    'See manifest.json for metadata and remote URLs.',
    '',
  ].join('\n'),
  'utf8'
);

console.log('\nDone. Saved to', outRoot);
