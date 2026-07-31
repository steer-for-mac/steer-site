/* The appearance control, on all 14 pages.
 *
 * A file rather than an inline block in the layout, for a reason beyond page
 * weight: `npx eslint .` reads home.js and every .mjs, and nothing at all reads
 * JavaScript living inside a .njk template. This logic was unlinted the whole
 * time it sat there, which is exactly the gap `make lint-js` exists to close.
 * Being one cached file across fourteen pages instead of fourteen copies is the
 * smaller half of the argument.
 *
 * The PRE-PAINT script stays inline in <head> and cannot move here. It has to
 * set data-theme before the first frame or a dark Mac gets a white flash, and
 * an external file is a round trip in front of that frame. Its job is only to
 * read storage and set two attributes; everything that can wait is here.
 *
 * State model, so the two halves stay in step: `data-theme` on <html> is the
 * RESOLVED appearance (light|dark) and drives every sheet. `data-theme-pref` is
 * the CHOICE (system|light|dark). The stored key holds light or dark ONLY when
 * forced -- System is the absence of the key, which is what makes the choice
 * reversible. localStorage, not a cookie: a theme preference is functional, is
 * never needed server-side, and a cookie would invite a consent question for
 * nothing.
 */
(function () {
  var root = document.documentElement;
  var trigger = document.getElementById("themeToggle");
  var menu = document.getElementById("themeMenu");
  var mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
  var NAME = { system: "System", light: "Light", dark: "Dark" };

  function apply(pref) {
    root.setAttribute("data-theme-pref", pref);
    root.setAttribute("data-theme", pref === "system" ? ((mq && mq.matches) ? "dark" : "light") : pref);
    try {
      pref === "system" ? localStorage.removeItem("steer-theme")
                        : localStorage.setItem("steer-theme", pref);
    } catch { /* private browsing: the choice just does not persist */ }
    var radio = document.getElementById("tm-" + pref);
    if (radio && !radio.checked) radio.checked = true;
    /* State, not next action. With a menu there is no single "next", and the
       trigger's glyph already shows what the page resolved to. */
    if (trigger) trigger.setAttribute("aria-label", "Appearance: " + NAME[pref]);
  }

  apply(root.getAttribute("data-theme-pref") || "system");

  function dismiss() {
    /* Native popover light-dismisses on an outside click but not on one inside
       itself, so closing after a pick is ours to do. Leaving it open over a page
       that just changed colour reads as a control that did not take. */
    if (menu && menu.hidePopover) { try { menu.hidePopover(); } catch { /* already closed */ } }
    if (trigger) trigger.focus();
  }

  /* APPLY on change, DISMISS on click or a confirm key -- deliberately not the
     same event. Arrow keys in a radio group move the selection, which fires
     change, so hiding there meant the first ArrowDown committed a theme nobody
     had chosen and shut the menu on the way out. There was no browsing. Now
     arrows preview live and the menu stays put; a click or Enter/Space ends it.
     Dismiss is on click rather than change for a second reason too: re-picking
     the mode already selected fires no change at all, so that click used to do
     nothing and leave the menu hanging open. */
  [].forEach.call(document.querySelectorAll(".tm-in"), function (radio) {
    radio.addEventListener("change", function () { if (radio.checked) apply(radio.value); });
  });
  if (menu) {
    menu.addEventListener("click", function (e) { if (e.target.closest(".tm-opt")) dismiss(); });
    menu.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      /* Space already selects the focused radio and Enter does nothing at all
         here (no form to submit), so neither had any way to say "this one, and
         I am done". Both confirm now. */
      var focused = menu.querySelector(".tm-in:focus");
      if (focused && !focused.checked) { focused.checked = true; apply(focused.value); }
      e.preventDefault();
      dismiss();
    });
  }

  /* Open with the current choice focused, so the arrow keys the radio group
     gives us for free have somewhere to start. */
  if (menu) menu.addEventListener("toggle", function (e) {
    if (e.newState !== "open") return;
    var checked = menu.querySelector(".tm-in:checked");
    if (checked) checked.focus();
  });

  /* Keep following the OS while no side has been forced. Without this, a Mac
     switching to dark at sunset leaves the page light until a reload. The
     pref check is what stops the OS clobbering a deliberate choice -- deleting
     it is caught by tests/theme.spec.js. */
  if (mq && mq.addEventListener) mq.addEventListener("change", function () {
    if ((root.getAttribute("data-theme-pref") || "system") === "system") apply("system");
  });
})();
