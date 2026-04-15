// Accessibility toolbar — ECCV-style
// - Font-size: default / large / xlarge
// - Contrast:  default / high
// - Dyslexic-friendly font toggle
// Preferences persist in localStorage.

const STORAGE_KEY = "vmm.a11y";

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage blocked — session-only */
  }
}

function applyPrefs(prefs) {
  const body = document.body;
  if (prefs.fontScale && prefs.fontScale !== "default") {
    body.dataset.fontScale = prefs.fontScale;
  } else {
    delete body.dataset.fontScale;
  }
  if (prefs.contrast === "high") {
    body.dataset.contrast = "high";
  } else {
    delete body.dataset.contrast;
  }
  if (prefs.dyslexic === true) {
    body.dataset.dyslexic = "true";
  } else {
    delete body.dataset.dyslexic;
  }
}

function mountToolbar() {
  const existing = document.querySelector(".a11y-toolbar");
  if (existing) return existing;

  const wrap = document.createElement("div");
  wrap.className = "a11y-toolbar";
  wrap.setAttribute("data-open", "false");
  wrap.innerHTML = `
    <button
      class="a11y-toolbar__toggle"
      type="button"
      aria-expanded="false"
      aria-controls="a11y-panel"
      aria-label="Accessibility options">
      <span aria-hidden="true">&#9881;</span>
    </button>
    <div class="a11y-toolbar__panel" id="a11y-panel" role="region" aria-label="Accessibility settings">
      <div class="a11y-toolbar__group">
        <p class="a11y-toolbar__group-label">Text size</p>
        <div class="a11y-toolbar__row" role="group" aria-label="Text size">
          <button type="button" data-pref="fontScale" data-value="default" aria-pressed="true">A</button>
          <button type="button" data-pref="fontScale" data-value="large" aria-pressed="false">A+</button>
          <button type="button" data-pref="fontScale" data-value="xlarge" aria-pressed="false">A++</button>
        </div>
      </div>
      <div class="a11y-toolbar__group">
        <p class="a11y-toolbar__group-label">Contrast</p>
        <div class="a11y-toolbar__row" role="group" aria-label="Contrast">
          <button type="button" data-pref="contrast" data-value="default" aria-pressed="true">Default</button>
          <button type="button" data-pref="contrast" data-value="high" aria-pressed="false">High</button>
        </div>
      </div>
      <div class="a11y-toolbar__group">
        <p class="a11y-toolbar__group-label">Readable font</p>
        <div class="a11y-toolbar__row" role="group" aria-label="Readable font">
          <button type="button" data-pref="dyslexic" data-value="false" aria-pressed="true">Off</button>
          <button type="button" data-pref="dyslexic" data-value="true" aria-pressed="false">On</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
  return wrap;
}

function syncButtons(root, prefs) {
  root.querySelectorAll("button[data-pref]").forEach((btn) => {
    const pref = btn.dataset.pref;
    const value = btn.dataset.value;
    const current =
      pref === "dyslexic"
        ? String(prefs.dyslexic === true)
        : prefs[pref] || "default";
    btn.setAttribute("aria-pressed", String(value === current));
  });
}

export function initA11yToolbar() {
  const prefs = loadPrefs();
  applyPrefs(prefs);

  const toolbar = mountToolbar();
  const toggle = toolbar.querySelector(".a11y-toolbar__toggle");
  toggle.addEventListener("click", () => {
    const open = toolbar.getAttribute("data-open") === "true";
    toolbar.setAttribute("data-open", String(!open));
    toggle.setAttribute("aria-expanded", String(!open));
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!toolbar.contains(e.target) && toolbar.getAttribute("data-open") === "true") {
      toolbar.setAttribute("data-open", "false");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toolbar.getAttribute("data-open") === "true") {
      toolbar.setAttribute("data-open", "false");
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }
  });

  syncButtons(toolbar, prefs);

  toolbar.querySelectorAll("button[data-pref]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pref = btn.dataset.pref;
      const value = btn.dataset.value;
      if (pref === "dyslexic") {
        prefs.dyslexic = value === "true";
      } else {
        prefs[pref] = value;
      }
      savePrefs(prefs);
      applyPrefs(prefs);
      syncButtons(toolbar, prefs);
    });
  });
}
