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

/**
 * Fetch and inject HTML partials into elements with `data-include="<name>"`.
 * Partials live at /partials/<name>.html
 */
async function includePartials() {
  const hosts = document.querySelectorAll("[data-include]");
  const work = [];
  hosts.forEach((host) => {
    const name = host.getAttribute("data-include");
    if (!name) return;
    work.push(
      fetch(`/partials/${name}.html`, { cache: "no-cache" })
        .then((res) => {
          if (!res.ok) throw new Error(`Partial ${name} failed (${res.status})`);
          return res.text();
        })
        .then((html) => {
          host.innerHTML = html;
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

function initCurrentYear() {
  const now = new Date().getFullYear();
  document.querySelectorAll("[data-current-year]").forEach((el) => {
    el.textContent = String(now);
  });
}

function highlightCurrentNav() {
  const path = window.location.pathname.replace(/\/index\.html$/, "/");
  document.querySelectorAll(".site-nav__link").forEach((link) => {
    const href = link.getAttribute("href") || "";
    const normalised = href.endsWith("/") ? href : href;
    if (
      (normalised !== "/" && path.startsWith(normalised)) ||
      (normalised === "/" && path === "/")
    ) {
      link.setAttribute("aria-current", "page");
    }
  });
}

async function boot() {
  await includePartials();
  initNav();
  initCurrentYear();
  highlightCurrentNav();
  initA11yToolbar();
  initPrayerTimes();
  initForms();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
