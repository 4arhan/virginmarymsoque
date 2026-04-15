// Lightweight form helpers:
//  - Honeypot check (bots fill the hidden field → drop submission)
//  - Client-side required/email validation with inline error messages
//  - Progressive enhancement: HTML `action` still works without JS

function markError(field, message) {
  const msgEl = field.querySelector(".form__error");
  if (msgEl) {
    msgEl.textContent = message;
  } else {
    const el = document.createElement("p");
    el.className = "form__error";
    el.textContent = message;
    field.appendChild(el);
  }
}

function clearError(field) {
  const msgEl = field.querySelector(".form__error");
  if (msgEl) msgEl.textContent = "";
}

function validate(form) {
  let ok = true;
  form.querySelectorAll(".form__field").forEach((field) => {
    clearError(field);
    const input = field.querySelector("input, textarea, select");
    if (!input) return;
    if (input.required && !input.value.trim()) {
      markError(field, "This field is required.");
      ok = false;
      return;
    }
    if (input.type === "email" && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
      markError(field, "Please enter a valid email address.");
      ok = false;
    }
  });
  return ok;
}

export function initForms() {
  document.querySelectorAll("form[data-enhanced]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      // Honeypot: if filled, silently drop
      const honey = form.querySelector('input[name="_honey"]');
      if (honey && honey.value) {
        e.preventDefault();
        return;
      }
      if (!validate(form)) {
        e.preventDefault();
      }
    });
  });
}
