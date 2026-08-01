/* ---------------------------------------------------------------------------
   One-command screenshot of the keyboard section.

   Drives the dev server, waits out the reveal, crops to the board and scales
   down, so checking a change costs one small image instead of a full 1600x1000
   frame. Optionally crops a region first for detail shots.

   Dev-only; needs puppeteer on the machine (not a dependency of this project).

     node scripts/shot.cjs out.png                  # whole board, downscaled
     node scripts/shot.cjs out.png 780 530 340 280  # x y w h, 2x detail crop
   --------------------------------------------------------------------------- */
const puppeteer = require("puppeteer");

const URL = process.env.KB_URL || "http://localhost:5173/";
const [out, cx, cy, cw, ch] = process.argv.slice(2);
if (!out) {
  console.error("usage: node scripts/shot.cjs out.png [x y w h]");
  process.exit(1);
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewportSize?.({ width: 1600, height: 1000 });
  await page.setViewport({ width: 1600, height: 1000 });
  await page.goto(URL, { waitUntil: "networkidle2" });

  // section 2 is the board; its reveal runs on its own clock once armed
  await page.keyboard.press("ArrowDown");
  await new Promise((r) => setTimeout(r, 4200));

  const full = await page.screenshot({ type: "png" });

  const b64 = full.toString("base64");
  const url = await page.evaluate(
    async (src, crop) => {
      const img = await new Promise((r) => {
        const i = new Image();
        i.onload = () => r(i);
        i.src = "data:image/png;base64," + src;
      });
      const [x, y, w, h, scale] = crop;
      const c = document.createElement("canvas");
      c.width = Math.round(w * scale);
      c.height = Math.round(h * scale);
      const g = c.getContext("2d");
      g.imageSmoothingQuality = "high";
      g.drawImage(img, x, y, w, h, 0, 0, c.width, c.height);
      return c.toDataURL("image/png");
    },
    b64,
    cw
      ? [+cx, +cy, +cw, +ch, 2]
      : // the board's bounding area in the 1600x1000 frame, at ~62%
        [330, 60, 990, 850, 0.62]
  );

  require("fs").writeFileSync(out, Buffer.from(url.split(",")[1], "base64"));
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  console.log(`wrote ${out}` + (errs.length ? `  (${errs.length} page errors)` : ""));
  await browser.close();
})();
