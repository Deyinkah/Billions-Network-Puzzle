// netlify/edge-functions/future-guard.js
// Blocks "future" dates so users can't peek tomorrow's puzzle.
// Uses your 06:00 UTC daily reset.

export default async (request, context) => {
  const url = new URL(request.url);
  const { pathname } = url;

  // Extract the date from the path
  // /share/YYYY-MM-DD.html  OR  /og/YYYY-MM-DD.png
  const m =
    pathname.match(/^\/share\/(\d{4}-\d{2}-\d{2})\.html$/) ||
    pathname.match(/^\/og\/(\d{4}-\d{2}-\d{2})\.png$/);

  if (!m) {
    // Not a dated file; allow
    return context.next();
  }

  const requestedKey = m[1]; // "YYYY-MM-DD"

  // 06:00 UTC rule — same as your game logic
  const now = new Date();
  // Use UTC clock directly to avoid double-applying timezone offset
  const todayKey =
    now.getUTCHours() >= 6
      ? now.toISOString().slice(0, 10)
      : new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Compare YYYY-MM-DD strings lexicographically (safe for ISO dates)
  if (requestedKey > todayKey) {
    // Future date → block
    return new Response("Not found", { status: 404 });
  }

  // Past or today → allow
  return context.next();
};
