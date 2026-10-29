// Main site script. Runs on every page.
// Responsibilities:
//  - Include shared partials (header, footer, prayer widget) via fetch
//  - Navigation (see nav.js), footer year, reveal-on-scroll
//  - Kick off the a11y toolbar, prayer times, forms and (when present) the gallery

import { initA11yToolbar } from "./a11y-toolbar.js";
import { initPrayerTimes } from "./prayer-times.js";
import { initForms } from "./forms.js";
import { initNav } from "./nav.js";

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

async function boot() {
  await includePartials();
  initNav(ROOT);
  initHeroSlideshow();
  initCurrentYear();
  initReveal();
  initA11yToolbar();
  initPrayerTimes();
  initForms();
  if (document.querySelector("[data-gallery]")) {
    import("./gallery.js").then((m) => m.initGallery());
  }
  if (document.querySelector("[data-donate]")) {
    import("./donate.js").then((m) => m.initDonate());
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
