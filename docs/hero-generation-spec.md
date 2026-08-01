# Hero generation spec

Scope: **Hero → Keyboard only.** The work/projector section is out of scope and
nothing in this document generates anything for it.

Account at time of writing: **Plus, 1,210 credits.** Nothing generated yet.

Read with `hero-video-plan.md` (the creative brief). This document is the
operational one: exact models, exact prompts, what counts as a pass, what to
change when it fails, and when to stop.

---

## 0 · The decision this spec locks

**How the hero reaches black: the robot brings its palm all the way onto the
lens until it is past the focal plane.**

Chosen over the two alternatives:

| option | why not |
|---|---|
| Pull the view down like a curtain | Asks the viewer to accept the camera is a physical object. Models have no strong prior for it, so it tends to come back as flailing. |
| Walk into the lens until the body fills frame | Most reliable black, least interesting — it is occlusion, not a gesture. |

A palm is the most legible gesture there is and it *motivates* the darkness.
Its one weakness is that a grey robot hand filling frame is **grey, not black**,
which would break the cut — so the prompt drives the hand past the focal plane,
where a close object loses all detail and falls dark on its own. That is real
optical behaviour and these models reproduce it well.

It also rhymes: the hero ends with a hand putting the world out, the keyboard
opens with a lamp being struck.

---

## 1 · Asset inventory and dependency order

Generate strictly in this order. Every asset after the first is conditioned on
the first, so a flaw in the keyframe is a flaw in all of them.

| # | asset | type | conditioned on | file |
|---|---|---|---|---|
| 1 | **Keyframe** | image | — | `public/shots/hero-keyframe.jpg` |
| 2 | **Empty street** | image | edit of #1 | `public/shots/hero-empty.jpg` |
| 3 | **Hold loop** | video | start **and** end = #1 | `public/reels/hero-hold.mp4` |
| 4 | **Intro** | video | start = #2, end = #1 | `public/reels/hero-intro.mp4` |
| 5 | **Exit** | video | start = #1 | `public/reels/hero-exit.mp4` |

**Asset 2 is not optional.** The intro has to begin on the same street the
keyframe shows, minus the installation. Generating that street from a text
prompt produces a *different* street and the join fails. Editing the keyframe
to remove the letters guarantees the two are identical in every other respect.

---

## 2 · Asset 1 — Keyframe

**Model:** `nano_banana_pro` — chosen because it is the catalogue's text and
lettering model, and this frame lives or dies on the word being spelled
correctly.

**Params:** `aspect_ratio: "16:9"`, `resolution: "4k"`, `count: 4` (four drafts
per call — the lettering is a lottery and comparing four beats four calls).

> `resolution` **defaults to `1k`** and must be set explicitly. The keyframe is
> shown full-bleed with `object-fit: cover`, so on a 1440p display it is
> stretched across 2560px — 1k would be visibly soft, and this is the frame
> people look at longest. Generate at 4k and compress down for the web.

**Prompt — send verbatim:**

> Photorealistic street-level locked-off shot of a downtown city street in
> daytime, shot on a 35mm lens at eye height. Oversized freestanding public-art
> letters spell BRIAN FU standing directly on the asphalt in the middle of the
> road — thick slab-serif capitals, smooth glossy white painted composite with
> softly rounded edges, roughly the height of an adult person, all sitting on
> one shared baseline like an installed sculpture. Standing in the position of
> the letter I in BRIAN is a grounded industrial humanoid robot: matte grey and
> off-white, scuffed and used, visible actuators, joints and cabling, no chrome
> and nothing futuristic. It stands upright and still, arms straight down at its
> sides, exactly the height of the letters and on the same baseline, occupying
> the letter's slot in the word so it reads as part of the name. The robot is
> plainly and obviously a machine — not disguised, not letter-shaped. Soft
> overcast daylight, city buildings receding on both sides, wet asphalt with
> gentle reflections. Cinematic, photographic, no text anywhere except the
> sculpture letters.

