// Main site script. Runs on every page.
// Responsibilities:
//  - Include shared partials (header, footer, prayer widget) via fetch
//  - Nav toggle for mobile
//  - Footer year
//  - Highlight current page in nav
//  - Kick off the a11y toolbar and (when present) prayer-times widget

import { initA11yToolbar } from "./a11y-toolbar.js";
import { initPrayerTimes } from "./prayer-times.js";
import { initForms } from "./forms.js";

// Site root path, derived from this file's location (<root>/assets/js/main.js):
// "/" on the production domain, "/virginmarymsoque/" on GitHub Pages.
const ROOT = new URL("../../", import.meta.url).pathname;

// Partials are written with root-absolute links ("/about/"); point them at ROOT.
function rootify(html) {
  return html.replace(/(\s(?:href|src)=")\/(?!\/)/g, `$1${ROOT}`);
}

/**
 * Fetch and inject HTML partials into elements with `data-include="<name>"`.
 * Partials live at <root>/partials/<name>.html
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
          host.innerHTML = rootify(html);
        })
        .catch((err) => {
          console.warn(err);
          host.remove();
        }),
    );
  });
  await Promise.allSettled(work);
}

function initNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("#primary-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const open = nav.getAttribute("data-open") === "true";
    nav.setAttribute("data-open", String(!open));
    toggle.setAttribute("aria-expanded", String(!open));
  });
}

function initHeaderShadow() {
  const header = document.querySelector("[data-site-header]");
  if (!header) return;
  let queued = false;
  const update = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 40);
    queued = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
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

function highlightCurrentNav() {
  // Compare without "index.html"/".html" so clean URLs (/news/events) match too.
  const norm = (p) => p.replace(/index\.html$/, "").replace(/\.html$/, "");
  const path = norm(window.location.pathname);
  document.querySelectorAll(".site-nav__link").forEach((link) => {
    const target = norm(new URL(link.href).pathname);
    if (target !== ROOT && path.startsWith(target)) {
      link.setAttribute("aria-current", "page");
    }
  });
}

function initReveal() {
  const els = document.querySelectorAll("[data-reveal]");
  if (!els.length) return;
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );
  els.forEach((el) => io.observe(el));
}

async function boot() {
  await includePartials();
  initNav();
  initHeaderShadow();
  initHeroSlideshow();
  initCurrentYear();
  highlightCurrentNav();
  initReveal();
  initA11yToolbar();
  initPrayerTimes();
  initForms();
  if (document.querySelector("[data-gallery]")) {
    import("./gallery.js").then((m) => m.initGallery());
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
