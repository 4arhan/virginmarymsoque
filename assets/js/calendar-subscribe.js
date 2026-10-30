// "Prayer times in your calendar": fills the subscribe buttons with links that
// open the feed in Google Calendar, Apple Calendar (webcal://) and Outlook,
// and copies the feed address for any other app.

import { PRODUCTION_ORIGIN, PRAYER_CALENDAR_PATH } from "./site-config.js";

const CALENDAR_NAME = "Masjid Maryam prayer times";

export function feedUrl(query = "") {
  return `${PRODUCTION_ORIGIN}${PRAYER_CALENDAR_PATH}${query}`;
}

export function subscribeLinks(query = "") {
  const url = feedUrl(query);
  const webcal = url.replace(/^https?:\/\//, "webcal://");
  return {
    url,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
    apple: webcal,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(url)}&name=${encodeURIComponent(CALENDAR_NAME)}`,
  };
}

export function initCalendarSubscribe() {
  document.querySelectorAll("[data-calendar-subscribe]").forEach((box) => {
    const links = subscribeLinks(box.dataset.query || "");
    box.querySelectorAll("[data-cal]").forEach((el) => {
      const kind = el.dataset.cal;
      if (links[kind]) el.href = links[kind];
    });
    box.querySelectorAll("[data-cal-url]").forEach((el) => {
      el.textContent = links.url;
    });
    const copy = box.querySelector('[data-cal="copy"]');
    const copied = box.querySelector("[data-cal-copied]");
    if (copy) {
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(links.url);
          if (copied) copied.hidden = false;
          copy.textContent = "Copied";
          setTimeout(() => {
            copy.textContent = "Copy calendar link";
          }, 2500);
        } catch {
          window.prompt("Copy this calendar address:", links.url);
        }
      });
    }
  });
}
