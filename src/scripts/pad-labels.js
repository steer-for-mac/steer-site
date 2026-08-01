// pad-aware re-labelling. The hero picker owns the pad state (html[data-pad],
// via the 'steerpad' event); every vignette label and drawn plate follows it.
//
// The face-button GLYPHS are no longer built here. This function used to
// assemble an <svg> per slot by concatenating strings, which meant the four
// letters and their four colours existed twice (the hero plates held the other
// copy) and that none of the markup was visible to html-validate, stylelint or
// PurgeCSS. All four variants are markup now, from _data/pads.json through
// _includes/macros/pad.njk, and CSS in styles/design-system.css picks one. The
// mapping they encode is unchanged and still by POSITION, so the muscle-memory
// claim stays true: bottom = Cross/A/B, right = Circle/B/A, etc. Mac-side
// surfaces (timeline clips, scene thumbs) keep their palette, they're UI.
(function(){
  function render(pad){
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
