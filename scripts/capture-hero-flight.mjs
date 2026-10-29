import puppeteer from "puppeteer-core";
import fs from "node:fs";

const edge = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => fs.existsSync(p));

const browser = await puppeteer.launch({
  executablePath: edge,
  headless: "new",
  args: ["--no-sandbox", "--use-angle=swiftshader"],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on("pageerror", (err) => console.log("PAGEERROR", err.message));
await page.goto("http://localhost:5175/", { waitUntil: "domcontentloaded", timeout: 60000 });
const dir = "tmp-hero-shots";
fs.mkdirSync(dir, { recursive: true });
const shots = [
  { name: "entrance2", test: (b) => b && b.mode === "HERO" && b.t > 0.7 && b.t < 1.6 && b.aim < 0.05 },
  { name: "approach2", test: (b) => b && b.mode === "HERO" && b.aim > 0.4 && b.aim < 0.8 },
  { name: "perch2", test: (b) => b && b.mode === "PERCHED" && b.t > 0.35 },
];
const start = Date.now();
while (shots.length && Date.now() - start < 26000) {
  const bf = await page.evaluate(() => window.__bf || null);
  const hit = shots.findIndex((s) => s.test(bf));
  if (hit >= 0) {
    const name = shots[hit].name;
    await page.screenshot({ path: `${dir}/${name}.png` });
    console.log("SHOT", name, JSON.stringify(bf));
    shots.splice(hit, 1);
  }
  await new Promise((r) => setTimeout(r, 80));
}
console.log("LEFT", shots.map((s) => s.name).join(","));
await browser.close();
