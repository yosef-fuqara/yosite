import puppeteer from "puppeteer-core";
import fs from "node:fs";

const edgePaths = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = edgePaths.find((p) => fs.existsSync(p));

const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  args: ["--no-sandbox", "--use-angle=swiftshader"],
  defaultViewport: { width: 1440, height: 810, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on("console", (msg) => console.log("PAGE:", msg.text()));
await page.goto("http://localhost:5173/", { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((r) => setTimeout(r, 6000));
const info = await page.evaluate(() => {
  const canvas = document.querySelector(".yo-hero canvas");
  const stage = document.querySelector(".yo-hero__stage");
  const rect = canvas?.getBoundingClientRect();
  const srect = stage?.getBoundingClientRect();
  return {
    canvas: rect ? { w: rect.width, h: rect.height, x: rect.x, y: rect.y } : null,
    stage: srect ? { w: srect.width, h: srect.height, x: srect.x, y: srect.y } : null,
    buffer: canvas ? { w: canvas.width, h: canvas.height } : null,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
