// generate-share-pages.js
const fs = require("fs");
const path = require("path");

// Your public domain (no trailing slash)
const BASE_URL = "https://puzzle.billionscommunitygames.com";

// Brand account for the site itself
const BRAND_SITE_HANDLE = "@billions_ntwk"; // twitter:site

const DATA_PATH = path.join(__dirname, "puzzle-data.json");
const OUT_DIR = path.join(__dirname, "share");

function normHandle(u) {
  if (!u) return BRAND_SITE_HANDLE;
  const s = String(u).trim();
  return s.startsWith("@") ? s : "@" + s;
}

if (!fs.existsSync(DATA_PATH)) {
  console.error("Missing puzzle-data.json");
  process.exit(1);
}
const json = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const days = Array.isArray(json.days) ? json.days : [];
if (!days.length) {
  console.error("puzzle-data.json has no 'days' entries.");
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const d of days) {
  if (!d || !d.date) continue;

  const date = d.date;
  const creator = normHandle(d.username);
  const shareUrl = `${BASE_URL}/share/${date}.html`;
  const ogImg = `${BASE_URL}/og/${date}.png`;

  const title = `Billions Daily Puzzle — ${date}`;
  const ogTitle = `I solved today's Billions Daily Puzzle!`;
  const ogDesc = `Try today's puzzle featuring ${creator}.`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <!-- Open Graph -->
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${ogDesc}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:image" content="${ogImg}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${ogTitle}" />
  <meta name="twitter:description" content="${ogDesc}" />
  <meta name="twitter:image" content="${ogImg}" />
  <meta name="twitter:site" content="${BRAND_SITE_HANDLE}" />
  <meta name="twitter:creator" content="${creator}" />
  <meta name="author" content="${creator}" />
</head>
<body>
  <script>
    (function(){
      try {
        var ua = navigator.userAgent || "";
        var isBot = /bot|crawl|spider|slurp|facebookexternalhit|Twitterbot|LinkedInBot|embedly|pinterest|quora|reddit|whatsapp|telegram|Slackbot|BingPreview/i.test(ua);
        if (!isBot) {
          window.location.replace('${BASE_URL}/');
        }
      } catch (e) {}
    })();
  </script>
  <p>
    This page is for social previews. If you are not redirected automatically,
    <a href="${BASE_URL}/">click here to go to the puzzle</a>.
  </p>
</body>
</html>`;

  fs.writeFileSync(path.join(OUT_DIR, `${date}.html`), html, "utf8");
  console.log(`wrote share/${date}.html (creator: ${creator})`);
}
console.log("Done.");

