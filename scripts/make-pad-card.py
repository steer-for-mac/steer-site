#!/usr/bin/env python3
"""Render the store's controller card from the hero's own DualSense art.

The pad in index.html is the best illustration the project owns, but it cannot
be extracted as markup: its CSS lives in the hero's inline <style>, scoped under
.chero, and the light bar's colour comes from --led, which the picker JS sets
inline on the .chero element at runtime.

Two traps, both paid for already:

  1. Do NOT relocate the pad into a fresh container. Moving it out of .chero
     orphans --led (and --glowF / --bloomO / --accent) and the light bar renders
     dark. Restyle .chero itself into the card instead.
  2. When hiding the rest of the page, hide only subtrees that do NOT contain
     the pad. Hiding every non-pad child of .chero also hides the pad's own
     wrapper, and the card renders empty.

Usage:  python3 scripts/make-pad-card.py [out.png]
Output: 1600x1200, rendered at 2x and downscaled. Run from the repo root.
"""

import os
import re
import subprocess
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread

from PIL import Image

PORT = 8951
TEMP = "_padrender.html"
HEADLESS = os.path.expanduser(
    "~/Library/Caches/ms-playwright/chromium_headless_shell-1228/"
    "chrome-headless-shell-mac-arm64/chrome-headless-shell"
)

# Kept in sync with index.html's h1 by the check below, so the card can never
# quietly drift from the headline the buyer just read on the site.
HEADLINE_RE = re.compile(r"<h1[^>]*>(A mouse needs a desk\.<br>[^<]*)</h1>")

HARNESS = r"""
<script>
window.addEventListener('load', function () {
  setTimeout(function () {
    var pad = document.querySelector('.padwrap.ps.active');
    var hero = pad && pad.closest('.chero');
    if (!hero) { document.title = 'PAD-NOT-FOUND'; return; }

    function hideSiblingsOf(keep, scope) {
      Array.prototype.forEach.call(scope.children, function (el) {
        if (el !== keep && !el.contains(keep) && el.tagName.toLowerCase() !== 'svg') {
          el.style.display = 'none';
        }
      });
    }
    var node = hero;
    while (node && node.parentElement && node !== document.body) {
      hideSiblingsOf(node, node.parentElement);
      node = node.parentElement;
    }
    (function walk(scope) {
      Array.prototype.forEach.call(scope.children, function (el) {
        if (el === pad) return;
        if (el.contains(pad)) { walk(el); return; }
        if (el.tagName.toLowerCase() !== 'svg') el.style.display = 'none';
      });
    })(hero);

    hero.style.position = 'fixed';
    hero.style.inset = '0';
    hero.style.zIndex = '99999';
    hero.style.margin = '0';
    hero.style.padding = '0';
    hero.style.background =
      'radial-gradient(120% 90% at 18% 0%, #4A5A6E 0%, #2E3744 46%, #1A2230 100%)';

    var h = document.createElement('div');
    h.textContent = "__HEADLINE__";
    h.style.cssText = 'position:fixed;top:104px;left:60px;right:60px;'
      + 'font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;'
      + 'font-size:88px;font-weight:600;letter-spacing:-0.022em;line-height:1.1;'
      + 'color:#fff;text-align:center;white-space:pre-line;'
      + '-webkit-font-smoothing:antialiased;z-index:100000';
    hero.appendChild(h);

    pad.style.opacity = '1';
    pad.style.visibility = 'visible';
    var anns = pad.querySelectorAll('.ann');
    for (var i = 0; i < anns.length; i++) anns[i].style.display = 'none';

    requestAnimationFrame(function () {
      var r = pad.getBoundingClientRect();
      var scale = r.width ? (1500 / r.width) : 1;
      pad.style.transformOrigin = 'center center';
      pad.style.transform = 'scale(' + scale.toFixed(3) + ')';
      var r2 = pad.getBoundingClientRect();
      var dy = 760 - (r2.top + r2.height / 2);
      pad.style.transform =
        'scale(' + scale.toFixed(3) + ') translateY(' + (dy / scale).toFixed(1) + 'px)';
    });
  }, 500);
});
</script>
</body>"""


def headline_from_site(html):
    """Lift the h1 verbatim so the card and the site never disagree."""
    m = HEADLINE_RE.search(html)
    if not m:
        sys.exit("index.html h1 did not match the expected shape; update HEADLINE_RE")
    # Keep the site's own line break. Flattening it to a space splits the
    # second sentence mid-clause and strands a two-word widow. The break is
    # emitted as an ESCAPED \n: a literal newline inside the injected JS
    # string literal is a syntax error, which kills the whole harness and
    # silently renders the untouched site page instead of the card.
    return m.group(1).replace("<br>", "\\n")


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "scratch/store-cards/steer-02-pad.png"
    if not os.path.exists("index.html"):
        sys.exit("run from the repo root")
    if not os.path.exists(HEADLESS):
        sys.exit(f"headless shell not found at {HEADLESS}")

    html = open("index.html", encoding="utf-8").read()
    headline = headline_from_site(html)
    print(f"headline: {headline}")
    harness = HARNESS.replace("__HEADLINE__", headline)
    open(TEMP, "w", encoding="utf-8").write(html.replace("</body>", harness, 1))

    server = ThreadingHTTPServer(("127.0.0.1", PORT), SimpleHTTPRequestHandler)
    Thread(target=server.serve_forever, daemon=True).start()
    time.sleep(0.5)
    raw = "/tmp/steer-pad-card-2x.png"
    try:
        subprocess.run(
            [HEADLESS, "--headless", "--disable-gpu", "--force-device-scale-factor=2",
             "--hide-scrollbars", "--virtual-time-budget=10000",
             "--window-size=1600,1200", f"--screenshot={raw}",
             f"http://127.0.0.1:{PORT}/{TEMP}"],
            check=True, capture_output=True,
        )
    finally:
        server.shutdown()
        # Guarded: only ever removes the temp harness in this directory.
        if TEMP == "_padrender.html" and os.path.exists(TEMP):
            os.remove(TEMP)

    # `os.makedirs("")` raises, so a bare filename (which the docstring invites)
    # crashed after the full 10s render and after the harness was cleaned up.
    outdir = os.path.dirname(out)
    if outdir:
        os.makedirs(outdir, exist_ok=True)
    Image.open(raw).convert("RGB").resize((1600, 1200), Image.LANCZOS).save(out, optimize=True)
    if os.path.exists(raw):
        os.remove(raw)
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
