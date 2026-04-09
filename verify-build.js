// verify-build.js
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://puzzle.billionscommunitygames.com";
const DATA_PATH = path.join(__dirname, "puzzle-data.json");
const OG_DIR = path.join(__dirname, "og");
const SHARE_DIR = path.join(__dirname, "share");

function fail(msg) { console.error("[error]", msg); process.exitCode = 1; }

if (!fs.existsSync(DATA_PATH)) fail("Missing puzzle-data.json");
if (!fs.existsSync(OG_DIR)) fail("Missing /og folder. Run: node generate-og-images.js");
if (!fs.existsSync(SHARE_DIR)) fail("Missing /share folder. Run: node generate-share-pages.js");

const json = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const days = Array.isArray(json.days) ? json.days : [];
if (!days.length) fail("puzzle-data.json has no 'days' entries.");

let ok = 0, bad = 0;
for (const d of days) {
  if (!d || !d.date) continue;
  const date = d.date;
  const og = path.join(OG_DIR, `${date}.png`);
  const share = path.join(SHARE_DIR, `${date}.html`);

  if (!fs.existsSync(og)) { fail(`Missing: og/${date}.png`); bad++; continue; }
  if (!fs.existsSync(share)) { fail(`Missing: share/${date}.html`); bad++; continue; }

  const html = fs.readFileSync(share, "utf8");
  const needImg = `${BASE_URL}/og/${date}.png`;
  const needUrl = `${BASE_URL}/share/${date}.html`;
  if (!html.includes(needImg)) { fail(`share/${date}.html does not reference ${needImg}`); bad++; continue; }
  if (!html.includes(needUrl)) { fail(`share/${date}.html does not reference ${needUrl}`); bad++; continue; }

  ok++;
}
console.log(`Checked ${days.length} days — OK: ${ok}, Problems: ${bad}`);
if (bad) process.exit(1);

