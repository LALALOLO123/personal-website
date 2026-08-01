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

/* On by default. Browsers still will not make a sound until the visitor has
   interacted with the page, so `unlock` below primes everything on the first
   gesture - any gesture, not a dedicated "enable audio" click. Until then
   play() rejects harmlessly. */
let enabled = true;

function ensure() {
  if (!press) press = new Sample("/sounds/press.mp3", 0.35);
  if (!release) release = new Sample("/sounds/release.mp3", 0.25);
}

export function soundEnabled() {
  return enabled;
}

export function setSound(on: boolean): boolean {
  enabled = on;
  if (enabled) ensure();
  return enabled;
}

export function toggleSound(): boolean {
  return setSound(!enabled);
}

/* Prime audio on the visitor's first interaction, whatever it is - a scroll,
   a key, a click. Autoplay policy blocks sound before that, and with sound on
   by default there is no "turn it on" click to hang this off. Runs once. */
if (typeof window !== "undefined") {
  const unlock = () => {
    ensure();
    audio(); // creating and resuming the AudioContext must happen in a gesture
    for (const ev of ["pointerdown", "keydown", "wheel", "touchstart"]) {
      window.removeEventListener(ev, unlock);
    }
  };
  for (const ev of ["pointerdown", "keydown", "wheel", "touchstart"]) {
    window.addEventListener(ev, unlock, { passive: true });
  }
}

/* ---------------------------------------------------------------------------
   The lamp striking.

   Synthesised rather than sampled: it is three sounds happening together -
   the contactor clunking closed, the arc striking, and the ballast settling
   into a hum - and building it means no asset to ship or license. Same
   `enabled` gate as the keycaps, so it stays silent until the sound toggle is
   used, which is also the gesture browsers require before any audio plays.
   --------------------------------------------------------------------------- */

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function playStageLight() {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;

  // contactor: a short, low, heavily damped thunk
  const thunk = ac.createOscillator();
  const tg = ac.createGain();
  thunk.type = "sine";
  thunk.frequency.setValueAtTime(150, t);
  thunk.frequency.exponentialRampToValueAtTime(46, t + 0.12);
  tg.gain.setValueAtTime(0.0001, t);
  tg.gain.exponentialRampToValueAtTime(0.45, t + 0.006);
  tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  thunk.connect(tg).connect(ac.destination);
  thunk.start(t);
  thunk.stop(t + 0.32);

  // the strike: a bright noise transient, decaying fast
  const len = Math.floor(ac.sampleRate * 0.18);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const fade = 1 - i / len;
    data[i] = (Math.random() * 2 - 1) * fade * fade * fade;
  }
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1500;
  const ng = ac.createGain();
  ng.gain.value = 0.2;
  noise.connect(hp).connect(ng).connect(ac.destination);
  noise.start(t + 0.004);

  // ballast: a filtered hum that swells then dies away
  const hum = ac.createOscillator();
  const lp = ac.createBiquadFilter();
  const hg = ac.createGain();
  hum.type = "sawtooth";
  hum.frequency.setValueAtTime(116, t);
  lp.type = "lowpass";
  lp.frequency.value = 340;
  hg.gain.setValueAtTime(0.0001, t + 0.02);
  hg.gain.exponentialRampToValueAtTime(0.055, t + 0.1);
  hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
  hum.connect(lp).connect(hg).connect(ac.destination);
  hum.start(t + 0.02);
  hum.stop(t + 1.0);
}

export function playPress() {
  if (enabled) press?.play();
}

export function playRelease() {
  if (enabled) release?.play();
}
