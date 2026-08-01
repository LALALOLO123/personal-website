/* ---------------------------------------------------------------------------
   Accellera's official HDL logos -> white-ink keycap masks.

   They publish real marks for SystemVerilog, VHDL and SystemRDL and grant use
   freely, but only as raster - and the SystemVerilog and VHDL files are
   white-background with no alpha at all, so dropped straight onto a coloured
   keycap they would render as a white sticker. This derives an alpha mask
   from the ink instead, so they sit on a cap like every other legend.

   Dev-only, run by hand; needs puppeteer on the machine (it is not a
   dependency of this project):
     node scripts/gen-logo-masks.cjs '[["src.png","public/logos/out.png"]]'
   --------------------------------------------------------------------------- */
const puppeteer = require('puppeteer');
const fs = require('fs');
const JOBS = JSON.parse(process.argv[2]);
(async () => {
  const br = await puppeteer.launch();
  const p = await br.newPage();
  for (const [src, dest] of JOBS) {
    const b64 = fs.readFileSync(src).toString('base64');
    const out = await p.evaluate(async (s) => {
      const i = await new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = 'data:image/png;base64,' + s; });
      const c = document.createElement('canvas'); c.width = i.width; c.height = i.height;
      const g = c.getContext('2d'); g.drawImage(i, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height);
      const px = d.data;
      // Ink coverage = distance from white in the LEAST saturated channel, so
      // a white background reads as 0 and any coloured or black ink reads
      // high. Where the source already carries alpha, respect that instead.
      // The lift curve matters: VHDL's green only reaches partial coverage
      // and rendered half-transparent without it, and it also thresholds
      // away the scan noise in the source files.
      const lift = v => Math.max(0, Math.min(255, (v - 30) * 255 / 150));
      for (let k = 0; k < px.length; k += 4) {
        const a0 = px[k + 3];
        const cover = 255 - Math.min(px[k], px[k + 1], px[k + 2]);
        px[k] = px[k + 1] = px[k + 2] = 255;
        px[k + 3] = lift(a0 < 250 ? a0 : cover);
      }
      g.putImageData(d, 0, 0);
      let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        if (px[(y * c.width + x) * 4 + 3] > 12) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      const w = maxX - minX + 1, h = maxY - minY + 1;
      const t = document.createElement('canvas'); t.width = w; t.height = h;
      t.getContext('2d').drawImage(c, minX, minY, w, h, 0, 0, w, h);
      return { url: t.toDataURL('image/png'), w, h };
    }, b64);
    fs.writeFileSync(dest, Buffer.from(out.url.split(',')[1], 'base64'));
    console.log(`${dest.split(/[\/]/).pop().padEnd(22)} ${out.w}x${out.h}  ${fs.statSync(dest).size} bytes`);
  }
  await br.close();
})();
