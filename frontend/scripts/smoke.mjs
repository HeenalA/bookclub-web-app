import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:4173";
// Use the Chrome already installed on this machine rather than downloading
// a separate Chromium just for a smoke test.
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();

const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

async function visit(path, expectText) {
  errors.length = 0;
  const res = await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const body = await page.textContent("body");
  const ok = expectText ? body.includes(expectText) : true;
  console.log(
    `${ok && errors.length === 0 ? "PASS" : "FAIL"}  ${path}` +
    `  http=${res.status()}  chars=${body.trim().length}` +
    (expectText ? `  expects="${expectText}": ${ok}` : "")
  );
  if (errors.length) console.log("      console errors:", errors.slice(0, 4));
  return ok && errors.length === 0;
}

let allOk = true;
allOk &= await visit("/style", "Style guide");
allOk &= await visit("/login", "Sign in to your book clubs");
allOk &= await visit("/clubs");            // should bounce to /login
console.log("      after /clubs, url =", page.url());
allOk &= await visit("/nope-does-not-exist", "Page not found");

// Interaction check on the style guide: open the modal.
await page.goto(BASE + "/style", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Open a modal" }).click();
const dialogVisible = await page.locator('[role="dialog"]').isVisible();
console.log(`${dialogVisible ? "PASS" : "FAIL"}  modal opens on click`);
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
const dialogClosed = (await page.locator('[role="dialog"]').count()) === 0;
console.log(`${dialogClosed ? "PASS" : "FAIL"}  Escape closes the modal`);

// Tab interaction
await page.getByRole("tab", { name: "Ratings" }).click();
const selected = await page.getByRole("tab", { name: "Ratings" }).getAttribute("aria-selected");
console.log(`${selected === "true" ? "PASS" : "FAIL"}  tab selection updates aria-selected`);

await page.screenshot({ path: "/private/tmp/claude-501/-Users-heenalamin-Desktop-git-bookclub-web-app/f802fc34-b167-4e5b-917e-3923a180c3e4/scratchpad/styleguide.png", fullPage: true });
await browser.close();
process.exit(allOk && dialogVisible && dialogClosed && selected === "true" ? 0 : 1);
