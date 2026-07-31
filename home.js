/* Homepage behaviour: pad picker, accent picker, gallery dialog, plate loops.
   The theme script stays inline in <head> because it must set data-theme
   before first paint; everything else can wait for the parser. */
// theme toggle (initial theme is already set by the <head> script)
(function(){
  var root=document.documentElement;
  var t=document.getElementById('themeToggle');
  if(!t) return;
  t.addEventListener('click',function(){
    var next=root.getAttribute('data-theme')==='dark'?'light':'dark';
    root.setAttribute('data-theme',next);
    try{localStorage.setItem('steer-theme',next);}catch{}
  });
})();
// nav floats transparent/light while it overlaps the always-dark hero
(function(){
  var hero=document.querySelector('.chero');
  if(!hero||!('IntersectionObserver' in window)) return;
  new IntersectionObserver(function(es){
    document.documentElement.classList.toggle('nav-over-hero', es[0].isIntersecting);
  },{rootMargin:'-52px 0px 0px 0px',threshold:0}).observe(hero);
})();
// launch list: the hero/nav CTAs open the <dialog> form; the pricing card holds
// the same form inline. Submits go form-encoded (a "simple" request, so no
// CORS preflight) to the list endpoint; failure offers the mailto instead of a
// dead end, because the alternative is losing the reader at peak intent.
(function(){
  var dlg=document.getElementById('mlDialog');
  if(dlg&&dlg.showModal){
    document.querySelectorAll('[data-ml]').forEach(function(a){
      a.addEventListener('click',function(e){e.preventDefault();dlg.showModal();});
    });
    var x=document.getElementById('mlClose');
    if(x)x.addEventListener('click',function(){dlg.close();});
  }
  document.querySelectorAll('.ml-form').forEach(function(f){
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var msg=f.querySelector('.ml-msg'),btn=f.querySelector('button[type="submit"]');
      btn.disabled=true;msg.textContent='Adding you...';
      fetch(f.action,{method:'POST',headers:{'Accept':'application/json'},body:new URLSearchParams(new FormData(f))})
        .then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
        .then(function(){
          msg.textContent="You're on the list. One email when the trial opens.";
          f.querySelectorAll('.ml-in,button').forEach(function(el){el.disabled=true;});
        })
        .catch(function(){
          btn.disabled=false;
          msg.innerHTML='Could not reach the list. Email <a href="mailto:steer@seanfloyd.dev?subject=Add%20me%20to%20the%20Steer%20launch%20list">steer@seanfloyd.dev</a> and I\'ll add you.';
        });
    });
  });
})();
// face-button glyphs + pad-aware re-labelling. The markup ships the default
// PlayStation glyph inline so the vignettes still state their claim with JS
// disabled (a design-rules non-negotiable); render() overwrites it on load and
// on every pad change, so the JS remains the single source of truth. The hero picker owns the pad
// state (html[data-pad], via the 'steerpad' event); every vignette glyph and
// key/mech label follows it, mapped by POSITION so the muscle-memory claim
// stays true: bottom = Cross/A/B, right = Circle/B/A, etc. Switch and MFi
// letters go neutral (Switch Pro caps are unlabelled grey; MFi uses Apple's
// A/B/X/Y naming from the GameController framework). Mac-side surfaces
// (timeline clips, scene thumbs) keep their palette — they're UI, not buttons.
(function(){
  var C={cross:'--ps-cross',circle:'--ps-circle',triangle:'--ps-triangle',square:'--ps-square'};
  // per-pad letter + colour for each PS-role position
  var LET={
    xb:{cross:['A','var(--ps-triangle)'],circle:['B','var(--ps-circle)'],square:['X','var(--ps-cross)'],triangle:['Y','var(--yellow)']},
    sw:{cross:['B','var(--text-2)'],circle:['A','var(--text-2)'],square:['Y','var(--text-2)'],triangle:['X','var(--text-2)']},
    mf:{cross:['A','var(--text-2)'],circle:['B','var(--text-2)'],square:['X','var(--text-2)'],triangle:['Y','var(--text-2)']}
  };
  function glyph(kind,pad){
    if(LET[pad]){
      var l=LET[pad][kind];
      return '<svg class="face" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="11.7" stroke="'+l[1]+'" stroke-width="1.5" opacity="0.9"/>'+
        '<text x="13" y="17.2" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="11.5" font-weight="600" fill="'+l[1]+'">'+l[0]+'</text></svg>';
    }
    var c='var('+C[kind]+')';
    var inner={
      cross:'<path d="M9 9l8 8M17 9l-8 8" stroke="'+c+'" stroke-width="1.7" stroke-linecap="round"/>',
      circle:'<circle cx="13" cy="13" r="4.6" stroke="'+c+'" stroke-width="1.7"/>',
      triangle:'<path d="M13 7.6l5.4 9.4H7.6z" stroke="'+c+'" stroke-width="1.7" stroke-linejoin="round" fill="none"/>',
      square:'<rect x="8.4" y="8.4" width="9.2" height="9.2" rx="1.4" stroke="'+c+'" stroke-width="1.7"/>'
    }[kind];
    return '<svg class="face" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="11.7" stroke="'+c+'" stroke-width="1.5" opacity="0.9"/>'+inner+'</svg>';
  }
  function render(pad){
    document.querySelectorAll('.face-slot').forEach(function(s){s.innerHTML=glyph(s.dataset.b,pad);});
    // the drawn plates carry the pad too: a single fixed symbol meant every
    // pick rendered the same generic controller.
    document.querySelectorAll('use.padart').forEach(function(u){u.setAttribute('href','assets/svg/pad-art-'+pad+'.svg#s');});
    document.querySelectorAll('[data-ps]').forEach(function(el){
      var v=el.getAttribute('data-'+pad);
      if(v!=null) el.textContent=v;
    });
  }
  render('ps');
  document.addEventListener('steerpad',function(e){render(e.detail);});
})();
// controller-picker hero (.chero): pad tabs, deep links, light-bar swatches.
// (The source hero's theme JS is dropped — the site's toggle owns html[data-theme].)
(function(){
  var hero=document.querySelector('.chero'); if(!hero) return;
  if(navigator.webdriver||/[?&]still/.test(location.search)) document.documentElement.classList.add('still');
  // Every .tab on the page, not just the hero's: the pad strip under the hero
  // is a second picker, so a reader who scrolled past the fold can still tell
  // the page which controller they own instead of silently getting ps.
  var tabs=[].slice.call(document.querySelectorAll('.tab'));
  var wraps={ps:hero.querySelector('.padwrap.ps'),xb:hero.querySelector('.padwrap.xb'),sw:hero.querySelector('.padwrap.sw'),mf:hero.querySelector('.padwrap.mf')};
  var hashNames={ps:'playstation',xb:'xbox',sw:'nintendo',mf:'others'};
  function setPad(pad,writeHash){
    hero.dataset.pad=pad;
    // mirror on <html> + announce, so vignette glyphs/labels page-wide follow the pick
    document.documentElement.setAttribute('data-pad',pad);
    document.dispatchEvent(new CustomEvent('steerpad',{detail:pad}));
    tabs.forEach(function(t){
      var on=t.dataset.pad===pad;
      t.setAttribute('aria-selected',on?'true':'false');
      t.tabIndex=on?0:-1;
    });
    Object.keys(wraps).forEach(function(k){
      var on=k===pad;
      wraps[k].classList.toggle('active',on);
      wraps[k].setAttribute('aria-hidden',on?'false':'true');
    });
    hero.querySelectorAll('.only-ps, .only-xb, .only-sw, .only-mf').forEach(function(el){
      el.hidden=!el.classList.contains('only-'+pad);
    });
    if(writeHash!==false) history.replaceState(null,'','#'+hashNames[pad]);
  }
  tabs.forEach(function(t){t.addEventListener('click',function(){setPad(t.dataset.pad);});});
  // roving focus stays inside the tablist that was pressed: `tabs` spans both
  // groups now, and cycling it moved focus from the strip up into the hero.
  document.querySelectorAll('.tabs').forEach(function(g){
    var group=[].slice.call(g.querySelectorAll('.tab'));
    g.addEventListener('keydown',function(e){
      if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
      var i=group.findIndex(function(t){return t.getAttribute('aria-selected')==='true';});
      var n=(i+(e.key==='ArrowRight'?1:group.length-1))%group.length;
      setPad(group[n].dataset.pad); group[n].focus(); e.preventDefault();
    });
  });
  // light bar colour swatches — the picker now lives in the Feel band, but
  // --led stays on .chero (it drives the hero bar) and the pick still
  // recolours the global accent: every emissive/interactive element (eyebrow
  // dots, links, focus rings, CTAs) crossfades to AA-safe variants of the
  // chosen colour (see the data-accent blocks in styles/tokens.css). Default stays blue.
  // Idle, the bar auto-cycles a slow rainbow (.lb-auto). Locking a swatch
  // stops the drift and re-themes the page accent; the Auto swatch (or
  // re-clicking the active colour) hands the bar back to the rainbow.
  var dots=[].slice.call(document.querySelectorAll('.lb-picker .dot'));
  var autoDot=document.querySelector('.lb-picker .dot-auto');
  var colourDots=dots.filter(function(d){return d!==autoDot;});
  var accentNames={'#4d8dff':'blue','#a87cff':'violet','#3fe0c0':'teal','#ffb454':'amber'};
  var reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setAccent(name){
    var root=document.documentElement;
    if((root.getAttribute('data-accent')||'blue')===name) return;
    if(!reduceMotion){
      root.classList.add('accent-anim');
      clearTimeout(setAccent.t);
      setAccent.t=setTimeout(function(){root.classList.remove('accent-anim');},450);
    }
    if(name==='blue') root.removeAttribute('data-accent'); else root.setAttribute('data-accent',name);
    try{localStorage.setItem('steer-accent',name);}catch{}
  }
  function press(el,on){el.setAttribute('aria-pressed',on?'true':'false');}
  function setAuto(){
    hero.classList.add('lb-auto');
    hero.style.setProperty('--led','#4D8DFF');
    colourDots.forEach(function(x){press(x,false);});
    if(autoDot) press(autoDot,true);
    setAccent('blue');
    try{localStorage.setItem('steer-accent','auto');}catch{}
  }
  function setLED(c){
    hero.classList.remove('lb-auto');
    hero.style.setProperty('--led',c);
    if(autoDot) press(autoDot,false);
    colourDots.forEach(function(x){press(x,x.dataset.c.toLowerCase()===c.toLowerCase());});
    var name=accentNames[c.toLowerCase()];
    if(name) setAccent(name);
  }
  colourDots.forEach(function(d){d.addEventListener('click',function(){
    if(d.getAttribute('aria-pressed')==='true'){setAuto();return;} // re-click active colour → back to auto
    setLED(d.dataset.c);
  });});
  if(autoDot) autoDot.addEventListener('click',setAuto);
  // restore: a locked colour comes back locked; absent or 'auto' → rainbow idle
  var savedAccent=null;
  try{savedAccent=localStorage.getItem('steer-accent');}catch{}
  if(savedAccent&&savedAccent!=='auto'){
    var savedHex=Object.keys(accentNames).find(function(k){return accentNames[k]===savedAccent;});
    if(savedHex) setLED(savedHex); else setAuto();
  }else{
    setAuto();
  }
  // don't run the rainbow while the hero is scrolled away
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){
      es.forEach(function(e){hero.classList.toggle('rb-halt',!e.isIntersecting);});
    },{threshold:0.03}).observe(hero);
  }
  // deep links: #playstation · #xbox · #nintendo (plus #ps/#xb/#sw/#switch), and #led=RRGGBB
  var h=location.hash.toLowerCase();
  var padFromHash=
    /xbox|^#xb$/.test(h)?'xb':
    /nintendo|switch|^#sw$/.test(h)?'sw':
    /mfi|others|^#mf$/.test(h)?'mf':
    /playstation|^#ps$/.test(h)?'ps':null;
  setPad(padFromHash||'ps',false);
  var m=h.match(/led=(%23|#)?([0-9a-f]{6})/);
  if(m) setLED('#'+m[2]);
  // after the entrance, hand the room lights over to transitions
  setTimeout(function(){hero.classList.add('booted');},2700);
})();
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
