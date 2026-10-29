// Upcoming-events renderer for the Events page.
// Data lives in /assets/data/events.json — a simple file the mosque can edit
// without touching markup. Each event may carry tickets: {platform, url}
// (SalamTix, Humanitix, etc.) and a "Get tickets" button renders automatically.

const DATA_URL = new URL("../data/events.json", import.meta.url);
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function esc(s) {
  const div = document.createElement("div");
  div.textContent = String(s == null ? "" : s);
  return div.innerHTML;
}

function todayKey() {
  // Melbourne "today" so events don't vanish early/late for remote visitors.
  const p = {};
  new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .forEach(({ type, value }) => {
      p[type] = value;
    });
  return `${p.year}-${p.month}-${p.day}`;
}

function dateBadge(ev) {
  if (ev.recurring === "weekly") {
    return `<div class="event-card__date" aria-hidden="true"><strong>&#9770;</strong><span>Weekly</span></div>`;
  }
  const [, m, d] = ev.date.split("-").map(Number);
  return `<div class="event-card__date" aria-hidden="true"><strong>${d}</strong><span>${MONTHS[m - 1]}</span></div>`;
}

function render(list, events) {
  if (!events.length) {
    list.innerHTML = `
      <div class="event-card event-card--empty">
        <div>
          <h3>No ticketed events right now</h3>
          <p style="max-width: 32rem; margin-inline: auto;">
            New events are announced on our socials first — follow
            <a href="https://facebook.com/virginmarymosque" rel="noreferrer" target="_blank">Facebook</a> and
            <a href="https://instagram.com/virginmarymosque" rel="noreferrer" target="_blank">Instagram</a>,
            or call the office on <a href="tel:+61380870900">(03) 8087 0900</a>.
          </p>
        </div>
      </div>`;
    return;
  }

  list.innerHTML = events
    .map((ev) => {
      const when = ev.recurring === "weekly" ? esc(ev.day) : esc(ev.dateLabel);
      const tickets = ev.tickets && ev.tickets.url
        ? `<div class="event-card__actions">
             <a class="btn btn--accent btn--sm" href="${esc(ev.tickets.url)}" rel="noreferrer" target="_blank">
               Get tickets${ev.tickets.platform ? ` on ${esc(ev.tickets.platform)}` : ""}
             </a>
           </div>`
        : "";
      return `
        <article class="event-card">
          ${dateBadge(ev)}
          <div class="event-card__body">
            <h3>${esc(ev.title)}</h3>
            <div class="event-card__meta">
              <span>${when}</span>
              ${ev.time ? `<span>${esc(ev.time)}</span>` : ""}
              ${ev.location ? `<span>${esc(ev.location)}</span>` : ""}
            </div>
            ${ev.description ? `<p>${esc(ev.description)}</p>` : ""}
            ${tickets}
          </div>
        </article>`;
    })
    .join("");
}

export async function initEvents() {
  const list = document.querySelector("[data-events-list]");
  if (!list) return;

  try {
    const res = await fetch(DATA_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`events.json ${res.status}`);
    const data = await res.json();
    const today = todayKey();

    const upcoming = (data.events || [])
      .filter((ev) => ev.recurring === "weekly" || (ev.date && ev.date >= today))
      .sort((a, b) => {
        if (a.recurring === "weekly") return 1; // dated events first
        if (b.recurring === "weekly") return -1;
        return a.date < b.date ? -1 : 1;
      })
      .map((ev) => ({
        ...ev,
        dateLabel: ev.date
          ? new Intl.DateTimeFormat("en-AU", {
              timeZone: "Australia/Melbourne",
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date(`${ev.date}T00:00:00+10:00`))
          : "",
      }));

    render(list, upcoming);
  } catch (err) {
    console.warn("Events:", err);
    render(list, []);
  }
}
