// Prayer times via Aladhan API
// - Fetches by city/country, method = MWL (3) — appropriate default for AU
// - Caches today's response in localStorage keyed by date
// - Gracefully degrades (shows fallback notice) if offline or API errors
// - Computes "next prayer" locally so the highlight updates as the day progresses

const CACHE_KEY = "vmm.prayerTimes";
const API_URL =
  "https://api.aladhan.com/v1/timingsByCity?city=Melbourne&country=Australia&method=3";

const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayKey()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ date: todayKey(), ...payload }),
    );
  } catch {
    /* quota/blocked */
  }
}

async function fetchTimings() {
  const res = await fetch(API_URL, { mode: "cors" });
  if (!res.ok) throw new Error(`Aladhan ${res.status}`);
  const data = await res.json();
  if (!data || !data.data || !data.data.timings) throw new Error("Malformed response");
  const timings = {};
  PRAYERS.forEach((p) => {
    const raw = data.data.timings[p];
    if (raw) timings[p] = raw.slice(0, 5); // "05:31" from "05:31 (AEST)"
  });
  const gregorian = data.data.date && data.data.date.readable;
  const hijri =
    data.data.date && data.data.date.hijri
      ? `${data.data.date.hijri.day} ${data.data.date.hijri.month.en} ${data.data.date.hijri.year} AH`
      : "";
  return { timings, gregorian, hijri };
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function computeNext(timings) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const name of PRAYERS) {
    const t = timings[name];
    if (!t) continue;
    if (toMinutes(t) > nowMin) {
      return { name, time: t };
    }
  }
  // After Isha → next is tomorrow's Fajr
  return { name: "Fajr (tomorrow)", time: timings.Fajr || "—" };
}

function render(widget, { timings, gregorian, hijri }) {
  const dateEl = widget.querySelector("[data-prayer-date]");
  if (dateEl) dateEl.textContent = [gregorian, hijri].filter(Boolean).join(" · ");

  PRAYERS.forEach((name) => {
    const row = widget.querySelector(`[data-prayer="${name}"] .prayer-widget__time`);
    if (row) row.textContent = timings[name] || "—";
  });

  const next = computeNext(timings);
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
