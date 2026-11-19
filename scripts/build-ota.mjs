// Zero-dependency Node script that packages dist/ into dist/ota-bundle.zip
// and writes dist/ota-manifest.json for offline-first Capacitor OTA updates.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const BUNDLE_NAME = 'ota-bundle.zip';
const MANIFEST_NAME = 'ota-manifest.json';
const BASE_URL = process.env.OTA_BASE_URL || 'https://aufgabenliste-beta.vercel.app';

// Standard CRC32 table for ZIP format
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function collectFiles(dir, baseDir = dir) {
  const entries = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(baseDir, full).replace(/\\/g, '/');
    if (rel === BUNDLE_NAME || rel === MANIFEST_NAME) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      entries.push(...collectFiles(full, baseDir));
    } else if (stat.isFile()) {
      entries.push({ full, rel });
    }
  }
  return entries;
}

function buildZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { full, rel } of files) {
    const raw = fs.readFileSync(full);
    const compressed = zlib.deflateRawSync(raw, { level: 6 });
    const nameBuf = Buffer.from(rel, 'utf8');
    const crc = crc32(raw);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // local file header signature
    localHeader.writeUInt16LE(20, 4);         // version needed
    localHeader.writeUInt16LE(0x0800, 6);     // UTF-8 flag
    localHeader.writeUInt16LE(8, 8);          // deflate
    localHeader.writeUInt16LE(0, 10);         // mod time
    localHeader.writeUInt16LE(0, 12);         // mod date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(raw.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(raw.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + compressed.length;
  }

  const centralBuf = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralBuf.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuf, endRecord]);
}

if (!fs.existsSync(DIST_DIR)) {
  console.error('dist/ directory not found. Run vite build first.');
  process.exit(1);
}

const files = collectFiles(DIST_DIR);
const zipBuffer = buildZip(files);
fs.writeFileSync(path.join(DIST_DIR, BUNDLE_NAME), zipBuffer);

const commitSha = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || '').slice(0, 7);
const version = commitSha ? `1.0.${Date.now()}-${commitSha}` : `1.0.${Date.now()}`;

const manifest = {
  version,
  url: `${BASE_URL}/${BUNDLE_NAME}`,
  builtAt: new Date().toISOString(),
  size: zipBuffer.length,
};

fs.writeFileSync(path.join(DIST_DIR, MANIFEST_NAME), JSON.stringify(manifest, null, 2));
console.log(`OTA bundle generated: ${BUNDLE_NAME} (${(zipBuffer.length / 1024).toFixed(1)} KB), version ${version}`);
