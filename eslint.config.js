// JS lint. Until now this repo linted CSS (stylelint) and markup (html-validate)
// and left 17.9KB of home.js plus six .mjs gates completely unread by a tool.
//
// `js.configs.recommended` and nothing added on top, for the same reason
// stylelint-config-recommended is the CSS baseline: it turns on the rules that
// catch *errors* rather than whatever a person thought to list, and it carries
// no style opinions, so it cannot start a formatting argument with a codebase
// that has its own dense house style. Everything below is either an environment
// declaration (which globals exist) or a rule the preset gets wrong *here*,
// with the reason. No taste rules, deliberately: a lint config is a bad place
// to hold an opinion nobody has asked for.
//
// Two environments, and the split matters: home.js runs in a browser as a
// classic script (six IIFEs, no module scope), everything else is an ES module
// on Node. Lint them as one and every `document` is undefined in the scripts or
// every `process` is undefined in the page.

import js from "@eslint/js";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // _site/ is build output and scratch/ is throwaway; both hold copies of
  // home.js that would be linted twice and reported at the wrong path.
  // test-results/ and playwright-report/ are Playwright's output. Ignoring them
  // is not tidiness: eslint globs the tree while the Playwright step runs
  // alongside it in scripts/ci, and Playwright clears test-results/ as it
  // starts, so eslint died with ENOENT scandir on a directory that existed when
  // the walk began. It reads as a flaky lint failure with no lint in it.
  globalIgnores(["_site/**", "scratch/**", "node_modules/**", "screenshots/**",
                 "test-results/**", "playwright-report/**"]),

  {
    files: ["**/*.js", "**/*.mjs"],
    extends: [js.configs.recommended],
    rules: {
      // An empty catch here is the intended path, not an oversight, at all
      // thirteen sites: localStorage throws in private browsing (the theme and
      // accent writes are best-effort by design, and the page must keep working
      // without them), and the CDP teardowns kill a Chrome or close a socket
      // that has usually exited already. The alternative to switching this off
      // is thirteen `catch { /* intentional */ }` comments saying the same
      // thing, which is noise rather than signal.
      "no-empty": ["error", { allowEmptyCatch: true }],
      // curb-check's emoji detector is a character class holding VS16 and ZWJ
      // as members in their own right, beside the astral ranges. Written as
      // escapes that is unambiguous, but as adjacent members they read as the
      // grapheme clusters this rule exists to catch, so it fires on the
      // detector however the members are ordered (verified: both orderings
      // report, and the class is set-identical either way over all 1,112,064
      // code points). `allowEscape` is the rule's own answer for escapes and it
      // keeps the teeth: verified that a literal combined character still errors.
      "no-misleading-character-class": ["error", { allowEscape: true }],
    },
  },

  // home.js: browser, classic script, served unbundled and untranspiled.
  // `sourceType: "script"` is what it actually is, and declaring it is what
  // stops `no-undef` reporting every browser global in the file.
  {
    files: ["home.js", "theme.js", "_includes/scripts/*.js"],
    languageOptions: { globals: globals.browser, sourceType: "script" },
  },

  {
    files: ["scripts/**/*.mjs", "*.config.js"],
    languageOptions: { globals: globals.node, sourceType: "module" },
  },

  // Playwright specs are the one place both environments are genuinely present
  // in one file: the test body is a Node module, and the callbacks handed to
  // page.evaluate() are serialised and run inside the browser, where `document`
  // and `localStorage` are exactly right. eslint cannot tell the two apart --
  // to it they are ordinary nested arrow functions -- so declaring both is the
  // honest description of the file rather than a suppression.
  {
    files: ["tests/**/*.spec.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      sourceType: "module",
    },
  },
]);
