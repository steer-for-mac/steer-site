// The centrepiece loop. Without scripts the element keeps its native controls
// and its poster. With them: the loop starts unless the reader asked the OS for
// reduced motion, native controls come off, one Pause button takes over
// (WCAG 2.2.2), and the chapter chips follow playback and seek on click.
(function(){
  var v=document.querySelector('.lg-video'), b=document.querySelector('.lg-pause'); if(!v||!b) return;
  var chapters=[].slice.call(document.querySelectorAll('.lg-chapter'));
  function setPaused(paused){
    if(paused) v.pause(); else v.play();
    b.textContent=paused?'Play':'Pause'; b.setAttribute('aria-pressed',paused?'true':'false');
  }
  chapters.forEach(function(c){c.addEventListener('click',function(){ v.currentTime=parseFloat(c.dataset.t)||0; if(v.paused) setPaused(false); });});
  v.addEventListener('timeupdate',function(){
    var t=v.currentTime, cur=null;
    chapters.forEach(function(c){ if(t>=(parseFloat(c.dataset.t)||0)) cur=c; });
    chapters.forEach(function(c){ if(c===cur) c.setAttribute('aria-current','true'); else c.removeAttribute('aria-current'); });
  });
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var p=v.play(); if(!p||!p.then) return;
  p.then(function(){
    v.controls=false; b.hidden=false;
    b.addEventListener('click',function(){ setPaused(!v.paused); });
  }).catch(function(){});
})();
