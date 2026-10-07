(() => {
  // The nav's button would sit right above the hero's identical one: hide it
  // while a homepage form is on screen. Without JS it simply stays.
  const forms = [...document.querySelectorAll(".h-main .ml-form")];
  if (forms.length && "IntersectionObserver" in window) {
    const seen = new Set();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      document.documentElement.classList.toggle("form-in-view", seen.size > 0);
    });
    forms.forEach((f) => io.observe(f));
  }
})();
