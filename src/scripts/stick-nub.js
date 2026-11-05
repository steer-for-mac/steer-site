// A stick's direction, drawn the way the app's corner view draws it
// (steer PadArt.swift dot(_:_:_:_:)): a dot inside the stick, pushed
// toward the tilt by up to 60% of its radius, and gone when the stick is centred.
// The stick outlines are polygons in art/controls-*.svg, so their boxes come from
// the path data: getBBox() reads zero on a pad that is display: none.

const NS = "http://www.w3.org/2000/svg";

/** @param {SVGPathElement} path */
function box(path) {
  const n = (path.getAttribute("d") || "").match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0 };
}

/**
 * @param {Element | null | undefined} svg  a pad's controls outline
 * @returns {(side: 0 | 1, x: number, y: number) => void}  0 is the left stick; x and y run -1 to 1, y down
 */
export function nubs(svg) {
  const dots = ["ls", "rs"].map((c) => {
    const path = /** @type {SVGPathElement | null | undefined} */ (svg?.querySelector(`[data-c="${c}"]`));
    if (!svg || !path) return null;
    const b = box(path);
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("class", "nub");
    dot.setAttribute("cx", String(b.cx));
    dot.setAttribute("cy", String(b.cy));
    dot.setAttribute("r", String(Math.max(4, b.w * 0.16)));
    svg.append(dot);
    return { dot, path, reach: (b.w / 2) * 0.6, last: "" };
  });
  return (side, x, y) => {
    const d = dots[side];
    if (!d) return;
    const m = Math.hypot(x, y), k = m > 1 ? 1 / m : 1;  // a diagonal push stays on the rim
    const key = m < 0.12 ? "" : `${(x * k * d.reach).toFixed(1)},${(y * k * d.reach).toFixed(1)}`;
    if (key === d.last) return;
    d.last = key;
    d.dot.classList.toggle("on", key !== "");
    d.path.classList.toggle("pushed", key !== "");  // lit under the white dot, whoever pushes it
    // A CSS transform, not the attribute, so the move eases; px are the outline's own units.
    if (key) d.dot.style.transform = `translate(${key.replace(",", "px, ")}px)`;
  };
}
