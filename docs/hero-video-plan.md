# Hero video plan — "the van and the robot"

Status: PLANNING. No generations run, no credits spent. 10 free credits on the
Higgsfield account (free plan), connected via the official Higgsfield MCP.

## The vision (Brian's, confirmed beat by beat)

Full-viewport AI-generated video hero, scroll-**triggered** (scroll activates
the next beat; it does not scrub).

**Beat 1 — default state, plays on load then holds.**
Photorealistic downtown street, daytime, NYC-type vibe. Street runs
left-to-right across frame, street-level camera. 2-3 ordinary cars pass at
normal city rhythm. Then a white van enters frame-right traveling
**right-to-left as a moving wipe**: the street ahead of it is empty, and in
its wake the name **BRIAN FU** stands on the asphalt as physical letter
sculptures. Reveal order is therefore U first, B last — the name completes
reading left-to-right exactly as the van exits frame-left. No effects, no
morphing: "the van passed and now they're there." Video holds on this frame.

**The letters.** BRIAN FU, all caps. Oversized freestanding 3D destination
letters — the I-LOVE-NY / AMSTERDAM-at-the-Rijksmuseum public-art
installation genre. Thick slab-serif, smooth painted composite/fiberglass,
clean glossy white finish, rounded edges, polished public-art appearance,
roughly chest-to-head height. The white-letters/white-van rhyme is
intentional (same "installation crew" story).

**Beat 2 — fires on first scroll intent.**
A grounded, industrial, Boston-Dynamics-Atlas-looking humanoid robot (NOT
futuristic chrome) appears from behind the letters, walks toward the camera,
reaches the bottom of frame, and pulls upward — dragging the view into full
black. The black IS the next section.

**After the black: the keyboard segment.** The existing 3D keyboard section
follows, with the keyboard recolored WHITE (glossy, matching the letter
sculptures) so it pops on the black ground. White-keyboard smoke test done
2026-07-31 — see `KB_VARIANT` in `src/components/Keyboard3D.tsx`.

## Production architecture (the "one shot" insurance)

Never ask a video model to invent the letters. Anchor everything to one
keyframe:

1. **Keyframe image first** (cheap, ~1-2 credits/draft): the street with the
   finished BRIAN FU installation. Iterate HERE until spelling, material,
   light are perfect. Image models garble letters on take one; iterating on
   stills is where the free credits go.
2. **Segment A** = end-frame-conditioned video: start frame = same street
   EMPTY, end frame = the keyframe. Prompt describes cars passing + the van
   wipe. The model only has to invent the in-between.
3. **Segment B** = start-frame-conditioned video: starts FROM the keyframe,
   robot emerges from behind the letters, walks to lens, pull-to-black.
4. **The hold state** between segments is the keyframe image itself displayed
   as a crisp still (not a paused video element).

Continuity between hold and both segments is guaranteed by construction.

## Model + budget

- **Model: Seedance 2.0** (Bytedance, via Higgsfield). Chosen because it is
  the only top-recommended model with BOTH start_image and end_image
  conditioning. 4-15s durations, up to 4K (std mode), 16:9/21:9,
  `generate_audio: false` for silent output. Supports "unlim" trial usage.
- **10 free credits** cover keyframe image drafts only — not one video.
- **The 3-day $0 Plus trial** grants UNLIMITED generations on
  unlim-supported models (Seedance included). Card required; auto-charges
  when the trial ends unless cancelled (a cancel-auto-renewal MCP tool
  exists; trigger it immediately after starting the trial). This converts
  "one shot" into "iterate for 3 days at $0". Decision: PENDING (Brian's
  call; zero-spend posture so far).

## Delivery mechanics (site side, decided so far)

- Hero video full-viewport; muted autoplay (`muted playsinline` — browsers
  require it), poster = keyframe for instant LCP.
- Scroll listener fires Segment B playback on first scroll intent past the
  hold; page scroll otherwise suppressed during the hero (scroll activates,
  never scrubs).
- Segment B preloads while the user reads the hold state.
- End of Segment B lands on black; the page continues into the black
  keyboard section.

## Confirmed answers (Brian, 2026-07-31)

1. Name: **BRIAN FU**, all caps. ("Brian" over legal name Jiacheng —
   matches site brand + domain; resume handles legal-name matching.)
2. Letters: destination-letter public art per above.
3. Time: daytime, downtown city.
4. Van: normal drive-by, right-to-left, moving-wipe reveal.
5. After black: keyboard segment, keyboard white.

## Decided (Brian, 2026-08-01) — brief is now closed

