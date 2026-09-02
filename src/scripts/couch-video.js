// The centrepiece loop. Without scripts the element keeps its native controls
// and its poster. With them: the loop starts unless the reader asked the OS for
// reduced motion, native controls come off, and one Pause button takes over,
// because a looping animation with no way to stop it fails WCAG 2.2.2.
(function(){
  var v=document.querySelector('.lg-video'), b=document.querySelector('.lg-pause'); if(!v||!b) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var p=v.play(); if(!p||!p.then) return;
  p.then(function(){
    v.controls=false; b.hidden=false;
    b.addEventListener('click',function(){
      var paused=!v.paused; if(paused) v.pause(); else v.play();
      b.textContent=paused?'Play':'Pause'; b.setAttribute('aria-pressed',paused?'true':'false');
    });
  }).catch(function(){});
})();