**Avoid list** (append if the model supports negatives, otherwise use it as the
reject checklist): chrome robot, glowing eyes, sci-fi, humanoid android face,
neon, motion blur, tilted or dutch camera, aerial view, extra words, watermark,
signage, crowds.

### Acceptance criteria — all must hold

1. **Spelling is exactly `BRIAN FU`**, one space, no extra or dropped glyphs.
   The robot stands where the `I` is; `BR•AN FU` with the machine in the slot
   is correct, `BRAIN` is not.
2. Robot is **the same height as the letters** and on **the same baseline** —
   in the line, not standing beside or behind it.
3. Robot reads as an **industrial machine**: matte, scuffed, mechanical joints.
4. Letters are **glossy white slab-serif**, human-height, clearly freestanding
   sculpture rather than paint on the road.
5. **Camera is level and at street height.** No tilt, no drone view.
6. **Centre-safe:** the whole word plus the robot sits inside the middle ~60%
   of frame width, so a 9:16 centre-crop still reads. This is the entire mobile
   strategy and it is free now, expensive later.
7. No stray text, watermarks or signage anywhere else in frame.

### When it fails, change this

| failure | fix |
|---|---|
| Letters garbled or misspelled | Re-roll first — this is mostly luck. If three rounds fail, shorten to `BRIAN` alone and add `FU` in a second pass. |
| Robot beside the word, not in it | Strengthen: "occupying the letter slot **between R and A**". |
| Robot too tall or too short | Add "the top of its head is exactly level with the top of the letters". |
| Robot too sci-fi | Add "industrial prototype, like a construction machine, matte and unpainted". |
| Word too wide for a 9:16 crop | Add "the word occupies the central half of the frame". |
| Perspective too dramatic | Add "camera perpendicular to the row of letters, flat on". |

**Budget: stop at 16 drafts.** If none pass by then the concept needs changing,
not more attempts — bring the best three back for a decision.

---

## 3 · Asset 2 — Empty street

**Model:** `nano_banana_pro`, passing the accepted keyframe as a reference
media input (image edit, not a fresh generation).

**Prompt — verbatim:**

> The exact same street, same camera position, same lighting and same buildings,
> with the sculpture letters and the robot completely removed. Bare empty
> asphalt where they stood. Change nothing else in the frame.

**Acceptance:** the two images must be indistinguishable outside the area the
installation occupied. Flip between them at full size — buildings, road
markings, sky and light must not shift. If they do, re-roll; do not accept
"close enough", because this is the only join the viewer sees twice.

**Budget: 6 drafts.**

---

## 4 · Assets 3–5 — the videos

**Model:** `seedance_2_0` for all three. It is the only recommended model with
**both** `start_image` and `end_image` conditioning, which is what makes the
loop and the joins safe.

**Shared params:** `aspect_ratio: "16:9"`, `generate_audio: false`,
`resolution: "1080p"`, `mode: "std"`, `bitrate_mode: "standard"`, duration as
noted per asset.

> **`generate_audio` defaults to TRUE.** Forgetting it buys audio we decided
> against, in a bigger file. It must be passed explicitly on every video call.
>
> `1080p` requires `mode: "std"` — `fast` only reaches 720p. 720p upscaled to a
> 2560px hero is soft, and 4k is far too heavy for something that autoplays, so
> 1080p/std is the only sensible point on that curve.

**Preflight every video call with `get_cost: true` and report the number before
submitting.** Video is where the budget goes.

### 4.1 Hold loop — `start_image = end_image = keyframe`, 5s

Setting **both** ends to the keyframe is the trick that makes the loop safe: it
forces the model back to the exact frame it began on, so the loop point is
seamless *and* both joins to the neighbouring clips still match. A loop made any
other way drifts and needs a crossfade to hide.

> Locked-off static camera, no camera movement whatsoever. The sculpture letters
> stand completely still. Ambient life only: distant traffic crossing the far
> background, light shifting slowly across the asphalt, faint heat haze. The
> robot standing in the word idles very slightly — a slow weight shift and a
> small turn of the head — and returns to standing perfectly upright with arms
> at its sides. Nothing else moves. Photorealistic, continuous, no cuts.

