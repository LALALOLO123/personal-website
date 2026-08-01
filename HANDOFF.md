# Handoff — brianfu.vercel.app

Read this first, then `docs/`. Written 2026-08-01.

**Working copy:** `C:\Users\brian\OneDrive\Desktop\Resume\personal-website`
**Repo:** https://github.com/jiacheng-fu/personal-website (branch `main`)
**Live:** https://brianfu.vercel.app — ⚠️ serving a build from *well before*
everything below. Nothing in this document is deployed yet.

The working directory for a new chat is the **parent** folder,
`C:\Users\brian\OneDrive\Desktop\Resume` — that is where `.mcp.json` and
`.claude/` live, so MCP servers only resolve when a session is opened there.
See `../README.md` for what else is in that folder.

```bash
cd "C:/Users/brian/OneDrive/Desktop/Resume/personal-website"
npm install          # only if node_modules is missing
npm run dev          # http://localhost:5173
npm run build        # tsc --noEmit, then vite build
```

`npm run build` passes clean as of this writing. If it suddenly reports dozens
of R3F errors like `Property 'color' does not exist on type ExtendedColors<...>`,
the code is fine — something has broken TypeScript's automatic `@types`
discovery. **Do not "fix" the components.** This was hit once by symlinking
`node_modules` out of OneDrive via a junction; TypeScript resolves the real
path and then stops finding the type augmentations. A real `node_modules`
directory is required.

---

## 0 · Do these before anything else

1. **Install a transcoder before generating any video.**
   ```bash
   npm i -D ffmpeg-static
   ```
   There is no ffmpeg on this machine, so without it the resolution, duration
   and bitrate of any generated clip are **irreversible** — the only fix is
   paying to generate again. See `docs/hero-generation-spec.md` §4.4.

2. **Check for stale dev servers before trusting what you see.** Several have
   accumulated on 5174 and 5199 during this project, serving old code from
   old paths; landing on one wastes an hour. `npx kill-port 5173 5174 5199`.

---

## 1 · What the site is

React 18 + TypeScript + Vite. Four full-screen sections. **Scroll is a
trigger, never a scrubber** — one gesture moves one section, and that section
runs its own choreography on its own clock.

| # | section | state |
|---|---|---|
| 1 | **Hero** — AI film: van reveals BRIAN FU, robot walks out, pulls to black | machinery **built**, no footage yet — runs on a placeholder |
| 2 | **Keyboard** — 3D board, blackout → lamp strike → stands up | **done** |
| 3 | **Work** — projected reels | two versions, **undecided** |
| 4 | **Contact** — "Say hi." | **untouched**, original typography |

### Section 2 — the keyboard (finished)

2.4s of genuine black (measured max channel 5/255, nothing on screen at all),
then the lamp strikes in 0.2s — a switch thrown, not a fade — half a second of
stillness, then the board stands up over 1.6s into the product pose.

45 keys, all real, laid out like a 60% board: the left column grows as it
descends (1u → 1.5 tab → 1.75 caps → 2.25 shift) and rows are left-aligned, so
the genuine ANSI stagger falls out for free. Hovering a key stands its brand
logo up as extruded geometry off to the lower-left, in the brand's own
logotype where one exists.

> The old plan says "recolour the keyboard white". **Superseded** — Brian chose
> brand-coloured caps over many rounds. Ignore that line.

### Section 3 — work (needs a decision)

- **default** — projection in a void: beam, gate weave, lamp flicker, dust,
  names in landmark 3D type. Works today.
- **`?work=plate`** — the better idea: a generated environment as a plate, with
  a floating AR panel corner-pinned onto it. Needs one generated loop.

Three earlier attempts at a 3D diorama were deleted. They failed structurally,
not cosmetically: **photoreal props on an empty plane are a scene, and a scene
needs an environment**. The keyboard works because it is one object in a void.
Do not rebuild the diorama.

---

## 2 · Environment

**Node + npm.** `npm install`, `npm run dev` (5173), `npm run build` (runs
`tsc --noEmit` first — typecheck failures block the build).

**MCPs are scoped per directory.** `../.mcp.json` already declares Playwright,
so it loads automatically — but **only for a session opened at
`C:\Users\brian\OneDrive\Desktop\Resume`**, not one opened inside this repo.
Open the parent folder. To add another:

```bash
claude mcp add <name> npx <package>
```

**Higgsfield MCP** — Brian's account, **Plus plan, 1,210 credits** at time of
writing. Connect via Higgsfield's official MCP connector (account already
exists; don't create a second one). Verify with the `balance` tool before
spending.

