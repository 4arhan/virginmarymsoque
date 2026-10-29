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

## Logo & photography

- **Logo**: `assets/img/logo.png` (full colour, for light backgrounds — used in the
  header) and `assets/img/logo-reversed.png` (same artwork with the black lettering
  turned ivory, for dark backgrounds — used in the footer). If the mosque has an
  official reversed/white version, drop it in over `logo-reversed.png`.
- **Photos are placeholders.** Everything in `assets/img/photos/` shows *other*
  mosques around the world (from Unsplash, free to use), and each one is captioned or
  credited on the page so no one mistakes it for Masjid Maryam. Files are named by
  where they appear (`home-hero-1`, `hero-contact`, `card-nikah`…), so a real photo
  can replace a placeholder by saving over the same filename — see
  [`assets/img/photos/CREDITS.md`](assets/img/photos/CREDITS.md) for every slot, its
  size, and the credit to update.

## Updating

| What | Where |
|---|---|
| Iqamah / Jumu'ah fallback times | `assets/js/prayer-times.js` (top constants) |
| Yearly adhan data | `assets/js/times-data.js` (re-wrap from awqat.com.au) |
| Events | `assets/data/events.json` |
| Contact details | `partials/header.html` (top bar), `partials/footer.html`, `contact.html`, JSON-LD blocks |
| Photos | `assets/img/photos/` — see `CREDITS.md` |
| Homepage slideshow | `index.html` — the four `hero__slide` figures (photo + caption each) |
| Design system | `assets/css/styles.css` (tokens at the top; colours matched to the logo) |

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
