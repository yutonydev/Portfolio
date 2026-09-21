// Generates the lanyard card faces, strap tile and favicons, sized from card.glb's atlas.
// Run: node scripts/build-card-images.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Source filenames contain spaces, so URLs must be decoded rather than sliced.
const p = (url) => fileURLToPath(url);

const SRC = new URL('../src/images/', import.meta.url);
const OUT = new URL('../src/components/Lanyard/', import.meta.url);

const ATLAS_W = 1678;
const ATLAS_H = 1677;
const FACE_W = Math.round(0.5 * ATLAS_W); // 839
const FRONT_H = Math.round(0.755 * ATLAS_H); // 1266
const BACK_H = Math.round(0.757 * ATLAS_H); // 1269

const INK = '#1a1d29';
const BORDER = 38; // white frame around the photo, in face pixels

// ---------- front: photo in a white frame ----------
// lanyard-photo.jpg is the decoded HEIC; sharp cannot read HEIC.
const photo = await sharp(p(new URL('lanyard-photo.jpg', SRC)))
  .resize({
    width: FACE_W - BORDER * 2,
    height: FRONT_H - BORDER * 2,
    fit: 'cover',
    position: 'top' // keep the face in frame on a portrait photo
  })
  .toBuffer();

await sharp({
  create: { width: FACE_W, height: FRONT_H, channels: 4, background: '#ffffff' }
})
  .composite([{ input: photo, left: BORDER, top: BORDER }])
  // JPEG, not PNG: as a PNG this photograph weighed 2 MB.
  .jpeg({ quality: 88 })
  .toFile(p(new URL('card-front.jpg', OUT)));

console.log(`card-front.jpg  ${FACE_W}x${FRONT_H}`);

// ---------- back: tech logos on white ----------
const LOGOS = ['github', 'unity', 'cplusplus', 'react', 'python', 'supabase'];
const COLS = 2;
const ROWS = 3;
const CELL_W = FACE_W / COLS;
const CELL_H = (BACK_H - 150) / ROWS; // leave room for the caption
const ICON = 150;

const tiles = await Promise.all(
  LOGOS.map(async (name, i) => {
    const raw = readFileSync(new URL(`logos/${name}.svg`, import.meta.url)).toString();
    // simple-icons ship monochrome paths with no fill; tint them to the ink colour.
    const tinted = raw.replace('<svg ', `<svg fill="${INK}" `);
    const buf = await sharp(Buffer.from(tinted)).resize(ICON, ICON, { fit: 'contain' }).png().toBuffer();
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return {
      input: buf,
      left: Math.round(col * CELL_W + (CELL_W - ICON) / 2),
      top: Math.round(110 + row * CELL_H + (CELL_H - ICON) / 2)
    };
  })
);

const caption = Buffer.from(
  `<svg width="${FACE_W}" height="${BACK_H}" xmlns="http://www.w3.org/2000/svg">
     <text x="${FACE_W / 2}" y="72" text-anchor="middle"
           font-family="Verdana, DejaVu Sans, sans-serif" font-size="46" font-weight="bold"
           letter-spacing="4" fill="${INK}">TONY YU</text>
     <text x="${FACE_W / 2}" y="${BACK_H - 54}" text-anchor="middle"
           font-family="Verdana, DejaVu Sans, sans-serif" font-size="30"
           letter-spacing="3" fill="#5B8CFF">yutony.dev</text>
   </svg>`
);

await sharp({
  create: { width: FACE_W, height: BACK_H, channels: 4, background: '#ffffff' }
})
  .composite([...tiles, { input: caption, left: 0, top: 0 }])
  .png()
  .toFile(p(new URL('card-back.png', OUT)));

console.log(`card-back.png   ${FACE_W}x${BACK_H}  (${LOGOS.join(', ')})`);

// ---------- lanyard strap ----------
// One tile of the print, 2:1, repeated at a fixed world length.
const STRAP_W = 512;
const STRAP_H = 256;

// Light on dark: a near-black strap measured 1.35:1 and was invisible.
const STRAP_BG = '#e7e9f2';
const STRAP_FG = '#15161c';

await sharp(
  Buffer.from(
    `<svg width="${STRAP_W}" height="${STRAP_H}" xmlns="http://www.w3.org/2000/svg">
       <rect width="${STRAP_W}" height="${STRAP_H}" fill="${STRAP_BG}"/>
       <text x="${STRAP_W / 2}" y="${STRAP_H / 2}" text-anchor="middle" dominant-baseline="central"
             font-family="Verdana, DejaVu Sans, sans-serif" font-size="110" font-weight="bold"
             letter-spacing="10" fill="${STRAP_FG}">TY</text>
     </svg>`
  )
)
  .png()
  .toFile(p(new URL('strap-ty.png', OUT)));

console.log(`strap-ty.png    ${STRAP_W}x${STRAP_H}`);

// ---------- favicon ----------
// A TY monogram, baked to PNG so glyphs cannot shift with browser fonts.
const PUB = new URL('../public/', import.meta.url);
const ICON_RES = 512;
const ICON_BG = '#6f74e8'; // the same purple as the pixels and card spotlights
const ICON_FG = '#000000';

const iconTile = Buffer.from(
  `<svg width="${ICON_RES}" height="${ICON_RES}" xmlns="http://www.w3.org/2000/svg">
     <rect width="${ICON_RES}" height="${ICON_RES}" rx="${ICON_RES * 0.22}" fill="${ICON_BG}"/>
     <text x="50%" y="53%" text-anchor="middle" dominant-baseline="central"
           font-family="Verdana, DejaVu Sans, sans-serif"
           font-size="${ICON_RES * 0.46}" font-weight="bold"
           letter-spacing="${ICON_RES * 0.012}" fill="${ICON_FG}">TY</text>
   </svg>`
);

for (const [file, size] of [
  ['favicon.png', 64],
  ['apple-touch-icon.png', 180]
]) {
  // Drawn large and scaled down, so the edges land smooth at icon sizes.
  await sharp(iconTile).resize(size, size).png().toFile(p(new URL(file, PUB)));
  console.log(`${file.padEnd(20)} ${size}x${size}`);
}
