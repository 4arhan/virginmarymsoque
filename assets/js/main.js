// Main site script. Runs on every page.
// Responsibilities:
//  - Include shared partials (header, footer, prayer widget) via fetch
//  - Navigation (see nav.js), footer year, reveal-on-scroll
//  - Kick off the a11y toolbar, prayer times, forms and (when present) the gallery

import { initA11yToolbar } from "./a11y-toolbar.js";
import { initPrayerTimes } from "./prayer-times.js";
import { initForms } from "./forms.js";
import { initNav } from "./nav.js";
import { initInstall } from "./install.js";
import { WHATSAPP_COMMUNITY_URL } from "./site-config.js";

// Site root path, derived from this file's location (<root>/assets/js/main.js):
// "/" on the production domain, "/virginmarymsoque/" on GitHub Pages.
const ROOT = new URL("../../", import.meta.url).pathname;

// Partials are written with root-absolute links ("/about/"); point them at ROOT.
function rootify(html) {
  return html.replace(/(\s(?:href|src)=")\/(?!\/)/g, `$1${ROOT}`);
}

/**
 * Fetch each `data-include="<name>"` partial from <root>/partials/<name>.html and
 * put its markup in place of the placeholder element. Replacing (not filling) the
 * placeholder keeps the header a direct child of <body>, so it can stay sticky.
 */
async function includePartials() {
  const hosts = document.querySelectorAll("[data-include]");
  const work = [];
  hosts.forEach((host) => {
    const name = host.getAttribute("data-include");
    if (!name) return;
    work.push(
      fetch(`${ROOT}partials/${name}.html`, { cache: "no-cache" })
        .then((res) => {
          if (!res.ok) throw new Error(`Partial ${name} failed (${res.status})`);
          return res.text();
        })
        .then((html) => {
          const tpl = document.createElement("template");
          tpl.innerHTML = rootify(html);
          host.replaceWith(tpl.content);
        })
        .catch((err) => {
          console.warn(err);
          host.remove();
        }),
    );
  });
  await Promise.allSettled(work);
}

function initHeroSlideshow() {
  const hero = document.querySelector("[data-hero]");
  const toggle = hero && hero.querySelector("[data-hero-pause]");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const paused = hero.classList.toggle("is-paused");
    toggle.setAttribute("aria-pressed", String(paused));
  });
}

function initCurrentYear() {
  const now = new Date().getFullYear();
  document.querySelectorAll("[data-current-year]").forEach((el) => {
    el.textContent = String(now);
  });
}

function initReveal() {
  const els = document.querySelectorAll("[data-reveal]");
  if (!els.length) return;
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  // Siblings that reveal together arrive one after another.
  els.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute("data-reveal"));
    const i = siblings.indexOf(el);
    if (i > 0) el.style.transitionDelay = `${Math.min(i, 6) * 70}ms`;
  });
  // Once revealed, drop the reveal styles so the element's own transitions
  // (card hovers etc.) run without the stagger delay.
  const settle = (el) => {
    el.removeAttribute("data-reveal");
    el.classList.remove("is-visible");
    el.style.transitionDelay = "";
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add("is-visible");
          io.unobserve(el);
          setTimeout(() => settle(el), 800 + (parseInt(el.style.transitionDelay, 10) || 0));
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );
  els.forEach((el) => io.observe(el));
}

// "Join our WhatsApp community" links: the invite link from site-config.js,
// or — until one is set — the email fallback written in the HTML. An element
// with data-whatsapp-fallback="email" turns into an Email action instead.
function initCommunityLinks() {
  document.querySelectorAll("[data-whatsapp-join]").forEach((link) => {
    if (WHATSAPP_COMMUNITY_URL) {
      link.href = WHATSAPP_COMMUNITY_URL;
      link.target = "_blank";
      link.rel = "noreferrer";
      return;
    }
    if (link.dataset.whatsappFallback === "email") {
      link.href = link.href.replace(/\?.*$/, "");
      const use = link.querySelector("use");
      if (use) use.setAttribute("href", `${ROOT}assets/img/icons.svg#i-mail`);
      const label = link.querySelector("span");
      if (label) label.textContent = "Email";
      link.classList.remove("is-whatsapp");
    }
  });
}

// Today's Hijri date (Umm al-Qura), for the footer and the phone menu.
function initHijriDate() {
  let hijri = "";
  try {
    hijri = new Intl.DateTimeFormat("en-AU-u-ca-islamic-umalqura", {
      timeZone: "Australia/Melbourne",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  } catch {
    return;
  }
  if (!hijri) return;
  document.querySelectorAll("[data-hijri-date]").forEach((el) => {
    el.textContent = hijri;
  });
  document.querySelectorAll("[data-hijri-wrap]").forEach((el) => {
    el.hidden = false;
  });
}

// Big numbers count up the first time they scroll into view.
function initCountUp() {
  const els = [...document.querySelectorAll(".stat__value")].filter((el) => /^[\d,]+$/.test(el.textContent.trim()));
  if (!els.length || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        io.unobserve(el);
        const text = el.textContent.trim();
        const target = Number(text.replace(/,/g, ""));
        const from = target >= 1000 ? target - 30 : 0;
        const start = performance.now();
        const duration = 900;
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          const value = Math.round(from + (target - from) * eased);
          el.textContent = text.includes(",") ? value.toLocaleString("en-AU") : String(value);
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    },
    { threshold: 0.6 },
  );
  els.forEach((el) => io.observe(el));
}

// Offline support and "Add to Home Screen" (see sw.js). Secure contexts only.
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (location.protocol !== "https:" && !local) return;
  // After the page has finished loading, so it never competes for bandwidth.
  // boot() runs after the partials arrive, which may be after the load event.
  const register = () => navigator.serviceWorker.register(`${ROOT}sw.js`).catch(() => {});
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

async function boot() {
  await includePartials();
  initNav(ROOT);
  initHeroSlideshow();
  initCurrentYear();
  initReveal();
  initA11yToolbar();
  initPrayerTimes();
  initForms();
  initCommunityLinks();
  initHijriDate();
  initCountUp();
  initInstall(ROOT);
  if (document.querySelector("[data-gallery]")) {
    import("./gallery.js").then((m) => m.initGallery());
  }
  if (document.querySelector("[data-donate]")) {
    import("./donate.js").then((m) => m.initDonate());
  }
  if (document.querySelector("[data-calendar-subscribe]")) {
    import("./calendar-subscribe.js").then((m) => m.initCalendarSubscribe());
  }
  if (document.querySelector("[data-instagram-feed]")) {
    import("./instagram-feed.js").then((m) => m.initInstagramFeed(ROOT));
  }
  if (document.querySelector("[data-visit-planner]")) {
    import("./visit-planner.js").then((m) => m.initVisitPlanner(ROOT));
  }
  registerServiceWorker();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
