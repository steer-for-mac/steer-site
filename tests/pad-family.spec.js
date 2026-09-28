/* Id FORMATS are sourced: Chromium gamepad_device_mac.mm, WebKit
   GameControllerGamepad.mm and HIDGamepad.cpp. Vendor and product IDs are
   sourced from SDL's usb_ids.h. Product NAMES are remembered, not captured
   from a real pad: "sourced" rows guess only the name; "guessed" rows guess
   the whole string, and every Safari GameController row is one of those. */
import { expect, test } from "@playwright/test";
import { NAMES, familyOf, glyphOf, nameOf, padNameOf, vendorOf } from "../src/scripts/pad-family.js";

const IDS = [
  // Chromium, macOS
  { pad: "DualSense", seen: "sourced", fam: "ps", id: "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)" },
  { pad: "DualShock 4", seen: "sourced", fam: "ps", id: "Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)" },
  { pad: "Xbox Series", seen: "sourced", fam: "xb", id: "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)" },
  { pad: "Xbox One S", seen: "sourced", fam: "xb", id: "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 02fd)" },
  { pad: "Switch Pro", seen: "sourced", fam: "sw", id: "Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)" },
  { pad: "8BitDo Pro 2, D-input", seen: "sourced", fam: "xb", id: "8BitDo Pro 2 (Vendor: 2dc8 Product: 6006)" },
  // The bug this file exists for: a generic pad that calls itself what a DualShock 4 does.
  { pad: "generic, DS4's name", seen: "guessed", fam: "xb", id: "Wireless Controller (Vendor: 2dc8 Product: 6006)" },

  // Firefox and Safari's HID path: unpadded hex prefix
  { pad: "DualShock 4", seen: "sourced", fam: "ps", id: "54c-9cc-Wireless Controller" },
  { pad: "generic, DS4's name", seen: "guessed", fam: "xb", id: "2dc8-6006-Wireless Controller" },

  // Safari, GameController framework path: vendorName only, no IDs
  { pad: "DualSense", seen: "guessed", fam: "ps", id: "DualSense Wireless Controller Extended Gamepad" },
  { pad: "DualShock 4", seen: "guessed", fam: "ps", id: "DUALSHOCK 4 Wireless Controller Extended Gamepad" },
  { pad: "Xbox Series", seen: "guessed", fam: "xb", id: "Xbox Wireless Controller Extended Gamepad" },
  { pad: "Xbox One", seen: "guessed", fam: "xb", id: "Xbox One Wireless Controller Extended Gamepad" },
  { pad: "Switch Pro", seen: "guessed", fam: "sw", id: "Pro Controller Extended Gamepad" },
  { pad: "8BitDo Pro 2", seen: "guessed", fam: "xb", id: "8BitDo Pro 2 Extended Gamepad" },
  { pad: "generic, DS4's name", seen: "guessed", fam: "xb", id: "Wireless Controller Extended Gamepad" },
];

for (const { pad, seen, fam, id } of IDS) {
  test(`${pad} (${seen}) is ${fam}: ${id}`, () => {
    expect(familyOf(id)).toBe(fam);
  });
}

test("the vendor ID is read from both id shapes, and absent from Safari's", () => {
  expect(vendorOf("Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)")).toBe(0x057e);
  expect(vendorOf("54c-ce6-DualSense Wireless Controller")).toBe(0x054c);
  expect(vendorOf("DualSense Wireless Controller Extended Gamepad")).toBe(-1);
});

test("the pad's name loses the browser's decoration", () => {
  expect(padNameOf("DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)")).toBe("DualSense Wireless Controller");
  expect(padNameOf("54c-9cc-Wireless Controller")).toBe("Wireless Controller");
  expect(padNameOf("Xbox Wireless Controller Extended Gamepad")).toBe("Xbox Wireless Controller");
});

/* A Switch owner once read "R: Scroll" and "R: Spotlight": the right stick
   and the R shoulder printed the same chip. Every control a family has must
   print its own label, as the app's ButtonDefs names it. */
for (const fam of /** @type {const} */ (["ps", "xb", "sw"])) {
  test(`every ${fam} control prints a chip no other control prints`, () => {
    const keys = [...Object.keys(NAMES[fam]), "up", "down", "left", "right", "ls", "rs"];
    /** @type {Map<string, string>} */
    const seen = new Map();
    for (const b of keys) {
      const html = glyphOf(fam, b);
      const shown = html.replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, "");
      for (const label of new Set([nameOf(fam, b), shown])) {
        expect(seen.get(label) ?? b, `${fam}: "${label}" is both ${seen.get(label)} and ${b}`).toBe(b);
        seen.set(label, b);
      }
    }
  });
}

test("the sticks carry the app's names: moving one is written out, clicking one is L3 or LS", () => {
  expect(nameOf("sw", "rs")).toBe("Right Stick");
  expect(nameOf("sw", "r3")).toBe("R3");
  expect(nameOf("xb", "r3")).toBe("RS");
  expect(nameOf("ps", "l3")).toBe("L3");
});
