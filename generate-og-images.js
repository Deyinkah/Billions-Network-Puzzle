/**
 * generate-og-images.js
 * Builds /og/YYYY-MM-DD.png for each entry in puzzle-data.json ({ days: [...] }).
 * If the day's source image is missing, it uses img/placeholder.jpg.
 *
 * Run: node generate-og-images.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// ---- Config
const WIDTH = 1200, HEIGHT = 630;
const CANVAS_BG = "#101435";
const BOARD_MARGIN = 0.08;
const BOARD_RADIUS = 24;
const GRID_STROKE = 3;
const GRID_COLOR = "rgba(0,0,0,0.65)";

const OUT_DIR = path.join(__dirname, "og");
const DATA_JSON = path.join(__dirname, "puzzle-data.json");
const PLACEHOLDER = path.join(__dirname, "img", "placeholder.jpg");

const GRID_BY_DIFFICULTY = { Easy: 3, Medium: 4, Hard: 5, Expert: 6 };
const DEFAULT_GRID = 4;

// ---- Helpers
function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function resolveLocal(pth) { return path.isAbsolute(pth) ? pth : path.join(__dirname, pth); }
function gridSVG(n, size, stroke, w) {
  const step = size / n, lines = [];
  for (let i = 1; i < n; i++) {
    const pos = (step * i).toFixed(2);
    lines.push(`<line x1="${pos}" y1="0" x2="${pos}" y2="${size}" stroke="${stroke}" stroke-width="${w}" />`);
    lines.push(`<line x1="0" y1="${pos}" x2="${size}" y2="${pos}" stroke="${stroke}" stroke-width="${w}" />`);
  }
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${lines.join("\n")}</svg>`);
}
function roundedMaskSVG(size, r) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="white"/></svg>`);
}
function roundedStrokeSVG(size, r, stroke="rgba(255,255,255,0.18)", w=4) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="none" stroke="${stroke}" stroke-width="${w}"/></svg>`);
}

// ---- Main
(async () => {
  if (!fs.existsSync(DATA_JSON)) { console.error("Missing puzzle-data.json"); process.exit(1); }
  const data = JSON.parse(fs.readFileSync(DATA_JSON, "utf8"));
  const days = Array.isArray(data.days) ? data.days : [];
  if (!days.length) { console.error("puzzle-data.json has no 'days'"); process.exit(1); }

  ensureDir(OUT_DIR);

  for (const d of days) {
    if (!d || !d.date) continue;
    let srcPath = resolveLocal(d.img);
    const date = d.date;
    const n = GRID_BY_DIFFICULTY[d.difficulty] || DEFAULT_GRID;

    if (!fs.existsSync(srcPath)) {
      if (fs.existsSync(PLACEHOLDER)) {
        console.warn(`[warn] ${date}: source not found -> ${srcPath} (using placeholder.jpg)`);
        srcPath = PLACEHOLDER;
      } else {
        console.warn(`[warn] ${date}: source not found -> ${srcPath} and no img/placeholder.jpg (skipping)`);
        continue;
      }
    }

    const usable = Math.floor(HEIGHT * (1 - 2 * BOARD_MARGIN));
    const boardSide = Math.min(usable, HEIGHT);
    const boardX = Math.floor((WIDTH - boardSide) / 2);
    const boardY = Math.floor((HEIGHT - boardSide) / 2);

    const srcSquare = await sharp(srcPath)
      .resize(boardSide, boardSide, { fit: "cover", position: "centre" })
      .composite([{ input: roundedMaskSVG(boardSide, BOARD_RADIUS), blend: "dest-in" }])
      .png().toBuffer();

    const grid = gridSVG(n, boardSide, GRID_COLOR, GRID_STROKE);
    const stroke = roundedStrokeSVG(boardSide, BOARD_RADIUS);

    const out = await sharp({
      create: { width: WIDTH, height: HEIGHT, channels: 3, background: CANVAS_BG }
    }).composite([
      { input: srcSquare, left: boardX, top: boardY },
      { input: grid, left: boardX, top: boardY },
      { input: stroke, left: boardX, top: boardY }
    ]).png().toBuffer();

    const outPath = path.join(OUT_DIR, `${date}.png`);
    await sharp(out).toFile(outPath);
    console.log(`wrote og/${date}.png`);
  }
  console.log("Done.");
})().catch(err => { console.error("Failed:", err); process.exit(1); });

