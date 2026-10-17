import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate icon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#0f766e" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.25" />
    </filter>
  </defs>
  <!-- Background with rounded corners -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  
  <!-- Outer Glow Ring -->
  <circle cx="256" cy="256" r="190" fill="none" stroke="#34d399" stroke-width="8" opacity="0.4" />
  
  <!-- Pill & Delivery Icon Graphics -->
  <g filter="url(#shadow)" transform="translate(256, 256)">
    <!-- Pill Capsule -->
    <g transform="rotate(-35)">
      <rect x="-120" y="-55" width="240" height="110" rx="55" fill="#ffffff" />
      <path d="M 0 -55 L 65 -55 A 55 55 0 0 1 65 55 L 0 55 Z" fill="#10b981" />
      <circle cx="-50" cy="0" r="14" fill="#059669" opacity="0.8" />
      <circle cx="50" cy="0" r="14" fill="#ffffff" opacity="0.9" />
      <line x1="0" y1="-55" x2="0" y2="55" stroke="#047857" stroke-width="6" />
    </g>
    
    <!-- Fast Delivery Wings / Speed marks -->
    <path d="M -150 -100 L -90 -100 L -120 -80 Z" fill="#facc15" />
    <path d="M -170 -60 L -100 -60 L -135 -40 Z" fill="#facc15" />
    <path d="M -150 70 L -90 70 L -120 90 Z" fill="#facc15" />
  </g>
  
  <!-- Text Label -->
  <text x="256" y="445" font-family="'Cairo', sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">فارما ديليفري</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');
console.log('Created public/icon.svg');

// 2. Generate PNGs using pure Node zlib CRC32
function createPngBuffer(width, height, isMaskable = false) {
  const rowSize = width * 4 + 1;
  const raw = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;
  const safeRadius = width * 0.38;

  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const idx = y * rowSize + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (isMaskable) {
        // Full bleed emerald gradient for maskable
        const gradT = (x + y) / (width + height);
        raw[idx] = Math.round(5 + gradT * 10);      // R
        raw[idx + 1] = Math.round(150 - gradT * 32); // G
        raw[idx + 2] = Math.round(105 + gradT * 5);  // B
        raw[idx + 3] = 255;                          // A
        
        // Inner white/gold emblem
        if (dist < safeRadius * 0.6) {
          raw[idx] = 255;
          raw[idx + 1] = 255;
          raw[idx + 2] = 255;
        } else if (dist < safeRadius * 0.75) {
          raw[idx] = 250;
          raw[idx + 1] = 204;
          raw[idx + 2] = 21; // Yellow accent
        }
      } else {
        // Rounded rect or circle with smooth emerald background
        const cornerR = width * 0.22;
        const inCornerX = Math.abs(dx) > (width / 2 - cornerR);
        const inCornerY = Math.abs(dy) > (height / 2 - cornerR);
        let inBounds = true;

        if (inCornerX && inCornerY) {
          const cornerDistX = Math.abs(dx) - (width / 2 - cornerR);
          const cornerDistY = Math.abs(dy) - (height / 2 - cornerR);
          inBounds = Math.sqrt(cornerDistX * cornerDistX + cornerDistY * cornerDistY) <= cornerR;
        }

        if (inBounds) {
          const gradT = (x + y) / (width + height);
          raw[idx] = Math.round(5 + gradT * 10);
          raw[idx + 1] = Math.round(150 - gradT * 32);
          raw[idx + 2] = Math.round(105 + gradT * 5);
          raw[idx + 3] = 255;

          // Emblem in center
          if (dist < radius * 0.5) {
            raw[idx] = 255;
            raw[idx + 1] = 255;
            raw[idx + 2] = 255;
          } else if (dist < radius * 0.65 && (dx > 0 || dy > 0)) {
            raw[idx] = 250;
            raw[idx + 1] = 204;
            raw[idx + 2] = 21;
          }
        } else {
          // Transparent
          raw[idx] = 0;
          raw[idx + 1] = 0;
          raw[idx + 2] = 0;
          raw[idx + 3] = 0;
        }
      }
    }
  }

  const compressed = zlib.deflateSync(raw);

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  function crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const toCrc = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(toCrc), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    header,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Generate files
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPngBuffer(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPngBuffer(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPngBuffer(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPngBuffer(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPngBuffer(64, 64, false));

console.log('Generated all PWA compliant icons in public/');
