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
