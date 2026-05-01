# Virgin Mary Mosque (Masjid Maryam) — Website

The public website for the Virgin Mary Mosque, Melbourne.

- **Stack:** plain HTML5, CSS (design tokens), vanilla JS (ES modules) — no build step.
- **Hosting:** Cloudflare Pages (Sydney edge, Australian-based caching, free SSL).
- **CMS (Phase 1):** edit HTML directly. Phase 2 will layer in Decap CMS without changing the page layout.

## Local development

You can preview the site locally with any static server. One of the simpler ways:

```bash
# from the project root
npx http-server . -p 8080 -s
# then open http://localhost:8080
```

Or with Python:

```bash
python3 -m http.server 8080
```

> **Note:** opening the `.html` files directly via `file://` will not work because the page
> `fetch`es shared partials (`/partials/header.html`, `/partials/footer.html`,
> `/partials/prayer-widget.html`). Use an HTTP server.

## Project structure

```
/                         homepage
/about/                   About, Why Maryam, Team, History
/programs/                Prayer, Classes, Youth, Women, New-Muslim, Nikah, Janazah, Counselling
/interfaith/              Interfaith index, Maryam in Islam, Dialogue, Visiting
/news/                    News, Events, Gallery
/knowledge/               Knowledge Hub index, Resources, New to Islam, Khutbah Archive
/get-involved/            Donate, Volunteer, Membership
/contact.html             Contact
/dark-site.html           Crisis-mode template (deploy-swap)
/404.html                 Not-found page
/assets/                  CSS (tokens/base/layout/components), JS, images, fonts
/partials/                Shared header/footer/prayer widget, injected at runtime
/.github/workflows/       CI (checks) and CD (deploy to Cloudflare Pages)
```

## Editing content (for mosque staff)

### Changing prayer times

Prayer times are pulled from [awqat.com.au](https://awqat.com.au/vmm/) — the same
source used by the mosque's physical display screens. Two files are fetched:

1. **Yearly adhan times:** `https://awqat.com.au/www/data/wtimes-AU.MELBOURNE.ini`
2. **Iqama times:** `https://awqat.com.au/vmm/iqamafixed.js`

Both adhan and iqama are shown side by side in the prayer widget. The iqama file
contains either fixed times (e.g. Fajr iqama at 6:00) or a minutes-after-adhan
offset (e.g. Dhuhr iqama = adhan + 10 min). To change iqama times, update the
`iqamafixed.js` file on the awqat dashboard.

Times are cached in the visitor's browser for the day to reduce requests.

### Adding a news item

Open `/news/index.html` and duplicate one of the existing `<article class="card">` blocks.
Keep entries in reverse-chronological order.

### Adding an event

Open `/news/events.html` and duplicate a `<article class="timeline__item">` block. Date
on the left, title and description on the right.

### Adding a khutbah

Open `/knowledge/khutbah-archive.html` and duplicate an existing card. Link the audio
file (host on a free service like Anchor / SoundCloud, or upload to the Cloudflare Pages
deployment under `/assets/audio/`) and the PDF.

### Changing the contact address / opening hours / phone

Three files hold this:

1. `partials/footer.html` — visible in the footer on every page
2. `contact.html` — full contact section and JSON-LD schema
3. `index.html` — JSON-LD schema on the homepage

Keep them consistent or staff phone numbers may be out of date somewhere.

### Swapping to the dark site (crisis mode)

The dark site is the plain-text statement page used during a crisis.

1. Update `/dark-site.html` with the current approved statement, timeline, and links.
2. Run the **Deploy to Cloudflare Pages** workflow manually from the Actions tab with
   **`dark_site = true`**. The workflow will rename `index.html` aside and deploy
   `dark-site.html` in its place.
3. When the crisis has passed, run the workflow again with **`dark_site = false`** to
   restore the full site.

### Updating the newsletter

The Mailchimp endpoint lives in `partials/footer.html`. Replace the `action=` URL and
the hidden `b_…` honeypot name with the values from your Mailchimp embedded form.

### Updating donation links

Stripe Payment Links are on `/get-involved/donate.html` and the homepage. Replace
`https://donate.stripe.com/REPLACE_*` with the real Payment Link URLs from Stripe.

### Updating contact/volunteer/membership form delivery

The three forms use Formspree so submissions go to Microsoft 365:

- `/contact.html` — `REPLACE_CONTACT`
- `/get-involved/volunteer.html` — `REPLACE` (volunteer)
- `/get-involved/membership.html` — `REPLACE_MEMBERSHIP`

In Formspree, point each form to the relevant Microsoft 365 mailbox and enable spam
filtering. The built-in honeypot catches most automated submissions.

## Accessibility

The site aims for WCAG 2.1 AA:

- Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`), skip links, keyboard focus rings.
- A11y toolbar (bottom-right gear button) for text size, high contrast, and a dyslexic-friendly font.
- `prefers-reduced-motion` respected.
- Colour contrast enforced in `assets/css/tokens.css`.

Please avoid:

- Using colour alone to convey meaning.
- Using images of text in place of HTML text.
- Adding auto-playing media.

## Security

- Cloudflare Pages provides free SSL, HSTS, and WAF (set in the Cloudflare dashboard).
- DMARC/SPF/DKIM are configured on the Microsoft 365 DNS records (outside this repo).
- The Janazah and pastoral-care phone numbers are the **only** direct numbers on the
  public site; all other enquiries route through Formspree to M365.

## CI/CD

- Every PR runs `html-validate`, `stylelint`, Pa11y (WCAG AA) and Lighthouse CI.
- Every push to `main` deploys to Cloudflare Pages.
- Manual dark-site deployment is available via `workflow_dispatch`.

## License

Content (text, images): © Virgin Mary Mosque. All rights reserved.
Code (HTML/CSS/JS): MIT-licensed — reuse is welcome.
