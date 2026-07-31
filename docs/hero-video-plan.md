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

## Still open (ask before generating)

- Blackout mechanic: in-video hand-over-lens vs hybrid (CSS pull synced to
  video end). Lean: in-video + CSS-black catch.
- Hold state: frozen keyframe vs living loop (extra generation + loop risk).
  Lean: frozen.
- Mobile: center-crop the 16:9 video vs static keyframe + simple entrance.
  (Separate 9:16 shoot doubles generation work.)
- Robot: neutral industrial white/gray, or a brand-color accent?
- Sound: silent-only vs sound-on toggle with city ambience.
- Budget: trial vs credit pack vs free-only keyframe drafts.
- Confirm: this replaces the "Building things that hold up." hero; normal
  scrolling resumes after the black lands.
