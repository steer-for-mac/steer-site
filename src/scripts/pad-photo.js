/* The photo controller (macros/pad-photo.njk) as a view. It reads no
   controller: its owner hands it a state, so replay, pad, keyboard and mouse
   all drive it alike. `held` is site button names (pad-family.js), `axes` the
   four stick axes, `trig` L2/R2 from 0 to 1, `layer` the demo's layer, for the bar. */

const SVG = "http://www.w3.org/2000/svg";
/* Two neighbouring directions make a diagonal. The Elite's faceted disc has a
   zone for it, which lights alone; a cross d-pad lights both arms. */
const DIAG = [["up", "left"], ["up", "right"], ["down", "left"], ["down", "right"]];
/* SteerCore/LEDConfig.swift `states`. Solo is 0,50,140 there, dimmed so a
   layer reads as a change; a screen shows the hue at full, or it reads as off. */
const LAYER = { solo: "0,91,255", l1: "255,165,0", r1: "255,220,0", l1r1: "0,200,180", l2: "255,80,140", r2: "160,80,255" };
const TILT = 0.5;           // a stick past halfway lights, as a click does
const THROW = 0.7;          // how far a cap slides at full tilt, in radii
/* What a pointer on an outline presses, in the demo's button names. */
export const PRESS = { ls: ["l3"], rs: ["r3"], capture: ["touchpad"], "up-left": ["up", "left"], "up-right": ["up", "right"],
  "down-left": ["down", "left"], "down-right": ["down", "right"] };
export const INERT = new Set(["dpad", "lightbar", "mute"]);
const DRAG = 6;             // CSS px a stick moves under the pointer before it is a tilt, not a click

/* The layer a set of held shoulders selects, in the demo's order (pad-demo.js layerNow). */
function layerOf(held) {
  if (held.has("l1") && held.has("r1")) return "l1r1";
  for (const m of ["l1", "l2", "r2", "r1"]) if (held.has(m)) return m;
  return "solo";
}

/** A frame's worth of nothing held. */
export const REST = Object.freeze({ held: new Set(), axes: [0, 0, 0, 0], trig: [0, 0], layer: "solo" });

/**
 * @param {Element} root holds one [data-pp-fam] per family, each with a svg.pad-controls
 * @param {{onInput?: (s: {held: Set<string>, axes: number[]}) => void}} [opts]
 *   onInput makes the outlines a controller: pressing a part presses its
 *   button, and dragging a stick's cap tilts it.
 */
export function padPhoto(root, opts = {}) {
  const pads = [...root.querySelectorAll("[data-pp-fam]")].map((el) => {
    const svg = /** @type {SVGSVGElement} */ (el.querySelector("svg.pad-controls"));
    const paths = [...svg.querySelectorAll("path[data-c]")];
    return {
      fam: /** @type {string} */ (/** @type {HTMLElement} */ (el).dataset.ppFam),
      img: /** @type {HTMLImageElement | null} */ (el.querySelector("img")),
      svg, paths,
      has: new Set(paths.map((p) => /** @type {SVGPathElement} */ (p).dataset.c)),
      trig: /** @type {HTMLElement[]} */ ([...el.querySelectorAll(".pp-t")]),
      caps: /** @type {{g: SVGGElement, hole: SVGPathElement, k: number}[]} */ ([]),
    };
  });
  let shown = "";

  /* A stick's cap, cut from the photo by its own outline, slides over a black
     hole a little wider than it, so the photo's own cap never shows beside the
     moved one. The hole fades in with the tilt; the lit outline rides along. */
  function buildCaps(pad) {
    const [, , w, h] = /** @type {string} */ (pad.svg.getAttribute("viewBox")).split(" ").map(Number);
    const defs = pad.svg.insertBefore(document.createElementNS(SVG, "defs"), pad.svg.firstChild);
    for (const c of ["ls", "rs"]) {
      const path = /** @type {SVGPathElement | null} */ (pad.svg.querySelector(`path[data-c="${c}"]`));
      if (!path || !pad.img) continue;
      const d = /** @type {string} */ (path.getAttribute("d"));
      const nums = (d.match(/-?[\d.]+/g) || []).map(Number);
      const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
      const r = (Math.max(...xs) - Math.min(...xs)) / 2;
      const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      const clip = defs.appendChild(document.createElementNS(SVG, "clipPath"));
      clip.id = `pp-cap-${pads.indexOf(pad)}-${c}-${Math.random().toString(36).slice(2, 7)}`;
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
      img.setAttribute("clip-path", `url(#${clip.id})`);
      path.replaceWith(hole, g);
      g.appendChild(path);
      pad.caps.push({ g, hole, k: r * THROW });
    }
    shown = "";
  }
  for (const pad of pads) {
    if (!pad.img) continue;
    if (pad.img.complete && pad.img.naturalWidth) buildCaps(pad);
    else pad.img.addEventListener("load", () => buildCaps(pad), { once: true });
  }

  if (opts.onInput) pointer(root, opts.onInput);

  return {
    /** @param {string} fam */
    show(fam) { /** @type {HTMLElement} */ (root).dataset.fam = fam; },

    /** @param {{held: Set<string>, axes?: number[], trig?: number[], layer?: string}} s */
    render(s) {
      const axes = s.axes || REST.axes;
      const trig = s.trig || [s.held.has("l2") ? 1 : 0, s.held.has("r2") ? 1 : 0];
      const lb = LAYER[s.layer || layerOf(s.held)] || LAYER.solo;
      const key = `${[...s.held].sort()}|${axes.map((a) => a.toFixed(2))}|${trig.map((t) => t.toFixed(2))}|${lb}`;
      if (key === shown) return;
      shown = key;
      const style = /** @type {HTMLElement} */ (root).style;
      style.setProperty("--pp-lb", `rgb(${lb})`);
      /* An LED strip reads white-hot at its core and coloured in its halo. */
      style.setProperty("--pp-lb-core", `rgb(${lb.split(",").map((v) => Math.round(+v * 0.72 + 255 * 0.28))})`);
      const lit = new Set(s.held);
      if (lit.has("l3") || Math.hypot(axes[0], axes[1]) > TILT) lit.add("ls");
      if (lit.has("r3") || Math.hypot(axes[2], axes[3]) > TILT) lit.add("rs");
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
          const [x, y] = [axes[i * 2] ?? 0, axes[i * 2 + 1] ?? 0];
          g.setAttribute("transform", `translate(${x * k} ${y * k})`);
          hole.style.opacity = String(Math.min(1, Math.hypot(x, y) * 4));
        });
        pad.trig.forEach((t, i) => t.style.setProperty("--v", String(trig[i] ?? 0)));
      }
    },
  };
}

