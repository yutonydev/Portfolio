// Builds the About carousel images from the originals in src/imported about images and gifs/.
// Run: node scripts/build-about-carousel.mjs

import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const p = url => fileURLToPath(url);

const IMPORTED = new URL('../src/imported about images and gifs/', import.meta.url);
const SRC = new URL('../src/images/', import.meta.url);
const OUT = new URL('../src/images/about-carousel/', import.meta.url);

// 2x the 280x373 the card renders at, for high-density displays.
const W = 480;
const H = 640;

mkdirSync(p(OUT), { recursive: true });

/** `zoom` narrows the frame before the 3:4 crop, `focusX`/`focusY` aim it, `fps` re-times animation. */
const ITEMS = [
  { src: new URL('about me image.jpg', SRC), name: 'santa-cruz.jpg' },
  { src: new URL('IMG_0036.JPG', IMPORTED), name: 'summit-lookout.jpg' },
  { src: new URL('IMG_1351.JPG', IMPORTED), name: 'trailhead-friends.jpg' },
  { src: new URL('IMG_7945.jpeg', IMPORTED), name: 'summit-rock.jpg' },
  { src: new URL('IMG_3159.jpeg', IMPORTED), name: 'card-opening.jpg', zoom: 0.72, focusX: 0.78, focusY: 0.2 },
  // Both already 3:4, so the resize below crops nothing off them.
  { src: new URL('IMG_0677.jpg', IMPORTED), name: 'graduation.jpg' },
  { src: new URL('IMG_0799.jpg', IMPORTED), name: 'christmas-tree.jpg' },
  { src: new URL('315.gif', IMPORTED), name: 'bench-press.webp', animated: true, fps: 15 },
  { src: new URL('IMG_5043.gif', IMPORTED), name: 'fishing.webp', animated: true },
  { src: new URL('337BAEB3-DD92-4266-BE7B-DE9C3BE15D44.gif', IMPORTED), name: 'night-out.webp', animated: true }
];

let before = 0;
let after = 0;

for (const { src, name, animated = false, zoom, focusX = 1, focusY = 0.5, fps } of ITEMS) {
  // `animated` reads every frame, so the resize applies per frame.
  const input = sharp(p(src), { animated, limitInputPixels: false });
  const meta = await input.metadata();
  const frames = meta.pages ?? 1;

  // EXIF orientation, sharp path only; GIFs carry no flag.
  let pipeline = input.rotate();

  if (zoom) {
    // Measured after rotating, since extract() runs on the rotated pixels.
    const { info } = await sharp(p(src), { limitInputPixels: false })
      .rotate()
      .toBuffer({ resolveWithObject: true });
    const width = Math.round(info.width * zoom);
    const height = Math.min(info.height, Math.round((width * H) / W));
    pipeline = pipeline.extract({
      left: Math.round((info.width - width) * focusX),
      top: Math.round((info.height - height) * focusY),
      width,
      height
    });
  }

  const out = p(new URL(name, OUT));
  let written;

  if (fps) {
    // Crop here too, so ffmpeg is not scaling away pixels it just encoded.
    const sw = meta.width;
    const sh = meta.pageHeight ?? meta.height;
    const cw = sw / sh < W / H ? sw : Math.round((sh * W) / H);
    const ch = sw / sh < W / H ? Math.round((sw * H) / W) : sh;
    execFileSync('ffmpeg', [
      '-y', '-v', 'error',
      '-i', p(src),
      '-vf', `fps=${fps},crop=${cw}:${ch},scale=${W}:${H}`,
      '-c:v', 'libwebp_anim', '-q:v', '60', '-loop', '0', '-an',
      out
    ]);
    written = { size: statSync(out).size };
  } else {
    const resized = pipeline.resize(W, H, { fit: 'cover', position: 'centre' });
    written = await (animated
      ? resized.webp({ quality: 70, effort: 4 })
      : resized.jpeg({ quality: 82, mozjpeg: true })
    ).toFile(out);
  }

  const srcSize = statSync(p(src)).size;
  before += srcSize;
  after += written.size;

  console.log(
    `${name.padEnd(24)} ${(srcSize / 1048576).toFixed(2).padStart(6)}MB -> ` +
      `${(written.size / 1048576).toFixed(2).padStart(6)}MB` +
      (frames > 1 ? `  (${frames} frames)` : '')
  );
}

console.log(
  `\ntotal ${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(1)}MB ` +
    `(${(100 - (after / before) * 100).toFixed(0)}% smaller)`
);
