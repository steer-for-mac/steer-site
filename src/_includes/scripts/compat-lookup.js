// The controller lookup on compatibility.html. Reads the list the build inlined
// into #pad-data and answers from it; nothing is fetched.
(function () {
  const box = document.getElementById("pad-lookup");
  const data = document.getElementById("pad-data");
  if (!box || !data) return;
  const input = box.querySelector("input");
  const out = box.querySelector("output");
  let pads;
  try { pads = JSON.parse(data.textContent || "[]"); } catch { return; }

  const TIERS = {
    tested: ["Tested on hardware", "Steer has run on a real one."],
    expected: ["Expected to work", "macOS recognises it, but Steer has not run on a real one yet."],
    untested: ["Untested", "Nobody here has one to try it on."],
  };
  const norm = (s) => s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");

  // Every spelling a pad answers to, longest first: "my dualsense edge" should
  // find the Edge before it finds the DualSense.
  const keys = [];
  for (const pad of pads) {
    for (const k of [pad.name, ...(pad.aliases || [])]) keys.push([norm(k), pad]);
  }
  keys.sort((a, b) => b[0].length - a[0].length);

  const span = (cls, text) => {
    const el = document.createElement("span");
    el.className = cls;
    el.textContent = text;
    return el;
  };

  function show(pad) {
    const [label, gloss] = TIERS[pad.tier];
    const tier = span("pad-tier", label);
    tier.setAttribute("data-tier", pad.tier);
    out.replaceChildren(tier, span("pad-name", pad.name), span("pad-note", `${gloss} ${pad.note}`));
  }

  function unknown() {
    const link = document.createElement("a");
    link.href = "suggest.html";
    link.textContent = "Tell us which one";
    const note = span("pad-note", "Steer may still work with it, through the path for off-brand pads, but that path has never run on a real pad. ");
    note.append(link, ".");
    out.replaceChildren(span("pad-name", "Not on the list"), note);
  }

  function hint(text) { out.replaceChildren(span("pad-note", text)); }

  // committed: the reader pressed Enter, picked an option or left the field.
  function answer(committed) {
    const q = norm(input.value);
    if (!q) { out.replaceChildren(); return; }
    const exact = keys.find(([k]) => k === q);
    if (exact) return show(exact[1]);
    // A known name inside a longer query ("sony dualsense controller").
    const inside = keys.find(([k]) => k.length >= 4 && q.includes(k));
    if (inside) return show(inside[1]);
    const partial = [...new Set(keys.filter(([k]) => k.includes(q)).map(([, pad]) => pad))];
    if (partial.length === 0) return q.length >= 3 || committed ? unknown() : out.replaceChildren();
    if (!committed) return out.replaceChildren();
    if (partial.length === 1) return show(partial[0]);
    hint("More than one controller matches. Pick one from the list.");
  }

  input.addEventListener("input", () => answer(false));
  input.addEventListener("change", () => answer(true));
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") answer(true); });
  box.hidden = false;
})();
