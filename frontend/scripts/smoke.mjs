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

// --- rating chips drag between rows -------------------------------------
// Worth a real drag rather than asserting the handler exists: the failure
// mode here is silent. Everything renders, the handle shows, and nothing
// moves — which is exactly the state this shipped in before.
await page.goto(BASE + "/style", { waitUntil: "networkidle" });
const row10 = page.getByTestId("row-10");
const row5 = page.getByTestId("row-5");
await row10.scrollIntoViewIfNeeded();
{
  const chip = row10.locator("button").first();
  const src = await chip.boundingBox();
  const dst = await page.getByTestId("mine-5").boundingBox();
  await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
  await page.mouse.down();
  // Stepped, so the 8px activation threshold is genuinely crossed.
  await page.mouse.move(src.x + src.width / 2 + 20, src.y + src.height / 2 + 20, { steps: 8 });
  await page.mouse.move(dst.x + 60, dst.y + dst.height / 2, { steps: 20 });
  await page.waitForTimeout(200);
  await page.mouse.up();
  await page.waitForTimeout(350);
}
const moved =
  !(await row10.innerText()).includes("Darker Shade") &&
  (await row5.innerText()).includes("Darker Shade");
console.log(`${moved ? "PASS" : "FAIL"}  rating chip drags between rows`);

const chipTag = await row5.locator("button").first().evaluate((el) => el.tagName);
const keyboardIntact = chipTag === "BUTTON";
console.log(`${keyboardIntact ? "PASS" : "FAIL"}  chips are still buttons (keyboard path intact)`);

// The same book appears in every member's column. When all three shared one
// draggable id, picking up your copy dimmed everyone else's — so this checks
// a neighbouring column stays opaque mid-drag.
//
// Reloaded first: the drag above emptied row 10, and this needs a chip to
// pick up.
await page.reload({ waitUntil: "networkidle" });
await row10.scrollIntoViewIfNeeded();
{
  const chip = row10.locator("button").first();
  const src = await chip.boundingBox();
  if (src) {
    await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
    await page.mouse.down();
    await page.mouse.move(src.x + 24, src.y + 24, { steps: 8 });
    await page.waitForTimeout(150);
  }
}
const otherOpacity = await page
  .getByTestId("other-5")
  .locator("span")
  .first()
  .evaluate((el) => {
    let n = el, o = 1;
    while (n && n !== document.body) {
      o *= parseFloat(getComputedStyle(n).opacity);
      n = n.parentElement;
    }
    return o;
  })
  .catch(() => 1);
await page.mouse.up();
await page.waitForTimeout(200);
const columnsIndependent = otherOpacity > 0.9;
console.log(`${columnsIndependent ? "PASS" : "FAIL"}  other members' chips unaffected by your drag`);

// Chips within one cell read alphabetically.
const cellTitles = (await page.getByTestId("mine-5").locator("button").allInnerTexts())
  .map((t) => t.replace(/⠿\s*/g, "").trim());
const sortedOk =
  cellTitles.length >= 2 &&
  JSON.stringify(cellTitles) ===
    JSON.stringify([...cellTitles].sort((a, b) => a.localeCompare(b)));
console.log(`${sortedOk ? "PASS" : "FAIL"}  chips sorted alphabetically within a cell`);

await page.screenshot({ path: "/private/tmp/claude-501/-Users-heenalamin-Desktop-git-bookclub-web-app/f802fc34-b167-4e5b-917e-3923a180c3e4/scratchpad/styleguide.png", fullPage: true });
await browser.close();
process.exit(
  allOk &&
  dialogVisible &&
  dialogClosed &&
  selected === "true" &&
  moved &&
  keyboardIntact &&
  columnsIndependent &&
  sortedOk
    ? 0
    : 1
);
