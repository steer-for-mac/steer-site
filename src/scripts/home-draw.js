// The sofa draws itself in like a pen sketch, then settles into the finished
// drawing and the pins land. Runs only if the inline arm added .drawing.
(() => {
  const hero = document.getElementById("hero");
  const box = document.getElementById("sofa-box");
  if (!hero || !box || !hero.classList.contains("drawing")) return;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    hero.classList.add("inked");
    setTimeout(() => hero.classList.add("pinned"), 950);
  };
  const bail = setTimeout(finish, 2500);
  fetch("assets/svg/sofa-draw.svg")
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
    .then((text) => {
      if (done) return;
      clearTimeout(bail);
      // parsed as SVG, not HTML: a same-origin static file, but no markup sink
      const svg = new DOMParser().parseFromString(text, "image/svg+xml").querySelector("svg");
      if (!svg) { finish(); return; }
      box.prepend(document.importNode(svg, true));
      const drawn = /** @type {SVGSVGElement} */ (box.firstElementChild);
      drawn.setAttribute("aria-hidden", "true");
      const paths = [...drawn.querySelectorAll("path")];
      paths.forEach((p, i) => {
        p.setAttribute("pathLength", "1");
        p.style.animationDelay = `${(i / paths.length * 2.2).toFixed(3)}s`;
        p.style.setProperty("--dur", `${(0.45 + ((i * 37) % 10) / 18).toFixed(2)}s`);
      });
      void drawn.getBoundingClientRect();
      drawn.classList.add("go");
      setTimeout(finish, 3200);
    })
    .catch(() => { clearTimeout(bail); finish(); });
})();
