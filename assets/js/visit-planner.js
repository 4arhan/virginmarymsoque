// "Plan your visit": four quick questions, then a personal checklist for the
// visit with an email to the office pre-filled from the answers and, for a
// Friday visit, the next Jumu'ah ready to add to a calendar. Everything runs in
// the browser; the facts come from the visiting pages.

import { JUMUAH_TIMES, melbourneParts, melbourneToUtc, format12h } from "./prayer-core.js";
import { OFFICE_EMAIL, OFFICE_PHONE, OFFICE_TEL } from "./site-config.js";

const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Virgin+Mary+Mosque+143+Hogans+Rd+Hoppers+Crossing+VIC+3029";

const STEPS = [
  {
    key: "who",
    title: "Who’s coming?",
    options: [
      ["solo", "Just me"],
      ["family", "Family or friends"],
      ["group", "A school or community group"],
    ],
  },
  {
    key: "first",
    title: "Have you been inside a mosque before?",
    options: [
      ["yes", "Yes"],
      ["no", "No — this is my first time"],
    ],
  },
  {
    key: "when",
    title: "When would you like to come?",
    options: [
      ["friday", "Friday, for Jumu’ah"],
      ["weekday", "Another day"],
      ["unsure", "I’m not sure yet"],
    ],
  },
  {
    key: "needs",
    title: "Anything else we should know?",
    hint: "Choose any that apply, or skip.",
    multi: true,
    options: [
      ["tour", "I’d like a guided tour"],
      ["woman", "I’m a woman — where do I go?"],
      ["access", "I have access needs"],
      ["questions", "I have questions about Islam"],
      ["watch", "I’d like to watch a prayer"],
    ],
  },
];

// The checklist, built from the answers. `root` makes the links work from any folder.
function buildPlan(answers, root) {
  const needs = new Set(answers.needs || []);
  const items = [];
  const add = (icon, title, html) => items.push({ icon, title, html });

  if (answers.when === "friday") {
    add(
      "i-kaaba",
      "Friday is Jumu’ah",
      `Three congregations: <strong>12:15 PM, 1:15 PM and 2:15 PM</strong>, with the khutbah in Arabic and English. It is the busiest time of the week, so arrive 15 minutes early for parking. The prayer itself is short — usually 5–10 minutes after the khutbah.`,
    );
  } else if (answers.when === "weekday") {
    add(
      "i-calendar",
      "A quieter visit",
      `Outside prayer times the masjid is calm and someone can show you around. Call <a href="tel:${OFFICE_TEL}">${OFFICE_PHONE}</a> or email the office to arrange a time.`,
    );
  } else {
    add(
      "i-calendar",
      "Choosing a time",
      `Friday afternoons around Jumu’ah (12:15, 1:15 and 2:15 PM) are lively; other days are quieter and better for a look around. Tell the office what suits you and they will suggest a time.`,
    );
  }

  if (answers.who === "group") {
    add(
      "i-users",
      "Book your group in",
      `Please book ahead so we can look after your group properly. A typical visit includes a walk through the prayer hall, a short introduction to what Muslims believe and how we pray, and open Q&amp;A. Let us know the group size and age range.`,
    );
  } else if (answers.who === "family") {
    add("i-users", "Coming with others", `Everyone is welcome. Let the office know roughly how many to expect so someone can meet you at the door.`);
  }

  if (answers.first === "no") {
    add(
      "i-door",
      "Your first time inside a mosque",
      `Come as you are. A member of the community will meet you at the main entrance, and there is no pressure to take part in anything. Ask about whatever you like — the building, the prayer, Islam itself.`,
    );
  }

  add(
    "i-id",
    "What to wear",
    `Dress modestly — long trousers or a long skirt, and a shirt that covers the shoulders. Women are asked to cover their hair with a scarf inside the prayer hall; a simple scarf is fine, and you can borrow one.`,
  );
  add("i-home", "Shoes off at the door", `Everyone removes their shoes before entering the carpeted prayer areas. Shoe racks are provided.`);

  if (needs.has("woman")) {
    add(
      "i-flower",
      "Where women pray and enter",
      `A dedicated women’s prayer section is available. Ask at the main entrance and someone will point the way.`,
    );
  }
  if (needs.has("watch")) {
    add(
      "i-kaaba",
      "Watching a prayer",
      `You are welcome to sit quietly at the back of the hall and watch respectfully. Islamic prayer involves standing, bowing and prostrating before Allah; it is led by the Imam and takes about 5–10 minutes.`,
    );
  }
  if (needs.has("tour")) {
    add("i-compass", "A guided first visit", `Contact the office in advance and we will arrange a time for someone to walk you through the masjid.`);
  }
  if (needs.has("questions")) {
    add(
      "i-question",
      "Bring your questions",
      `No question is too simple or too hard. See <a href="${root}interfaith/dialogue.html">Ask us about Islam</a>, or learn at your own pace with free courses from our partner <a href="https://introtoislam.org/" target="_blank" rel="noreferrer">IntroToIslam</a>.`,
    );
  }
  if (needs.has("access")) {
    add(
      "i-access",
      "Access needs",
      `Please call <a href="tel:${OFFICE_TEL}">${OFFICE_PHONE}</a> before you travel so we can help with parking, entry and seating.`,
    );
  }

  add(
    "i-pin",
    "Getting here",
    `143 Hogans Rd, Hoppers Crossing VIC 3029 — <a href="${MAPS_URL}" target="_blank" rel="noreferrer">directions on Google Maps</a>.`,
  );
  return items;
}

