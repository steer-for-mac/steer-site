// Lift the subject out of a reference photo using Vision's foreground instance
// mask (the same thing Preview's "remove background" runs). Thresholding a
// photo of a black pad on mottled granite merges the shadow and the dark
// specks into the subject; this does not.
//
//   swift subject.swift in.jpg out-mask.png
import AppKit
import Vision

let args = CommandLine.arguments
guard args.count >= 3 else { FileHandle.standardError.write("usage: subject.swift <in> <out.png>\n".data(using: .utf8)!); exit(2) }

guard let src = CIImage(contentsOf: URL(fileURLWithPath: args[1])) else {
    FileHandle.standardError.write("cannot read \(args[1])\n".data(using: .utf8)!); exit(1)
}

let handler = VNImageRequestHandler(ciImage: src, options: [:])
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])

guard let result = request.results?.first else {
    FileHandle.standardError.write("no foreground instance found\n".data(using: .utf8)!); exit(1)
}

// every instance, so a pad photographed with its cable still comes out whole
let maskBuffer = try result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
let mask = CIImage(cvPixelBuffer: maskBuffer)

// the mask is a one-channel alpha ramp; paint it white-on-black so potrace
// gets a clean binary edge rather than a soft matte
let ctx = CIContext()
let white = CIImage(color: .white).cropped(to: mask.extent)
let composited = white.applyingFilter("CIBlendWithMask", parameters: [
    kCIInputBackgroundImageKey: CIImage(color: .black).cropped(to: mask.extent),
    kCIInputMaskImageKey: mask,
])

guard let cg = ctx.createCGImage(composited, from: mask.extent) else { exit(1) }
let rep = NSBitmapImageRep(cgImage: cg)
guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
try png.write(to: URL(fileURLWithPath: args[2]))
print("\(args[2]) \(Int(mask.extent.width))x\(Int(mask.extent.height)) instances=\(result.allInstances.count)")
