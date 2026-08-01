# Section transitions — storyboards

Scroll is a **trigger**, never a scrubber. One gesture fires one transition
clip, the clip plays to completion, and the next section is live underneath it.
Nothing is tied to scroll position.

Sections, in order:

| # | Section | Theme | First frame is |
|---|---------|-------|----------------|
| 1 | Hero | AI video (planned) | downtown street, daylight |
| 2 | Keyboard | black studio | **pure black** for 2.4s |
| 3 | Projects (CarScout) | light | off-white page |
| 4 | TBD (currently Contact) | light | off-white page |

---

## The one idea holding it together

**Every transition turns the section's own subject into a physical object, and
something happens to that object.** Letters are freestanding sculptures. The
keyboard becomes a brick. The project card becomes paper. It keeps three
separate clips from reading as three unrelated gimmicks, and it is already the
language of the hero — the BRIAN FU letters are physical, in the world, not an
overlay.

## Two cheats that do most of the work

**1. The start frame is free and pixel-exact.**
We control sections 2–4, so their frames can be exported straight from the
running site at 2560×1440 (`scripts/shot.cjs` already does this). The clip then
begins *identical* to what the visitor is looking at — no frame matching, no
drift, no generation spent on the opening frame. This is the single biggest
lever on seamlessness and it costs nothing.

**2. Black and flash both hide a cut.**
The keyboard section opens on genuinely full black — measured max channel 5 of
255 for 1.5s. Any clip that ends on black cuts into it invisibly. Going the
other way (dark → light) a white impact flash does the same job, and a flash is
far easier to hit than a specific frame.

---

## A. Hero → Keyboard  *(the long one)*

The existing hero plan doubles as this transition; see `hero-video-plan.md`.

```
0:00  downtown street, daylight, camera locked off
0:03  two or three ordinary cars pass
0:06  white van crosses right→left, and where it has passed
      BRIAN FU stands in the road: oversized freestanding slab-serif
      letters, glossy white, public-art scale
0:10  HOLD. this is the resting state — scroll does nothing until here
--- scroll fires ---
0:00  robot steps out from behind the letters (Boston-Dynamics-ish,
      not futuristic, real weight, visible actuators)
0:03  walks to camera, fills frame
0:05  reaches over the lens and pulls down
0:06  BLACK
```

- **Out:** full black → lands in the keyboard blackout. Nothing to match.
- **Shots:** 4 (street+cars, van reveal, robot approach, lens grab).
- **Cost:** this is the whole budget. Everything else is rounding.
- **Fallback:** if the robot never lands, the van reveal alone plus a CSS wipe
  to black still works as a hero.

---

## B. Keyboard → Projects  *(the brick)*

```
start frame  the settled keyboard, exported from the live scene
0:00         spotlight CUTS out — one frame, no fade
0:01         relit low and warm. the board is now a clay brick lying
             on the same dark floor, same position, same angle
0:02         a bare hand enters frame, picks it up, hurls it at camera
0:02.6       impact. WHITE FLASH
```

- **In:** start frame is our own render, so the cut in is invisible.
- **Out:** white flash → the light Projects section. The flash is what carries
  dark → light; without it that jump is jarring.
- **Duration:** ~2.6s. Single shot.
- **Why it works:** the joke lands because the object is heavy and dumb, which
  is the opposite of what a keyboard is. Keep the brick unglamorous — no
  glowing, no particles.
- **Reverse (scroll up):** play the same clip backwards. Brick flies out of the
  flash, into the hand, back to the floor, becomes a keyboard, light snaps on.
  Costs nothing extra and reads better than a cut.
- **Fallback:** spotlight snap-off → white flash, done in CSS.

---

## C. Projects → Section 4  *(paper)*

```
start frame  the CarScout card, exported from the live page
0:00         the card peels off the page — it was printed, not rendered
0:01         it folds itself into a paper plane, mid-air
0:02         thrown; flies away from camera down a white void
0:02.8       it banks, comes back at the lens, covers it. WHITE
```

- **Out:** white → light section 4. If section 4 ends up dark, swap the ending
  for the plane flying into shadow and land on black instead.
- **Duration:** ~2.8s. Single shot.
- **Depends on section 4.** If it becomes a contact section, the plane can land
  as an envelope. If it becomes writing, it lands as a folded page. Decide the
  section first — this clip is cheap to spec but wrong to generate early.
- **Reverse:** backwards again — plane un-flies, unfolds, flattens onto the page.

---

## Open decisions

**Reverse scroll.** Playing clips backwards is free and fits both B and C. It
does not fit A — a robot un-grabbing the lens looks like a mistake. Options for
scrolling up from the keyboard: hard cut, or a short CSS fade. Recommend the
cut; nobody expects a cinematic on the way back.

**Repeat visits.** A 2.6s blocking clip is delightful once and irritating the
fourth time. Suggest: full clip on first traversal per session, hard cut
thereafter. Store the flag in memory, not localStorage — a fresh visit should
still get the show.

---

## Delivery specs

- 1920×1080 minimum, ideally 2560×1440. H.264 mp4 + WebM if the size warrants.
- **Under 1.5MB each** for B and C. They must be preloaded or the first play
  stutters exactly when it is supposed to feel slick.
- `muted`, `playsinline`, `preload="auto"`. Preload the next section's clip when
  a section becomes active, not on page load.
- Every clip's final frame must be a flat colour (black or white). No detail in
  the last frame — that is what makes the cut free.

## Budget on Plus (1,200 credits ≈ 53 full Seedance 2.0 videos)

| | generations | credits |
|---|---|---|
| B — brick | ~8 | ~185 |
| C — paper | ~8 | ~185 |
| A — hero, 4 shots | ~36 | ~830 |

Tight but it fits, **provided the frames are locked with the image model first**
— iterating a video to fix a framing problem is the expensive mistake. Do B and
C first: they are the certain half, and finishing them proves the pipeline
before the hero eats the rest.

Credit figures are derived from Higgsfield's own "1,200 credits ≈ 53 videos"
ratio, not published per-generation pricing. Verify against real spend on the
first two generations.