function label(step, value) {
  const option = step.options.find(([v]) => v === value);
  return option ? option[1] : value;
}

function emailLink(answers) {
  const who = label(STEPS[0], answers.who);
  const first = answers.first === "no" ? "First visit to a mosque" : "Has visited a mosque before";
  const when = label(STEPS[2], answers.when);
  const needs = (answers.needs || []).map((v) => label(STEPS[3], v)).join("; ") || "None";
  const body = [
    "Salaam,",
    "",
    "I would like to visit Virgin Mary Mosque.",
    `Who: ${who}`,
    `Experience: ${first}`,
    `When: ${when}`,
    `Notes: ${needs}`,
    "Preferred date and time: ",
    "",
    "Thank you.",
  ].join("\n");
  return `mailto:${OFFICE_EMAIL}?subject=${encodeURIComponent("Visit request")}&body=${encodeURIComponent(body)}`;
}

// The next Friday in Melbourne (today if it is Friday).
function nextFriday() {
  const now = melbourneParts();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const ahead = (5 - days.indexOf(now.weekday) + 7) % 7;
  const d = new Date(Date.UTC(now.year, now.month - 1, now.day + ahead));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

const pad = (n) => String(n).padStart(2, "0");
const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function jumuahLinks() {
  const { year, month, day } = nextFriday();
  const start = melbourneToUtc(year, month, day, JUMUAH_TIMES[0]);
  const end = melbourneToUtc(year, month, day, "15:00");
  const title = "Jumu'ah at Virgin Mary Mosque";
  const details = `Three congregations: ${JUMUAH_TIMES.map(format12h).join(", ")}. Khutbahs in Arabic and English.`;
  const location = "Virgin Mary Mosque, 143 Hogans Rd, Hoppers Crossing VIC 3029";
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${stamp(start)}/${stamp(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Virgin Mary Mosque//Visit//EN",
    "BEGIN:VEVENT",
    `UID:jumuah-${year}${pad(month)}${pad(day)}@virginmarymosque.org.au`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${details}`,
    `LOCATION:${location.replace(/,/g, "\\,")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const file = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  const date = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return { google, file, date };
}

function iconSvg(name, root) {
  return `<svg class="icon" aria-hidden="true"><use href="${root}assets/img/icons.svg#${name}"/></svg>`;
}

export function initVisitPlanner(root) {
  const host = document.querySelector("[data-visit-planner]");
  if (!host) return;
  const answers = {};
  let index = 0;

  function renderStep() {
    const step = STEPS[index];
    const chosen = answers[step.key];
    host.innerHTML = `
      <div class="planner__progress" aria-hidden="true">${STEPS.map((_, i) => `<span class="${i <= index ? "is-done" : ""}"></span>`).join("")}</div>
      <p class="planner__count">Question ${index + 1} of ${STEPS.length}</p>
      <fieldset class="planner__step">
        <legend class="planner__question">${step.title}</legend>
        ${step.hint ? `<p class="planner__hint">${step.hint}</p>` : ""}
        <div class="planner__options">
          ${step.options
            .map(([value, text]) => {
              const checked = step.multi ? (chosen || []).includes(value) : chosen === value;
              return `<label class="planner__option"><input type="${step.multi ? "checkbox" : "radio"}" name="${step.key}" value="${value}"${checked ? " checked" : ""}><span>${text}</span></label>`;
            })
            .join("")}
        </div>
      </fieldset>
      <div class="planner__nav">
        ${index > 0 ? '<button class="btn btn--ghost btn--sm" type="button" data-planner-back>Back</button>' : ""}
        <button class="btn btn--primary" type="button" data-planner-next>${index === STEPS.length - 1 ? "Show my plan" : "Next"}</button>
      </div>
    `;
    const next = host.querySelector("[data-planner-next]");
    const inputs = [...host.querySelectorAll("input")];
    if (!step.multi) {
      next.disabled = !chosen;
      inputs.forEach((input) =>
        input.addEventListener("change", () => {
          answers[step.key] = input.value;
          next.disabled = false;
        }),
      );
    } else {
      inputs.forEach((input) =>
        input.addEventListener("change", () => {
          answers[step.key] = inputs.filter((i) => i.checked).map((i) => i.value);
        }),
      );
    }
    next.addEventListener("click", () => {
      if (!step.multi && !answers[step.key]) return;
      if (index === STEPS.length - 1) renderPlan();
      else {
        index += 1;
        renderStep();
        focusFirst();
      }
    });
    host.querySelector("[data-planner-back]")?.addEventListener("click", () => {
      index -= 1;
      renderStep();
      focusFirst();
    });
  }

  function focusFirst() {
    const target = host.querySelector(".planner__question");
    if (target) {
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  }

  function renderPlan() {
    const items = buildPlan(answers, root);
    const friday = answers.when === "friday" ? jumuahLinks() : null;
    host.innerHTML = `
      <div class="planner__result">
        <p class="section__eyebrow">Your visit, planned</p>
        <h3 class="planner__title">Here’s what to expect</h3>
        <ol class="planner__list">
          ${items
            .map(
              (item) => `<li><span class="planner__icon">${iconSvg(item.icon, root)}</span><div><strong>${item.title}</strong><p>${item.html}</p></div></li>`,
            )
            .join("")}
        </ol>
        ${
          friday
            ? `<div class="planner__calendar"><strong>Next Jumu’ah: ${friday.date}</strong>
                 <a class="btn btn--ghost btn--sm" href="${friday.google}" target="_blank" rel="noreferrer">${iconSvg("i-calendar-plus", root)} Google Calendar</a>
                 <a class="btn btn--ghost btn--sm" href="${friday.file}" download="jumuah-virgin-mary-mosque.ics">${iconSvg("i-download", root)} Apple / Outlook (.ics)</a></div>`
            : ""
        }
        <div class="planner__actions">
          <a class="btn btn--accent" href="${emailLink(answers)}">Email this plan to the office</a>
          <a class="btn btn--ghost" href="tel:${OFFICE_TEL}">Call ${OFFICE_PHONE}</a>
          <button class="btn btn--ghost btn--sm" type="button" data-planner-restart>Start again</button>
        </div>
      </div>
    `;
    host.querySelector("[data-planner-restart]").addEventListener("click", () => {
      index = 0;
      renderStep();
      focusFirst();
    });
    const title = host.querySelector(".planner__title");
    title.setAttribute("tabindex", "-1");
    title.focus({ preventScroll: true });
  }

  host.classList.add("planner");
  renderStep();
}
