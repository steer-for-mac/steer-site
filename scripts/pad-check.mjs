#!/usr/bin/env node
/* Behavioural gate for the controller picker.
 *
 *   node scripts/pad-check.mjs        (or `make pad`, which builds first)
 *
 * The picker was four role="tab" buttons with a hand-written ArrowLeft/Right
 * handler and aria-selected written back onto every button on each pick. It is
 * two native radio groups now, so the browser owns the keyboard and CSS reads
 * :checked. That swap is invisible to every other gate here: html-validate sees
 * valid markup either way, axe sees a labelled group either way, and neither can
 * press ArrowRight. This can.
 *
 * The two groups carry different name= values deliberately. Same-name radios are
 * one group document-wide, so arrow keys would walk from the strip up into the
 * hero seven screens away -- the exact bug the deleted roving-focus code existed
 * to patch. The "stays inside its own group" assertion below is what stops that
 * regressing quietly.
 */
import { launch, reporter, sleep } from "./lib/cdp.mjs";

const { ok, done } = reporter();
const { session: s, url, close } = await launch();

const KEY = { key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39, nativeVirtualKeyCode: 39 };
const arrowRight = async () => {
  await s.send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...KEY });
  await s.send("Input.dispatchKeyEvent", { type: "keyUp", ...KEY });
  await sleep(80);
};

/* Everything the pick is supposed to move, read in one go. */
const state = `(()=>{const r=document.documentElement,h=document.querySelector('.chero');
  const chk=n=>{const e=document.querySelector('input[name="'+n+'"]:checked');return e&&e.value;};
  const act=[].slice.call(document.querySelectorAll('.chero .padwrap'))
    .filter(w=>w.classList.contains('active')).map(w=>w.className.replace('padwrap','').replace('active','').trim());
  const shown=[].slice.call(document.querySelectorAll('.chero [class*="only-"]'))
    .filter(e=>getComputedStyle(e).display!=='none')
    .map(e=>(e.className.match(/only-\\w+/)||[''])[0]);
  return {html:r.getAttribute('data-pad'),hero:h&&h.getAttribute('data-pad'),
          heroPick:chk('hero-pad'),stripPick:chk('strip-pad'),
          active:act,shown:[...new Set(shown)],focus:document.activeElement&&document.activeElement.id};})()`;

try {
  await s.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await s.send("Page.navigate", { url: url("index.html") });
  await sleep(900);

  let st = await s.eval(state);
  ok("default is PlayStation, everywhere at once",
     [st.html, st.hero, st.heroPick, st.stripPick, st.active, st.shown],
     ["ps", "ps", "ps", "ps", ["ps"], ["only-ps"]]);

  // A pointer pick in the hero must move the page AND the other picker.
  await s.eval(`document.querySelector('label[for="hp-xb"]').click()`);
  await sleep(120); st = await s.eval(state);
  ok("hero pick moves the page and syncs the strip",
     [st.html, st.hero, st.heroPick, st.stripPick, st.active, st.shown],
     ["xb", "xb", "xb", "xb", ["xb"], ["only-xb"]]);

  // ...and the reverse, since the strip is a real picker and not a display.
  await s.eval(`document.querySelector('label[for="sp-sw"]').click()`);
  await sleep(120); st = await s.eval(state);
  ok("strip pick moves the page and syncs the hero",
     [st.html, st.heroPick, st.stripPick, st.active], ["sw", "sw", "sw", ["sw"]]);

  /* The whole reason for radios: no keydown handler exists any more, so if this
     passes it is the browser doing it. */
  await s.eval(`document.getElementById('hp-ps').focus()`);
  await arrowRight(); st = await s.eval(state);
  ok("ArrowRight selects the next pad with no handler of ours",
     [st.html, st.heroPick, st.focus], ["xb", "xb", "hp-xb"]);

  /* Focus must not escape into the other picker. With one shared name= it
     would, which is what made the old handler necessary. */
  await s.eval(`document.getElementById('sp-mf').focus()`);
  await arrowRight(); st = await s.eval(state);
  ok("arrow keys wrap inside the strip, never into the hero",
     [st.focus, st.stripPick, st.heroPick], ["sp-ps", "ps", "ps"]);

  /* Deep link, which is how the compatibility page hands off to the hero.
     Via about:blank on purpose: Page.navigate to a URL that differs only by
     hash does not reload the document, so the init this asserts on would never
     re-run and the assertion would grade the state left by the test above. */
  await s.send("Page.navigate", { url: "about:blank" });
  await sleep(120);
  await s.send("Page.navigate", { url: url("index.html#xbox") });
  await sleep(900); st = await s.eval(state);
  ok("#xbox deep link arrives on Xbox with both pickers agreeing",
     [st.html, st.hero, st.heroPick, st.stripPick, st.active], ["xb", "xb", "xb", "xb", ["xb"]]);
} finally {
  close();
}
done("pad");
