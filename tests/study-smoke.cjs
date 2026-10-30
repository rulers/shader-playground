// npm install --no-save playwright; npx playwright install chromium
// node tests/study-smoke.cjs <study-directory>
const fs = require("fs"),
  http = require("http"),
  path = require("path"),
  assert = require("assert");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, ".."),
  out = path.join(require("os").tmpdir(), "shader-study-qa");
fs.mkdirSync(out, { recursive: true });
const slug = process.argv[2];
assert(slug && /^[a-z-]+$/.test(slug), "Pass the study directory name");
const works = [[slug, "", slug]];
const server = http.createServer((req, res) => {
  let p = path.resolve(root, "." + decodeURI(req.url.split("?")[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory())
    p = path.join(p, "index.html");
  if (!p.startsWith(root + path.sep) || !fs.existsSync(p)) {
    res.writeHead(404);
    return res.end();
  }
  res.setHeader(
    "Content-Type",
    p.endsWith(".js")
      ? "text/javascript"
      : p.endsWith(".css")
        ? "text/css"
        : p.endsWith(".svg")
          ? "image/svg+xml"
          : p.endsWith(".png")
            ? "image/png"
            : "text/html",
  );
  res.end(fs.readFileSync(p));
});
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  let browser;
  const launch = () =>
    chromium.launch({
      executablePath: process.env.STUDY_BROWSER_PATH,
      headless: true,
      args: process.env.STUDY_SOFTWARE_ONLY
        ? [
            "--no-sandbox",
            "--no-zygote",
            "--single-process",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--use-gl=disabled",
          ]
        : [],
    });
  const results = [];
  try {
    for (const [day, folder, slug] of works) {
      for (const mobile of [false, true]) {
        browser = await launch();
        const context = await browser.newContext({
          viewport: mobile
            ? { width: 390, height: 844 }
            : { width: 1440, height: 900 },
          hasTouch: mobile,
          isMobile: mobile,
          deviceScaleFactor: mobile ? 3 : 1,
        });
        const p = await context.newPage();
        const errors = [],
          failed = [];
        p.on("pageerror", (e) => errors.push(e.message));
        p.on("response", (r) => {
          if (r.status() >= 400) failed.push(r.url());
        });
        await p.goto(`http://127.0.0.1:${port}/${folder}/${slug}/`);
        await p.waitForTimeout(650);
        assert.equal(await p.locator("#controls").isVisible(), false);
        await p.locator("#toggle").click();
        assert.equal(await p.locator("#controls").isVisible(), true);
        assert.equal(
          await p.locator("#toggle").getAttribute("aria-expanded"),
          "true",
        );
        await p.locator("#pause").click();
        assert.equal(
          await p.locator("#pause").getAttribute("aria-pressed"),
          "true",
        );
        await p.keyboard.press("Escape");
        assert.equal(await p.locator("#controls").isVisible(), false);
        const getImage = () =>
          p.locator("canvas").evaluate((c) => c.toDataURL());
        await p.waitForTimeout(80);
        const frozen = await getImage();
        await p.waitForTimeout(150);
        assert.equal(await getImage(), frozen, "pause must freeze canvas");
        await p.locator("#toggle").click();
        await p.locator("#pause").click();
        assert.equal(
          await p.locator("#pause").getAttribute("aria-pressed"),
          "false",
        );
        await p.keyboard.press("Escape");
        const v = p.viewportSize();
        if (mobile) {
          const cdp = await context.newCDPSession(p);
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x: v.width * 0.55, y: v.height * 0.55 }],
          });
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: v.width * 0.73, y: v.height * 0.4 }],
          });
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
        } else {
          await p.mouse.move(v.width * 0.63, v.height * 0.45);
          await p.mouse.down();
          await p.mouse.move(v.width * 0.78, v.height * 0.35, { steps: 12 });
          await p.mouse.up();
        }
        await p.waitForTimeout(450);
        await p.screenshot({
          path: `${out}/${day}-${mobile ? "mobile" : "desktop"}.png`,
        });
        if (!mobile && process.env.CAPTURE_PREVIEW) {
          const data = await getImage();
          fs.writeFileSync(
            `${root}/${folder}/${slug}/preview.png`,
            Buffer.from(data.split(",")[1], "base64"),
          );
        }
        await p.locator("canvas").focus();
        await p.keyboard.press("Enter");
        await p.locator("#toggle").click();
        for (const input of await p.locator("input[type=range]").all()) {
          await input.focus();
          await p.keyboard.press("ArrowRight");
        }
        await p.locator("#reset").click();
        await p.locator("#close").click();
        await p.setViewportSize({ width: 320, height: 568 });
        await p.waitForTimeout(80);
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          "horizontal overflow",
        );
        assert.equal(await p.locator("#toggle").isVisible(), true);
        await p.emulateMedia({ reducedMotion: "reduce" });
        await p.reload();
        await p.waitForTimeout(120);
        assert.equal(
          await p.locator("#pause").getAttribute("aria-pressed"),
          "true",
          "reduced motion initial pause",
        );
        const still = await getImage();
        await p.waitForTimeout(100);
        assert.equal(await getImage(), still, "reduced motion canvas stable");
        assert.deepEqual(errors, []);
        assert.deepEqual(failed, []);
        results.push({ day, mobile, pass: true, errors, failed });
        console.log(JSON.stringify(results.at(-1)));
        await browser.close();
      }
    }
  } finally {
    fs.writeFileSync(out + "/results.json", JSON.stringify(results, null, 2));
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
  server.close();
});
