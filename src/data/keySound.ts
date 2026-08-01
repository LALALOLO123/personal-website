/* ---------------------------------------------------------------------------
   Keycap clicks.

   Samples are Naresh Khatri's (MIT, github.com/Naresh-Khatri/3d-portfolio),
   2.6KB and 2KB. Off by default and toggled from the VOL key: unannounced
   audio on hover is obnoxious, and browsers block it before a gesture anyway.
   A small pool per sample lets fast passes across the board overlap instead
   of cutting each other off.
   --------------------------------------------------------------------------- */

const POOL = 4;

class Sample {
  private clips: HTMLAudioElement[] = [];
  private next = 0;

  constructor(src: string, volume: number) {
    if (typeof Audio === "undefined") return;
    for (let i = 0; i < POOL; i++) {
      const a = new Audio(src);
      a.preload = "auto";
      a.volume = volume;
      this.clips.push(a);
    }
  }

  play() {
    const clip = this.clips[this.next];
    if (!clip) return;
    this.next = (this.next + 1) % this.clips.length;
    clip.currentTime = 0;
    // Rejects when no gesture has happened yet; that is fine and expected.
    clip.play().catch(() => {});
  }
}

let press: Sample | null = null;
let release: Sample | null = null;
let enabled = false;

function ensure() {
  if (!press) press = new Sample("/sounds/press.mp3", 0.35);
  if (!release) release = new Sample("/sounds/release.mp3", 0.25);
}

export function soundEnabled() {
  return enabled;
}

export function toggleSound(): boolean {
  enabled = !enabled;
  if (enabled) {
    ensure();
    // The toggle itself is a click, so this doubles as the unlock gesture.
    press?.play();
  }
  return enabled;
}

export function playPress() {
  if (enabled) press?.play();
}

export function playRelease() {
  if (enabled) release?.play();
}
