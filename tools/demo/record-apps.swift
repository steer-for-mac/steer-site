// Records only the named apps' windows (and the pointer) on the main display:
// every other window, the menu bar and notifications are left out by the
// filter, so nothing of the owner's desktop can reach the file.
//   swiftc -O record-apps.swift -o record-apps
//   record-apps <out.mov> <seconds> <bundle-id>... [--except <window-id>...]
import AVFoundation
import Foundation
import ScreenCaptureKit

let argv = CommandLine.arguments
guard argv.count >= 4, let seconds = Double(argv[2]) else {
  FileHandle.standardError.write(Data("usage: record-apps <out.mov> <seconds> <bundle-id>... [--except <window-id>...]\n".utf8))
  exit(2)
}
let out = URL(fileURLWithPath: argv[1])
let rest = Array(argv[3...])
let split = rest.firstIndex(of: "--except") ?? rest.count
let bundles = Set(rest[..<split])
let except = Set(rest[min(split + 1, rest.count)...].compactMap(UInt32.init))

final class Done: NSObject, SCRecordingOutputDelegate {
  func recordingOutputDidFinishRecording(_ r: SCRecordingOutput) { exit(0) }
  func recordingOutput(_ r: SCRecordingOutput, didFailWithError e: Error) {
    FileHandle.standardError.write(Data("recording failed: \(e)\n".utf8)); exit(1)
  }
}
let done = Done()

Task {
  do {
    let content = try await SCShareableContent.excludingDesktopWindows(true, onScreenWindowsOnly: false)
    guard let display = content.displays.first(where: { $0.displayID == CGMainDisplayID() }) else { exit(3) }
    let apps = content.applications.filter { bundles.contains($0.bundleIdentifier) }
    if apps.count != bundles.count { FileHandle.standardError.write(Data("not running: \(bundles.subtracting(apps.map(\.bundleIdentifier)))\n".utf8)); exit(4) }
    let skip = content.windows.filter { except.contains($0.windowID) }
    let filter = SCContentFilter(display: display, including: apps, exceptingWindows: skip)
    let cfg = SCStreamConfiguration()
    cfg.width = display.width * 2; cfg.height = display.height * 2
    cfg.showsCursor = true
    cfg.minimumFrameInterval = CMTime(value: 1, timescale: 60)
    let stream = SCStream(filter: filter, configuration: cfg, delegate: nil)
    let rc = SCRecordingOutputConfiguration()
    rc.outputURL = out; rc.outputFileType = .mov; rc.videoCodecType = .hevc
    let rec = SCRecordingOutput(configuration: rc, delegate: done)
    try stream.addRecordingOutput(rec)
    try await stream.startCapture()
    print("recording"); fflush(stdout)
    try await Task.sleep(for: .seconds(seconds))
    try await stream.stopCapture()
    try await Task.sleep(for: .seconds(2))
    exit(0)
  } catch {
    FileHandle.standardError.write(Data("error: \(error)\n".utf8)); exit(1)
  }
}
RunLoop.main.run()
