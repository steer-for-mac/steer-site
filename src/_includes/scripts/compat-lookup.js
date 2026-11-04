// The controller lookup on compatibility.html. Reads the list the build inlined
// into #pad-data and answers from it; nothing is fetched.
(function () {
  const box = document.getElementById("pad-lookup");
  const data = document.getElementById("pad-data");
  if (!box || !data) return;
  const input = box.querySelector("input");
  const out = box.querySelector("output");
  const list = box.querySelector("datalist");
  let pads, listed;
  try {
    pads = JSON.parse(data.textContent || "[]");
    listed = JSON.parse(document.getElementById("pad-sdl")?.textContent || "[]");
  } catch { return; }

  const TIERS = {
    tested: ["Tested on hardware", "Steer has run on a real one."],
    expected: ["Expected to work", "macOS recognises it, but Steer has not run on a real one yet."],
    untested: ["Untested", "Nobody here has one to try it on."],
    listed: ["In the beta list", "Steer has a community mapping for it built in. That support is in beta: it has never been confirmed on real hardware with Steer."],
  };
  const norm = (s) => s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");
  const words = (s) => ` ${s.normalize("NFKD").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).join(" ")} `;

  // Every spelling a pad answers to, longest first: "my dualsense edge" should
  // find the Edge before it finds the DualSense. A named pad sorts ahead of a
  // beta-list name with the same spelling, so it keeps its own tier.
  const keys = [];
  for (const pad of pads) {
    for (const k of [pad.name, ...(pad.aliases || [])]) keys.push([norm(k), pad, words(k), k === pad.name]);
  }
  for (const name of listed) keys.push([norm(name), { name, tier: "listed" }, words(name), true]);
  keys.sort((a, b) => b[0].length - a[0].length || (a[1].tier === "listed") - (b[1].tier === "listed"));
  const named = keys.filter(([, pad]) => pad.tier !== "listed");

  // ~240 names is too many for a phone's suggestion strip: show the first few.
  const SUGGEST = 8;
  const initial = [...list.options].map((o) => o.value);
  function suggest(q) {
    const names = q
      ? [...new Set([...named, ...keys].filter(([k]) => k.includes(q)).map(([, pad]) => pad.name))].slice(0, SUGGEST)
      : initial;
    list.replaceChildren(...names.map((n) => Object.assign(document.createElement("option"), { value: n })));
  }

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
    if (pad.tier !== "listed") {
      out.replaceChildren(tier, span("pad-name", pad.name), span("pad-note", `${gloss} ${pad.note}`));
      return;
    }
    const note = span("pad-note", `${gloss} Testers wanted: `);
    note.append(tellUs("tell us how it goes"), ".");
    out.replaceChildren(tier, span("pad-name", pad.name), note);
  }

  function tellUs(text) {
    const link = document.createElement("a");
    link.href = "suggest.html";
    link.textContent = text;
    return link;
  }

  function unknown() {
    const note = span("pad-note", "Steer may still work with it, through the path for off-brand pads, but that path has never run on a real pad. ");
    note.append(tellUs("Tell us which one"), ".");
    out.replaceChildren(span("pad-name", "Not on the list"), note);
  }

  function hint(text) { out.replaceChildren(span("pad-note", text)); }

  // committed: the reader pressed Enter, picked an option or left the field.
  function answer(committed) {
    const q = norm(input.value);
    if (!committed) suggest(q);
    if (!q) { out.replaceChildren(); return; }
    const exact = keys.find(([k]) => k === q);
    if (exact) return show(exact[1]);
    // A known name inside a longer query ("sony dualsense controller"), as whole
    // words. A one-word alias is a brand or a nickname ("Steam", "Logitech") and
    // only answers on its own: "steam deck" is not a Steam Controller.
    const qw = words(input.value);
    const inside = keys.find(([, , kw, isName]) => (isName || kw.trim().includes(" ")) && kw.trim().length >= 4 && qw.includes(kw));
    if (inside) return show(inside[1]);
    // A named pad answers a prefix before the beta list does: "stad" is the Stadia row.
    const hits = (from) => [...new Set(from.filter(([k]) => k.includes(q)).map(([, pad]) => pad))];
    const partial = hits(named).length ? hits(named) : hits(keys);
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
