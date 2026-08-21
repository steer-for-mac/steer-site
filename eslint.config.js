// `js.configs.recommended` and nothing on top, for the reason
// stylelint-config-recommended is the CSS baseline: it catches *errors* rather
// than whatever a person thought to list, and holds no style opinion to argue
// with a dense house style. Everything below is an environment declaration or a
// rule the preset gets wrong here. No taste rules, deliberately.

import js from "@eslint/js";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // test-results/ is not tidiness: Playwright clears it mid-run while eslint is
  // globbing, and eslint dies with ENOENT on a directory that existed when the
  // walk began -- a flaky lint failure with no lint in it.
  globalIgnores(["dist/**", "scratch/**", "node_modules/**", "screenshots/**",
                 "test-results/**", "playwright-report/**"]),

  {
    files: ["**/*.js"],
    extends: [js.configs.recommended],
    rules: {
      // An empty catch is the intended path here: localStorage throws in
      // private browsing and the theme and accent writes are best-effort by
      // design, so the page has to keep working without them.
      "no-empty": ["error", { allowEmptyCatch: true }],
      // curb-check's emoji detector holds VS16 and ZWJ as members beside the
      // astral ranges, so as adjacent members they read as the grapheme
      // clusters this rule catches. allowEscape is the rule's own answer and
      // keeps the teeth: a literal combined character still errors.
      "no-misleading-character-class": ["error", { allowEscape: true }],
    },
  },

  // home.js: browser, classic script, served unbundled and untranspiled.
  // `sourceType: "script"` is what it actually is, and declaring it is what
  // stops `no-undef` reporting every browser global in the file.
  {
    files: ["src/_includes/scripts/*.js"],
    languageOptions: { globals: globals.browser, sourceType: "script" },
  },

  // home.js is an entry that imports one module per band; both are browser ESM.
  {
    files: ["src/home.entry.js", "src/scripts/*.js"],
    languageOptions: { globals: globals.browser, sourceType: "module" },
  },

  {
    files: ["scripts/**/*.js", "*.config.js"],
    languageOptions: { globals: globals.node, sourceType: "module" },
  },

  // serve.js runs under Bun rather than Node -- it is the only file here that
  // does, so `Bun` is declared for it alone and stays undefined everywhere else.
  {
    files: ["scripts/serve.js"],
    languageOptions: { globals: { ...globals.node, Bun: "readonly" } },
  },

  // Specs really are both environments: the body is Node, and the callbacks
  // passed to page.evaluate() run in the browser.
  {
    files: ["tests/**/*.spec.js", "tools/**/*.spec.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      sourceType: "module",
    },
  },
]);
