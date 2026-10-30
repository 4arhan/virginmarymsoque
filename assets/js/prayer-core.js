// Prayer-time calculations shared by the browser (prayer-times.js) and the
// serverless functions (api/prayer-calendar.js). No DOM, no fetch.
//
// Times are "HH:MM" strings in Melbourne local time, as in the mosque's
// display at https://awqat.com.au/vmm/ (TAWKIT).
//
// IQAMA_FIXED / IQAMA_OFFSET are the fallback iqamah rules, last synced
// 2026-10-30 from https://awqat.com.au/vmm/iqamafixed.js. The live rules
// from that file take precedence whenever they can be fetched.

import { YEARLY_TIMES } from "./times-data.js";

export const TZ = "Australia/Melbourne";
export const PRAYER_NAMES = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
export const SALAH_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
export const JUMUAH_TIMES = ["12:15", "13:15", "14:15"];

export const IQAMA_FIXED = { Fajr: "05:15", Dhuhr: "13:45", Asr: "17:15" };
export const IQAMA_OFFSET = { Dhuhr: 10, Asr: 10, Maghrib: 5, Isha: 5 }; // minutes after adhan

// Adhan times for a "MM-DD" key from the bundled yearly dataset.
export function timingsFor(key) {
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

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function addMinutes(hhmm, mins) {
  const total = toMinutes(hhmm) + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Iqamah for each salah: a fixed time where the rules give one, otherwise
// adhan + offset. A fixed time that can't be right for the day (before the
// adhan, or Fajr after sunrise — the rules are seasonal and may be stale)
// falls back to the offset, or to no iqamah at all rather than a wrong one.
export function computeIqamaTimes(adhan, fixed = IQAMA_FIXED, offset = IQAMA_OFFSET) {
  const iqama = {};
  for (const name of SALAH_NAMES) {
    const start = adhan[name];
    const fixedTime = fixed[name];
    const plausible =
      fixedTime &&
      start &&
      toMinutes(fixedTime) >= toMinutes(start) &&
      !(name === "Fajr" && adhan.Sunrise && toMinutes(fixedTime) >= toMinutes(adhan.Sunrise));
    if (plausible) {
      iqama[name] = fixedTime;
    } else if (offset[name] != null && start) {
      iqama[name] = addMinutes(start, offset[name]);
    } else {
      iqama[name] = "";
    }
  }
  return iqama;
}

export function format12h(hhmm) {
  if (!hhmm || !hhmm.includes(":")) return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Parts of a Date in Melbourne time, regardless of the local timezone.
export function melbourneParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ,
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const p = {};
  for (const { type, value } of parts) p[type] = value;
  return {
    key: `${p.month}-${p.day}`,
    date: `${p.year}-${p.month}-${p.day}`,
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    weekday: p.weekday,
    minutes: (Number(p.hour) % 24) * 60 + Number(p.minute),
  };
}

// Offset of `tz` from UTC, in minutes, at the instant `ts` (ms since epoch).
function tzOffsetMinutes(ts, tz) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ts));
  const p = {};
  for (const { type, value } of parts) p[type] = value;
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second));
  return (asUtc - ts) / 60000;
}

// The instant (ms since epoch) of a Melbourne local date and "HH:MM" time,
// daylight saving included.
export function melbourneToUtc(year, month, day, hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, day, h, m);
  let utc = guess - tzOffsetMinutes(guess, TZ) * 60000;
  const check = tzOffsetMinutes(utc, TZ);
  if (guess - check * 60000 !== utc) utc = guess - check * 60000;
  return utc;
}
