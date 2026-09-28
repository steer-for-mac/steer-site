/* Which naming scheme a Gamepad API id gets. Vendor ID first: a DualShock 4
   calls itself plain "Wireless Controller", and so do other makers' pads.
   Chromium: "<name> (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)". Firefox
   and Safari's HID path: "54c-ce6-<name>". Safari's GameController path:
   "<vendorName> Extended Gamepad", no ID at all. Unknown pads get Xbox names,
   as NamingScheme.defaultScheme does. */

const VENDOR = { 0x054c: "ps", 0x045e: "xb", 0x057e: "sw" };

/** @param {string} id @returns {number} the USB vendor ID, or -1 */
export function vendorOf(id) {
  const m = /Vendor: ([0-9a-f]{1,4})\b/i.exec(id) || /^([0-9a-f]{1,4})-[0-9a-f]{1,4}-/i.exec(id);
  return m?.[1] ? parseInt(m[1], 16) : -1;
}

/** @param {string} id @returns {"ps"|"xb"|"sw"} */
export function familyOf(id) {
  const v = VENDOR[vendorOf(id)];
  if (v) return v;
  /* Names only, and only ones no other maker reuses: never bare "wireless controller". */
  if (/xbox|xinput/i.test(id)) return "xb";
  if (/dualsense|dualshock|playstation/i.test(id)) return "ps";
  if (/pro controller|joy-con|nintendo/i.test(id)) return "sw";
  return "xb";
}

/** The pad's own name, without the browser's decoration. @param {string} id */
export function padNameOf(id) {
  return (id || "controller")
    .replace(/\s*\(.*$/, "")
    .replace(/^[0-9a-f]{1,4}-[0-9a-f]{1,4}-/i, "")
    .replace(/ (Extended )?Gamepad$/, "");
}

/* ButtonDefs.swift xboxNames / switchNames: what each family calls a button
   by its standard-mapping POSITION (cross is the south button everywhere).
   Unknown pads get the Xbox scheme, as NamingScheme.defaultScheme does. The
   one table: the demo reads it live, and _data/padGlyphs.js hands it to the
   templates, so the per-app band's chips cannot disagree with the demo's. */
export const NAMES = {
  ps: { cross: "Cross", circle: "Circle", square: "Square", triangle: "Triangle", l1: "L1", r1: "R1", l2: "L2", r2: "R2",
    l3: "L3", r3: "R3", create: "Create", options: "Options", touchpad: "Touchpad Click" },
  xb: { cross: "A", circle: "B", square: "X", triangle: "Y", l1: "LB", r1: "RB", l2: "LT", r2: "RT",
    l3: "LS", r3: "RS", create: "View", options: "Menu" },
  sw: { cross: "B", circle: "A", square: "Y", triangle: "X", l1: "L", r1: "R", l2: "ZL", r2: "ZR",
    l3: "L3", r3: "R3", create: "−", options: "+" },
};
const DPAD = { up: "D-pad Up", down: "D-pad Down", left: "D-pad Left", right: "D-pad Right" };
const ARROW = { up: "↑", down: "↓", left: "←", right: "→" };
/* Moving a stick. The app writes it out in every family (HelpOverlay's analog
   rows, Strings.Onboarding.leftStick): a bare "L" or "R" would read as the
   Switch's shoulders, and "LS"/"RS" are Xbox's names for CLICKING a stick. */
const STICK = { ls: "Left Stick", rs: "Right Stick" };

/** @param {string} fam @param {string} b */
export const nameOf = (fam, b) => NAMES[/** @type {"ps"|"xb"|"sw"} */ (fam)]?.[b] || DPAD[b] || STICK[b] || b;

const PS_SHAPE = {
  cross: '<path d="M9 9l8 8M17 9l-8 8" stroke="var(--ps-cross)"/>',
  circle: '<circle cx="13" cy="13" r="4.8" stroke="var(--ps-circle)"/>',
  square: '<rect x="8.6" y="8.6" width="8.8" height="8.8" rx="1.2" stroke="var(--ps-square)"/>',
  triangle: '<path d="M13 7.8l5.2 9H7.8z" stroke="var(--ps-triangle)" stroke-linejoin="round"/>',
};

/** One button as a .py-g chip: PlayStation's shapes, every other family's
    letters, arrows for the d-pad. @param {string} fam @param {string} b */
export function glyphOf(fam, b) {
  const label = nameOf(fam, b);
  if (fam === "ps" && PS_SHAPE[b]) {
    return `<span class="py-g py-g-face" data-b="${b}"><svg viewBox="0 0 26 26" fill="none" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">${PS_SHAPE[b]}</svg><span class="py-vh">${label}</span></span>`;
  }
  const text = ARROW[b] || label;
  const cls = PS_SHAPE[b] ? " py-g-face" : "";
  return `<span class="py-g${cls}" data-b="${b}"${text !== label ? ` aria-label="${esc(label)}" role="img"` : ""}>${esc(text)}</span>`;
}

/** @param {string} s */
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c] || c); }
