// Vercel serverless function: the mosque's prayer times as a calendar feed
// (iCalendar) that Google Calendar, Apple Calendar and Outlook can subscribe
// to. Served at /prayer-times.ics (see vercel.json) and /api/prayer-calendar.
//
// One event per salah per day — Fajr, Dhuhr, Asr, Maghrib and Isha, lasting
// from the adhan to the iqamah — plus Jumu'ah on Fridays (which replaces the
// Friday Dhuhr event), from yesterday through the next 120 days. Adhan times
// come from the bundled yearly dataset (the display's own data); the iqamah
// rules are fetched live from awqat.com.au/vmm with the bundled rules as the
// fallback. Subscribed calendars re-fetch on their own schedule (Google:
// about once a day), so changes made at the mosque flow through by themselves.
//
// Options:
//   ?prayers=fajr,dhuhr,asr,maghrib,isha,jumuah   which events to include
//   ?days=90                                      how far ahead (7–366)
//   ?reminder=10                                  alarm N minutes before each
//                                                 event (Apple and Outlook
//                                                 honour it; Google ignores it)

import {
  SALAH_NAMES,
  JUMUAH_TIMES,
  timingsFor,
  computeIqamaTimes,
  format12h,
  melbourneParts,
  melbourneToUtc,
  addMinutes,
} from "../assets/js/prayer-core.js";
import { IQAMA_URL, parseIqama } from "./prayer.js";

const DEFAULT_DAYS = 120;
const LOCATION = "Virgin Mary Mosque (Masjid Maryam), 143 Hogans Rd, Hoppers Crossing VIC 3029, Australia";
const PAGE_URL = "https://virgin-mary-mosque.vercel.app/programs/prayers.html";
const UID_DOMAIN = "prayer-times.virginmarymosque.org.au";

const pad = (n) => String(n).padStart(2, "0");

function utcStamp(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

// iCalendar text: escape, then fold lines longer than 75 bytes (RFC 5545).
function escapeText(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function fold(line) {
  const out = [];
  let rest = line;
  while (Buffer.byteLength(rest, "utf8") > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut), "utf8") > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

async function liveIqamaRules() {
  try {
    const res = await fetch(IQAMA_URL, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const rules = parseIqama(await res.text());
    return Object.keys(rules.fixed).length || Object.keys(rules.offsetMinutes).length ? rules : null;
  } catch {
    return null;
  }
}

function buildEvent({ uid, start, end, summary, description, reminder, stamp }) {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}@${UID_DOMAIN}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(LOCATION)}`,
    `URL:${PAGE_URL}`,
    "CATEGORIES:Prayer",
    "TRANSP:TRANSPARENT",
  ];
  if (reminder) {
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `TRIGGER:-PT${reminder}M`, `DESCRIPTION:${escapeText(summary)}`, "END:VALARM");
  }
  lines.push("END:VEVENT");
  return lines;
}

export function buildCalendar({ prayers, days, reminder, iqamaRules, now = new Date() }) {
  const stamp = utcStamp(now.getTime());
  const today = melbourneParts(now);
  const fixed = iqamaRules ? iqamaRules.fixed : undefined;
  const offset = iqamaRules ? iqamaRules.offsetMinutes : undefined;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Virgin Mary Mosque//Prayer Times//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Masjid Maryam prayer times",
    `X-WR-CALDESC:${escapeText("Adhan and iqamah times at Virgin Mary Mosque (Masjid Maryam), Hoppers Crossing, in sync with awqat.com.au/vmm. Jumu'ah every Friday at 12:15, 1:15 and 2:15 PM.")}`,
    "X-WR-TIMEZONE:Australia/Melbourne",
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
  ];

  for (let i = -1; i < days; i++) {
    // Walk calendar days in UTC arithmetic; only the y/m/d matter.
    const d = new Date(Date.UTC(today.year, today.month - 1, today.day + i));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const friday = d.getUTCDay() === 5;
    const dateKey = `${year}-${pad(month)}-${pad(day)}`;
    const adhan = timingsFor(`${pad(month)}-${pad(day)}`);
    if (!adhan) continue;
    const iqama = computeIqamaTimes(adhan, fixed, offset);

    for (const name of SALAH_NAMES) {
      if (!prayers.has(name.toLowerCase()) || !adhan[name]) continue;
      if (friday && name === "Dhuhr" && prayers.has("jumuah")) continue;
      const startTime = adhan[name];
      const endTime = iqama[name] && iqama[name] > startTime ? iqama[name] : addMinutes(startTime, 15);
      const summary = iqama[name] ? `${name} (iqamah ${format12h(iqama[name])})` : name;
      const description = [
        `Adhan ${format12h(startTime)}${iqama[name] ? ` - Iqamah ${format12h(iqama[name])}` : ""}`,
        "Virgin Mary Mosque (Masjid Maryam), 143 Hogans Rd, Hoppers Crossing",
        "Times in sync with awqat.com.au/vmm",
      ].join("\n");
      lines.push(
        ...buildEvent({
          uid: `${dateKey}-${name.toLowerCase()}`,
          start: melbourneToUtc(year, month, day, startTime),
          end: melbourneToUtc(year, month, day, endTime),
          summary,
          description,
          reminder,
          stamp,
        }),
      );
    }

    if (friday && prayers.has("jumuah")) {
      const times = JUMUAH_TIMES.map(format12h);
      lines.push(
        ...buildEvent({
          uid: `${dateKey}-jumuah`,
          start: melbourneToUtc(year, month, day, JUMUAH_TIMES[0]),
          end: melbourneToUtc(year, month, day, addMinutes(JUMUAH_TIMES[JUMUAH_TIMES.length - 1], 30)),
          summary: `Jumu'ah (${times.join(", ")})`,
          description: [
            `Three congregations: ${times.join(", ")}. Khutbahs in Arabic and English.`,
            "Virgin Mary Mosque (Masjid Maryam), 143 Hogans Rd, Hoppers Crossing",
          ].join("\n"),
          reminder,
          stamp,
        }),
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function readOptions(url) {
  const all = ["fajr", "dhuhr", "asr", "maghrib", "isha", "jumuah"];
  const wanted = (url.searchParams.get("prayers") || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => all.includes(s));
  const days = Math.min(366, Math.max(7, Number(url.searchParams.get("days")) || DEFAULT_DAYS));
  const reminderRaw = Number(url.searchParams.get("reminder"));
  const reminder = Number.isFinite(reminderRaw) && reminderRaw > 0 ? Math.min(120, Math.round(reminderRaw)) : 0;
  return { prayers: new Set(wanted.length ? wanted : all), days, reminder };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }
  const url = new URL(req.url || "/", "http://localhost");
  const options = readOptions(url);
  const iqamaRules = await liveIqamaRules();
  const body = buildCalendar({ ...options, iqamaRules });

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'inline; filename="masjid-maryam-prayer-times.ics"');
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
  return res.status(200).send(body);
}
