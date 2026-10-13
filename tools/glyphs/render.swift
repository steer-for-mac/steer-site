// Renders the SF Symbols the demo shows into PNG masks under src/assets/glyphs/.
// They are the glyphs Steer itself draws (Steer/Sources/SteerCore/Strings.swift,
// sfSymbols / xboxSFSymbols / nintendoSFSymbols), so the demo and the app match.
// The demo fills each one with a colour token through CSS `mask`, so only the
// alpha matters. 48pt draws a face circle 56px tall: 2x the 28px ghost chip.
// Run: swift tools/glyphs/render.swift   (macOS, from the repo root)
import AppKit

let names = [
    // PlayStation
    "xmark.circle", "circle.circle", "square.circle", "triangle.circle",
    "l1.button.roundedbottom.horizontal", "r1.button.roundedbottom.horizontal",
    "l2.button.roundedtop.horizontal", "r2.button.roundedtop.horizontal",
    "rectangle.on.rectangle.button.angledtop.vertical.left",
    "line.3.horizontal.button.angledtop.vertical.right",
    // Xbox
    "a.circle", "b.circle", "x.circle", "y.circle",
    "lb.button.roundedbottom.horizontal", "rb.button.roundedbottom.horizontal",
    "lt.button.roundedtop.horizontal", "rt.button.roundedtop.horizontal",
    "square.on.square", "line.3.horizontal",
    // Switch (its face letters are the Xbox circles above)
    "l.button.roundedbottom.horizontal", "r.button.roundedbottom.horizontal",
    "zl.button.roundedtop.horizontal", "zr.button.roundedtop.horizontal",
    "minus.circle", "plus.circle",
    // Every pad
    "l.joystick", "r.joystick", "l.joystick.press.down", "r.joystick.press.down",
]
let out = URL(fileURLWithPath: "src/assets/glyphs")
var failed = false
for name in names {
    guard let base = NSImage(systemSymbolName: name, accessibilityDescription: nil),
          let img = base.withSymbolConfiguration(.init(pointSize: 48, weight: .regular)) else {
        FileHandle.standardError.write("missing symbol \(name)\n".data(using: .utf8)!); failed = true; continue
    }
    let w = Int(ceil(img.size.width)), h = Int(ceil(img.size.height))
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    img.draw(in: NSRect(x: 0, y: 0, width: w, height: h))
    NSGraphicsContext.restoreGraphicsState()
    try rep.representation(using: .png, properties: [:])!.write(to: out.appendingPathComponent("\(name).png"))
    print("\(name) \(w)x\(h)")
}
exit(failed ? 1 : 0)
