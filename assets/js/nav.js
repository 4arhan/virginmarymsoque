// Site navigation: desktop dropdowns, the mobile menu, the mobile tab bar,
// scroll effects (header shadow, progress bar, back-to-top) and current-page states.

const MOBILE = window.matchMedia("(max-width: 66em)");
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

const norm = (path) => path.replace(/index\.html$/, "").replace(/\.html$/, "");

function setSubOpen(item, open) {
  item.classList.toggle("is-open", open);
  const toggle = item.querySelector(".site-nav__toggle");
  if (toggle) toggle.setAttribute("aria-expanded", String(open));
}

function initMenu(nav, header) {
  const html = document.documentElement;
  const toggles = [...document.querySelectorAll("[data-nav-toggle]")];
  let opener = null;

  const isOpen = () => html.classList.contains("nav-open");

  const setBackgroundInert = (inert) => {
    document.querySelectorAll("main, .site-footer").forEach((el) => {
      el.inert = inert;
    });
  };

  function open(trigger) {
    opener = trigger;
    nav.style.setProperty("--drawer-top", `${Math.max(0, Math.round(header.getBoundingClientRect().bottom))}px`);
    // Expand the section holding the current page.
    const current = nav.querySelector('.site-nav__sublink[aria-current="page"]');
    if (current) setSubOpen(current.closest(".site-nav__item"), true);
    html.classList.add("nav-open");
    toggles.forEach((t) => t.setAttribute("aria-expanded", "true"));
    setBackgroundInert(true);
    const first = nav.querySelector(".nav-prayer:not([hidden]), .site-nav__link");
    requestAnimationFrame(() => first && first.focus({ preventScroll: true }));
  }

  function close({ restoreFocus = true } = {}) {
    if (!isOpen()) return;
    html.classList.remove("nav-open");
    toggles.forEach((t) => t.setAttribute("aria-expanded", "false"));
    setBackgroundInert(false);
    if (restoreFocus && opener) opener.focus({ preventScroll: true });
  }

  toggles.forEach((t) => t.addEventListener("click", () => (isOpen() ? close() : open(t))));

  // Following a link closes the menu, so Back (bfcache) never restores it open.
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a") && isOpen()) close({ restoreFocus: false });
  });
  window.addEventListener("pageshow", () => close({ restoreFocus: false }));
  MOBILE.addEventListener("change", (e) => {
    if (!e.matches) close({ restoreFocus: false });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (isOpen()) {
      close();
      return;
    }
    const openItem = nav.querySelector(".site-nav__item.is-open");
    if (openItem) {
      setSubOpen(openItem, false);
      openItem.querySelector(".site-nav__toggle").focus();
    }
  });

  // "Accessibility" quick action: close the menu, then open the a11y panel.
  const a11y = nav.querySelector("[data-open-a11y]");
  if (a11y) {
    a11y.addEventListener("click", () => {
      close({ restoreFocus: false });
      setTimeout(() => {
        const toggle = document.querySelector(".a11y-toolbar__toggle");
        if (!toggle) return;
        toggle.click();
        const firstOption = document.querySelector(".a11y-toolbar__panel button");
        if (firstOption) firstOption.focus();
      }, 60);
    });
  }
}

function initSubmenus(nav) {
  const items = [...nav.querySelectorAll(".site-nav__item.has-sub")];
  items.forEach((item) => {
    const toggle = item.querySelector(".site-nav__toggle");
    toggle.addEventListener("click", () => {
      const willOpen = !item.classList.contains("is-open");
      if (!MOBILE.matches) items.forEach((other) => other !== item && setSubOpen(other, false));
      setSubOpen(item, willOpen);
    });
    // Desktop dropdowns close once focus moves elsewhere.
    item.addEventListener("focusout", (e) => {
      if (!MOBILE.matches && !item.contains(e.relatedTarget)) setSubOpen(item, false);
    });
  });
  document.addEventListener("click", (e) => {
    if (MOBILE.matches) return;
    items.forEach((item) => {
      if (!item.contains(e.target)) setSubOpen(item, false);
    });
  });
}

function markCurrent(root) {
  const path = norm(window.location.pathname);
  document.querySelectorAll(".site-nav__link").forEach((link) => {
    const target = norm(new URL(link.href).pathname);
    if (target === path) link.setAttribute("aria-current", "page");
    else if (target !== root && path.startsWith(target)) link.setAttribute("aria-current", "true");
  });
  document.querySelectorAll(".site-nav__sublink").forEach((link) => {
    if (norm(new URL(link.href).pathname) !== path) return;
    link.setAttribute("aria-current", "page");
    const top = link.closest(".site-nav__item").querySelector(".site-nav__link");
    if (!top.hasAttribute("aria-current")) top.setAttribute("aria-current", "true");
  });
  document.querySelectorAll("[data-tab]").forEach((tab) => {
    if (norm(new URL(tab.href).pathname) === path) tab.setAttribute("aria-current", "page");
  });
}

function initScrollEffects(header, root) {
  const progress = header.querySelector(".scroll-progress");
  const tabbar = document.querySelector("[data-tabbar]");
  const html = document.documentElement;

  const toTop = document.createElement("button");
  toTop.type = "button";
  toTop.className = "to-top";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.innerHTML = `<svg class="icon" aria-hidden="true"><use href="${root}assets/img/icons.svg#i-arrow-up"/></svg>`;
  toTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: REDUCED_MOTION.matches ? "auto" : "smooth" });
  });
  document.body.appendChild(toTop);

  let lastY = window.scrollY;
  let queued = false;
  const update = () => {
    queued = false;
    const y = window.scrollY;
    const max = html.scrollHeight - window.innerHeight;
    header.classList.toggle("is-scrolled", y > 30);
    if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    toTop.classList.toggle("is-visible", y > window.innerHeight * 1.2);
    if (tabbar) {
      const delta = y - lastY;
      if (Math.abs(delta) > 6) {
        tabbar.classList.toggle("is-hidden", delta > 0 && y > 160 && !html.classList.contains("nav-open"));
        lastY = y;
      }
      if (y >= max - 4) tabbar.classList.remove("is-hidden");
    }
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

export function initNav(root) {
  const header = document.querySelector("[data-site-header]");
  const nav = document.querySelector("[data-site-nav]");
  if (!header || !nav) return;
  markCurrent(root);
  initMenu(nav, header);
  initSubmenus(nav);
  initScrollEffects(header, root);
}
