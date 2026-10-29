// Donate page: appeal, frequency and amount choices with a live summary,
// Stripe Checkout through /api/donate, and the zakat calculator.
//
// Without online giving switched on (no STRIPE_SECRET_KEY, or a host without the
// API such as GitHub Pages), the form still works as a guide: the button offers
// an email to the office pre-filled with the donor's choice, and the phone number.

import { PRESETS, DEFAULT_AMOUNT, MIN_AMOUNT, MAX_AMOUNT, findAppeal } from "./appeals.js";

const API_URL = new URL("../../api/donate", import.meta.url);
const OFFICE_EMAIL = "admin@virginmarymosque.org.au";
const OFFICE_PHONE = "(03) 8087 0900";
const OFFICE_TEL = "+61380870900";

const money = (n) =>
  "$" + n.toLocaleString("en-AU", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function initDonate() {
  const form = document.querySelector("[data-donate]");
  if (!form) return;

  const amountGrid = form.querySelector("[data-amounts]");
  const custom = form.querySelector("[data-custom-amount]");
  const summary = form.querySelector("[data-donate-summary]");
  const submit = form.querySelector("[data-donate-submit]");
  const submitLabel = form.querySelector("[data-donate-submit-label]");
  const notice = form.querySelector("[data-donate-notice]");
  let online = null; // unknown until the API answers

  const checked = (name) => form.querySelector(`input[name="${name}"]:checked`);
  const appeal = () => findAppeal(checked("appeal")?.value) || findAppeal("masjid");
  const frequency = () => checked("frequency")?.value || "once";

  function amount() {
    if (custom.value.trim() !== "") return Number(custom.value);
    return Number(checked("amount")?.value || 0);
  }

  function amountProblem(value) {
    if (!Number.isFinite(value) || value <= 0) return "Please choose or enter an amount.";
    if (value < MIN_AMOUNT) return `Online donations start at ${money(MIN_AMOUNT)}.`;
    if (value > MAX_AMOUNT) {
      return `For gifts over ${money(MAX_AMOUNT)}, please contact the office to arrange a bank transfer.`;
    }
    return null;
  }

  function showNotice(html, tone = "info", focus = false) {
    notice.innerHTML = html;
    notice.className = `donate-notice${tone === "error" ? " donate-notice--error" : ""}`;
    notice.hidden = false;
    if (focus) notice.focus();
  }

  function hideNotice() {
    notice.hidden = true;
    notice.textContent = "";
  }

  function officeFallback(lead) {
    const a = appeal();
    const subject = `Donation: ${a.name}`;
    const body = `Salaam,\n\nI would like to give ${money(amount())} ${frequency() === "monthly" ? "each month" : "once"} to the ${a.name}. Please let me know how.\n\n`;
    const mailto = `mailto:${OFFICE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return `${lead} <a href="${mailto}">Email the office</a> or call <a href="tel:${OFFICE_TEL}">${OFFICE_PHONE}</a> &mdash; or give in person at the masjid.`;
  }

  function update() {
    const a = appeal();
    const value = amount();
    const monthly = frequency() === "monthly";
    const valid = !amountProblem(value);
    custom.closest(".amount-custom").classList.toggle("is-active", custom.value.trim() !== "");
    const shown = valid ? `<strong>${money(value)}</strong>` : "Choose an amount";
    summary.innerHTML = `<span class="donate-summary__label">Your donation</span>${shown} ${
      monthly ? "every month" : "one-off"
    } &middot; <strong>${escapeHtml(a.name)}</strong>`;
    submitLabel.textContent = valid ? `Donate ${money(value)}${monthly ? " monthly" : ""}` : "Donate";
  }

  // Swap the six preset amounts when switching between one-off and monthly.
  function renderPresets(keepCustom) {
    const freq = frequency();
    const presets = PRESETS[freq];
    const current = checked("amount")?.value;
    const labels = amountGrid.querySelectorAll(".amount-option");
    labels.forEach((label, i) => {
      const input = label.querySelector("input");
      input.value = String(presets[i]);
      label.querySelector("span").textContent = money(presets[i]);
      input.checked = false;
    });
    if (!keepCustom || custom.value.trim() === "") {
      const match = [...amountGrid.querySelectorAll("input")].find((i) => i.value === current);
      (match || amountGrid.querySelector(`input[value="${DEFAULT_AMOUNT[freq]}"]`)).checked = true;
    }
  }

  function selectAppeal(id) {
    const input = form.querySelector(`input[name="appeal"][value="${CSS.escape(id)}"]`);
    if (input) input.checked = true;
  }

  function setAmount(value) {
    const preset = amountGrid.querySelector(`input[value="${CSS.escape(String(value))}"]`);
    if (preset) {
      preset.checked = true;
      custom.value = "";
    } else {
      amountGrid.querySelectorAll("input").forEach((i) => (i.checked = false));
      custom.value = String(value);
    }
  }

  function jumpToForm(focusEl) {
    const panel = form.querySelector(".donate-panel");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (window.innerWidth < 992 ? panel : form).scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    if (focusEl) setTimeout(() => focusEl.focus({ preventScroll: true }), reduce ? 0 : 450);
  }

  form.addEventListener("change", (e) => {
    if (e.target.name === "frequency") renderPresets(true);
    if (e.target.name === "amount") custom.value = "";
    hideNotice();
    update();
  });

  custom.addEventListener("input", () => {
    if (custom.value.trim() !== "") amountGrid.querySelectorAll("input").forEach((i) => (i.checked = false));
    update();
  });

  // If the "other amount" box is emptied, fall back to the default preset.
  custom.addEventListener("blur", () => {
    if (custom.value.trim() === "" && !checked("amount")) {
      amountGrid.querySelector(`input[value="${DEFAULT_AMOUNT[frequency()]}"]`).checked = true;
      update();
    }
  });

  // Quick-give buttons (e.g. the Gaza banner) preselect the form and jump to it.
  document.querySelectorAll("[data-quick-give]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      selectAppeal(link.dataset.quickGive);
      const once = form.querySelector('input[name="frequency"][value="once"]');
      if (!once.checked) {
        once.checked = true;
        renderPresets(false);
      }
      const value = link.dataset.amount;
      if (value && value !== "other") setAmount(Number(value));
      hideNotice();
      update();
      jumpToForm(value === "other" ? custom : submit);
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = amount();
    const problem = amountProblem(value);
    if (problem) {
      showNotice(escapeHtml(problem), "error", true);
      return;
    }
    if (online === false) {
      showNotice(officeFallback("Online giving isn&rsquo;t switched on yet."), "info", true);
      return;
    }

    submit.setAttribute("aria-busy", "true");
    submit.disabled = true;
    submitLabel.textContent = "Opening secure checkout…";
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ appeal: appeal().id, amount: value, frequency: frequency() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      if (res.status === 503 || res.status === 404) {
        online = false;
        showNotice(officeFallback("Online giving isn&rsquo;t switched on yet."), "info", true);
      } else {
        showNotice(escapeHtml(data.error || "Something went wrong. Please try again."), "error", true);
      }
    } catch {
      showNotice(officeFallback("We couldn&rsquo;t reach the payment page."), "error", true);
    }
    submit.removeAttribute("aria-busy");
    submit.disabled = false;
    update();
  });

  // Preselect from the address bar: ?appeal=gaza&amount=50, and messages after
  // returning from Stripe (?cancelled=1) or from a plain form post (?error=…).
  const params = new URLSearchParams(window.location.search);
  if (params.get("appeal")) selectAppeal(params.get("appeal"));
  if (params.get("amount") && Number(params.get("amount")) > 0) setAmount(Number(params.get("amount")));
  if (params.get("cancelled")) {
    showNotice("Your donation wasn&rsquo;t completed and no payment was taken. You can try again below.");
  } else if (params.get("error") === "not_configured") {
    online = false;
    showNotice(officeFallback("Online giving isn&rsquo;t switched on yet."));
  } else if (params.get("error")) {
    showNotice("Something went wrong starting the payment. Please check the amount and try again.", "error");
  }
  update();

  // Is online giving switched on? (GET /api/donate → { enabled })
  fetch(API_URL, { headers: { Accept: "application/json" } })
    .then((res) => (res.ok ? res.json() : { enabled: false }))
    .then((data) => {
      online = Boolean(data.enabled);
      if (!online && notice.hidden) {
        showNotice(officeFallback("Online giving opens soon."));
      }
    })
    .catch(() => {
      online = false;
    });

  initZakat({ selectAppeal, setAmount, renderPresets, update, jumpToForm, form, custom, submit });
}

function initZakat(donate) {
  const calc = document.querySelector("[data-zakat]");
  if (!calc) return;
  const assets = calc.querySelectorAll("[data-zakat-asset]");
  const debts = calc.querySelector("[data-zakat-debts]");
  const nisab = calc.querySelector("[data-zakat-nisab]");
  const netEl = calc.querySelector("[data-zakat-net]");
  const dueEl = calc.querySelector("[data-zakat-due]");
  const note = calc.querySelector("[data-zakat-note]");
  const give = calc.querySelector("[data-zakat-give]");
  const num = (input) => Math.max(0, Number(input.value) || 0);
  let due = 0;

  function calculate() {
    const total = [...assets].reduce((sum, input) => sum + num(input), 0);
    const net = Math.max(0, total - num(debts));
    const threshold = num(nisab);
    const below = threshold > 0 && net < threshold;
    due = below ? 0 : Math.round(net * 2.5) / 100;
    netEl.textContent = money(Math.round(net * 100) / 100);
    dueEl.textContent = money(due);

    if (net === 0) note.textContent = "Enter your wealth to see your zakat.";
    else if (below) note.textContent = "This is below the nisab you entered, so zakat is not due.";
    else if (!threshold) note.textContent = "Check this is above today’s nisab before you pay.";
    else note.textContent = "Above the nisab — zakat is due on this wealth.";

    const canGive = due >= MIN_AMOUNT && due <= MAX_AMOUNT;
    give.disabled = !canGive;
    give.textContent = canGive ? `Give ${money(due)} as zakat` : "Give this as zakat";
    if (due > 0 && due < MIN_AMOUNT) note.textContent += ` Online donations start at ${money(MIN_AMOUNT)}.`;
  }

  calc.addEventListener("input", calculate);
  give.addEventListener("click", () => {
    donate.selectAppeal("zakat");
    const once = donate.form.querySelector('input[name="frequency"][value="once"]');
    if (!once.checked) {
      once.checked = true;
      donate.renderPresets(false);
    }
    donate.setAmount(due);
    donate.update();
    donate.jumpToForm(donate.submit);
  });
  calculate();
}
