/* Third-party controller names are inlined into compatibility.html's <script>
   elements. A hostile name must neither reach the data nor, if it did, close
   the element. Node-side only: no page is loaded. */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { scriptJson } from "../scripts/script-json.js";

const HOSTILE = "Pad</script><img src=x onerror=alert(1)>\u2028&";

test("scriptJson leaves nothing that can close a script element, and parses back unchanged", () => {
  const out = scriptJson([HOSTILE]);
  expect(out).not.toMatch(/[<>&\u2028\u2029]/);
  expect(JSON.parse(out)).toEqual([HOSTILE]);
});

test("sdl-names skips a hostile name and keeps the rest", () => {
  const dir = mkdtempSync(join(tmpdir(), "sdl-names-"));
  const row = (name) => `03000000000000000000000000000000,${name},a:b0,platform:Mac OS X,`;
  const rows = [row(HOSTILE.replace(",", "")), ...Array.from({ length: 120 }, (_, i) => row(`Pad ${i}`))];
  writeFileSync(join(dir, "db.txt"), rows.join("\n"));
  execFileSync("scripts/sdl-names", [join(dir, "db.txt"), join(dir, "out.json")], { stdio: "pipe" });
  const names = JSON.parse(readFileSync(join(dir, "out.json"), "utf8")).names;
  expect(names).toHaveLength(120);
  expect(names.some((n) => n.includes("<"))).toBe(false);
});
