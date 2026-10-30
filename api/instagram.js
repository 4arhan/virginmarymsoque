// Vercel serverless function: the mosque's latest Instagram posts, for the
// feed on the News page and the homepage (assets/js/instagram-feed.js).
//
// GET /api/instagram?limit=8 → { enabled, username, posts: [{ id, type,
// image, permalink, caption, timestamp }] }. Without a token it answers
// { enabled: false } and the pages show a "follow us" card instead.
//
// Setup (Vercel → Project → Settings → Environment Variables):
//   INSTAGRAM_ACCESS_TOKEN   a long-lived token for the mosque's Instagram
//                            account from the Instagram API with Instagram
//                            Login (see README → Instagram feed)
// Long-lived tokens expire after 60 days unless refreshed; this function
// refreshes the token about once a day while the site is being visited, so
// it stays valid. If Instagram ever answers with a different token string,
// a warning is logged and the variable needs updating by hand.

const GRAPH = "https://graph.instagram.com";
const FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username";
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 24;
const CAPTION_LENGTH = 140;

let lastRefresh = 0;

async function refreshToken(token) {
  if (Date.now() - lastRefresh < 86_400_000) return;
  lastRefresh = Date.now();
  try {
    const res = await fetch(
      `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    const data = await res.json();
    if (res.ok && data.access_token && data.access_token !== token) {
      console.warn("Instagram issued a new access token; update INSTAGRAM_ACCESS_TOKEN in Vercel.");
    }
  } catch (err) {
    console.warn("Instagram token refresh skipped:", err && err.message ? err.message : err);
  }
}

function trimCaption(caption) {
  const text = String(caption || "").replace(/\s+/g, " ").trim();
  if (text.length <= CAPTION_LENGTH) return text;
  return text.slice(0, CAPTION_LENGTH - 1).replace(/\s+\S*$/, "") + "…";
}

export function normalizePosts(items) {
  return items
    .filter((p) => p && p.permalink && (p.media_url || p.thumbnail_url))
    .map((p) => ({
      id: p.id,
      type: p.media_type || "IMAGE",
      image: p.media_type === "VIDEO" ? p.thumbnail_url || p.media_url : p.media_url || p.thumbnail_url,
      permalink: p.permalink,
      caption: trimCaption(p.caption),
      timestamp: p.timestamp || null,
    }));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    res.setHeader("Cache-Control", "public, s-maxage=300");
    return res.status(200).json({ enabled: false });
  }

  const url = new URL(req.url || "/", "http://localhost");
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit")) || DEFAULT_LIMIT));

  try {
    const api = `${GRAPH}/v21.0/me/media?fields=${FIELDS}&limit=${limit}&access_token=${encodeURIComponent(token)}`;
    const igRes = await fetch(api, { signal: AbortSignal.timeout(8000) });
    const data = await igRes.json();
    if (!igRes.ok || !Array.isArray(data.data)) {
      throw new Error((data.error && data.error.message) || `Instagram HTTP ${igRes.status}`);
    }
    await refreshToken(token);
    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");
    return res.status(200).json({
      enabled: true,
      username: (data.data[0] && data.data[0].username) || null,
      posts: normalizePosts(data.data),
    });
  } catch (err) {
    console.error("Instagram feed error", err && err.message ? err.message : err);
    res.setHeader("Cache-Control", "public, s-maxage=300");
    return res.status(502).json({ enabled: false, error: "Instagram feed unavailable." });
  }
}