> **Playwright MCP pins the browser viewport**, which does not match the window
> it opens. That once produced a confident, wrong report that fullscreen layout
> was broken — the site was fine. When judging layout, compare
> `window.innerWidth` against `outerWidth` before believing a screenshot.

**Puppeteer** drives the dev scripts below but is **not** a dependency of this
repo — it resolves from `..\node_modules`, in the parent folder. The scripts
hardcode that absolute path, so they work as long as this repo stays a child of
`Desktop\Resume`. Move it elsewhere and either `npm i -D puppeteer` here or fix
the `require` at the top of each script.

### Dev scripts (all dev-only, run by hand)

| script | what it does |
|---|---|
| `scripts/shot.cjs` | one cropped, downscaled screenshot of a section. `HOVER="x,y"` parks the cursor on a key; `REVEAL_WAIT` / `HOVER_WAIT` control timing. **Use this instead of full-resolution screenshots** — it exists because full frames burn enormous context. |
| `scripts/gen-legends.cjs` | rebuilds `src/data/legends.ts` from simple-icons + hand-authored marks |
| `scripts/gen-brand-logos.cjs` | fetches devicon full-colour logos + wordmark lockups into `public/logos/brand` |
| `scripts/gen-logo-masks.cjs` | turns the Accellera HDL logos into white-ink keycap masks |

---

## 3 · The docs

| file | what it is |
|---|---|
| `docs/hero-video-plan.md` | hero **creative brief** — every beat confirmed, all questions closed |
| `docs/hero-generation-spec.md` | hero **operational spec** — exact models, verbatim prompts, pass criteria, failure fixes, stop conditions. **This is the one to follow when generating.** |
| `docs/section-transitions.md` | storyboards for the other transitions (brick, paper) — not built |
| `docs/work-plate.md` | the plate technique, calibration workflow, and its traps |

---

## 4 · Next action: the hero keyframe

Everything is conditioned on one image, so generate it first and do not move
on until it passes. Full prompt and criteria in `docs/hero-generation-spec.md`
§2. In short:

- `nano_banana_pro`, 16:9, **`resolution: "4k"`** (it defaults to 1k, which is
  visibly soft full-bleed on a 1440p screen), `count: 4`.
- Downtown street, BRIAN FU as human-height glossy white slab-serif sculpture
  letters on a shared baseline. **The robot is the I** — plainly a machine,
  not disguised, same height, same baseline, in the letter's slot.
- **16 drafts maximum.** If none pass, the concept needs changing, not more
  attempts.

Then: empty street (an *edit* of the accepted keyframe — generating it fresh
produces a different street and the join fails), then the three clips.

**On every video call:** `generate_audio: false` — it **defaults to true**, and
forgetting it buys audio we decided against in a bigger file. `1080p` +
`mode: "std"`. Preflight with `get_cost: true` and report the number before
submitting.

**Still unknown, and only drafts can answer it:** whether a model can put a
humanoid *inside a word* at letter height on a shared baseline. It is the
hardest thing in the brief and everything depends on it, so the honest first
milestone is "does this composition exist", not "start the pipeline".

---

## 5 · Standing rules

**Nothing on this site may be untrue.** Four invented projects were deleted
from it once. Since then: Tailwind was refused (it appears on no résumé, in no
`package.json`, and a GitHub code search returned zero hits), and a keycap set
was rejected for advertising tools Brian does not use. Every project's role is
stated where it was not solo — Wild West was a team hackathon build and he
wrote the frontend, so it says so. Dates are when the work happened, not when
the repo was pushed.

**Deploy only to the personal Vercel scope** `brianfu-6056s-projects`. Never
the employer's `thingsx-projects`.

**Security posture** (from the internship autoapply work in the same account):
no defeating CAPTCHAs or bot detection, no scraping LinkedIn or Indeed, every
application answer must be true, and credentials stay in gitignored local
files.

---

## 6 · Open items

| item | note |
|---|---|
| **Deploy** | production is far behind `main`. Nothing here is live. |
| **Work section** | pick the plate or the void version; delete the other |
| **Two project reels** | Horizon (Unity build) and CarStatus (CLI against a real car) cannot be captured from this machine — they show a film leader until Brian records them. Drop mp4s in `public/reels/`, set `clip` in `src/data/content.ts`. |
| **Contact section** | untouched |
| **Transitions 2→3, 3→4** | storyboarded only |
| **Spacebar** | still reads "shipped, not read about" — the last non-logo type on the board |
| **Mobile** | work section clips ~41px at 390px wide |
