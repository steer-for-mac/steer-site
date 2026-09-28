/* The demo's button table and chip markup, handed to the templates so a
   static band (the per-app legend) prints the same chips the live demo draws.
   Not a copy: both read scripts/pad-family.js. */
import { glyphOf, nameOf } from "../scripts/pad-family.js";

export default { glyph: glyphOf, name: nameOf, families: ["ps", "xb", "sw"] };
