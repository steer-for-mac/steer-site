// The demo desk, driven the way Steer's defaults drive a Mac (app of 2026-10-06):
//   keyboard buttons  Steer/Sources/Steer/EventLoop+OnScreenKeyboard.swift:51-96
//   d-pad modifiers   same file :333-335; cursors start on F and J SplitKeyboard.swift:282-286
//   base layer        SteerCore/Defaults.swift:49-69; ring apps RadialMenuDefaults.swift:60-70
// It plays itself until the first press, except under automation or reduced motion.

const K = (label, opts = {}) => ({ label, u: 1, ...opts });
const ch = (c, shifted) => K(c, { ch: c, sh: shifted ?? c.toUpperCase() });
const LAYOUT = [
  [[K("esc", { u: 1.5, k: "esc" }), ...[1, 2, 3, 4, 5].map((n) => K("F" + n, { k: "F" + n }))],
    [...[6, 7, 8, 9, 10, 11].map((n) => K("F" + n, { k: "F" + n })), K("F12", { u: 1.6, k: "F12" })]],
  [[ch("`", "~"), ch("1", "!"), ch("2", "@"), ch("3", "#"), ch("4", "$"), ch("5", "%")],
    [ch("6", "^"), ch("7", "&"), ch("8", "*"), ch("9", "("), ch("0", ")"), ch("-", "_"), ch("=", "+"), K("delete", { u: 1.5, k: "delete", mod: true })]],
  [[K("tab", { u: 1.5, k: "tab", mod: true }), ..."qwert".split("").map((c) => ch(c))],
    [..."yuiop".split("").map((c) => ch(c)), ch("[", "{"), ch("]", "}"), ch("\\", "|")]],
  [[K("caps lock", { u: 1.75, k: "caps", mod: true }), ..."asdfg".split("").map((c) => ch(c))],
    [..."hjkl".split("").map((c) => ch(c)), ch(";", ":"), ch("'", "\""), K("return", { u: 1.75, k: "return", mod: true })]],
  [[K("shift", { u: 2.25, k: "shift", mod: true }), ..."zxcvb".split("").map((c) => ch(c))],
    [..."nm".split("").map((c) => ch(c)), ch(",", "<"), ch(".", ">"), ch("/", "?"), K("shift", { u: 2.25, k: "shift", mod: true })]],
  [[K("fn", { k: "fn", mod: true }), K("control", { k: "control", mod: true }), K("option", { k: "option", mod: true }), K("command", { u: 1.25, k: "command", mod: true }), K("", { u: 2.5, k: "space" })],
    [K("", { u: 2.5, k: "space" }), K("command", { u: 1.25, k: "command", mod: true }), K("option", { k: "option", mod: true }), K("←", { k: "left" }), K("↑↓", { k: "updown" }), K("→", { k: "right" })]],
];
const APPS = ["Safari", "Finder", "Music", "Mail", "Calendar", "Notes", "Messages", "Settings", "Maps"];
const BASE = [["Cross ✕", "Left Click"], ["Circle ○", "Right Click"], ["Triangle △", "Return"], ["Square □", "Escape"],
  ["L1", "Back, hold for its layer"], ["R1", "Spotlight, hold for its layer"], ["L2", "App Switch, hold for its layer"],
  ["R2", "Space, hold for its layer"], ["D-pad", "Arrow keys"], ["Left stick", "Mouse; press for your apps"],
  ["Right stick", "Scroll; press for the keyboard"], ["Options", "Mission Control"], ["Create", "Help Card"], ["Touchpad press", "Dictation"]];
const BASEJOB = { cross: "Left Click", circle: "Right Click", tri: "Return", sq: "Escape", l1: "Back", r1: "Spotlight", l2: "App Switch", r2: "Space",
  options: "Mission Control", up: "Arrow Up", down: "Arrow Down", left: "Arrow Left", right: "Arrow Right", touch: "Dictation" };
