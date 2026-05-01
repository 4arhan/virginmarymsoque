// Prayer times from awqat.com.au — the VMM (Virgin Mary Mosque) instance
// Data sources:
//   1. Yearly adhan times: https://awqat.com.au/www/data/wtimes-AU.MELBOURNE.ini
//      Format per line: "MM-DD~~~~~Fajr|Sunrise|Dhuhr|Asr|Maghrib|Isha" (24h)
//   2. Iqama times: https://awqat.com.au/vmm/iqamafixed.js
//      FIXED_IQAMA_TIMES = ['','6:00','12:45','16:00','','19:30']
//      JS_IQAMA_TIME = [0,,10,10,5,5] (minutes after adhan)

const CACHE_KEY = "vmm.prayerTimes";
const TIMES_URL = "https://awqat.com.au/www/data/wtimes-AU.MELBOURNE.ini";
const IQAMA_URL = "https://awqat.com.au/vmm/iqamafixed.js";

const PRAYER_NAMES = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
const SALAH_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

function todayKey() {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayCacheKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayCacheKey()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayCacheKey(), ...payload }));
  } catch { /* quota/blocked */ }
}

function parseTimesFile(text) {
  const key = todayKey();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('"' + key)) continue;
    const match = trimmed.match(/~~~~~(.+?)"/);
    if (!match) continue;
    const parts = match[1].split("|");
    if (parts.length < 6) continue;
    const timings = {};
    PRAYER_NAMES.forEach((name, i) => {
      timings[name] = parts[i];
    });
    return timings;
  }
  return null;
}

function parseIqamaFile(text) {
  const fixed = {};
  const minutes = {};

  const fixedMatch = text.match(/FIXED_IQAMA_TIMES\s*=\s*\[([^\]]+)\]/);
  if (fixedMatch) {
    const vals = fixedMatch[1].split(",").map((s) => s.trim().replace(/'/g, ""));
    // Index: 0=unused, 1=Fajr, 2=Dhuhr, 3=Asr, 4=Maghrib, 5=Isha
    const map = [null, "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    for (let i = 1; i < Math.min(vals.length, map.length); i++) {
      if (vals[i] && vals[i].includes(":")) {
        fixed[map[i]] = vals[i];
      }
    }
  }

  const minMatch = text.match(/JS_IQAMA_TIME\s*=\s*\[([^\]]+)\]/);
  if (minMatch) {
    const vals = minMatch[1].split(",");
    const map = [null, "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    for (let i = 1; i < Math.min(vals.length, map.length); i++) {
      const n = parseInt(vals[i], 10);
      if (!isNaN(n)) minutes[map[i]] = n;
    }
  }

  return { fixed, minutes };
}

function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  const rh = Math.floor(total / 60) % 24;
  const rm = total % 60;
  return `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}`;
}

function computeIqamaTimes(adhanTimings, iqamaData) {
  const iqama = {};
  for (const name of SALAH_NAMES) {
    if (iqamaData.fixed[name]) {
      iqama[name] = iqamaData.fixed[name];
    } else if (iqamaData.minutes[name] != null && adhanTimings[name]) {
      iqama[name] = addMinutes(adhanTimings[name], iqamaData.minutes[name]);
    } else {
      iqama[name] = "";
    }
  }
  return iqama;
}

async function fetchTimings() {
  const [timesRes, iqamaRes] = await Promise.all([
    fetch(TIMES_URL, { mode: "cors" }),
    fetch(IQAMA_URL, { mode: "cors" }),
  ]);

  if (!timesRes.ok) throw new Error(`awqat times ${timesRes.status}`);
  if (!iqamaRes.ok) throw new Error(`awqat iqama ${iqamaRes.status}`);

  const timesText = await timesRes.text();
  const iqamaText = await iqamaRes.text();

  const adhan = parseTimesFile(timesText);
  if (!adhan) throw new Error("No times found for today");

  const iqamaData = parseIqamaFile(iqamaText);
  const iqama = computeIqamaTimes(adhan, iqamaData);

  const now = new Date();
  const gregorian = now.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return { adhan, iqama, gregorian };
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function format12h(hhmm) {
  if (!hhmm || !hhmm.includes(":")) return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function computeNext(adhan) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const name of SALAH_NAMES) {
    const t = adhan[name];
    if (!t) continue;
    if (toMinutes(t) > nowMin) {
      return { name, time: format12h(t) };
    }
  }
  return { name: "Fajr (tomorrow)", time: format12h(adhan.Fajr) || "—" };
}

function render(widget, { adhan, iqama, gregorian }) {
  const dateEl = widget.querySelector("[data-prayer-date]");
  if (dateEl) dateEl.textContent = gregorian || "";

  for (const name of PRAYER_NAMES) {
    const row = widget.querySelector(`[data-prayer="${name}"]`);
    if (!row) continue;
    const adhanEl = row.querySelector("[data-adhan]");
    const iqamaEl = row.querySelector("[data-iqama]");
    if (adhanEl) adhanEl.textContent = adhan[name] ? format12h(adhan[name]) : "—";
    if (iqamaEl) iqamaEl.textContent = iqama[name] ? format12h(iqama[name]) : "";
  }

  const next = computeNext(adhan);
  const nextEl = widget.querySelector("[data-prayer-next-time]");
  if (nextEl) nextEl.textContent = `${next.name} · ${next.time}`;
}

function showError(widget) {
  const err = widget.querySelector("[data-prayer-error]");
  if (err) err.hidden = false;
}

export async function initPrayerTimes() {
  const widget = document.querySelector("[data-prayer-widget]");
  if (!widget) return;

  const cached = readCache();
  if (cached) {
    render(widget, cached);
    return;
  }

  try {
    const data = await fetchTimings();
    writeCache(data);
    render(widget, data);
  } catch (err) {
    console.warn("Prayer times:", err);
    showError(widget);
  }
}
