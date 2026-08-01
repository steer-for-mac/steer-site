// controller-picker hero (.chero): pad tabs, deep links, light-bar swatches.
// (The source hero's theme JS is dropped — the site's toggle owns html[data-theme].)
(function(){
  var hero=document.querySelector('.chero'); if(!hero) return;
  if(navigator.webdriver||/[?&]still/.test(location.search)) document.documentElement.classList.add('still');
  // Two radio groups: the hero's and the pad strip's, so a reader who scrolled
  // past the fold can still tell the page which controller they own instead of
  // silently getting ps. They are separate name= groups (see the note in
  // _includes/bands/hero.html), so this keeps them agreeing.
  //
  // What used to be here and is now the browser's job: an ArrowLeft/ArrowRight
  // keydown handler, and writing aria-selected and tabIndex onto four elements
  // on every pick. A radio group does all three, and CSS reads :checked, so
  // there is no selected-state bookkeeping left to drift.
  var radios=[].slice.call(document.querySelectorAll('.tab-in'));
  var wraps={ps:hero.querySelector('.padwrap.ps'),xb:hero.querySelector('.padwrap.xb'),sw:hero.querySelector('.padwrap.sw'),mf:hero.querySelector('.padwrap.mf')};
  var hashNames={ps:'playstation',xb:'xbox',sw:'nintendo',mf:'others'};
  function setPad(pad,writeHash){
    hero.dataset.pad=pad;
    // mirror on <html> + announce, so vignette glyphs/labels page-wide follow the pick
    document.documentElement.setAttribute('data-pad',pad);
    document.dispatchEvent(new CustomEvent('steerpad',{detail:pad}));
    radios.forEach(function(r){ if(r.value===pad && !r.checked) r.checked=true; });
    Object.keys(wraps).forEach(function(k){
      var on=k===pad;
      wraps[k].classList.toggle('active',on);
      wraps[k].setAttribute('aria-hidden',on?'false':'true');
    });
    if(writeHash!==false) history.replaceState(null,'','#'+hashNames[pad]);
  }
  // 'change', not 'click': it fires for the keyboard too, so arrow keys move the
  // page and not just the focus ring.
  radios.forEach(function(r){r.addEventListener('change',function(){if(r.checked)setPad(r.value);});});
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
