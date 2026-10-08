// Loops of the real app: each starts from its first frame when it arrives and
// pauses when it leaves, has a visible Pause (WCAG 2.2.2), and never starts by
// itself under reduced motion or automation.
(() => {
  const PAUSE = '<rect x="1" y="1" width="3.5" height="10" rx="1"/><rect x="7.5" y="1" width="3.5" height="10" rx="1"/>';
  const PLAY = '<path d="M2 1 L11 6 L2 11 Z"/>';
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const still = () => reduce.matches || navigator.webdriver;
  const loops = [...document.querySelectorAll("video[data-loop]")].flatMap((el) => {
    const v = /** @type {HTMLVideoElement} */ (el);
    const b = /** @type {HTMLButtonElement | null | undefined} */ (v.closest("figure")?.querySelector(".ctl"));
    const icon = b?.querySelector("svg"), word = b?.querySelector("span");
    if (!b || !icon || !word) return [];
    const o = { v, user: false, vis: false, seen: false,
      /** @param {boolean} playing */
      set(playing) {
        b.setAttribute("aria-label", `${playing ? "Pause" : "Play"} ${v.dataset.name}`);
        word.textContent = playing ? "Pause" : "Play";
        icon.innerHTML = playing ? PAUSE : PLAY;
      } };
    b.hidden = false;
    o.set(false);  // Play until a frame actually moves; apply() says Pause once play() resolves
    b.addEventListener("click", () => {
      o.user = true;
      if (v.paused) v.play().then(() => o.set(true), () => o.set(false));
      else { v.pause(); o.set(false); }
    });
    return [o];
  });
  if (!loops.length) return;
  /* A loop with a take per theme is one element whose source follows the
     theme, so its button and a Pause the user pressed carry across a flip. */
  const root = document.documentElement;
  /** @param {typeof loops[number]} o */
  const pick = (o) => {
    const want = root.dataset.theme === "dark" ? o.v.dataset.dark : o.v.dataset.light;
    if (!want || o.v.getAttribute("src") === want) return;
    const playing = !o.v.paused;
    o.v.src = want;
    if (playing) o.v.play().then(() => o.set(true), () => o.set(false));
  };
  loops.forEach(pick);
  new MutationObserver(() => loops.forEach(pick)).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  /** @param {typeof loops[number]} o */
  const apply = (o) => {
    if (still() && !o.user) { o.v.pause(); o.set(false); return; }
    if (o.user && o.v.paused) return;
    if (!o.vis) { o.v.pause(); return; }
    o.v.play().then(() => o.set(true), () => o.set(false));
  };
  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      const o = loops.find((x) => x.v === e.target);
      if (!o) continue;
      o.vis = e.isIntersecting;
      if (o.vis && !o.seen && !still()) { o.seen = true; if (o.v.currentTime) o.v.currentTime = 0; }
      apply(o);
    }
  }, { threshold: 0.35 });
  loops.forEach((o) => io.observe(o.v));
  reduce.addEventListener("change", () => loops.forEach(apply));
})();
