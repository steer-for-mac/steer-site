// Per-app layouts on the homepage. Tabs: turns the stacked panels into one stage
// with a tab list, every panel in one grid cell so a tab never changes the
// band's height. The markup ships every panel visible, so without script the
// page still shows every layout. ARIA tabs with manual activation; arrow keys,
// Home and End move between tabs, per the APG tabs pattern.
import { INERT, PRESS, padPhoto } from "./pad-photo.js";

(function () {
  var list = document.querySelector(".pa-tabs");
  if (!list) return;
  var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute("aria-controls")); });
  var stack = document.querySelector(".pa-panels");
  /* One set of the photo's outlines, carried into whichever tab is shown. */
  var lightsEl = document.querySelector(".pa-lights");
  var lights = lightsEl && padPhoto(lightsEl);

  panels.forEach(function (p, i) {
    p.setAttribute("role", "tabpanel");
    p.setAttribute("aria-labelledby", tabs[i].id);
    p.setAttribute("tabindex", "0");
  });

  function select(i, focus) {
    tabs.forEach(function (t, j) {
      var on = i === j;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      /* inert, not hidden: an unchosen panel keeps its box in the shared
         cell (visibility in apps.css) and leaves the tab order and the
         accessibility tree. */
      panels[j].inert = !on;
    });
    if (focus) tabs[i].focus();
    var slot = panels[i].querySelector(".pa-slot");
    if (lightsEl && slot) { slot.appendChild(lightsEl); lightsEl.hidden = false; }
  }

  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { select(i, false); });
    t.addEventListener("keydown", function (e) {
      var n = tabs.length, k = e.key, to = -1;
      if (k === "ArrowRight") to = (i + 1) % n;
      else if (k === "ArrowLeft") to = (i - 1 + n) % n;
      else if (k === "Home") to = 0;
      else if (k === "End") to = n - 1;
      if (to < 0) return;
      e.preventDefault();
      select(to, true);
    });
  });

  list.hidden = false;
  if (stack) stack.classList.add("is-tabbed");
  select(0, false);

  /* A row and its part of the photo light together, by pointer or by
     keyboard: each row takes focus (script only, since without script nothing
     lights). The photo is drawing (aria-hidden); the row says it in words. */
  function hot(el) {
    document.querySelectorAll(".pa-key li.is-hot").forEach(function (li) { li.classList.remove("is-hot"); });
    if (el && el.matches(".pa-key li")) el.classList.add("is-hot");
    if (!lights) return;
    var c = el && el.getAttribute("data-c"), h = el && el.getAttribute("data-hold");
    var b = c ? (el.getAttribute("data-b") || "").split(" ").filter(Boolean) : [];
    if (h) b.push(h);
    /* A hold header names only its shoulder; its rows add their own buttons. */
    if (c && el.classList.contains("pa-hold")) b = [c];
    lights.render({ held: new Set(b) });
  }

  /* Left alone in view, the band walks the shown layout's rows, so the photo
     says what each binding is without a pointer. A visitor pointing or
     focusing takes over, and it waits a beat after they leave. Not under
     reduced motion, nor in the frozen frame (html.still) captures use. */
  var STEP = 1700, REST_MS = 2500;
  var busyUntil = 0, walkAt = 0, walkI = 0, inView = false;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)");
  var busy = function () { busyUntil = Infinity; };
  var idle = function () { busyUntil = performance.now() + REST_MS; hot(null); };
  function shown() {
    var p = panels.find(function (q) { return !q.inert; }) || panels[0];
    return Array.prototype.filter.call(p.querySelectorAll(".pa-key li"), function (li) { return li.offsetParent; });
  }
  function walk(now) {
    requestAnimationFrame(walk);
    if (!inView || reduced.matches || root.classList.contains("still") || now < busyUntil || now < walkAt) return;
    var rows = shown();
    if (!rows.length) return;
    hot(rows[walkI++ % rows.length]);
    walkAt = now + STEP;
  }
  var band = document.querySelector(".l2-apps");
  if (band && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      inView = es[0].isIntersecting;
      if (!inView) { walkI = 0; hot(null); }
    }, { threshold: 0.4 }).observe(band);
    requestAnimationFrame(walk);
  }
  document.addEventListener("change", function (e) { if (e.target.name === "pa-pad") walkI = 0; });
  tabs.forEach(function (t) { t.addEventListener("click", function () { walkI = 0; }); });

  /* The other way round: pointing at a part of the photo marks every row of
     the shown layout that uses it, and lights just that part. A stick is both
     moved (ls) and pressed (l3). */
  function fromPart(c) {
    var names = [c].concat(PRESS[c] || []);
    document.querySelectorAll(".pa-key li.is-hot").forEach(function (li) { li.classList.remove("is-hot"); });
    shown().forEach(function (li) {
      var b = (li.getAttribute("data-b") || "").split(" ");
      if (b.some(function (x) { return names.indexOf(x) >= 0; }) || names.indexOf(li.getAttribute("data-hold")) >= 0) li.classList.add("is-hot");
    });
    lights.render({ held: new Set(names) });
  }
  if (lightsEl) {
    lightsEl.addEventListener("pointerover", function (e) {
      var part = e.target.closest("path[data-c]"), c = part && part.getAttribute("data-c");
      busy();
      if (c && !INERT.has(c)) fromPart(c); else hot(null);
    });
    lightsEl.addEventListener("pointerleave", idle);
  }

  panels.forEach(function (p) {
    p.querySelectorAll(".pa-key li").forEach(function (li) { li.tabIndex = 0; });
    p.addEventListener("pointerover", function (e) {
      if (e.target.closest(".pa-lights")) return;
      busy();
      hot(e.target.closest(".pa-key li, .pa-hold"));
    });
    p.addEventListener("pointerleave", idle);
    p.addEventListener("focusin", function (e) { busy(); hot(e.target.closest(".pa-key li")); });
    p.addEventListener("focusout", function (e) { if (!p.contains(e.relatedTarget)) idle(); });
  });

  /* The controller defaults to the one the demo saw (pad-demo.js raises
     "steerpad" when a pad takes over), unless the visitor already chose. */
  var chose = false;
  document.addEventListener("change", function (e) { if (e.isTrusted && e.target.name === "pa-pad") chose = true; });
  document.addEventListener("steerpad", function (e) {
    var r = document.getElementById("pa-pad-" + e.detail);
    if (r && !chose) r.checked = true;
  });

  var root = document.documentElement;
  document.addEventListener("keydown", function () { root.dataset.kbd = ""; }, true);
  document.addEventListener("pointerdown", function () { delete root.dataset.kbd; }, true);
})();
