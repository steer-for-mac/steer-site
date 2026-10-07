// Each question lands, then its answer, then the proof. Armed only with
// motion allowed and outside automation; without it everything shows.
(() => {
  if (navigator.webdriver || matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -18% 0px" });
  document.querySelectorAll(".q").forEach((q) => {
    if (q.getBoundingClientRect().top > innerHeight * 0.82) io.observe(q); else q.classList.add("in");
  });
  document.documentElement.classList.add("arm");
})();
