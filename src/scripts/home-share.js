// Phones can't drive the demo, so they get "Send it to my Mac"; every form
// carries the ?from= tag of the link that brought the visitor (plan, §How we'll know).
(() => {
  const from = new URLSearchParams(location.search).get("from") || "";
  document.querySelectorAll(".ml-from").forEach((i) => { /** @type {HTMLInputElement} */ (i).value = from.slice(0, 40); });
  const phone = matchMedia("(pointer: coarse), (max-width: 760px)").matches;
  document.querySelectorAll("[data-share]").forEach((b) => {
    if (!phone) return;
    /** @type {HTMLElement} */ (b).hidden = false;
    b.addEventListener("click", async () => {
      try {
        if (navigator.share) await navigator.share({ title: "Steer", url: location.href });
        else { await navigator.clipboard.writeText(location.href); b.textContent = "Link copied. Open it on your Mac."; }
      } catch { b.textContent = "Open this page on your Mac to try it."; }
    });
  });
})();
