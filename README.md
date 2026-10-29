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

## Navigation

The header, menus and phone tab bar live in `partials/header.html` (behaviour in
`assets/js/nav.js`). To add a page to the menu, add a `site-nav__sublink` item to the
right dropdown — it appears in the desktop dropdown and in the phone menu's accordion
automatically. The top bar, the phone menu card and the tab bar's centre button show
the next prayer live (from `prayer-times.js`; any element with `data-next-prayer-name`,
`-time`, `-in` or `-short` is filled in).

## Icons & components

Icons are one sprite, `assets/img/icons.svg`:

```html
<svg class="icon" aria-hidden="true"><use href="../assets/img/icons.svg#i-mosque"/></svg>
```

Building blocks in `styles.css` (search for the class): `section-head`, `card` with
`card__icon`, `photo-grid` + `photo-card`, `stats`/`stat`, `steps`/`step`,
`info-cards`/`info-card`, `media-frame` (`--arch`), `verse-card`, `feature-list`,
`chips`/`chip`, `callout`, `support-band` (the "More support · Ask ICV" panel),
`card--topic` (compact icon-and-title link card), `stats--3` (three numbers on one
row), `prompt-tiles--4`, and `scroller` (turns a card grid into a swipeable row on
phones). Plain `<ul>`/`<ol>` lists in page content get gold star bullets automatically.

## Support & ICV

`programs/support.html` lists all 13 topics of the Islamic Council of Victoria's
**Ask ICV** service finder (<https://www.icv.org.au/askicv>), plus urgent numbers and
ICV's Islamophobia support. Relevant program pages end with a `support-band` linking
their matching Ask ICV topics. If ICV renames a topic, update the links there.

## Online donations (Stripe)

`get-involved/donate.html` lets donors pick an appeal (Gaza Emergency Appeal, Global
Emergencies, Masjid Fund, Zakat, Sadaqah Jariyah, Food & Welfare, Classes & Youth),
one-off or monthly, and an amount, then sends them to **Stripe Checkout** through the
Vercel function `api/donate.js`. Card details are entered on Stripe's page, never on
this site. The page also has a zakat calculator. After paying, donors land on
`get-involved/thank-you.html`.

**Switching it on**

1. Sign in to (or create) the mosque's Stripe account at <https://dashboard.stripe.com>.
2. Developers → API keys → copy the **Secret key** (`sk_live_…`). To try it first,
   switch on Test mode and copy the test key (`sk_test_…`).
3. Vercel → project `virgin-mary-mosque` → Settings → Environment Variables → add
   `STRIPE_SECRET_KEY` with that key, then redeploy (`vercel deploy --prod`).
4. Stripe → Settings → Customer emails → turn on emails for **successful payments**,
   so donors receive the receipt the page promises.
5. Optional: set `SITE_URL` (e.g. `https://www.virginmarymosque.org.au`) if the site
   moves to its own domain — it's where Stripe sends donors back to.

In Test mode, pay with card `4242 4242 4242 4242`, any future expiry and any CVC.
Until the key is set, the page still works: it says online giving opens soon and
offers an email to the office pre-filled with the donor's choice.

**Seeing donations by appeal.** Every payment carries the appeal in its metadata
(`appeal`: `gaza`, `zakat`, …) and as its product name. One-off gifts are under
Payments, monthly gifts under Subscriptions (cancel one there if a donor asks). An
optional "On behalf of" field at checkout records gifts made for someone else.

**Adding or changing an appeal.** Edit `assets/js/appeals.js` (the server only accepts
appeals listed there) *and* the matching card in the `appeal-picker` on
`donate.html`. The appeal marked `featured: true` is selected by default. Minimum and
maximum amounts and the preset amounts are set at the top of `appeals.js`.

Before launch, confirm the appeal wording with the masjid — in particular how the
Gaza and Global Emergencies appeals are distributed — and check whether Stripe
offers the mosque discounted pricing as a registered charity.

## Icons & share preview

`assets/img/favicon.svg` (browser tab), `apple-touch-icon.png` and `icon-*.png`
(home-screen icons, listed in `site.webmanifest`), and `og-image.jpg` (the preview
shown when a link is shared on WhatsApp, Facebook, etc.). The `og:image` tags use the
absolute URL `https://virgin-mary-mosque.vercel.app/assets/img/og-image.jpg` —
update it if the site moves to its own domain.

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

Links inside pages are **relative** (`../assets/...`, `../about/`), so the site
works both at a domain root (Vercel) and in a sub-folder — e.g. the GitHub Pages
preview at <https://4arhan.github.io/virginmarymsoque/>. Keep new page links
relative. The shared `partials/` files may use root links (`/about/`); `main.js`
rewrites them to the site root when it loads them. `404.html` keeps root links on
purpose, because Vercel serves it at any URL depth.

## Deploy

Live at <https://virgin-mary-mosque.vercel.app> (Vercel project
`virgin-mary-mosque`). From the repository root:

```
vercel deploy --prod
```

`vercel.json` serves files exactly as linked (no clean-URL redirects) and makes
browsers revalidate CSS, JS, data and partials on each visit, so updates show up
immediately. To deploy on every push instead, connect the GitHub repository to the
project in the Vercel dashboard (production follows `main`).