const ONLY_NAMED = ["r1", "l2", "options", "touch", "l1", "circle"];
const WORDS = ["hello", "help", "here", "have", "how", "happy", "mac", "make", "maybe", "meeting", "thanks", "the", "this", "that", "tonight", "today",
  "tomorrow", "steer", "see", "soon", "controller", "could", "can", "watch", "what", "when", "where", "with", "will", "film", "find", "friday",
  "great", "good", "going", "is", "it", "in", "and", "are", "about", "again", "you", "your", "yes"];
const KEYMAP = { " ": "cross", Enter: "circle", Backspace: "sq", t: "tri", q: "l2", o: "r2", u: "r1", z: "l3", m: "r3", h: "create", Escape: "options",
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
const STD = ["cross", "circle", "sq", "tri", "l1", "r1", "l2", "r2", "create", "options", "l3", "r3", "up", "down", "left", "right", null, "touch"];
// The chip while it plays: the glyph, then the control in plain words.
const SAY = { cross: ["✕", "Cross"], create: ["Create", "Create"], l2: ["L2", "Left trigger"], r2: ["R2", "Right trigger"],
  l3: ["L3", "Left stick press:"], r3: ["R3", "Right stick press"], L: ["L", "Left stick"], R: ["R", "Right stick"] };

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]);
const span = (row, side, idx) => {
  const keys = LAYOUT[row][side], total = keys.reduce((s, k) => s + k.u, 0);
  let x = 0; for (let i = 0; i < idx; i++) x += keys[i].u;
  return [x / total, (x + keys[idx].u) / total];
};
const find = (side, label) => {
  for (let r = 0; r < LAYOUT.length; r++) { const i = LAYOUT[r][side].findIndex((k) => k.ch === label); if (i >= 0) return { row: r, idx: i }; }
  return null;
};

