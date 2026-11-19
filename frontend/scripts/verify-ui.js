// Automated verification & screenshot script for Anticipatory Commerce UI
import puppeteer from "puppeteer-core";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOT_DIR = path.resolve(__dirname, "../screenshots");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL = "http://localhost:4173/";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("Launching headless Chrome...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();

  // 1. Desktop 1440x900 - Light Mode Idle
  console.log("1. Testing Desktop 1440x900 Light Mode...");
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: "networkidle0" });
  await sleep(1000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "1-desktop-1440-idle-light.png"),
    fullPage: false,
  });
  console.log("Captured: 1-desktop-1440-idle-light.png");

  // 2. Click "Try: correction"
  console.log("2. Running Correction scenario ('black no wait white')...");
  const correctionChip = await page.waitForSelector(
    'button:has-text("Try: correction"), button ::-p-text("Try: correction")'
  ).catch(async () => {
    // fallback xpath / evaluate
    const buttons = await page.$$("button");
    for (const b of buttons) {
      const text = await page.evaluate((el) => el.innerText, b);
      if (text.includes("correction")) return b;
    }
  });

  if (correctionChip) {
    await correctionChip.click();
  } else {
    // Click button by evaluating
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const target = btns.find((b) => b.innerText.includes("correction"));
      if (target) target.click();
    });
  }

  // Wait for streaming words to arrive and finish (approx 3.5s)
  console.log("Waiting for correction stream to complete...");
  await sleep(4000);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "2-desktop-1440-correction-light.png"),
    fullPage: false,
  });
  console.log("Captured: 2-desktop-1440-correction-light.png");

  // 3. Switch to Night Mode (Dark)
  console.log("3. Toggling Dark Mode (Night)...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const themeBtn = btns.find(
      (b) => b.innerText.includes("Night") || b.innerText.includes("Paper")
    );
    if (themeBtn) themeBtn.click();
  });
  await sleep(800);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "3-desktop-1440-correction-dark.png"),
    fullPage: false,
  });
  console.log("Captured: 3-desktop-1440-correction-dark.png");

  // 4. Click "Try: Hinglish"
  console.log("4. Running Hinglish scenario ('mujhe Loomsy green casual shoes size eight chahiye please')...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const hinglishBtn = btns.find((b) => b.innerText.includes("Hinglish"));
    if (hinglishBtn) hinglishBtn.click();
  });

  await sleep(4000);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "4-desktop-1440-hinglish-dark.png"),
    fullPage: false,
  });
  console.log("Captured: 4-desktop-1440-hinglish-dark.png");

  // 5. Mobile 390x844 Dark Mode
  console.log("5. Testing Mobile 390x844 Viewport...");
  await page.setViewport({ width: 390, height: 844 });
  await sleep(600);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "5-mobile-390-hinglish-dark.png"),
    fullPage: false,
  });
  console.log("Captured: 5-mobile-390-hinglish-dark.png");

  // 6. Mobile Light Mode
  console.log("6. Mobile Light Mode...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const themeBtn = btns.find(
      (b) => b.innerText.includes("Paper") || b.innerText.includes("Night")
    );
    if (themeBtn) themeBtn.click();
  });
  await sleep(600);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "6-mobile-390-light.png"),
    fullPage: false,
  });
  console.log("Captured: 6-mobile-390-light.png");

  console.log("Verification complete! Closing browser.");
  await browser.close();
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
