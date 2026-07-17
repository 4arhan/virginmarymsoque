// Vercel serverless function: live prayer-time sync with the mosque's
// official display at https://awqat.com.au/vmm/ (TAWKIT).
//
// awqat.com.au sends no CORS headers, so browsers cannot fetch it directly;
// this proxy fetches server-side and returns compact JSON. The CDN caches
// responses (s-maxage), so awqat sees a handful of requests per hour at most.

const TIMES_URL = "https://awqat.com.au/www/data/wtimes-AU.MELBOURNE.ini";
const IQAMA_URL = "https://awqat.com.au/vmm/iqamafixed.js";
const TZ = "Australia/Melbourne";

const PRAYER_NAMES = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
// FIXED_IQAMA_TIMES / JS_IQAMA_TIME index → prayer (index 0 unused in TAWKIT)
const IQAMA_SLOTS = [null, "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

function melbourneDateKey() {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ,
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const p = {};
  for (const { type, value } of parts) p[type] = value;
  return `${p.month}-${p.day}`;
}

function parseAdhan(text, key) {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('"' + key)) continue;
    const match = trimmed.match(/~~~~~(.+?)"/);
    if (!match) continue;
    const parts = match[1].split("|");
    if (parts.length < 6) continue;
    const adhan = {};
    PRAYER_NAMES.forEach((name, i) => {
      adhan[name] = parts[i];
    });
    return adhan;
  }
  return null;
}

function parseIqama(text) {
  const fixed = {};
  const offsetMinutes = {};

  const fixedMatch = text.match(/FIXED_IQAMA_TIMES\s*=\s*\[([^\]]*)\]/);
  if (fixedMatch) {
    const vals = fixedMatch[1].split(",").map((s) => s.trim().replace(/['"]/g, ""));
    for (let i = 1; i < Math.min(vals.length, IQAMA_SLOTS.length); i++) {
      if (vals[i] && vals[i].includes(":")) fixed[IQAMA_SLOTS[i]] = vals[i];
    }
  }

  const minMatch = text.match(/JS_IQAMA_TIME\s*=\s*\[([^\]]*)\]/);
  if (minMatch) {
    const vals = minMatch[1].split(",");
    for (let i = 1; i < Math.min(vals.length, IQAMA_SLOTS.length); i++) {
      const n = parseInt(vals[i], 10);
      if (!Number.isNaN(n)) offsetMinutes[IQAMA_SLOTS[i]] = n;
    }
  }

  return { fixed, offsetMinutes };
}

export default async function handler(req, res) {
  try {
    const [timesRes, iqamaRes] = await Promise.all([
      fetch(TIMES_URL),
      fetch(IQAMA_URL),
    ]);
    if (!timesRes.ok) throw new Error(`awqat times HTTP ${timesRes.status}`);
    if (!iqamaRes.ok) throw new Error(`awqat iqama HTTP ${iqamaRes.status}`);

    const key = melbourneDateKey();
    const adhan = parseAdhan(await timesRes.text(), key);
    if (!adhan) throw new Error(`no adhan entry for ${key}`);
    const iqama = parseIqama(await iqamaRes.text());

    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ source: "awqat.com.au/vmm", date: key, adhan, iqama });
  } catch (err) {
    // Client falls back to the bundled dataset.
    res.setHeader("Cache-Control", "public, s-maxage=300");
    res.status(502).json({ error: String(err && err.message ? err.message : err) });
  }
}
