// The pad beside the keyboard recording presses what the recording presses.
// The times are read off keyboard-light.mp4 frame by frame (a lit key that moves
// is a stick aiming, one that blinks is its trigger, the lit chip stepping is
// RB, the chips resetting is Y); both takes come from one cut, so they share them.
// Re-read them whenever tools/demo/loops.py records a new take.
import { nubs } from "./stick-nub.js";

(() => {
  const fig = /** @type {HTMLElement | null} */ (document.querySelector("[data-sync]"));
  const v = /** @type {HTMLVideoElement | null | undefined} */ (fig?.querySelector("video"));
  const a = /** @type {HTMLElement | null | undefined} */ (fig?.querySelector("#ty-a"));
  const b = /** @type {HTMLElement | null | undefined} */ (fig?.querySelector("#ty-b"));
  const sayA = fig?.querySelector(".say-a"), sayB = fig?.querySelector(".say-b");
  if (!fig || !v || !a || !b || !sayA || !sayB) return;

  // Where a line leaves each control: its top, as a share of the pad (controls-xs.svg).
  const AT = { ls: [24.4, 19.2], rs: [63.7, 43], r1: [75.6, 0.5], triangle: [75.9, 13.1], lt: [21, -13], rt: [79, -13] };
  const NAME = { ls: "Left stick", rs: "Right stick", r1: "RB", triangle: "Y", lt: "LT", rt: "RT" };
  // The suggestion chips, as a share of the recording; the text field is #ty-b's own place in type.css.
  const CHIPS = "78%";
  /** @type {[number, keyof typeof AT, string, number][]} seconds, control, what it does, how long it is held */
  const STEPS = [
    [2.75, "rs", "Opens the keyboard", 0.3],
    [4.3, "ls", "Aims at t", 0.75], [5.07, "lt", "Types t", 0.25],
    [5.6, "rs", "Aims at y", 0.7], [6.33, "rt", "Types y", 0.25],
    [7.47, "r1", "Next suggestion", 0.3], [8.6, "r1", "Next suggestion", 0.3], [9.47, "triangle", "Takes “type”", 0.35],
    [10.55, "ls", "Aims at w", 0.85], [11.47, "lt", "Types w", 0.25],
    [12.05, "rs", "Aims at i", 0.85], [12.97, "rt", "Types i", 0.25], [13.97, "triangle", "Takes “with”", 0.35],
    [15.63, "r1", "Next suggestion", 0.3], [16.67, "r1", "Next suggestion", 0.3], [17.62, "triangle", "Takes “your”", 0.35],
    [18.65, "ls", "Aims at c", 0.75], [19.47, "lt", "Types c", 0.25], [20.52, "triangle", "Takes “controller”", 0.35],
  ];
  // Each push of a stick: from, to, side (0 left), x, y. A held push repeats a key
  // every 0.12 s (SplitKeyboardStepper.swift), which is how the lit key moves here.
  /** @type {[number, number, 0 | 1, number, number][]} */
  const PUSH = [
    [4.38, 4.6, 0, 1, -1], [5.68, 5.9, 1, -1, -1],
    [10.58, 11, 0, -1, 0], [12.11, 12.45, 1, 1, 0], [18.68, 19, 0, 1, 1],
  ];
  const tilt = nubs(fig.querySelector(".pad svg"));
  const parts = Object.fromEntries(Object.keys(AT).map((c) => [c, fig.querySelector(`.pad [data-c="${c}"]`)]));
  const narrow = matchMedia("(max-width: 600px)");  // the phone crop shows the left half: no chips
  let shown = -1, raf = 0;

  const tick = () => {
    const t = v.currentTime;
    let i = STEPS.findLastIndex((s) => s[0] <= t);
    if (i < 0) i = STEPS.length - 1;  // the loop opens on the finished sentence
    for (const [c, el] of Object.entries(parts)) {
      el?.classList.toggle("on", STEPS.some(([s, k, , d]) => k === c && t >= s && t < s + d));
    }
    for (const side of /** @type {const} */ ([0, 1])) {
      const p = PUSH.find(([s, e, k]) => k === side && t >= s && t < e);
      tilt(side, p ? p[3] : 0, p ? p[4] : 0);
    }
    if (i !== shown) {
      shown = i;
      const [, c, does] = STEPS[i];
      const chips = (c === "r1" || c === "triangle") && !narrow.matches;
      a.style.setProperty("--x", `${AT[c][0]}%`);
      a.style.setProperty("--y", `${AT[c][1]}%`);
      a.dataset.tag = c === "lt" || c === "rt" ? "1" : "";
      if (chips) b.style.setProperty("--x", CHIPS); else b.style.removeProperty("--x");
      sayA.textContent = NAME[c];
      sayB.textContent = does;
      dispatchEvent(new Event("wire:redraw"));
    }
    if (!v.paused) raf = requestAnimationFrame(tick);
  };
  // One frame loop at a time: the loop attribute seeks to 0 on every wrap.
  const restart = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); };
  v.addEventListener("play", () => { fig.classList.add("synced"); restart(); });
  v.addEventListener("seeked", restart);
  narrow.addEventListener("change", () => { shown = -1; restart(); });
})();
