const { launch } = require('./pw');
const { start } = require('./serve');
let PORT = 0;
(async () => {
  const { srv, port } = start(); PORT = port;
  const browser = await launch();
  for (const [name, q, vw, vh] of [
    ['desk 2560x1440', '&r=2560x1440', 1280, 900],
    ['desk 3840x2160', '&r=3840x2160', 1280, 900],
    ['desk sur mobile', '&r=2560x1440', 390, 844],
    ['tablette', '&r=2048x2732', 1280, 900],
    ['tel', '&r=1179x2556', 1280, 900],
    ['tel etroit', '&r=1179x2556', 320, 568]
  ]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, locale: 'fr-FR' });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/?l=fr${q}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const dev = document.getElementById('device');
      const vr = dev.getBoundingClientRect();
      const res = { dev: [Math.round(vr.width), Math.round(vr.height)], mu: getComputedStyle(dev).getPropertyValue('--mu') };
      for (const id of ['mockHandheld', 'mockDesk']) {
        const m = document.getElementById(id);
        if (m.hidden) continue;
        res.shown = id;
        res.scroll = [m.scrollWidth, m.scrollHeight];
        res.client = [m.clientWidth, m.clientHeight];
        const dock = m.querySelector(id === 'mockDesk' ? '.mockd-dock-w' : '.mock-dock');
        if (dock) { const d = dock.getBoundingClientRect(); res.dockBottomVsDevice = Math.round(d.bottom - vr.bottom); res.dockH = Math.round(d.height); }
        const icons = m.querySelector(id === 'mockDesk' ? '.mockd-icons' : '.mock-grid');
        if (icons) { const i = icons.getBoundingClientRect(); res.iconsH = Math.round(i.height); res.iconsBottomVsDevice = Math.round(i.bottom - vr.bottom); }
      }
      return res;
    });
    console.log(name.padEnd(18), JSON.stringify(r));
    await ctx.close();
  }
  await browser.close(); srv.close();
})();
