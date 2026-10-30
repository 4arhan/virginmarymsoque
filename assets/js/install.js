// "Add to home screen".
//  - Android / desktop Chrome and Edge: the browser's own install prompt, kept
//    for a small banner on phones and for [data-install] buttons.
//  - iPhone and iPad: no install API, so the banner and buttons explain
//    Share → "Add to Home Screen" instead.
// The banner appears once per 30 days unless the app is already installed.

const DISMISS_KEY = "vmm-install-dismissed";
const DISMISS_DAYS = 30;
const SHOW_AFTER_MS = 4000;

let deferredPrompt = null;
let banner = null;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isPhone = () => window.matchMedia("(max-width: 48em)").matches;

function dismissed() {
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return until > Date.now();
  } catch {
    return false;
  }
}

function remember(days = DISMISS_DAYS) {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 86_400_000));
  } catch {
    /* private mode */
  }
}

function iconSvg(name, root) {
  return `<svg class="icon" aria-hidden="true"><use href="${root}assets/img/icons.svg#${name}"/></svg>`;
}

function iosHelp(root) {
  return `Tap ${iconSvg("i-share", root)} <strong>Share</strong>, then <strong>Add to Home Screen</strong>.`;
}

function androidHelp(root) {
  return `Open the browser menu ${iconSvg("i-menu", root)} and choose <strong>Add to Home screen</strong> or <strong>Install app</strong>.`;
}

async function install() {
  if (!deferredPrompt) return false;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  prompt.prompt();
  const choice = await prompt.userChoice.catch(() => ({ outcome: "dismissed" }));
  return choice.outcome === "accepted";
}

function hideBanner() {
  if (!banner) return;
  const el = banner;
  banner = null;
  el.classList.remove("is-visible");
  setTimeout(() => el.remove(), 400);
}

function showBanner(mode, root) {
  if (banner || !isPhone() || dismissed() || document.querySelector("[data-donate]")) return;
  banner = document.createElement("div");
  banner.className = "install-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Add Masjid Maryam to your home screen");
  const text =
    mode === "ios"
      ? `Prayer times at a tap. ${iosHelp(root)}`
      : "Prayer times at a tap — add the masjid to your home screen.";
  banner.innerHTML = `
    <img class="install-banner__icon" src="${root}assets/img/icon-192.png" width="48" height="48" alt="">
    <p class="install-banner__text"><strong>Masjid Maryam</strong><span>${text}</span></p>
    ${mode === "ios" ? "" : '<button class="btn btn--accent btn--sm" type="button" data-install-accept>Add</button>'}
    <button class="install-banner__close" type="button" aria-label="Not now" data-install-dismiss>${iconSvg("i-close", root)}</button>
  `;
  banner.querySelector("[data-install-dismiss]").addEventListener("click", () => {
    remember();
    hideBanner();
  });
  const accept = banner.querySelector("[data-install-accept]");
  if (accept) {
    accept.addEventListener("click", async () => {
      const ok = await install();
      remember(ok ? 365 : DISMISS_DAYS);
      hideBanner();
    });
  }
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner && banner.classList.add("is-visible"));
}

// "Add to home screen" buttons in page content, with inline help when the
// browser has no install prompt.
function initButtons(root) {
  document.querySelectorAll("[data-install]").forEach((button) => {
    const help = button.parentElement.querySelector("[data-install-help]");
    button.addEventListener("click", async () => {
      if (deferredPrompt) {
        const ok = await install();
        if (ok) remember(365);
        return;
      }
      if (help) {
        help.innerHTML = isIOS() ? iosHelp(root) : androidHelp(root);
        help.hidden = false;
      }
    });
  });
}

export function initInstall(root) {
  if (isStandalone()) {
    document.documentElement.classList.add("is-standalone");
    document.querySelectorAll("[data-install-section]").forEach((el) => {
      el.hidden = true;
    });
    return;
  }
  initButtons(root);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    setTimeout(() => showBanner("prompt", root), SHOW_AFTER_MS);
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    remember(365);
    hideBanner();
  });

  if (isIOS()) setTimeout(() => showBanner("ios", root), SHOW_AFTER_MS);
}
