// JSON for a <script type="application/json"> element. Nunjucks' `dump` is
// JSON.stringify, which leaves "</script>" intact, so a name in the upstream
// SDL file could close the element. Escaping < > & as \u003c \u003e \u0026
// keeps the JSON identical once parsed, and U+2028/2029 are escaped for any
// older parser that reads the payload as script.
export const scriptJson = (value) => JSON.stringify(value)
  .replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
  .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
