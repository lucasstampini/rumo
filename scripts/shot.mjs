// Utilitário de dev: node scripts/shot.mjs <url> <saida.png> [largura] [altura]
import { chromium } from "@playwright/test";
const [url, out, w = "390", h = "844"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const res = await page.goto(url, { waitUntil: "networkidle" });
console.log(res?.status(), page.url());
await page.screenshot({ path: out });
await browser.close();
