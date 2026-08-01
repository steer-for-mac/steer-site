// input vignettes: loop only while on-screen; pause everything on hidden tab.
// Under reduced motion .on is never added — the authored static frame stands.
(function(){
  document.addEventListener('visibilitychange',function(){
    document.documentElement.classList.toggle('anim-halt',document.hidden);
  });
  var vgs=[].slice.call(document.querySelectorAll('.vg'));
  if(!vgs.length) return;
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){
        e.target.classList.toggle('on',e.isIntersecting);
        // The hero pad is phase-locked to the glide demo, so it has to switch
        // with the SAME box. Observing .chero separately desynced them: the
        // hero is far taller, so at threshold 0.3 it lost .on ~228px of scroll
        // before .vg-glide did, and the pad's animation restarted from 0% while
        // the cursor demo kept running.
        if(e.target.classList.contains('vg-glide')){
          var hero=e.target.closest('.chero');
          if(hero) hero.classList.toggle('on',e.isIntersecting);
        }
      });
    },{threshold:0.3});
    vgs.forEach(function(v){io.observe(v);});
  }else{
    vgs.forEach(function(v){v.classList.add('on');});
  }
})();
