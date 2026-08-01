// screenshot gallery: native <dialog> lightbox. showModal() supplies the focus
// trap, Esc-to-close, and focus return to the opener; we add one-shot-at-a-time
// navigation (arrows, keyboard arrows, swipe), a counter, tap-to-zoom, backdrop
// -click close, a page scroll lock, and lazy hydration — data-light/data-dark
// become src only when a slide is shown, matched to the current theme (the
// modal blocks the theme toggle, so the pick can't go stale while open;
// re-resolved on every open anyway).
(function(){
  var dlg=document.getElementById('shotsDialog');
  var opener=document.getElementById('shotsOpen');
  if(!dlg||!opener) return;
  if(typeof dlg.showModal!=='function'){opener.hidden=true;return;}
  var view=document.getElementById('shotsView');
  var counter=document.getElementById('shotsCount');
  var slides=Array.prototype.slice.call(dlg.querySelectorAll('.shots-item'));
  var cur=0;
  function hydrate(slide){
    var img=slide.querySelector('img[data-light]');
    if(!img) return;
    var theme=document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';
    var want=img.getAttribute('data-'+theme);
    if(want&&img.getAttribute('src')!==want) img.setAttribute('src',want);
  }
  function unzoom(){
    view.classList.remove('zoomed');
    view.scrollTop=view.scrollLeft=0;
    var b=view.querySelector('.shots-zoom[aria-pressed="true"]');
    if(b) b.setAttribute('aria-pressed','false');
  }
  function show(n){
    cur=(n%slides.length+slides.length)%slides.length;
    slides.forEach(function(s,k){s.classList.toggle('cur',k===cur);});
    hydrate(slides[cur]);
    // pre-resolve the neighbours so the arrows feel instant
    hydrate(slides[(cur+1)%slides.length]);
    hydrate(slides[(cur-1+slides.length)%slides.length]);
    counter.textContent=(cur+1)+' / '+slides.length;
    unzoom();
  }
  opener.addEventListener('click',function(){
    show(cur); // re-resolves srcs for the current theme on every open
    dlg.showModal();
    document.documentElement.classList.add('shots-open');
  });
  document.getElementById('shotsPrev').addEventListener('click',function(){show(cur-1);});
  document.getElementById('shotsNext').addEventListener('click',function(){show(cur+1);});
  dlg.addEventListener('keydown',function(e){
    if(e.key==='ArrowLeft'){e.preventDefault();show(cur-1);}
    else if(e.key==='ArrowRight'){e.preventDefault();show(cur+1);}
  });
  // tap or click the shot to zoom to readable size; zoom centres on the tap
  view.addEventListener('click',function(e){
    var btn=e.target.closest?e.target.closest('.shots-zoom'):null;
    if(!btn) return;
    var r=view.getBoundingClientRect();
    var relX=(e.clientX-r.left)/r.width, relY=(e.clientY-r.top)/r.height;
    if(!(relX>0&&relX<1)) relX=.5; // keyboard activation has no pointer
    if(!(relY>0&&relY<1)) relY=.5;
    var z=view.classList.toggle('zoomed');
    btn.setAttribute('aria-pressed',z?'true':'false');
    if(z){
      view.scrollLeft=view.scrollWidth*relX-view.clientWidth/2;
      view.scrollTop=view.scrollHeight*relY-view.clientHeight/2;
    }else{
      view.scrollTop=view.scrollLeft=0;
    }
  });
  // swipe navigates when not zoomed (zoomed, the native pan owns the touch)
  var tx=null,ty=null;
  view.addEventListener('touchstart',function(e){tx=e.touches[0].clientX;ty=e.touches[0].clientY;},{passive:true});
  view.addEventListener('touchend',function(e){
    if(tx===null||view.classList.contains('zoomed')) return;
    var dx=e.changedTouches[0].clientX-tx, dy=e.changedTouches[0].clientY-ty;
    tx=ty=null;
    if(Math.abs(dx)>44&&Math.abs(dx)>Math.abs(dy)*1.5) show(dx<0?cur+1:cur-1);
  },{passive:true});
  document.getElementById('shotsClose').addEventListener('click',function(){dlg.close();});
  // a click that lands on the dialog element itself is on the backdrop
  // (padding is 0, so every in-panel click targets a child)
  dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close();});
  // 'close' fires for Esc, backdrop, and the button alike — unlock once here
  dlg.addEventListener('close',function(){document.documentElement.classList.remove('shots-open');unzoom();});
})();
