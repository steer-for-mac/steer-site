/* The photo controller (macros/pad-photo.njk) as a view. It reads no
   controller: the demo hands it a state, so replay, pad and keyboard all drive
   it alike. `held` is site button names (pad-family.js), `axes` the four stick
   axes, `trig` L2/R2 from 0 to 1, `layer` the demo's layer, for the bar. */

const SVG = "http://www.w3.org/2000/svg";
/* Two neighbouring directions make a diagonal. The Elite's faceted disc has a
   zone for it, which lights alone; a cross d-pad lights both arms. */
const DIAG = [["up", "left"], ["up", "right"], ["down", "left"], ["down", "right"]];
/* SteerCore/LEDConfig.swift `states`, read by LEDSystem.colourFor on every
   layer edge. Solo is 0,50,140 there, dimmed on purpose so a layer's
   brightness reads as a change; a screen shows the hue at full, or it reads as
   off. */
const LAYER = { solo: "0,91,255", l1: "255,165,0", r1: "255,220,0", l1r1: "0,200,180", l2: "255,80,140", r2: "160,80,255" };
const TILT = 0.5;           // a stick past halfway lights, as a click does
const THROW = 0.7;          // how far a cap slides at full tilt, in radii

/** @param {HTMLElement} root the .pp element */
export function padPhoto(root) {
  const pads = [...root.querySelectorAll(".pp-f")].map((el) => {
    const svg = /** @type {SVGSVGElement} */ (el.querySelector(".pad-controls"));
    const paths = [...svg.querySelectorAll("path[data-c]")];
    return {
      fam: /** @type {string} */ (/** @type {HTMLElement} */ (el).dataset.fam),
      img: /** @type {HTMLImageElement} */ (el.querySelector("img")),
      svg, paths,
      has: new Set(paths.map((p) => /** @type {SVGPathElement} */ (p).dataset.c)),
      trig: /** @type {HTMLElement[]} */ ([...el.querySelectorAll(".pp-t")]),
      caps: /** @type {{g: SVGGElement, hole: SVGPathElement, k: number}[]} */ ([]),
    };
  });
  let shown = "";

  /* A stick's cap, cut from the photo by its own outline, slides over a black
     hole a little wider than it, so the photo's own cap never shows beside the
     moved one. The hole fades in with the tilt, leaving the photo untouched at
     rest, and the lit outline rides with the cap. */
  function buildCaps(pad) {
    const [, , w, h] = /** @type {string} */ (pad.svg.getAttribute("viewBox")).split(" ").map(Number);
    const defs = pad.svg.insertBefore(document.createElementNS(SVG, "defs"), pad.svg.firstChild);
    for (const c of ["ls", "rs"]) {
      const path = /** @type {SVGPathElement | null} */ (pad.svg.querySelector(`path[data-c="${c}"]`));
      if (!path) continue;
      const d = /** @type {string} */ (path.getAttribute("d"));
      const nums = (d.match(/-?[\d.]+/g) || []).map(Number);
      const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
      const r = (Math.max(...xs) - Math.min(...xs)) / 2;
      const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      const id = `pp-cap-${pad.fam}-${c}`;
      const clip = defs.appendChild(document.createElementNS(SVG, "clipPath"));
      clip.id = id;
      clip.appendChild(document.createElementNS(SVG, "path")).setAttribute("d", d);
      const hole = /** @type {SVGPathElement} */ (document.createElementNS(SVG, "path"));
      hole.setAttribute("d", d);
      hole.setAttribute("class", "pp-hole");
      hole.setAttribute("transform", `translate(${cx} ${cy}) scale(1.04) translate(${-cx} ${-cy})`);
      const g = /** @type {SVGGElement} */ (document.createElementNS(SVG, "g"));
      const img = g.appendChild(document.createElementNS(SVG, "image"));
      img.setAttribute("href", pad.img.currentSrc || pad.img.src);
      img.setAttribute("width", String(w));
      img.setAttribute("height", String(h));
      img.setAttribute("preserveAspectRatio", "none");
      img.setAttribute("clip-path", `url(#${id})`);
      path.replaceWith(hole, g);
      g.appendChild(path);
      pad.caps.push({ g, hole, k: r * THROW });
    }
    shown = "";
  }
  for (const pad of pads) {
    if (pad.img.complete && pad.img.naturalWidth) buildCaps(pad);
    else pad.img.addEventListener("load", () => buildCaps(pad), { once: true });
  }

  return {
    /** @param {string} fam */
    show(fam) { root.dataset.fam = fam; },

    /** @param {{held: Set<string>, axes: number[], trig: number[], layer: string}} s */
    render(s) {
      const lb = LAYER[s.layer] || LAYER.solo;
      const key = `${[...s.held].sort()}|${s.axes.map((a) => a.toFixed(2))}|${s.trig.map((t) => t.toFixed(2))}|${lb}`;
      if (key === shown) return;
      shown = key;
      root.style.setProperty("--pp-lb", `rgb(${lb})`);
      /* An LED strip reads white-hot at its core and coloured in its halo. */
      root.style.setProperty("--pp-lb-core", `rgb(${lb.split(",").map((v) => Math.round(+v * 0.72 + 255 * 0.28))})`);
      const lit = new Set(s.held);
      if (lit.has("l3") || Math.hypot(s.axes[0], s.axes[1]) > TILT) lit.add("ls");
      if (lit.has("r3") || Math.hypot(s.axes[2], s.axes[3]) > TILT) lit.add("rs");
      if (lit.has("touchpad")) lit.add("capture");
      for (const pad of pads) {
        const mine = new Set(lit);
        for (const [a, b] of DIAG) {
          const d = `${a}-${b}`;
          if (mine.has(a) && mine.has(b) && pad.has.has(d)) { mine.add(d); mine.delete(a); mine.delete(b); }
        }
        for (const p of pad.paths) {
          const c = /** @type {string} */ (/** @type {SVGPathElement} */ (p).dataset.c);
          if (c !== "lightbar") p.classList.toggle("is-on", mine.has(c));
        }
        pad.caps.forEach(({ g, hole, k }, i) => {
          const [x, y] = [s.axes[i * 2] ?? 0, s.axes[i * 2 + 1] ?? 0];
          g.setAttribute("transform", `translate(${x * k} ${y * k})`);
          hole.style.opacity = String(Math.min(1, Math.hypot(x, y) * 4));
        });
        pad.trig.forEach((t, i) => t.style.setProperty("--v", String(s.trig[i] ?? 0)));
      }
    },
  };
}