**Accept if:** camera dead still; cast letters dead still; robot returns to its
starting pose; the last frame matches the first; no cut or jump mid-clip.

### 4.2 Intro — `start_image = empty street`, `end_image = keyframe`, 6s

> Locked-off static camera. Two or three ordinary cars drive across the empty
> street at normal city speed. Then a plain white delivery van enters from the
> right and drives steadily right to left across the frame. The road ahead of the
> van is empty; in the van's wake the freestanding white sculpture letters
> BRIAN FU are already standing on the asphalt, revealed progressively as the van
> passes, so the name completes from left to right as the van exits frame left.
> The robot stands among them in the letter I position. No morphing, no fading,
> no sparkle or magic — the van simply passes and they are there. Photorealistic,
> continuous, no cuts.

**Accept if:** the van travels **right to left**; letters are revealed by the
van's passage rather than fading up; the final frame matches the keyframe; the
camera never moves.

**Most likely failure:** the model fades or morphs the letters in. If two
attempts do that, add "the letters are already physically present behind the
van, they are simply uncovered as it passes, like a curtain being drawn".

### 4.3 Exit — `start_image = keyframe`, 5s

> Locked-off static camera. The industrial humanoid robot standing in the word
> steps forward out of the line of letters, leaving a visible empty gap where it
> stood. It walks directly toward the camera at a steady, heavy, deliberate pace
> until it fills the frame, then raises one hand and brings its open palm all the
> way onto the lens, so close that the hand goes completely out of focus and the
> frame falls to black. Ends on full black. Photorealistic, continuous, no cuts,
> no camera movement.

**Accept if:** the robot leaves a **visible gap** in the word and nothing closes
it; the walk reads as heavy and deliberate rather than floaty; the final frame
is **genuinely black**, not grey.

**Most likely failure:** ending on a grey hand rather than black. If two
attempts do that, add "the final second of the video is entirely black frames".
If it still fails, we can catch the last of it in CSS — the code supports it —
but the clip going black on its own is much better and worth two more rolls.

**Budget: 6 attempts per clip, 18 total.** Stop and review at that point.

---

## 4.4 · Size, and why it is decided at generation time

There is **no ffmpeg on this machine**, so whatever the model returns is what
ships: resolution, duration and bitrate are irreversible once generated. Three
1080p clips could plausibly total 15-25MB, which is far too heavy for a hero
that autoplays.

Before generating any video, install a transcoder so this is recoverable:

```
npm i -D ffmpeg-static
```

`ffmpeg-static` ships a prebuilt binary, so it needs no system install. With it
we can compress after the fact and target roughly:

| clip | budget |
|---|---|
| intro | ≤ 3MB — on the critical path, plays on load |
| hold | ≤ 2MB — loops forever, so it wants to be smallest |
| exit | ≤ 3MB — preloads during the hold, so it has time |

Without it, the only lever is generating shorter and lower, and getting that
wrong means paying twice.

## 5 · Integration and acceptance test

1. Drop files at the paths in §1. Each is optional and the sequence degrades
   cleanly, so they can land one at a time.
2. `npm run build`, then load the site.
3. Watch the whole hero once at full size.
4. Run the instrumented check that already exists for this: it steps through
   the transition sampling the brightest pixel on screen. The bar, measured on
   the placeholder, is:
   - **0/255 at the cut**
   - **5/255 through the keyboard blackout** (that is the `#050505` backdrop)
   - **first light at ~4.3s**, when the lamp strikes
   Anything brighter than ~10 between the cut and the strike means the join is
   showing and something is wrong.
5. Check a 9:16 viewport. The word and the robot must still read.

---

## 6 · Stop conditions

- Stop and report if spend passes **400 credits** without a passing keyframe.
- Stop and report if any single video passes **6 attempts**.
- Never re-run a rejected generation unchanged. Change one thing per attempt so
  it is clear what moved the result.
- Report actual cost after each stage against the estimate here.
