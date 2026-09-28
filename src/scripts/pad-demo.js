/* One virtual pad, three sources (replay, real controller, keyboard), one
   engine that resolves presses against Steer's default profile. The replay
   can only do what a pad can, and the help card renders from the same table
   the presses resolve against. Sources: play.html's header comment. */

import { familyOf, glyphOf, nameOf, padNameOf } from "./pad-family.js";
import { padPhoto } from "./pad-photo.js";

const $ = (id) => document.getElementById(id);
const stage = $("pyStage");
const ta = /** @type {HTMLTextAreaElement|null} */ ($("pyText"));

if (stage && ta) init();

function init() {
  const root = document.documentElement;
  const cursorEl = $("pyCursor"), osk = $("pyOsk"), ring = $("pyRing"), help = $("pyHelp");
  const disc = $("pyDisc"), ringName = $("pyRingName"), wheel = $("pyWheel"), table = $("pyTable");
  const modeEl = $("pyMode"), modeText = $("pyModeText"), layerEl = $("pyLayer"), lastEl = $("pyLast");
  const stateEl = $("pyState"), legend = $("pyLegend"), toast = $("pyToast"), cta = $("pyCta"), ctaText = $("pyCtaText");
  const helpLive = $("pyHelpLive"), helpSub = $("pyHelpSub"), hubEl = $("pyHub"), aimDot = $("pyAimDot");
  const photo = padPhoto(/** @type {HTMLElement} */ (document.querySelector(".pp")));

  /* Standard-mapping indices (w3c.github.io/gamepad/#remapping). Positional,
     and so is Steer: `cross` is the SOUTH button on every family
     (ControllerAdapter: s.cross = gamepad.buttonA). */
  const IDX = ["cross", "circle", "square", "triangle", "l1", "r1", "l2", "r2",
    "create", "options", "l3", "r3", "up", "down", "left", "right", "home", "touchpad"];
  const MODS = ["l1", "r1", "l2", "r2"];

  const name = (b) => nameOf(fam, b);

  /* Defaults.swift, layer by layer. Values are the labels the app's own help
     card prints (assets/help-overlay.png), so the card below reads the same. */
  const SOLO = { cross: "Left Click", circle: "Right Click", triangle: "↩", square: "⎋",
    r1: "Spotlight", l2: "App Switch", r2: "␣", up: "↑", down: "↓", left: "←", right: "→",
    options: "Mission Control", create: "Help Overlay", touchpad: "Dictation", l3: "Radial Menu", r3: "Gyro Toggle" };
  const LAYERS = {
    solo: SOLO,
    l1: { cross: "Fullscreen", circle: "Close Tab", triangle: "Dictation", square: "Mute", r1: "⇥",
      r2: "Play/Pause", up: "Volume Up", down: "Volume Down", left: "Previous Track", right: "Next Track",
      l3: "Radial Menu (Secondary)", r3: "On-Screen Keyboard" },
    r1: { cross: "⌘A", circle: "⇧⌘→", triangle: "⇧⌘↑", square: "⇧⌘↓",
      up: "⇧↑", down: "⇧↓", left: "⇧←", right: "⇧→" },
    l1r1: { cross: "⌘C", circle: "⌘V", triangle: "⌘X", square: "⌘Z",
      up: "⌘↑", down: "⌘↓", left: "⌘←", right: "⌘→" },
    l2: { circle: "⌫", triangle: "⌘K", square: "⌘D", r1: "⌃⇥", r2: "⌃⇧⇥",
      up: "⇞", down: "⇟", left: "⌘[", right: "⌘]" },
    r2: { cross: "⌘F", circle: "⌘G", triangle: "⇧⌘G", square: "⎋",
      up: "⌘↑", down: "⌘↓", left: "↖", right: "↘" },
  };
  const LAYER_ORDER = ["solo", "l1", "r1", "l1r1", "l2", "r2"];

  /* ProfileDefaults.makeDefault: no gyroscope (Xbox, generic) moves the ring
     to R3 and puts Mission Control on L3; no touchpad drops Touchpad Click. */
  function soloFor(f) {
    const s = { ...SOLO };
    if (f === "xb") { s.r3 = "Radial Menu"; s.l3 = "Mission Control"; }
    if (f !== "ps") delete s.touchpad;
    return s;
  }
  const binding = (layer, b) => (layer === "solo" ? soloFor(fam) : LAYERS[layer])[b];

  /* RadialMenuDefaults.swift: nine apps clockwise from Safari; the secondary
     ring (L1 + L3) holds seven workflow actions. */
  const RING = ["Safari", "Finder", "Music", "Mail", "Calendar", "Notes", "Messages", "System Settings", "Maps"];
  const RING2 = ["Screenshot", "Lock Screen", "Hide App", "Show Desktop", "Find", "Reload", "Steer Settings"];

  /* DaisyWheelLayout.swift, clusters N..NW clockwise, keys [N, E, S, W]. */
  const DAISY = {
    base: ["bcda", "fghe", "jkli", "nopm", "rstq", "vwxu", "z,.y", "?@-/"].map((s) => [...s]),
    shifted: ["BCDA", "FGHE", "JKLI", "NOPM", "RSTQ", "VWXU", "Z<>Y", "!*_;"].map((s) => [...s]),
    symbols: [["1", "2", "3", "0"], ["5", "6", "7", "4"], ["9", "+", "=", "8"], ["#", "$", "%", "@"],
      ["&", "(", ")", "!"], ["{", "}", "]", "["], ["\n", "<", ">", "\t"], ["|", "\"", "'", "\\"]],
    controls: [["↑", "→", "↓", "←"], ["F1", "F2", "F3", "F4"], ["F5", "F6", "F7", "F8"],
      ["F9", "F10", "F11", "F12"], ["Home", "PgUp", "End", "PgDn"], ["esc", "\t", "\n", "⌫"],
      ["⌘↑", "⌘→", "⌘↓", "⌘←"], ["⌥↑", "⌥→", "⌥↓", "⌥←"]],
  };
  const FACE_SLOT = { triangle: 0, circle: 1, cross: 2, square: 3 };
  const LATCH = { left: "⌃", down: "⌥", right: "⌘", up: "⇧" };
  const shown = (c) => (c === "\n" ? "↩" : c === "\t" ? "⇥" : c);

  const DEAD_STICK = 0.12;   // StickConfig.deadZone
  const DEAD_AIM = 0.3;      // RadialMenu / DaisyWheelLayout.deadZone
  const TAP_MAX = 280;       // ModTapConfig.holdThreshold default, ms

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const still = () => root.classList.contains("still");
  if (navigator.webdriver) root.classList.add("still");

  let fam = "ps";
  let mode = "still";          // still | ghost | pad | keys
  let overlay = still() || reduced.matches ? "osk" : null;
  let ringKind = "primary";
  let aim = -1;
  let latch = new Set();
  let cur = { x: 0, y: 0 };
  let prev = blank();
  let held = {};               // modifier -> { at, layer, used }
  let padIndex = -1, padName = "";
  let acted = false;
  let last = performance.now();
  let toastTimer = 0;

  /* t: L2 and R2 from 0 to 1. Only a real pad has the analog value; the replay
     and the keyboard pull a trigger all the way or not at all. */
  function blank() { return { axes: [0, 0, 0, 0], b: IDX.map(() => false), t: null }; }
  const on = (v, b) => v.b[IDX.indexOf(b)];

  /* ---------- sources ---------- */

  const ghostPad = blank();
  const keyPad = blank();
  let ghost = null, ghostWait = 0;

  function readPad() {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of list || []) {
      if (!gp || !gp.connected) continue;
      const v = blank();
      gp.axes.slice(0, 4).forEach((a, i) => { v.axes[i] = a || 0; });
      IDX.forEach((_, i) => { const btn = gp.buttons[i]; v.b[i] = !!btn && (btn.pressed || btn.value > 0.5); });
      v.t = [gp.buttons[6]?.value ?? 0, gp.buttons[7]?.value ?? 0];
      return { gp, v };
    }
    return null;
  }

  /* ---------- the engine ---------- */

  function layerNow(v) {
    const h = (b) => on(v, b);
    if (h("l1") && h("r1")) return "l1r1";
    if (h("l1")) return "l1";
    if (h("l2")) return "l2";
    if (h("r2")) return "r2";
    if (h("r1")) return "r1";
    return "solo";
  }
  /* The layer a modifier press lands in: the other shoulders held with it. */
  function layerWithout(v, m) {
    const c = { ...v, b: v.b.slice() };
    c.b[IDX.indexOf(m)] = false;
    return layerNow(c);
  }

  function step(v, dt, now) {
    const rose = (b) => on(v, b) && !on(prev, b);
    const fell = (b) => !on(v, b) && on(prev, b);
    const lx = v.axes[0] ?? 0, ly = v.axes[1] ?? 0, ry = v.axes[3] ?? 0;

    if (overlay === "osk") {
      stepOsk(v, rose, lx, ly);
    } else if (overlay === "ring") {
      stepRing(rose, lx, ly);
    } else {
      moveCursor(lx, ly, dt);
      if (Math.abs(ry) > DEAD_STICK) ta.scrollTop += ry * 600 * dt;
      stepButtons(v, rose, fell, now);
    }
    renderHud(v);
    const l = layerNow(v);
    layerEl.textContent = l === "solo" ? "Solo" : l === "l1r1" ? name("l1") + " + " + name("r1") : name(l);
    if (!help.hidden) lightColumn(l);
  }

  function stepButtons(v, rose, fell, now) {
    /* Shoulders are modifiers first. A shoulder with a job of its own (R1
       Spotlight, L2 App Switch, R2 Space) fires it only as a clean tap: released
       quickly, nothing else pressed meanwhile. The mod-tap rule the
       Defaults.swift L2 comment describes. */
    for (const m of MODS) {
      if (rose(m)) {
        for (const k in held) held[k].used = true;
        held[m] = { at: now, layer: layerWithout(v, m), used: false };
      } else if (fell(m) && held[m]) {
        const h = held[m];
        delete held[m];
        if (!h.used && now - h.at < TAP_MAX) fire(h.layer, m);
      }
    }
    for (const b of IDX) {
      if (MODS.includes(b) || !rose(b)) continue;
      for (const k in held) held[k].used = true;
      fire(layerNow(v), b);
    }
  }

  function fire(layer, b) {
    const label = binding(layer, b);
    if (!label) { note(name(b), "no job here on its own"); return; }
    markActed();
    switch (label) {
      case "Left Click": click(); return;
      case "Radial Menu": openRing("primary"); say(b, label); return;
      case "Radial Menu (Secondary)": openRing("secondary"); say(b, label); return;
      case "On-Screen Keyboard": openOsk(); say(b, label); return;
      case "Help Overlay": toggleHelp(); say(b, label); return;
      case "↩": if (typing()) insert("\n"); say(b, "Return"); return;
      case "␣": if (typing()) insert(" "); say(b, "Space"); return;
      case "⌫": if (typing()) del(); say(b, "Delete"); return;
      case "←": case "→": case "↑": case "↓": caret(label, false); say(b, label); return;
      case "⇧←": case "⇧→": caret(label.slice(1), true); say(b, label); return;
      case "⌘←": case "⌘→": case "⌘↑": case "⌘↓": jump(label.slice(1)); say(b, label); return;
      case "⌘A": if (typing()) ta.select(); say(b, label); return;
      default: mac(b, label);
    }
  }

  /* ---------- desk ---------- */

  function stageBox() { return stage.getBoundingClientRect(); }

  function moveCursor(lx, ly, dt) {
    const mag = Math.hypot(lx, ly);
    if (mag < DEAD_STICK) return;
    /* Steer: 1400 pt/s at full throw with a 2.2 curve (StickConfig). This box
       is a fraction of a screen, so the speed is scaled to its width. */
    const box = stageBox();
    const t = Math.min(1, (mag - DEAD_STICK) / (1 - DEAD_STICK));
    const speed = Math.max(box.width, 360) * 1.1 * Math.pow(t, 2.2);
    cur.x = clamp(cur.x + (lx / mag) * speed * dt, 4, box.width - 4);
    cur.y = clamp(cur.y + (ly / mag) * speed * dt, 4, box.height - 4);
    placeCursor();
  }
  function placeCursor() {
    cursorEl.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
    const el = under();
    stage.querySelectorAll(".is-over").forEach((n) => { if (n !== el) n.classList.remove("is-over"); });
    if (el && el.matches(".py-act, .py-text")) el.classList.add("is-over");
  }
  function under() {
    const box = stageBox();
    const el = document.elementFromPoint(box.left + cur.x, box.top + cur.y);
    return el && stage.contains(el) ? el.closest(".py-act, .py-text, .py-petal span, .py-item, .py-x") || el : null;
  }
  function click() {
    const el = under();
    cursorEl.classList.remove("is-click");
    void cursorEl.offsetWidth;
    cursorEl.classList.add("is-click");
    if (!el) { say("cross", "Left Click"); return; }
    if (el === ta) { ta.focus({ preventScroll: true }); say("cross", "Left Click, in the note"); return; }
    if (el instanceof HTMLButtonElement) { el.click(); return; }
    say("cross", "Left Click");
  }

  const typing = () => document.activeElement === ta;
  function insert(s) {
    ta.focus({ preventScroll: true });
    ta.setRangeText(s, ta.selectionStart, ta.selectionEnd, "end");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function del() {
    ta.focus({ preventScroll: true });
    const a = ta.selectionStart, e = ta.selectionEnd;
    if (a !== e) ta.setRangeText("", a, e, "end");
    else if (a > 0) ta.setRangeText("", a - 1, a, "end");
  }
  function caret(dir, extend) {
    if (!typing()) return;
    const a = ta.selectionStart, e = ta.selectionEnd, n = ta.value.length;
    if (dir === "←" || dir === "→") {
      const d = dir === "←" ? -1 : 1;
      if (extend) ta.setSelectionRange(a, clamp(e + d, a, n));
      else { const p = clamp((d < 0 ? a : e) + (a === e ? d : 0), 0, n); ta.setSelectionRange(p, p); }
    } else {
      const p = dir === "↑" ? ta.value.lastIndexOf("\n", a - 1) : ta.value.indexOf("\n", e);
      const q = dir === "↑" ? Math.max(0, p) : p < 0 ? n : p + 1;
      ta.setSelectionRange(q, q);
    }
  }
  function jump(dir) {
    if (!typing()) return;
    const v = ta.value, a = ta.selectionStart;
    let p;
    if (dir === "↑") p = 0;
    else if (dir === "↓") p = v.length;
    else if (dir === "←") p = v.lastIndexOf("\n", a - 1) + 1;
    else { const i = v.indexOf("\n", a); p = i < 0 ? v.length : i; }
    ta.setSelectionRange(p, p);
  }

  /* ---------- the keyboard (daisy wheel) ---------- */

  function oskLayer(v) {
    const l1 = on(v, "l1"), r1 = on(v, "r1");
    return l1 && r1 ? "controls" : l1 ? "shifted" : r1 ? "symbols" : "base";
  }
  let paintedLayer = "";
  function paintWheel(layer) {
    if (layer === paintedLayer) return;
    paintedLayer = layer;
    wheel.querySelectorAll(".py-petal").forEach((p, i) => {
      p.querySelectorAll("span").forEach((s, k) => { s.textContent = shown(DAISY[layer][i][k]); });
    });
    wheel.dataset.layer = layer;
  }
  function stepOsk(v, rose, lx, ly) {
    paintWheel(oskLayer(v));
    setAim(aimAt(lx, ly, 8), wheel.querySelectorAll(".py-petal"));
    aimDot.style.transform = `translate(${lx * 22}px, ${ly * 22}px)`;
    for (const b in FACE_SLOT) if (rose(b)) commit(FACE_SLOT[b], b);
    if (rose("l2")) { markActed(); del(); latch.clear(); paintLatch(); say("l2", "Delete"); }
    if (rose("r2")) { markActed(); latched("Space", " "); say("r2", "Space"); }
    if (rose("r3")) {
      markActed();
      /* L1 + R3 resolves to .daisyWheel and toggles it shut; R3 alone is the
         wheel's Return (handleDaisyWheelOverride). */
      if (on(v, "l1")) { closeOsk(); say("r3", "On-Screen Keyboard, closed"); }
      else { latched("Return", "\n"); say("r3", "Return"); }
    }
    for (const d in LATCH) if (rose(d)) { markActed(); toggleLatch(LATCH[d]); }
  }
  function commit(slot, b) {
    if (aim < 0) return;           // a press in the dead zone types nothing
    const layer = wheel.dataset.layer || "base";
    const c = DAISY[layer][aim][slot];
    const span = wheel.querySelectorAll(".py-petal")[aim].children[slot];
    flash(span);
    markActed();
    rumble();
    if (layer === "controls") { controlKey(c); say(b, c === "\n" ? "Return" : c === "\t" ? "Tab" : c); return; }
    if (latch.size) {
      const combo = [...latch].join("") + c.toUpperCase();
      latch.clear(); paintLatch();
      if (combo.length === 2 && combo[0] === "⇧") { insert(c.toUpperCase()); say(b, c.toUpperCase()); return; }
      mac(b, combo);
      return;
    }
    insert(c);
    say(b, c === "\n" ? "Return" : c === "\t" ? "Tab" : c === " " ? "Space" : c);
  }
  function controlKey(c) {
    if (c === "\n" || c === "\t") insert(c);
    else if (c === "⌫") del();
    else if (["←", "→", "↑", "↓"].includes(c)) caret(c, false);
    else if (c.startsWith("⌘")) jump(c.slice(1));
    else mac("cross", c);
  }
  function latched(label, s) {
    if (latch.size) { const l = [...latch].join(""); latch.clear(); paintLatch(); mac("r2", l + label); return; }
    insert(s);
  }
  function toggleLatch(g) {
    if (latch.has(g)) latch.delete(g); else latch.add(g);
    paintLatch();
  }
  function paintLatch() {
    hubEl.textContent = latch.size ? [...latch].join(" ") + " held for the next key" : "left stick aims · face button commits";
  }

  function openOsk() {
    overlay = "osk"; osk.hidden = false; ring.hidden = true; help.hidden = true;
    latch.clear(); paintLatch(); paintedLayer = ""; paintWheel("base");
    ta.focus({ preventScroll: true });
    legendFor();
  }
  function closeOsk() { overlay = null; osk.hidden = true; setAim(-1, wheel.querySelectorAll(".py-petal")); legendFor(); }

  /* ---------- the app ring ---------- */

  function openRing(kind) {
    ringKind = kind;
    const items = kind === "primary" ? RING : RING2;
    /* RadialRingGeometry: items at 0.62 of the 172pt radius, on a disc of
       2 * 172 + 50, so 27.07% of the disc's width from its centre. */
    disc.replaceChildren(...items.map((label, i) => {
      const a = (i / items.length) * Math.PI * 2;
      const b = document.createElement("button");
      b.type = "button";
      b.className = kind === "primary" ? "py-item" : "py-item is-sym";
      const t = document.createElement("span");
      t.className = kind === "primary" ? "py-vh" : "py-sym";
      t.textContent = label;
      b.append(t);
      if (kind === "primary") b.style.setProperty("--i", String(i));
      b.style.setProperty("--x", (50 + 27.07 * Math.sin(a)).toFixed(2) + "%");
      b.style.setProperty("--y", (50 - 27.07 * Math.cos(a)).toFixed(2) + "%");
      b.addEventListener("click", () => { takeFromMouse(); aim = i; ringCommit(); });
      b.addEventListener("pointerenter", () => { pointerAim = true; setAim(i, disc.querySelectorAll(".py-item")); });
      return b;
    }), ringName);
    disc.dataset.kind = kind;
    overlay = "ring"; ring.hidden = false; osk.hidden = true; help.hidden = true;
    aim = -1; pointerAim = false; nameAim();
    legendFor();
  }
  /* The aimed item's name lives in the hub, not under its icon (RadialMenu.swift hubLabel). */
  function nameAim() {
    const items = ringKind === "primary" ? RING : RING2;
    const n = overlay === "ring" && aim >= 0 ? items[aim] : "";
    if (ringName.textContent !== n) ringName.textContent = n;
    ring.classList.toggle("is-named", !!n);
  }
  /* A mouse aims too; a stick at rest must not take that aim back. */
  let pointerAim = false;
  function stepRing(rose, lx, ly) {
    const items = disc.querySelectorAll(".py-item");
    const a = aimAt(lx, ly, items.length);
    if (a >= 0) pointerAim = false;
    if (!pointerAim) setAim(a, items);
    if (rose("cross")) { markActed(); ringCommit(); return; }
    if (rose("circle") || rose("square") || rose("l3")) { markActed(); closeRing(); say(rose("l3") ? "l3" : rose("square") ? "square" : "circle", "Cancel"); }
  }
  function ringCommit() {
    const items = ringKind === "primary" ? RING : RING2;
    const pick = items[aim];
    closeRing();
    if (pick) { rumble(); mac("cross", ringKind === "primary" ? "Opening " + pick : pick); }
  }
  /* Instant open, fade-only close (RadialMenu.swift): the fade lives in CSS. */
  function closeRing() {
    overlay = null;
    ring.classList.add("is-closing");
    setTimeout(() => { ring.hidden = true; ring.classList.remove("is-closing"); }, reduced.matches ? 0 : 180);
    legendFor();
  }

  /* RadialGeometry.bandIndex: equal bands centred on each item, item 0 north. */
  function aimAt(x, y, n) {
    if (Math.hypot(x, y) < DEAD_AIM) return -1;
    const ang = Math.atan2(x, -y);
    return ((Math.round(ang / (2 * Math.PI / n)) % n) + n) % n;
  }
  function setAim(i, els) {
    if (i === aim && els[i]?.classList.contains("is-aim")) return;
    aim = i;
    els.forEach((el, k) => el.classList.toggle("is-aim", k === i));
    if (overlay === "ring") nameAim();
  }

  /* ---------- the help card ---------- */

  const ROWS = () => ["cross", "circle", "triangle", "square", "l1", "r1", "l2", "r2", "up", "down", "left", "right",
    "options", "create", ...(fam === "ps" ? ["touchpad"] : []), "l3", "r3"];
  function count(layer) { return ROWS().filter((b) => binding(layer, b)).length; }
  function colName(l) { return l === "solo" ? "Solo" : l === "l1r1" ? name("l1") + "+" + name("r1") : name(l); }
  function buildTable() {
    const head = "<thead><tr><th scope=\"col\">Button</th>" +
      LAYER_ORDER.map((l) => `<th scope="col" data-l="${l}">${colName(l)}<small>${count(l)}</small></th>`).join("") + "</tr></thead>";
    const body = ROWS().map((b) => `<tr><th scope="row">${glyph(b)}<span>${esc(name(b))}</span></th>` +
      LAYER_ORDER.map((l) => `<td data-l="${l}">${esc(binding(l, b) || "—")}</td>`).join("") + "</tr>").join("");
    const sticks = `<tr class="py-sticks"><th scope="row">${glyph("ls")}</th><td colspan="6">Mouse</td></tr>` +
      `<tr class="py-sticks"><th scope="row">${glyph("rs")}</th><td colspan="6">Scroll</td></tr>`;
    table.innerHTML = head + "<tbody>" + body + sticks + "</tbody>";
    helpSub.textContent = "Default profile · " + LAYER_ORDER.reduce((n, l) => n + count(l), 0) + " bindings";
  }
  let litCol = "";
  function lightColumn(l) {
    if (l === litCol) return;
    litCol = l;
    table.querySelectorAll("[data-l]").forEach((c) => c.classList.toggle("is-lit", l !== "solo" && c.getAttribute("data-l") === l));
    helpLive.textContent = l === "solo" ? "Hold a shoulder button to light its column."
      : `Active now · ${colName(l)} · ${count(l)} bindings available · release to return to Solo`;
  }
  function toggleHelp() {
    help.hidden = !help.hidden;
    if (!help.hidden && overlay) { if (overlay === "osk") closeOsk(); else { overlay = null; ring.hidden = true; } }
    if (!help.hidden) { buildTable(); litCol = ""; lightColumn("solo"); }
    legendFor();
  }

  /* ---------- glyphs, legend, status ---------- */

  const glyph = (b) => glyphOf(fam, b);
  function relabel() {
    photo.show(fam);
    document.querySelectorAll(".py-osk .py-g, .py-ring .py-g").forEach((el) => {
      const b = el.getAttribute("data-b");
      if (b) el.outerHTML = glyph(b);
    });
    if (!help.hidden) buildTable();
    legendFor();
    reserve();
  }
  const ringBtn = () => (fam === "xb" ? "r3" : "l3");
  function legendRows(over, helpShown) {
    if (over === "osk") return [
      [["ls"], "Aim at a cluster of letters"],
      [["triangle", "circle", "cross", "square"], "Type the letter in that position"],
      [["l1"], "Hold for capitals"], [["r1"], "Hold for numbers and symbols"],
      [["l2", "r2", "r3"], "Delete, space, return"],
      [["l1", "r3"], "Together: close the keyboard"],
    ];
    if (over === "ring") return [
      [["ls"], "Aim at an app"], [["cross"], "Select"], [["circle"], "Cancel"],
    ];
    return [
      [["ls"], "Move the pointer"], [["cross"], "Click"], [["rs"], "Scroll the note"],
      [[ringBtn()], "Open the app ring"], [["l1", "r3"], "Together: open the keyboard"],
      [["create"], helpShown ? "Hide the help card" : "Show the help card"],
      [["l1"], "Hold: every button changes job"],
    ];
  }
  const legendHtml = (over, helpShown) => legendRows(over, helpShown)
    .map(([bs, t]) => `<li><span class="py-gs">${bs.map(glyph).join("")}</span><span>${t}</span></li>`).join("");
  function legendFor() { legend.innerHTML = legendHtml(overlay, !help.hidden); }

  /* A pane that changes length moves the page under it, so each changing text
     sits in a .py-slot beside an invisible copy of every state it can take.
     Copies, not a measured min-height: the cell re-fits at every width, where
     a number would need re-measuring on each resize. Rebuilt on relabel, since
     the family changes the words and the glyphs' widths. */
  const WAIT = "Try it first: press any button on your controller.";
  const GONE = "Controller disconnected. Reconnect it and press any button.";
  /* The pad's name is in two of the texts and is not known until a pad takes
     over, so they are reserved for a long stand-in as well as the real one:
     a real name shorter than the stand-in must not shrink the pane either. */
  function reserve() {
    const names = [...new Set(["Nintendo Switch Pro Controller", padName || "controller"])];
    sizers(stateEl, [stateFor("ghost"), stateFor("keys"), stateFor("still"), GONE,
      ...names.flatMap((n) => [stateFor("pad", n, "xb"), stateFor("pad", n, fam)])], false);
    sizers(legend, [legendHtml("osk", false), legendHtml("ring", false), legendHtml(null, false), legendHtml(null, true)], true);
    sizers(ctaText, [WAIT, goText("keys"), ...names.map((n) => goText("pad", n))], false);
  }
  function sizers(el, texts, html) {
    const slot = el.parentElement;
    slot.querySelectorAll(".py-sizer").forEach((n) => n.remove());
    for (const t of texts) {
      const c = /** @type {HTMLElement} */ (el.cloneNode(false));
      c.removeAttribute("id");
      c.removeAttribute("aria-live");
      c.classList.add("py-sizer");
      c.setAttribute("aria-hidden", "true");
      if (html) c.innerHTML = t; else c.textContent = t;
      slot.append(c);
    }
  }

  function say(b, what) {
    lastEl.textContent = (b ? name(b) + ": " : "") + what;
  }
  /* A job only macOS can do. Named, never faked. */
  function mac(b, what) {
    lastEl.textContent = name(b) + ": " + what;
    showToast("On your Mac: " + what + ". A web page can't do that one.");
  }
  function note(b, what) { lastEl.textContent = b + ": " + what; }
  function showToast(t) {
    toast.textContent = t;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-on"), 2200);
  }
  function flash(el) {
    if (!el) return;
    el.classList.remove("is-hit");
    void el.offsetWidth;
    el.classList.add("is-hit");
  }
  function renderHud(v) {
    photo.render({
      held: new Set(IDX.filter((_, i) => v.b[i])),
      axes: v.axes,
      trig: v.t || [on(v, "l2") ? 1 : 0, on(v, "r2") ? 1 : 0],
      layer: layerNow(v),
    });
  }

  function setMode(m, detail) {
    mode = m;
    modeEl.dataset.mode = m;
    const words = {
      ghost: "Replay",
      pad: detail || "Your controller",
      keys: "Keyboard",
      still: "Still frame",
    };
    modeText.textContent = words[m];
    stateEl.textContent = stateFor(m, detail, fam);
  }
  function stateFor(m, detail, f) {
    return {
      ghost: "A replay of Steer at work: the controller clicks into the note, types “Hello, Mac.” on the on-screen keyboard, " +
        "then opens the app ring and the help card. Your browser can't see your controller until you press a button on it.",
      pad: `Your ${detail || "controller"} is driving this page with Steer's default layout.` +
        (f === "xb" ? " Xbox controllers have no motion sensor, so Steer puts the app ring on the right stick click instead." : ""),
      keys: "You're using the keyboard as a stand-in controller. The layout is the one Steer puts on a pad.",
      still: reduced.matches
        ? "A still of Steer's on-screen keyboard. The replay is off because your Mac is set to reduce motion. Press any button on a controller to drive the page."
        : "A still of Steer's on-screen keyboard, mid-sentence. Press any button on a controller to drive the page.",
    }[m];
  }

  function markActed() {
    if (acted || mode === "ghost" || mode === "still") return;
    acted = true;
    cta.dataset.state = "go";
    ctaText.textContent = goText(mode, padName);
  }
  function goText(m, n) {
    return m === "pad"
      ? `That was your ${n || "controller"} on Steer's real layout. On a Mac it works in every app, every menu, every text field.`
      : "That is Steer's real layout. With a controller, it works in every app on your Mac.";
  }

  function rumble() {
    if (mode !== "pad") return;
    const gp = (navigator.getGamepads ? navigator.getGamepads() : [])[padIndex];
    const act = gp && /** @type {any} */ (gp).vibrationActuator;
    try { act?.playEffect?.("dual-rumble", { duration: 40, strongMagnitude: 0, weakMagnitude: 0.35 }); } catch { }
  }

  /* ---------- the replay ---------- */

  function center(el) {
    const b = stageBox(), r = el.getBoundingClientRect();
    return { x: r.left - b.left + r.width / 2, y: r.top - b.top + Math.min(r.height / 2, 40) };
  }
  function find(c) {
    for (const [layer, mod] of [["base", null], ["shifted", "l1"], ["symbols", "r1"]]) {
      for (let i = 0; i < 8; i++) {
        const k = DAISY[layer][i].indexOf(c);
        if (k >= 0) return { i, k, mod };
      }
    }
    return null;
  }
  const set = (b, down) => { ghostPad.b[IDX.indexOf(b)] = down; };
  const stick = (x, y) => { ghostPad.axes[0] = x; ghostPad.axes[1] = y; };

  function* moveTo(el) {
    for (;;) {
      const t = center(el), dx = t.x - cur.x, dy = t.y - cur.y, d = Math.hypot(dx, dy);
      if (d < 10) { stick(0, 0); return; }
      const m = Math.min(0.95, 0.35 + d / 260);
      stick((dx / d) * m, (dy / d) * m);
      yield 0;
    }
  }
  function* tap(...bs) { bs.forEach((b) => set(b, true)); yield 120; bs.forEach((b) => set(b, false)); yield 160; }
  function* chord(mod, b) { set(mod, true); yield 140; set(b, true); yield 120; set(b, false); yield 80; set(mod, false); yield 220; }
  function* aimAtIndex(i, n, ms) {
    const a = (i / n) * Math.PI * 2;
    stick(Math.sin(a) * 0.95, -Math.cos(a) * 0.95);
    yield ms;
  }
  function* type(text) {
    for (const c of text) {
      if (c === " ") { stick(0, 0); yield* tap("r2"); continue; }
      const f = find(c);
      if (!f) continue;
      if (f.mod) { set(f.mod, true); yield 90; }
      yield* aimAtIndex(f.i, 8, 300);
      const face = Object.keys(FACE_SLOT).find((b) => FACE_SLOT[b] === f.k);
      if (face) yield* tap(face);
      if (f.mod) { set(f.mod, false); yield 60; }
    }
    stick(0, 0);
  }
  function* script() {
    for (;;) {
      resetDesk();
      yield 900;
      yield* moveTo(ta);
      yield* tap("cross");
      yield 300;
      yield* chord("l1", "r3");
      yield 500;
      yield* type("Hello, Mac.");
      yield 1400;
      yield* chord("l1", "r3");
      yield 700;
      yield* tap(ringBtn());
      yield 500;
      yield* aimAtIndex(5, 9, 900);
      yield* aimAtIndex(0, 9, 900);
      stick(0, 0);
      yield 200;
      yield* tap("circle");
      yield 700;
      yield* tap("create");
      yield 900;
      set("l1", true);
      yield 1600;
      set("l1", false);
      yield 900;
      yield* tap("create");
      yield 1600;
    }
  }
  function startGhost() {
    resetDesk();
    ghost = script();
    ghostWait = 0;
    setMode("ghost");
  }
  function stopGhost() { ghost = null; ghostPad.axes.fill(0); ghostPad.b.fill(false); }
  function advanceGhost(dtMs) {
    if (!ghost) return;
    ghostWait -= dtMs;
    while (ghost && ghostWait <= 0) {
      const r = ghost.next();
      if (r.done) { ghost = null; break; }
      /* A 0 is "call me next frame" (a pointer glide). Without the reset the
         frames it spends pile up as debt, and every press after a glide then
         fires and releases inside one frame, where no rising edge can be seen. */
      if (r.value === 0) { ghostWait = 0; break; }
      ghostWait += r.value;
    }
  }

  /* ---------- takeover ---------- */

  function resetDesk() {
    overlay = null; osk.hidden = true; ring.hidden = true; help.hidden = true;
    ta.value = ""; ta.blur();
    latch.clear(); paintLatch(); held = {};
    const b = stageBox();
    cur = { x: b.width * 0.62, y: b.height * 0.78 };
    placeCursor();
    legendFor();
  }
  function take(m, detail) {
    const from = mode;
    stopGhost();
    if (from === "ghost" || from === "still") resetDesk();
    setMode(m, detail);
  }
  function takeFromMouse() { if (mode === "ghost" || mode === "still") take("keys"); }

  /* ---------- keyboard and mouse ---------- */

  const KEYMAP = { k: "cross", enter: "cross", l: "circle", i: "triangle", j: "square", q: "l1", e: "r1",
    z: "l2", c: "r2", r: "l3", f: "r3", h: "create" };
  const ARROWS = { arrowleft: [0, -1], arrowright: [0, 1], arrowup: [1, -1], arrowdown: [1, 1] };
  function onKey(e, down) {
    if (e.target === ta || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!stage.contains(/** @type {Node} */ (e.target))) return;
    const k = e.key.toLowerCase();
    if (ARROWS[k]) {
      const [ax, s] = ARROWS[k];
      keyPad.axes[ax] = down ? s * 0.8 : 0;
    } else if (KEYMAP[k]) {
      keyPad.b[IDX.indexOf(KEYMAP[k])] = down;
    } else return;
    e.preventDefault();
    if (down && mode !== "pad" && mode !== "keys") take("keys");
  }
  addEventListener("keydown", (e) => onKey(e, true));
  addEventListener("keyup", (e) => onKey(e, false));
  addEventListener("blur", () => { keyPad.axes.fill(0); keyPad.b.fill(false); });

  stage.querySelectorAll(".py-act").forEach((btn) => btn.addEventListener("click", (e) => {
    if (e.isTrusted) takeFromMouse();
    const what = btn.getAttribute("data-open");
    if (what === "ring") { openRing("primary"); say(ringBtn(), "Radial Menu"); }
    else if (what === "keys") { openOsk(); say("r3", "On-Screen Keyboard"); }
    else { toggleHelp(); say("create", "Help Overlay"); }
    if (e.isTrusted) markActed();
  }));
  wheel.addEventListener("click", (e) => {
    const s = /** @type {HTMLElement} */ (e.target).closest(".py-petal span");
    if (!s || overlay !== "osk") return;
    takeFromMouse();
    const petal = /** @type {HTMLElement} */ (s.parentElement);
    const i = [...wheel.querySelectorAll(".py-petal")].indexOf(petal);
    setAim(i, wheel.querySelectorAll(".py-petal"));
    commit([...petal.children].indexOf(s), "cross");
  });
  ring.addEventListener("click", (e) => { if (e.target === ring) { takeFromMouse(); closeRing(); } });
  document.querySelectorAll("[data-close]").forEach((x) => x.addEventListener("click", () => {
    takeFromMouse();
    const w = x.getAttribute("data-close");
    if (w === "osk") closeOsk(); else if (w === "help") toggleHelp();
  }));

  addEventListener("gamepadconnected", (e) => {
    if (mode === "pad") return;
    const n = padNameOf(e.gamepad.id);
    lastEl.textContent = n + " found. Press any button to take over.";
  });
  addEventListener("gamepaddisconnected", () => {
    if (mode !== "pad") return;
    padIndex = -1;
    setMode("keys");
    stateEl.textContent = GONE;
  });

  /* ---------- loop ---------- */

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let v = null;
    const real = readPad();
    if (real) {
      const live = real.v.b.some(Boolean) || real.v.axes.some((a) => Math.abs(a) > DEAD_AIM);
      if (mode !== "pad" && live) {
        fam = familyOf(real.gp.id);
        padIndex = real.gp.index;
        padName = padNameOf(real.gp.id);
        prev = blank();
        take("pad", padName);
        relabel();
        /* The page's pad event (pad-labels.js): anything else that names
           buttons can follow the pad the visitor actually holds. */
        document.dispatchEvent(new CustomEvent("steerpad", { detail: fam }));
      }
      if (mode === "pad") v = real.v;
    }
    if (!v && mode === "keys") v = keyPad;
    if (!v && mode === "ghost") { advanceGhost(dt * 1000); v = ghostPad; }
    if (v) { step(v, dt, now); prev = { axes: v.axes.slice(), b: v.b.slice() }; }
    requestAnimationFrame(frame);
  }

  /* ---------- boot ---------- */

  cta.dataset.state = "wait";
  ctaText.textContent = WAIT;
  relabel();
  if (still() || reduced.matches) {
    setMode("still");
    const b = stageBox();
    cur = { x: b.width * 0.62, y: b.height * 0.78 };
    placeCursor();
  } else {
    startGhost();
  }
  requestAnimationFrame(frame);
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c] || c); }
