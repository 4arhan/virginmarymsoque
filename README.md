# Virgin Mary Mosque (Masjid Maryam)

Static website for the Virgin Mary Mosque, 143 Hogans Rd, Hoppers Crossing VIC 3029.
Plain HTML/CSS/JS — no build step. Deployed on Vercel.

## Prayer times — synced with awqat.com.au/vmm

1. **Instant render**: `assets/js/times-data.js` bundles the yearly adhan dataset
   (verbatim copy of the official display's `wtimes-AU.MELBOURNE.ini`, Melbourne
   local time, DST included). `assets/js/prayer-times.js` renders from it
   immediately, with the last-synced iqamah rules.
2. **Live sync**: `/api/prayer` (Vercel serverless, `api/prayer.js`) proxies
   awqat.com.au server-side (it sends no CORS headers) and refreshes adhan +
   iqamah on page load — mosque-side schedule changes appear without a redeploy.

## Events (SalamTix-ready)

`assets/data/events.json` drives the Events page (`news/events.html`).
Add an event:

```json
{
  "title": "Eid al-Adha Program",
  "date": "2026-05-27",
  "time": "8:00 AM",
  "location": "Virgin Mary Mosque",
  "description": "Takbeerat, salah and breakfast.",
  "tickets": { "platform": "SalamTix", "url": "https://..." }
}
```

Past events hide automatically; `"recurring": "weekly"` items (Jumu'ah) always
show; `tickets.url` renders a "Get tickets on <platform>" button — works with
SalamTix, Humanitix, or any platform.

## Updating

| What | Where |
|---|---|
| Iqamah / Jumu'ah fallback times | `assets/js/prayer-times.js` (top constants) |
| Yearly adhan data | `assets/js/times-data.js` (re-wrap from awqat.com.au) |
| Events | `assets/data/events.json` |
| Contact details | `partials/footer.html`, `contact.html`, JSON-LD blocks |
| Design system | `assets/css/styles.css` (tokens at the top) |

## Partners

- **IntroToIslam** — <https://introtoislam.org/> — free online Islamic courses;
  linked from the footer, homepage and learning pages.

## Local development

```
python -m http.server 8000
```

(The `/api/prayer` function only runs on Vercel; locally the site falls back to
the bundled dataset automatically.)

## Deploy

```
vercel deploy --prod
```
