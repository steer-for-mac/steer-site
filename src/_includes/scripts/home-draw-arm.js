/* Inline, right after the hero, so the finished sofa never paints before its
   draw-in. home-draw.js clears it; the timeout is the fallback if that never runs. */
(function () {
  if (navigator.webdriver || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var hero = document.getElementById("hero");
  if (!hero) return;
  hero.classList.add("drawing");
  setTimeout(function () { hero.classList.add("inked", "pinned"); }, 6000);
})();
