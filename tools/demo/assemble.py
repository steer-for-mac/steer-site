#!/usr/bin/env python3
"""Cut the session into the homepage panel: trim, draw the live-input overlay
from the run log, encode mp4 + webm + poster into src/assets/video, and print
the chapter times for hero.html's chips (which carry the index; nothing is
burned into the picture, and Homebrew's ffmpeg has no drawtext anyway).

  assemble.py <take.mov> --start S --end S --chapters "01 Open the TV app@0,02 Find a show@6.5,..." [--crop W:H:X:Y] [--poster S]
"""
import argparse, json, os, shutil, subprocess, tempfile
HERE = os.path.dirname(os.path.abspath(__file__)); V = os.path.join(HERE, "..", "..", "src", "assets", "video")
def run(*a): subprocess.run(a, check=True)
ap = argparse.ArgumentParser(); ap.add_argument("take"); ap.add_argument("--start", type=float, default=0); ap.add_argument("--end", type=float, required=True)
ap.add_argument("--chapters", required=True); ap.add_argument("--crop", default="3456:2180:0:0"); ap.add_argument("--width", type=int, default=1640); ap.add_argument("--poster", type=float, help="take time of the poster frame")
a = ap.parse_args()
dur = a.end - a.start; tmp = tempfile.mkdtemp(); ov = os.path.join(tmp, "ov")
run("uv", "run", "--quiet", os.path.join(HERE, "overlay.py"), a.take + ".run.json", ov, "--fps", "30", "--duration", str(dur), "--offset", str(a.start), "--width", "480")
chapters = [(c.split("@")[0], float(c.split("@")[1])) for c in a.chapters.split(",")]
filt = f"[0:v]crop={a.crop},setpts=PTS-STARTPTS[base];[1:v]format=rgba[o];[base][o]overlay=56:main_h-overlay_h-150:format=auto,scale={a.width}:-2,fps=30[v]"
base = os.path.join(V, "couch-search")
run("ffmpeg", "-v", "error", "-y", "-ss", str(a.start), "-t", str(dur), "-i", a.take, "-framerate", "30", "-i", os.path.join(ov, "f%05d.png"), "-filter_complex", filt, "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", base + ".mp4")
run("ffmpeg", "-v", "error", "-y", "-i", base + ".mp4", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "34", "-row-mt", "1", "-an", base + ".webm")
run("ffmpeg", "-v", "error", "-y", "-ss", str(a.poster - a.start if a.poster is not None else min(dur / 2, 6)), "-i", base + ".mp4", "-frames:v", "1", "-q:v", "4", base + "-poster.jpg")
print(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", base + ".mp4"], capture_output=True, text=True).stdout.strip())
print("chapters:", ", ".join(f"{t}@{s - a.start:.1f}" for t, s in chapters)); shutil.rmtree(tmp)
