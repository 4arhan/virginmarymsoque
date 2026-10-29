// Prayer times for Virgin Mary Mosque — in sync with the mosque's official
// display at https://awqat.com.au/vmm/ (TAWKIT).
//
// Rendering strategy:
//   1. Instant paint from the bundled yearly dataset in ./times-data.js
//      (verbatim copy of the display's wtimes-AU.MELBOURNE.ini, Melbourne
//      local time, DST included) + last-synced iqamah rules below.
//   2. Then /api/prayer (a serverless proxy for awqat.com.au, which sends no
//      CORS headers) refreshes adhan + iqamah live, so mosque-side schedule
//      changes appear without a redeploy. If the API is unreachable (e.g.
//      local preview), the bundled data stands.
//
// IQAMA_FIXED / IQAMA_OFFSET last synced 2026-07-17 from
// https://awqat.com.au/vmm/iqamafixed.js.

import { YEARLY_TIMES } from "./times-data.js";

const TZ = "Australia/Melbourne";
const API_URL = new URL("../../api/prayer", import.meta.url);

const IQAMA_FIXED = { Fajr: "06:30", Dhuhr: "12:45", Asr: "15:30", Isha: "19:30" };
const IQAMA_OFFSET = { Maghrib: 5 }; // minutes after adhan

const PRAYER_NAMES = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
const SALAH_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

// "Now" in Melbourne, regardless of the visitor's timezone.
function melbourneNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ,
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const p = {};
  for (const { type, value } of parts) p[type] = value;
  return {
    key: `${p.month}-${p.day}`,
    minutes: (Number(p.hour) % 24) * 60 + Number(p.minute),
  };
}

function timingsFor(key) {
  const line = YEARLY_TIMES.find((row) => row.startsWith(key));
  if (!line) return null;
  const parts = line.split("~~~~~")[1].split("|");
  if (parts.length < 6) return null;
  const timings = {};
  PRAYER_NAMES.forEach((name, i) => {
    timings[name] = parts[i];
  });
  return timings;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function addMinutes(hhmm, mins) {
  const total = toMinutes(hhmm) + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function computeIqamaTimes(adhan, fixed = IQAMA_FIXED, offset = IQAMA_OFFSET) {
  const iqama = {};
  for (const name of SALAH_NAMES) {
    if (fixed[name]) {
      iqama[name] = fixed[name];
    } else if (offset[name] != null && adhan[name]) {
      iqama[name] = addMinutes(adhan[name], offset[name]);
    } else {
      iqama[name] = "";
    }
  }
  return iqama;
}

function format12h(hhmm) {
  if (!hhmm || !hhmm.includes(":")) return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Next salah after `nowMinutes`; after Isha it is tomorrow's Fajr.
function computeNext(adhan, nowMinutes) {
  for (const name of SALAH_NAMES) {
    const t = adhan[name];
    if (t && toMinutes(t) > nowMinutes) {
      return { name, hhmm: t, minutes: toMinutes(t) - nowMinutes, tomorrow: false };
    }
  }
  const tomorrow = timingsFor(melbourneNow(new Date(Date.now() + 86_400_000)).key) || adhan;
  return {
    name: "Fajr",
    hhmm: tomorrow.Fajr,
    minutes: 1440 - nowMinutes + toMinutes(tomorrow.Fajr),
    tomorrow: true,
  };
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// "4:53 PM" -> "4:53" for tight spaces such as the mobile tab bar.
function shortTime(hhmm) {
  return format12h(hhmm).replace(/\s?[AP]M$/, "");
}

function melbourneDates() {
  const now = new Date();
  const gregorian = new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  let hijri = "";
  try {
    hijri = new Intl.DateTimeFormat("en-AU-u-ca-islamic-umalqura", {
      timeZone: TZ,
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);
  } catch {
    /* older browsers: skip hijri */
  }
  return { gregorian, hijri };
}

// Live data from /api/prayer once it arrives; null until then.
let live = null;

function todayState() {
  const now = melbourneNow();
  if (live && live.date === now.key) {
    const adhan = live.adhan;
    return { now, adhan, iqama: computeIqamaTimes(adhan, live.iqama.fixed, live.iqama.offsetMinutes) };
  }
  const adhan = timingsFor(now.key);
  if (!adhan) return null;
  return { now, adhan, iqama: computeIqamaTimes(adhan) };
}

// Fill every next-prayer hook on the page (top bar, mobile menu, tab bar).
function renderNextPrayer() {
  const state = todayState();
  if (!state) return;
  const next = computeNext(state.adhan, state.now.minutes);
  const set = (attr, text) => document.querySelectorAll(`[${attr}]`).forEach((el) => { el.textContent = text; });
  set("data-next-prayer-name", next.name);
  set("data-next-prayer-time", format12h(next.hhmm));
  set("data-next-prayer-in", next.tomorrow ? "tomorrow" : `in ${formatDuration(next.minutes)}`);
  set("data-next-prayer-short", `${next.name} ${shortTime(next.hhmm)}`);
  document.querySelectorAll("[data-next-prayer]").forEach((el) => { el.hidden = false; });
}

function render(widget) {
  const state = todayState();
  if (!state) return false;
  const { now, adhan, iqama } = state;
  const { gregorian, hijri } = melbourneDates();

  const dateEl = widget.querySelector("[data-prayer-date]");
  if (dateEl) dateEl.textContent = hijri ? `${gregorian} · ${hijri}` : gregorian;

  for (const name of PRAYER_NAMES) {
    const row = widget.querySelector(`[data-prayer="${name}"]`);
    if (!row) continue;
    const adhanEl = row.querySelector("[data-adhan]");
    const iqamaEl = row.querySelector("[data-iqama]");
    if (adhanEl) adhanEl.textContent = adhan[name] ? format12h(adhan[name]) : "—";
    if (iqamaEl) iqamaEl.textContent = iqama[name] ? format12h(iqama[name]) : "";
  }

  const next = computeNext(adhan, now.minutes);
  const nextEl = widget.querySelector("[data-prayer-next-time]");
  if (nextEl) nextEl.textContent = `${next.name}${next.tomorrow ? " (tomorrow)" : ""} · ${format12h(next.hhmm)}`;
  widget.querySelectorAll("[data-prayer]").forEach((row) => {
    row.classList.toggle("is-next", !next.tomorrow && row.dataset.prayer === next.name);
  });
  return true;
}

async function syncLive(widget) {
  try {
    const res = await fetch(API_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.adhan && data.iqama) {
      live = data;
      render(widget);
      renderNextPrayer();
    }
  } catch {
    /* offline or local preview — bundled data stands */
  }
}

export function initPrayerTimes() {
  renderNextPrayer();
  setInterval(renderNextPrayer, 30_000);

  const widget = document.querySelector("[data-prayer-widget]");
  if (!widget) return;

  if (!render(widget)) {
    const err = widget.querySelector("[data-prayer-error]");
    if (err) err.hidden = false;
  }
  syncLive(widget);
  // Keep the "next prayer" line fresh; re-check the live feed hourly.
  setInterval(() => render(widget), 60_000);
  setInterval(() => syncLive(widget), 3_600_000);
}