function init(root) {
  const $ = (id) => root.querySelector("#sd-" + id);
  const stage = $("stage"), field = $("field"), said = $("said"), src = $("src"), stopBtn = $("stop");
  const osk = $("osk"), rows = $("rows"), ring = $("ring"), plate = $("plate"), hole = $("hole");
  const help = $("help"), toast = $("toast"), pointer = $("pointer"), ghost = $("ghost");
  root.classList.add("sd-js");

  const cur = { 0: find(0, "f"), 1: find(1, "j") };
  const state = { open: true, text: "Hello, Mac", caps: false, shiftHeld: false, latch: new Set(), sugg: [], sel: -1,
    ring: false, ringSel: -1, help: false, px: 0.74, py: 0.2 };

  function drawKeyboard() {
    rows.textContent = "";
    LAYOUT.forEach((row, r) => {
      const el = document.createElement("div"); el.className = "sd-row" + (r === 0 ? " fnr" : "");
      row.forEach((keys, side) => {
        const h = document.createElement("div"); h.className = "sd-half";
        keys.forEach((k, i) => {
          const d = document.createElement("div");
          d.className = "sd-key" + (r === 0 ? " fn" : "") + (k.mod ? " mod" : "");
          d.style.setProperty("--u", String(k.u));
          const up = state.shiftHeld || state.latch.has("shift");
          const letter = /^[a-z]$/.test(k.ch || "");
          d.textContent = k.ch ? ((letter ? up !== state.caps : up) ? k.sh : k.ch) : k.label;
          if (state.latch.has(k.k) || (k.k === "shift" && state.shiftHeld) || (k.k === "caps" && state.caps)) d.classList.add("held");
          if (cur[side].row === r && cur[side].idx === i) {
            d.classList.add("lit");
            const b = document.createElement("span"); b.className = "sd-badge"; b.textContent = side === 0 ? "L2" : "R2"; d.append(b);
          }
          h.append(d);
        });
        el.append(h);
        if (side === 0) { const g = document.createElement("div"); g.className = "sd-gap"; el.append(g); }
      });
      rows.append(el);
    });
    for (const [id, m] of [["dU", "shift"], ["dL", "control"], ["dR", "command"], ["dD", "option"]]) $(id).classList.toggle("on", state.latch.has(m));
  }

  function step(side, dx, dy) {
    const c = cur[side];
    if (dy) {
      const [a, b] = span(c.row, side, c.idx), mid = (a + b) / 2;
      const nr = Math.max(0, Math.min(LAYOUT.length - 1, c.row + dy));
      if (nr !== c.row) {
        const keys = LAYOUT[nr][side];
        let best = 0;
        for (let i = 0; i < keys.length; i++) { const [s, e] = span(nr, side, i); if (mid >= s && mid < e) { best = i; break; } if (mid >= e) best = i; }
        c.row = nr; c.idx = best;
      }
    }
    if (dx) c.idx = Math.max(0, Math.min(LAYOUT[c.row][side].length - 1, c.idx + dx));
    drawKeyboard();
  }

  function suggest() {
    const m = /([A-Za-z]+)$/.exec(state.text);
    const pre = m ? m[1].toLowerCase() : "";
    state.sugg = pre ? WORDS.filter((w) => w.startsWith(pre) && w !== pre).slice(0, 3).map((w) => m[1] + w.slice(pre.length)) : [];
    if (state.sel >= state.sugg.length) state.sel = -1;
    $("sugg").innerHTML = state.sugg.map((w, i) => `<span class="sd-chip${i === state.sel ? " on" : ""}">${esc(w)}</span>`).join(" ");
  }
  function renderText() {
    field.textContent = state.text;
    const c = document.createElement("span"); c.className = "sd-caret"; field.append(c);
    $("typed").textContent = state.text;
    suggest();
  }

  function typeKey(side) {
    const k = LAYOUT[cur[side].row][side][cur[side].idx];
    if (["control", "option", "command", "fn", "shift"].includes(k.k)) {
      state.latch.has(k.k) ? state.latch.delete(k.k) : state.latch.add(k.k);
      drawKeyboard(); return say(`${cap(k.k)} ${state.latch.has(k.k) ? "held for the next key" : "let go"}`);
    }
    if (k.k === "caps") { state.caps = !state.caps; drawKeyboard(); return say(`Caps lock ${state.caps ? "on" : "off"}`); }
    const chord = [...state.latch].filter((m) => m !== "shift");
    if (chord.length && k.ch) {
      state.latch.clear(); drawKeyboard();
      return say(`Sent ${chord.map((m) => ({ control: "⌃", option: "⌥", command: "⌘", fn: "fn " })[m]).join("")}${k.ch.toUpperCase()} to Notes`);
    }
    if (k.ch) {
      const up = state.shiftHeld || state.latch.has("shift");
      const out = /^[a-z]$/.test(k.ch) ? ((up !== state.caps) ? k.sh : k.ch) : (up ? k.sh : k.ch);
      state.text += out; state.latch.delete("shift"); renderText(); drawKeyboard();
      return say(`Typed “${out}”`);
    }
    if (k.k === "space") { state.text += " "; renderText(); return say("Typed a space"); }
    if (k.k === "delete") return del();
    if (k.k === "return") return ret();
    if (k.k === "tab") { state.text += "    "; renderText(); return say("Tab"); }
    return say(`Pressed ${k.label === "↑↓" ? "up or down" : k.label}`);
  }
  function del() { state.text = state.text.slice(0, -1); renderText(); say("Delete"); }
  function ret() { state.text += "\n"; renderText(); say("Return"); }

  APPS.forEach((name, i) => {
    const a = (i / APPS.length) * Math.PI * 2;
    const b = document.createElement("div"); b.className = "sd-item"; b.dataset.i = String(i);
    b.style.left = (190 + Math.sin(a) * 140) + "px"; b.style.top = (190 - Math.cos(a) * 140) + "px";
    b.innerHTML = `<i>${name[0]}</i><span>${name}</span>`;
    b.addEventListener("click", () => { state.ringSel = i; drawRing(); ringSelect(); });
    plate.append(b);
  });
  function drawRing() {
    plate.querySelectorAll(".sd-item").forEach((n) => n.classList.toggle("on", Number(n.dataset.i) === state.ringSel));
    hole.textContent = state.ringSel >= 0 ? APPS[state.ringSel] : "Point the left stick";
  }
  function aimRing(x, y) {
    if (Math.hypot(x, y) < 0.5) return;
    let a = Math.atan2(x, -y); if (a < 0) a += Math.PI * 2;
    const i = Math.round(a / (Math.PI * 2 / APPS.length)) % APPS.length;
    if (i !== state.ringSel) { state.ringSel = i; drawRing(); say(`Pointing at ${APPS[i]}`); }
  }
  function openRing() { state.ring = true; state.ringSel = -1; ring.hidden = false; drawRing(); say("Your apps. Point the left stick, then ✕ to pick one."); }
  function closeRing() { state.ring = false; ring.hidden = true; }
  function ringSelect() {
    if (state.ringSel < 0) return say("Point at an app first");
    const n = APPS[state.ringSel]; closeRing(); showToast(`Steer would switch to ${n}. This page only names it.`); return say(`Picked ${n}`);
  }

  $("helptable").querySelector("tbody").innerHTML = BASE.map(([a, b]) => `<tr><th scope="row">${a}</th><td>${b}</td></tr>`).join("");
  function toggleHelp() {
    state.help = !state.help; help.hidden = !state.help;
    say(state.help ? "Help card. Options shows it as a table, Create closes it." : "Help card closed");
  }
  function toggleTable() {
    const t = $("helptable"); t.hidden = !t.hidden; help.classList.toggle("as-table", !t.hidden);
    say(t.hidden ? "Help card as the picture" : "Help card as a table");
  }

  function openKeyboard() { state.open = true; osk.hidden = false; cur[0] = find(0, "f"); cur[1] = find(1, "j"); drawKeyboard(); say("Keyboard. Each stick aims at its half, the triggers type."); }
  function closeKeyboard() { state.open = false; osk.hidden = true; state.latch.clear(); say("Keyboard closed"); }

  function press(b) {
    if (state.help) {
      if (b === "create") return toggleHelp();
      if (b === "options") return toggleTable();
    }
    if (state.ring) {
      if (b === "cross") return ringSelect();
      if (b === "circle" || b === "l3") { swallowL3 = b === "l3"; closeRing(); return say("Cancelled"); }
      return undefined;
    }
    if (state.open) {
      const dmod = { left: "control", down: "option", right: "command", up: "shift" }[b];
      if (dmod) {
        state.latch.has(dmod) ? state.latch.delete(dmod) : state.latch.add(dmod); drawKeyboard();
        return say(`${cap(dmod)} ${state.latch.has(dmod) ? "held for the next key" : "let go"}`);
      }
      switch (b) {
        case "l2": return typeKey(0);
        case "r2": return typeKey(1);
        case "cross": state.text += " "; renderText(); return say("Space");
        case "sq": return del();
        case "circle": return ret();
        case "r1":
          if (!state.sugg.length) return say("No suggestions yet");
          state.sel = (state.sel + 1) % state.sugg.length; suggest(); return say(`Suggestion: ${state.sugg[state.sel]}. △ types it.`);
        case "tri": {
          if (state.sel < 0) return say("Pick a suggestion with R1 first");
          const w = state.sugg[state.sel]; state.text = state.text.replace(/[A-Za-z]+$/, w); state.sel = -1; renderText();
          return say(`Typed the rest of “${w}”`);
        }
        case "l3": return say("Dictation. On your Mac, say it and the words appear in Notes.");
        case "r3": case "options": return closeKeyboard();
        case "create": return say("Create switches the input source. This page has one.");
        default: return undefined;
      }
    }
    switch (b) {
      case "cross": return click();
      case "r3": return openKeyboard();
      case "create": return toggleHelp();
      case "r2": state.text += " "; renderText(); return say("Space");
      case "tri": return ret();
      default: break;
    }
    if (BASEJOB[b]) say(`${BASEJOB[b]}${ONLY_NAMED.includes(b) ? ". On your Mac that happens; this page names it." : ""}`);
    return undefined;
  }
  let swallowL3 = false;  // the L3 press that closed the ring must not reopen it on release
  function release(b) {
    if (b === "l3" && swallowL3) { swallowL3 = false; return; }
    if (b === "l3" && !state.open && !state.ring && !state.help) openRing();
  }

  function click() {
    const r = stage.getBoundingClientRect();
    const hit = document.elementsFromPoint(r.left + state.px * r.width, r.top + state.py * r.height).find((n) => n.matches(".sd-dock button"));
    if (hit) { press(hit.dataset.press); release(hit.dataset.press); return; }
    say("Left Click");
  }

  let toastT = 0;
  function showToast(t) { toast.textContent = t; toast.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toast.hidden = true; }, 2600); }
  function say(t) { said.textContent = t; }
  function setSrc(s) { src.textContent = s; }
  function drawPointer() { pointer.style.setProperty("--px", `${state.px * stage.clientWidth}px`); pointer.style.setProperty("--py", `${state.py * stage.clientHeight}px`); }

  // Sticks step one key per push and repeat while held (SplitKeyboardStepper.swift:3-20).
  const st = [{ armed: false, t: 0 }, { armed: false, t: 0 }];
  function tickStick(i, x, y, dt) {
    const s = st[i], m = Math.hypot(x, y);
    if (state.ring && i === 0) return aimRing(x, y);
    if (!state.open) {
      if (i === 0 && m > 0.12) { state.px = Math.min(0.98, Math.max(0.01, state.px + x * dt * 0.55)); state.py = Math.min(0.97, Math.max(0.06, state.py + y * dt * 0.7)); drawPointer(); }
      if (i === 1 && m > 0.5 && !s.armed) { s.armed = true; say("Scroll"); }
      if (i === 1 && m < 0.3) s.armed = false;
      return undefined;
    }
    const dir = m < 0.5 ? [0, 0] : [Math.abs(x) > 0.38 * m ? Math.sign(x) : 0, Math.abs(y) > 0.38 * m ? Math.sign(y) : 0];
    if (!s.armed && m >= 0.5) { s.armed = true; s.t = -0.4; step(i, dir[0], dir[1]); return undefined; }
    if (s.armed && m < 0.3) { s.armed = false; return undefined; }
    if (s.armed) { s.t += dt; if (s.t >= 0.12) { s.t = 0; step(i, dir[0], dir[1]); } }
    return undefined;
  }

  const held = new Set();
  stage.addEventListener("keydown", (e) => {
    if (e.target !== stage) return;  // Enter and Space belong to a focused dock button
    if (e.metaKey || e.ctrlKey || e.altKey || e.key === "Tab") return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === "Shift") { state.shiftHeld = true; if (state.open) drawKeyboard(); setSrc("Keyboard"); return; }
    if (k.length === 1 && "wasdijkl".includes(k)) { held.add(k); e.preventDefault(); setSrc("Keyboard"); return; }
    const b = KEYMAP[k] || KEYMAP[e.key]; if (!b) return;
    e.preventDefault(); if (e.repeat) return; setSrc("Keyboard"); press(b);
  });
  stage.addEventListener("keyup", (e) => {
    if (e.target !== stage) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === "Shift") { state.shiftHeld = false; if (state.open) drawKeyboard(); return; }
    held.delete(k);
    const b = KEYMAP[k] || KEYMAP[e.key]; if (b) release(b);
  });
  stage.addEventListener("blur", () => held.clear());
  root.querySelectorAll(".sd-dock button").forEach((btn) => btn.addEventListener("click", (e) => {
    e.stopPropagation(); setSrc("Mouse"); press(btn.dataset.press); release(btn.dataset.press);
  }));
  stage.addEventListener("pointerdown", (e) => { if (!e.target.closest("button, .sd-item")) stage.focus(); });

  // ---------- It plays itself, through the same handlers, until anyone presses anything ----------
  let io;
  let attract = !navigator.webdriver && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const timers = [];
  const sleep = (ms) => new Promise((r) => { timers.push(setTimeout(r, ms)); });
  const live = () => { if (!attract) throw new Error("stopped"); };
  function show(b, verb) {
    const [g, words] = SAY[b] || [b, ""];
    ghost.innerHTML = `<span class="sd-g">${esc(g)}</span>${esc(`${words} ${verb}`.trim())}`;
    ghost.classList.add("on");
  }
  async function tap(b, verb, wait = 600) { live(); show(b, verb); press(b); release(b); await sleep(wait); }
  async function aimAt(side, c) {
    const t = find(side, c);
    for (let g = 0; g < 16 && (cur[side].row !== t.row || cur[side].idx !== t.idx); g++) {
      live();
      const dy = Math.sign(t.row - cur[side].row), dx = dy ? 0 : Math.sign(t.idx - cur[side].idx);
      show(side ? "R" : "L", "aims"); step(side, dx, dy); await sleep(150);
    }
  }
  async function typeWord(w) {
    for (const c of w) { const sd = find(0, c) ? 0 : 1; await aimAt(sd, c); await tap(sd ? "r2" : "l2", `types ${c}`, 320); }
  }
  async function nudge(keys, ms, b, verb) { live(); show(b, verb); keys.forEach((k) => held.add(k)); await sleep(ms); keys.forEach((k) => held.delete(k)); }
  async function run() {
    if (!attract) return;
    said.setAttribute("aria-live", "off"); setSrc("Playing by itself"); stopBtn.hidden = false;
    try {
      for (;;) {
        if (!state.open) await tap("r3", "opens the keyboard", 500);
        state.text = ""; renderText();
        await typeWord("hello"); await tap("cross", "types a space", 400); await typeWord("mac"); await sleep(900);
        await tap("r3", "closes it", 500);
        await nudge(["d", "s"], 650, "L", "moves the pointer"); await sleep(300);
        await tap("l3", "your apps", 700);
        await nudge(["w"], 380, "L", "points at Safari"); await sleep(400);
        await tap("cross", "picks it", 1700);
        await tap("create", "shows the help card", 1500);
        await tap("create", "closes it", 600);
      }
    } catch { /* a visitor took over */ }
  }
  function stop() {
    if (!attract) return;
    attract = false; io?.disconnect(); timers.forEach(clearTimeout); held.clear(); ghost.classList.remove("on"); stopBtn.hidden = true;
    said.setAttribute("aria-live", "polite"); say("You’re driving. Press any button."); setSrc("You’re driving");
  }
  if (attract) {
    $("phone").textContent = "It’s playing by itself. Open this page on a Mac and plug in a controller to take over.";
    ["keydown", "pointerdown"].forEach((t) => stage.addEventListener(t, stop, { capture: true }));
    stopBtn.addEventListener("click", () => { stop(); stage.focus(); });
    io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); run(); } });
    io.observe(stage);
  } else {
    said.textContent += " Press a button to take over.";
  }

  // ---------- A real controller, standard mapping ----------
  let prev = [], last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    let lx = (held.has("d") ? 1 : 0) - (held.has("a") ? 1 : 0), ly = (held.has("s") ? 1 : 0) - (held.has("w") ? 1 : 0);
    let rx = (held.has("l") ? 1 : 0) - (held.has("j") ? 1 : 0), ry = (held.has("k") ? 1 : 0) - (held.has("i") ? 1 : 0);
    const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
    if (gp) {
      if (attract && gp.buttons.some((b) => b.pressed)) stop();
      const ax = gp.axes;
      if (Math.hypot(ax[0], ax[1]) > 0.12) { lx = ax[0]; ly = ax[1]; }
      if (Math.hypot(ax[2], ax[3]) > 0.12) { rx = ax[2]; ry = ax[3]; }
      gp.buttons.forEach((b, i) => {
        const d = b.pressed, name = STD[i];
        if (!name || d === Boolean(prev[i])) return;
        setSrc("Controller");
        if (name === "l1") { state.shiftHeld = d; if (state.open) drawKeyboard(); if (d && !state.open) press("l1"); }
        else if (d) press(name); else release(name);
      });
      prev = gp.buttons.map((b) => b.pressed);
    }
    tickStick(0, lx, ly, dt); tickStick(1, rx, ry, dt);
    requestAnimationFrame(frame);
  }

  drawKeyboard(); renderText(); drawPointer();
  addEventListener("resize", drawPointer);
  requestAnimationFrame(frame);
}

document.querySelectorAll("[data-steer-demo]").forEach(init);
