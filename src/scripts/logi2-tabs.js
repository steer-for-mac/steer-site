// Per-app layouts on the homepage. Tabs: turns the stacked panels into one stage
// with a tab list, every panel in one grid cell so a tab never changes the
// band's height. The markup ships every panel visible, so without script the
// page still shows every layout. ARIA tabs with manual activation; arrow keys,
// Home and End move between tabs, per the APG tabs pattern.
import { padPhoto } from "./pad-photo.js";

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

  /* A row and its chip on the pad light together, by pointer or by keyboard:
     each row takes focus (script only, since without script nothing lights).
     The pad's chips are drawing (aria-hidden); the row says it in words. */
  panels.forEach(function (p) {
    p.querySelectorAll(".pa-key li").forEach(function (li) { li.tabIndex = 0; });
    function hot(el) {
      var c = el && el.getAttribute("data-c"), h = el && el.getAttribute("data-hold");
      if (c) p.setAttribute("data-hot", ""); else p.removeAttribute("data-hot");
      p.querySelectorAll(".pa-pin").forEach(function (d) {
        var dc = d.getAttribute("data-c");
        var on = !!c && (dc === c || (!!h && dc === h));
        d.classList.toggle("is-hot", on);
      });
      if (lights) {
        var b = c ? (el.getAttribute("data-b") || "").split(" ").filter(Boolean) : [];
        if (h) b.push(h);
        /* A hold header names only its shoulder; its rows add their own buttons. */
        if (c && el.classList.contains("pa-hold")) b = [c];
        lights.render({ held: new Set(b) });
      }
    }
    p.addEventListener("pointerover", function (e) { hot(e.target.closest(".pa-key li, .pa-hold")); });
    p.addEventListener("pointerleave", function () { hot(null); });
    p.addEventListener("focusin", function (e) { hot(e.target.closest(".pa-key li")); });
    p.addEventListener("focusout", function (e) { if (!p.contains(e.relatedTarget)) hot(null); });
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
