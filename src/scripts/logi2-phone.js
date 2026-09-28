// The homepage on a phone: the demo is a loop to watch, and one line offers to
// send the page to a Mac (bands/logi2/demo.html says why).
(function () {
  var phone = matchMedia("(pointer: coarse), (max-width: 600px)");
  var stage = document.getElementById("pyStage");

  /* Not inert: the replay types by focusing the note, and an inert desk
     cannot take focus, so the loop would stop typing. Instead the desk takes
     no touches (demo.css, .is-watch) and the note is read-only, so no tap can
     raise the phone's keyboard, and the desk leaves the tab order. A
     controller that takes over (pad-demo.js raises "steerpad") gets the desk
     back: a phone with a pad paired is a visitor who wants to drive. */
  var note = /** @type {HTMLTextAreaElement|null} */ (document.getElementById("pyText"));
  var driven = false;
  function fit() {
    var watch = phone.matches && !driven;
    if (stage) { stage.classList.toggle("is-watch", watch); stage.tabIndex = watch ? -1 : 0; }
    if (note) note.readOnly = watch;
  }
  phone.addEventListener("change", fit);
  document.addEventListener("steerpad", function () { driven = true; fit(); });
  fit();


  var go = document.querySelector(".l2-share-go");
  var said = document.querySelector(".l2-share-said");
  if (!go || !said) return;
  var url = location.href.split("#")[0];
  var canShare = typeof navigator.share === "function";
  if (!canShare && !(navigator.clipboard && navigator.clipboard.writeText)) return;
  go.textContent = canShare ? "Send the link" : "Copy the link";
  go.hidden = false;
  go.addEventListener("click", function () {
    if (canShare) {
      /* A dismissed sheet rejects with AbortError; that is the visitor's
         answer, not a failure to report. */
      navigator.share({ title: document.title, text: "Try Steer with a controller on your Mac.", url: url }).catch(function () {});
      return;
    }
    navigator.clipboard.writeText(url).then(
      function () { said.textContent = "Link copied. Open it on your Mac."; },
      function () { said.textContent = url; });
  });
})();