/* The outlines as a controller. One pointer at a time: press a part and its
   button is held until release; press a stick's cap and drag, and it tilts by
   how far the pointer is from where it went down, a cap's radius being full
   tilt. A cap let go without dragging was a click. */
function pointer(root, onInput) {
  /** @type {null | {id: number, names: string[], stick: number, x: number, y: number, r: number, moved: boolean}} */
  let press = null;
  let release = 0;          // a stick click's pending release, cancelled by the next press
  const emit = (held, axes) => onInput({ held: new Set(held), axes });
  root.classList.add("is-live");
  root.addEventListener("pointerdown", (e) => {
    const p = /** @type {Element} */ (e.target).closest("path[data-c]");
    const c = p && /** @type {SVGPathElement} */ (p).dataset.c;
    if (!p || !c || INERT.has(c) || press) return;
    e.preventDefault();
    clearTimeout(release);
    const box = p.getBoundingClientRect();
    const stick = c === "ls" ? 0 : c === "rs" ? 2 : -1;
    press = { id: e.pointerId, names: PRESS[c] || [c], stick, x: e.clientX, y: e.clientY, r: box.width / 2, moved: false };
    try { /** @type {Element} */ (e.target).setPointerCapture(e.pointerId); } catch { /* a pointer already gone */ }
    emit(stick < 0 ? press.names : [], [0, 0, 0, 0]);
  });
  root.addEventListener("pointermove", (e) => {
    if (!press || e.pointerId !== press.id || press.stick < 0) return;
    const dx = e.clientX - press.x, dy = e.clientY - press.y;
    if (!press.moved && Math.hypot(dx, dy) < DRAG) return;
    press.moved = true;
    const m = Math.hypot(dx, dy) / press.r, k = m > 1 ? 1 / m : 1;
    const axes = [0, 0, 0, 0];
    axes[press.stick] = (dx / press.r) * k;
    axes[press.stick + 1] = (dy / press.r) * k;
    emit([], axes);
  });
  const up = (e) => {
    if (!press || e.pointerId !== press.id) return;
    const click = press.stick >= 0 && !press.moved ? press.names : null;
    press = null;
    if (!click) return emit([], [0, 0, 0, 0]);
    /* A tap on a cap is a stick click: held for a beat, so the demo's frame sees it. */
    emit(click, [0, 0, 0, 0]);
    release = setTimeout(() => emit([], [0, 0, 0, 0]), 120);
  };
  root.addEventListener("pointerup", up);
  root.addEventListener("pointercancel", up);
}
