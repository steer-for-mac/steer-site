#!/usr/bin/env node
/* Behavioural test for the three-state theme toggle. make ci proves the page
 * builds, validates and grades; it never presses the button. This does.
 *
 *   node scripts/theme-check.mjs        (or `make theme`, which builds first)
 *
 * Build first: a stale _site/ tests a page that no longer exists in the tree.
 *
 * Emulation.setEmulatedMedia is the only honest way to test "follows the OS":
 * it changes what prefers-color-scheme reports to the live page, which is
 * exactly the event the matchMedia listener exists to catch.
 *
 * Transport (Chrome, the loopback server, and the CDP-not-JS eval note) is in
 * scripts/lib/cdp.mjs.
 */
import { launch, reporter, sleep } from "./lib/cdp.mjs";

const { ok, done } = reporter();
const { session: s, url: urlFor, close } = await launch();

try {
  const state = `(()=>{const r=document.documentElement,t=document.getElementById('themeToggle');
    const vis=n=>{const e=t&&t.querySelector('.'+n);return !!e&&getComputedStyle(e).display!=='none';};
    let st=null;try{st=localStorage.getItem('steer-theme');}catch(e){}
    return {pref:r.getAttribute('data-theme-pref'),theme:r.getAttribute('data-theme'),
            stored:st,label:t&&t.getAttribute('aria-label'),
            glyph:['auto','sun','moon'].filter(vis)};})()`;
  const click = `document.getElementById('themeToggle').click()`;

  /* Sub-page AND homepage: the toggle used to be two implementations, so the
     regression this guards against is precisely one page behaving differently. */
  for (const page of ["features.html", "index.html"]) {
    const url = urlFor(page);
    const tag = page.replace(".html", "");

    // A visitor who has never chosen, on a dark Mac.
    await s.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
    await s.send("Page.navigate", { url });
    await sleep(500);
    await s.eval(`try{localStorage.removeItem('steer-theme')}catch(e){}`);
    await s.send("Page.navigate", { url });
    await sleep(500);
    let st = await s.eval(state);
    ok(`${tag}: first visit follows the OS`, [st.pref, st.theme, st.stored, st.glyph], ["system", "dark", null, ["auto"]]);
    ok(`${tag}: label says what pressing does`, st.label, "Theme: System, activate for Light");

    // System -> Light -> Dark -> System, one press at a time.
    await s.eval(click); await sleep(60); st = await s.eval(state);
    ok(`${tag}: press 1 forces Light`, [st.pref, st.theme, st.stored, st.glyph], ["light", "light", "light", ["sun"]]);
    ok(`${tag}: label updates`, st.label, "Theme: Light, activate for Dark");

    await s.eval(click); await sleep(60); st = await s.eval(state);
    ok(`${tag}: press 2 forces Dark`, [st.pref, st.theme, st.stored, st.glyph], ["dark", "dark", "dark", ["moon"]]);

    await s.eval(click); await sleep(60); st = await s.eval(state);
    ok(`${tag}: press 3 RETURNS to System and clears the key`, [st.pref, st.theme, st.stored, st.glyph], ["system", "dark", null, ["auto"]]);

    // The whole point: while on System, an OS change must land live.
    await s.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
    await sleep(120); st = await s.eval(state);
    ok(`${tag}: OS flip repaints while on System`, [st.pref, st.theme], ["system", "light"]);

    // ...and must NOT, once a side is forced.
    await s.eval(click); await sleep(60);                       // -> light (forced)
    await s.eval(click); await sleep(60);                       // -> dark (forced)
    await s.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
    await sleep(120); st = await s.eval(state);
    ok(`${tag}: forced Dark ignores the OS`, [st.pref, st.theme, st.stored], ["dark", "dark", "dark"]);

    // A forced choice survives navigation, which is the reason for localStorage.
    /* The label is asserted HERE and not only on first load. On first load the
       expected string is byte-identical to the one hard-coded in nav.html, so
       that assertion passes whether or not the script ever writes it -- deleting
       the load-time apply() still scored 18/18 until this line existed. After a
       reload carrying a forced preference the two differ, which is the only
       place the write is actually observable. */
    await s.send("Page.navigate", { url });
    await sleep(400); st = await s.eval(state);
    ok(`${tag}: forced choice survives reload`, [st.pref, st.theme, st.glyph, st.label],
       ["dark", "dark", ["moon"], "Theme: Dark, activate for System"]);

    /* A value outside light|dark used to become the state: data-theme="SYSTEM"
       matched no rule, the label read "Theme: undefined", and the first click
       wrote the string "undefined" into storage, killing the only control that
       could recover it. Nothing in this repo writes such a value, so this guards
       the guard rather than a live path. */
    await s.eval(`try{localStorage.setItem('steer-theme','SYSTEM')}catch(e){}`);
    await s.send("Page.navigate", { url });
    await sleep(400); st = await s.eval(state);
    ok(`${tag}: a junk stored value falls back to System`, [st.pref, st.theme, st.label],
       ["system", "light", "Theme: System, activate for Light"]);
    await s.eval(click); await sleep(60); st = await s.eval(state);
    ok(`${tag}: and the control still works after one`, [st.pref, st.stored], ["light", "light"]);
  }
} finally {
  close();
}
done("theme");