| question | decision |
|---|---|
| Blackout | In-video pull to black, with a CSS black catching the join. Built. |
| Hold state | **Living loop.** Ambient motion, frozen camera and letters. |
| Mobile | Centre-crop the 16:9. No portrait shoot. |
| Robot | Neutral industrial grey/off-white. No brand accent. |
| Sound | Silent. `generate_audio: false`. |
| Budget | Plus plan, purchased. |
| Replaces old hero | Yes — done, the typographic hero is deleted. |

## What to generate — four assets, in this order

Everything anchors to ONE keyframe. Generate it first and do not move on
until the spelling, material and light are right; every other asset is
conditioned on it, so a flaw here is a flaw in all of them.

**1. Keyframe (image).** Downtown street, daytime, street-level locked camera.
BRIAN FU standing on the asphalt as oversized freestanding slab-serif letters:
smooth painted composite, glossy white, rounded edges, the I-LOVE-NY /
AMSTERDAM public-art genre.

**The robot IS the I in BRIAN.** It stands in the lineup, upright, arms at its
sides, in the letter's slot and at the letters' exact height.

It is **not disguised and not a twist.** It plainly reads as a robot from the
first frame — exactly like the Pixar lamp, which never pretends to be an I; it
is obviously a lamp standing where the I goes. The pleasure is the composition,
not a reveal. Do not prompt for a "hidden" or "disguised" figure: that produces
something letter-shaped and lifeless, and the shot needs a machine that is
clearly a machine and clearly part of the name.

Two things this forces, and both are cheap now and expensive later:
- the letters must be **robot height** — a humanoid at human scale sets the
  scale of the whole installation
- the letters need a **common baseline** so the robot sits in the line rather
  than beside it

Iterate here — image models garble lettering on the first pass, and this one
also has to sell a machine as a glyph.

**2. Hold loop (video).** `start_image = end_image = keyframe`.

> Setting BOTH ends to the keyframe is the trick that makes a loop safe. It
> forces the model to return to the exact frame it began on, so the loop point
> is seamless AND both joins to the neighbouring clips still match. A loop
> generated any other way has to be crossfaded and will drift.

Ambient only: distant traffic crossing far background, light shifting, a flag
or foliage moving. **The camera does not move. The cast letters do not move.**

The robot may idle — a slow weight shift, a small head turn — as long as it
**returns to the keyframe pose exactly**, because that frame is also both
joins. Since it was never hiding, letting it be visibly alive during the hold
costs nothing and makes the street feel inhabited. Keep it small: it is
standing in a sign, not performing. 4-6 seconds.

**3. Intro (video).** `end_image = keyframe`, start from the same street empty.
Two or three ordinary cars pass, then a white van crosses right-to-left as a
moving wipe — the street ahead of it empty, BRIAN FU standing in its wake, so
the name completes left-to-right as the van exits frame. No morphing, no
sparkle: the van passed and now they are there.

**4. Exit (video).** `start_image = keyframe`. The I **steps out of the name** —
a grounded industrial humanoid, matte grey and off-white, scuffed, visible
actuators, real weight, no chrome — leaving a gap where the letter was. It
walks to camera, reaches over the lens and pulls down. **Ends on full black.**

The gap it leaves matters: BR_AN FU held for a beat is the joke landing. Do
not let the model close it, and do not let another letter slide in.

The keyboard section opens on its own 2.4s blackout, so a black final frame
cuts into it with nothing to match.

### Constraints that apply to all four

- **Locked-off camera.** Every clip.
- **Keep BRIAN FU and the robot centred** enough that a 9:16 centre-crop still
  reads — that is the entire mobile strategy.
- 16:9, silent, and small enough to autoplay without stalling.

## Where they go

`public/reels/hero-intro.mp4`, `hero-hold.mp4`, `hero-exit.mp4`, and the
keyframe at `public/shots/hero-keyframe.jpg`. Each is optional and the
sequence degrades cleanly without it, so they can land one at a time.


## How the cut to black works

A hard cut hidden under black, not a crossfade:

1. Scroll fires the nav's gate; the exit clip plays and pulls to black in
   frame.
2. `stage-dark` goes on at the same moment, so the nav, progress dots and
   cursor fade WITH the pull instead of surviving it — they live outside the
   panel and were the only things left lit otherwise.
3. The gate resolves on the clip's `ended`. A CSS black snaps opaque to catch
   the join.
4. The nav jumps **instantly** — `animate = false`. The screen is already
   black, and animating a scroll nobody can see only delays the next section.
5. The keyboard is already in its own 2.4s blackout, so there is nothing to
   match on the other side.

The CSS black deliberately does **not** fade during a real exit clip. Darkening
the frame while the robot is still reaching would eat its last beat. It only
fades across the whole beat in the fallback case, where there is no clip and it
IS the blackout.

Measured end to end on the placeholder: 0/255 at the cut, 5 through the
keyboard blackout, first light at 4.3s when the lamp strikes.
