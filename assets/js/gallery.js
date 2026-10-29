// Gallery lightbox: opens the full-size photo in the page's <dialog data-lightbox>,
// with previous/next buttons, arrow keys, and focus returned to the opening thumbnail.

export function initGallery() {
  const items = [...document.querySelectorAll("[data-gallery-item]")];
  const dialog = document.querySelector("[data-lightbox]");
  if (!items.length || !dialog || typeof dialog.showModal !== "function") return;

  const img = dialog.querySelector("[data-lightbox-img]");
  const title = dialog.querySelector("[data-lightbox-title]");
  const meta = dialog.querySelector("[data-lightbox-meta]");
  let index = 0;
  let opener = null;

  const show = (i) => {
    index = (i + items.length) % items.length;
    const item = items[index];
    img.src = item.dataset.full;
    img.alt = item.querySelector("img").alt;
    title.textContent = item.dataset.title;
    meta.textContent = item.dataset.meta;
  };

  items.forEach((item, i) => {
    item.addEventListener("click", () => {
      opener = item;
      show(i);
      dialog.showModal();
    });
  });

  dialog.querySelector("[data-lightbox-prev]").addEventListener("click", () => show(index - 1));
  dialog.querySelector("[data-lightbox-next]").addEventListener("click", () => show(index + 1));
  dialog.querySelector("[data-lightbox-close]").addEventListener("click", () => dialog.close());

  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(index - 1);
    if (e.key === "ArrowRight") show(index + 1);
  });

  // A click that lands on the dialog element itself is a click on the backdrop.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => {
    if (opener) opener.focus();
  });
}
