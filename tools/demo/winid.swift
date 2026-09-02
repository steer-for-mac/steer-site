import AppKit
import CoreGraphics

// winid <pid> <normal|panel|popup> : largest on-screen window of that pid in that layer band
guard CommandLine.arguments.count >= 3, let pid = pid_t(CommandLine.arguments[1]) else { exit(1) }
let mode = CommandLine.arguments[2]
guard let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] else { exit(1) }
var best: (area: CGFloat, id: Int, b: [String: CGFloat])? = nil
for w in windows {
    guard let owner = w[kCGWindowOwnerPID as String] as? Int32, pid_t(owner) == pid else { continue }
    let layer = w[kCGWindowLayer as String] as? Int ?? -1
    let ok: Bool
    switch mode {
    case "normal": ok = layer == 0
    case "panel": ok = layer > 0 && layer <= 20
    case "popup": ok = layer == 101
    default: ok = false
    }
    guard ok, let b = w[kCGWindowBounds as String] as? [String: CGFloat] else { continue }
    let area = (b["Width"] ?? 0) * (b["Height"] ?? 0)
    if area < 10_000 { continue }
    guard let id = w[kCGWindowNumber as String] as? Int else { continue }
    if best == nil || area > best!.area { best = (area, id, b) }
}
if let b = best { print("\(b.id) \(Int(b.b["X"] ?? 0)),\(Int(b.b["Y"] ?? 0)),\(Int(b.b["Width"] ?? 0)),\(Int(b.b["Height"] ?? 0))") }
