#!/usr/bin/env node
/* Compare two cssdiff.mjs dumps. Exit 1 on any difference.
 *   node scratch/cssdiff-cmp.mjs scratch/css-before.json scratch/css-after.json
 */
import { readFileSync } from "node:fs";
const [a, b] = process.argv.slice(2);
const A = JSON.parse(readFileSync(a, "utf8"));
const B = JSON.parse(readFileSync(b, "utf8"));
let diffs = 0;
const keys = [...new Set([...Object.keys(A), ...Object.keys(B)])];
for (const k of keys) {
  const ra = A[k] || [], rb = B[k] || [];
  if (ra.length !== rb.length) { console.log(`${k}: element count ${ra.length} -> ${rb.length}`); diffs++; continue; }
  for (let i = 0; i < ra.length; i++) {
    if (ra[i] === rb[i]) continue;
    const [ia, tag, boxA, propsA] = ra[i].split("|");
    const [, , boxB, propsB] = rb[i].split("|");
    const pa = new Map(propsA.split(";").map((s) => [s.slice(0, s.indexOf(":")), s.slice(s.indexOf(":") + 1)]));
    const pb = new Map(propsB.split(";").map((s) => [s.slice(0, s.indexOf(":")), s.slice(s.indexOf(":") + 1)]));
    const changed = [];
    for (const [p, v] of pa) if (pb.get(p) !== v) changed.push(`${p}: ${v} -> ${pb.get(p)}`);
    for (const [p, v] of pb) if (!pa.has(p)) changed.push(`+${p}: ${v}`);
    if (boxA !== boxB) changed.unshift(`box: ${boxA} -> ${boxB}`);
    if (!changed.length) continue;
    diffs++;
    console.log(`\n${k}  #${ia} <${tag}>`);
    for (const c of changed.slice(0, 12)) console.log(`    ${c}`);
    if (changed.length > 12) console.log(`    ... ${changed.length - 12} more`);
    if (diffs > 40) { console.log("\n(stopping after 40)"); process.exit(1); }
  }
}
console.log(diffs ? `\n${diffs} element(s) differ` : "identical: no computed-style or box difference in any case");
process.exit(diffs ? 1 : 0);
