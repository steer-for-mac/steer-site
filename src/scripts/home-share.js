(() => {
  // The nav's button would sit right above the hero's identical one: hide it
  // while a homepage buy button is on screen. Without JS it simply stays.
  const ctas = [...document.querySelectorAll(".h-main .join")];
  if (ctas.length && "IntersectionObserver" in window) {
    const seen = new Set();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      document.documentElement.classList.toggle("form-in-view", seen.size > 0);
    });
    ctas.forEach((c) => io.observe(c));
  }
})();
