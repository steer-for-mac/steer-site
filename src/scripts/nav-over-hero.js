// nav floats transparent/light while it overlaps the always-dark hero
(function(){
  var hero=document.querySelector('.chero');
  if(!hero||!('IntersectionObserver' in window)) return;
  new IntersectionObserver(function(es){
    document.documentElement.classList.toggle('nav-over-hero', es[0].isIntersecting);
  },{rootMargin:'-52px 0px 0px 0px',threshold:0}).observe(hero);
})();
