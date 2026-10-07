// The couplet lines: from the pad's lit control up to a rail above both,
// across, and down to the effect. The labels ride the rail.
(() => {
  const figs = /** @type {HTMLElement[]} */ ([...document.querySelectorAll("[data-wire]")]);
  if (!figs.length) return;
  /** @param {Element | null} e */
  const box = (e) => (e ? e.getBoundingClientRect() : new DOMRect());
  const draw = () => figs.forEach((f) => {
    const [a, b] = (f.dataset.wire || "").split(" ");
    if (!a || !b) return;
    const A = box(document.querySelector(a)), B = box(document.querySelector(b)), F = box(f);
    const eff = box(f.querySelector(".effect")), cause = box(f.querySelector(".pad"));
    const ax = A.left - F.left, bx = B.left - F.left, by = B.top - F.top;
    // the R2 tag sits on the trigger, so the line leaves from under it
    const ay = A.top - F.top + (f.classList.contains("duo-type") ? 12 : 0);
    const rail = Math.min(eff.top, cause.top) - F.top - 30, r = 10, s = ax < bx ? 1 : -1;
    const path = f.querySelector(".wire path"), dot = f.querySelector(".wire circle");
    const la = /** @type {HTMLElement | null} */ (f.querySelector(".say-a"));
    const lb = /** @type {HTMLElement | null} */ (f.querySelector(".say-b"));
    if (!path || !dot || !la || !lb) return;
    path.setAttribute("d", ["M", ax, ay, "V", rail + r, "Q", ax, rail, ax + s * r, rail, "H", bx - s * r, "Q", bx, rail, bx, rail + r, "V", by].join(" "));
    dot.setAttribute("cx", String(bx));
    dot.setAttribute("cy", String(by));
    const half = la.offsetWidth / 2;
    la.style.left = `${Math.max(half, Math.min(F.width - half, ax))}px`;
    la.style.top = lb.style.top = `${rail}px`;
    lb.style.left = `${bx}px`;
    f.classList.add("wired");
  });
  draw();
  new ResizeObserver(draw).observe(document.body);
  addEventListener("load", draw);
})();
