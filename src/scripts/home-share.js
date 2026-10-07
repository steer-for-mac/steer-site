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
  // The nav's button would sit right above the hero's identical one: hide it
  // while a homepage form is on screen. Without JS it simply stays.
  const forms = [...document.querySelectorAll(".h-main .ml-form")];
  if (forms.length && "IntersectionObserver" in window) {
    const seen = new Set();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      document.documentElement.classList.toggle("form-in-view", seen.size > 0);
    });
    forms.forEach((f) => io.observe(f));
  }
})();
