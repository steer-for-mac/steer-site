// Loops of the real app play only while on screen, never under reduced
// motion, and each has a Pause button (WCAG 2.2.2).
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || navigator.webdriver) return;
  document.querySelectorAll(".h-loop-wrap").forEach((wrap) => {
    const v = /** @type {HTMLVideoElement} */ (wrap.querySelector("video"));
    const btn = /** @type {HTMLButtonElement} */ (wrap.querySelector("[data-loop-btn]"));
    let paused = false;
    btn.hidden = false;
    btn.addEventListener("click", () => {
      paused = !paused; btn.textContent = paused ? "Play" : "Pause";
      if (paused) v.pause(); else v.play().catch(() => {});
    });
    new IntersectionObserver((es) => {
      for (const e of es) { if (e.isIntersecting && !paused) v.play().catch(() => {}); else v.pause(); }
    }, { threshold: 0.4 }).observe(v);
  });
})();
