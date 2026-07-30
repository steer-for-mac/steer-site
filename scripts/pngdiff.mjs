#!/usr/bin/env node
/* Byte-exact PNG comparison of two shot directories, plus a decoded per-pixel
 * count when the bytes differ so "1 pixel" and "the band moved" are told apart.
 *
 *   node scratch/pngdiff.mjs scratch/shots-before scratch/shots
 *
 * Decoding is zlib + the five PNG filter types, which is what Node ships; no
 * image library, same rule as the rest of this repo's tooling.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

const [A, B] = process.argv.slice(2);

function decode(buf) {
  let p = 8, w = 0, h = 0, bitDepth = 0, colorType = 0, idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString("ascii", p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    p += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`bit depth ${bitDepth} unsupported`);
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch, out = Buffer.alloc(h * stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[q++];
    const line = raw.subarray(q, q + stride); q += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[x] = v & 255;
    }
  }
  return { w, h, ch, out };
}

const names = readdirSync(A).filter((n) => n.endsWith(".png") && existsSync(join(B, n)));
const onlyA = readdirSync(A).filter((n) => n.endsWith(".png") && !existsSync(join(B, n)));
const onlyB = readdirSync(B).filter((n) => n.endsWith(".png") && !existsSync(join(A, n)));
let bad = 0;
for (const n of names.sort()) {
  const ba = readFileSync(join(A, n)), bb = readFileSync(join(B, n));
  if (ba.equals(bb)) { console.log(`  same bytes  ${n}`); continue; }
  const da = decode(ba), db = decode(bb);
  if (da.w !== db.w || da.h !== db.h) { console.log(`  DIFFERENT SIZE ${n}: ${da.w}x${da.h} -> ${db.w}x${db.h}`); bad++; continue; }
  let px = 0, maxd = 0;
  for (let i = 0; i < da.out.length; i += da.ch) {
    let d = 0;
    for (let c = 0; c < da.ch; c++) d = Math.max(d, Math.abs(da.out[i + c] - db.out[i + c]));
    if (d) { px++; maxd = Math.max(maxd, d); }
  }
  if (px) { console.log(`  DIFFER      ${n}: ${px} px (${(100 * px / (da.w * da.h)).toFixed(4)}%), max channel delta ${maxd}`); bad++; }
  else console.log(`  same pixels ${n} (bytes differ, decoded identical)`);
}
if (onlyA.length) console.log(`  only in ${A}: ${onlyA.join(", ")}`);
if (onlyB.length) console.log(`  only in ${B}: ${onlyB.join(", ")}`);
console.log(bad ? `\n${bad} frame(s) differ` : `\n${names.length} frames identical`);
process.exit(bad ? 1 : 0);
