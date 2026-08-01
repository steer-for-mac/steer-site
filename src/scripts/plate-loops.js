
// Plate loops: .on only while the figure is on screen, so nothing animates in a
// tab nobody is looking at. The static markup is the claim, so no-JS and
// reduced-motion ship the authored frame unchanged.
(function(){
  var figs=[].slice.call(document.querySelectorAll('.dgs,.lay-fig'));
  if(!figs.length) return;
  if(!('IntersectionObserver' in window)){figs.forEach(function(f){f.classList.add('on');});return;}
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){e.target.classList.toggle('on',e.isIntersecting);});
  },{rootMargin:'0px 0px -10% 0px'});
  figs.forEach(function(f){io.observe(f);});
})();
