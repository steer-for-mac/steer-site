// Inlined into <head> by base.njk, which carries the reasoning. Every byte here
// ships render-blocking on twelve pages, so keep it short.
(function () {
  var root = document.documentElement;
  var home = root.hasAttribute("data-home");
  var theme = null, accent = null;
  try {
    theme = localStorage.getItem("steer-theme");
    if (home) accent = localStorage.getItem("steer-accent");
  } catch { /* private browsing */ }
  theme = (theme === "light" || theme === "dark") ? theme : null;
  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme", theme || (prefersDark ? "dark" : "light"));
  root.setAttribute("data-theme-pref", theme || "system");
  root.setAttribute("data-js", "");
  if (accent && accent !== "blue" && accent !== "auto") root.setAttribute("data-accent", accent);
})();
