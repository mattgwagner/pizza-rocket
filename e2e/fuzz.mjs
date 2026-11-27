// Clicks every button from the title through the kitchen, a flight, and the hat rack.
// Usage: node e2e/fuzz.mjs
import { launch, pageUrl } from "./pw.mjs";

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
const clicked = new Set();
let step = "start";

async function click(id) {
  step = id;
  const el = page.locator("#" + id);
  await el.waitFor({ state: "visible", timeout: 6000 });
  await el.click();
  clicked.add(id);
}

try {
  await page.goto(pageUrl("?debug&test"));
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("pizzarocket")) localStorage.removeItem(k); });
  await page.goto(pageUrl("?debug&test"));
  await page.waitForFunction(() => window.__pizza);

  const problems = await page.evaluate(() => __pizza.audit());
  if (problems.length) throw new Error("order audit: " + problems.slice(0, 8).join(" | "));

  await click("musicBtn");
  await click("musicBtn");
  await click("whoBtn");
  await click("whoClose");
  await click("playBtn");
  await page.fill("#plName", "Tester");
  await click("plDone");
  await page.waitForFunction(() => __pizza.screen === "kitchen");

  await click("minusBtn");
  await click("plusBtn");
  for (const id of ["pepperoni", "mushroom", "olive", "cheese"]) await click("top-" + id);
  const topping = await page.evaluate(() => __pizza.order.topping);
  await page.fill("#countInput", "0");
  await click("top-" + topping);
  await click("bakeBtn");
  await page.waitForFunction(() => __pizza.screen === "result");
  await click("retryBtn");
  const answer = await page.evaluate(() => __pizza.order.answer);
  await page.fill("#countInput", String(answer));
  await click("top-" + topping);
  await click("bakeBtn");
  await page.waitForFunction(() => __pizza.screen === "result");
  await click("continueBtn");
  await page.waitForFunction(() => __pizza.screen === "kitchen");

  const second = await page.evaluate(() => ({ answer: __pizza.order.answer, topping: __pizza.order.topping, skill: __pizza.order.skill }));
  if (second.skill === "fraction-slices") {
    for (let i = 0; i < (await page.evaluate(() => __pizza.order.pepperoni)); i++) await click("slice" + i);
  } else {
    await page.fill("#countInput", String(second.answer));
    await click("top-" + second.topping);
  }
  await click("bakeBtn");
  await page.waitForFunction(() => __pizza.screen === "result");
  await click("continueBtn");
  await page.waitForFunction(() => __pizza.screen === "flight");
  await click("upBtn");
  await click("downBtn");
  await page.evaluate(() => __pizza.pump(30000));
  await page.waitForFunction(() => __pizza.screen === "delivery");
  await click("nextBtn");
  await page.waitForFunction(() => __pizza.screen === "kitchen");

  await page.evaluate(() => __pizza.debugOrder("fraction"));
  await page.waitForFunction(() => __pizza.order.skill === "fraction-slices");
  for (let i = 0; i < 8; i++) await click("slice" + i);
  const pep = await page.evaluate(() => __pizza.order.pepperoni);
  // slices toggle, so turn them all off then on for the ticket
  const on = await page.evaluate(() => [...Array(8).keys()].filter(i => document.getElementById("slice" + i).getAttribute("aria-pressed") === "true"));
  for (const i of on) await click("slice" + i);
  for (let i = 0; i < pep; i++) await click("slice" + i);
  await click("bakeBtn");
  await page.waitForFunction(() => __pizza.screen === "result");
  await click("continueBtn");

  await page.evaluate(() => __pizza.debugOrder("bar"));
  await click("shopBtn");
  await page.waitForFunction(() => __pizza.screen === "shop");
  for (const id of ["star-goggles", "tall-hat", "bow", "gold-wrench", "cape", "moon-boots", "antenna", "crown"]) await click("hat-" + id);
  await click("shopBack");

  await click("whoBtn");
  await click("plAdd");
  await page.fill("#plName", "Two");
  await click("plDone");
  await click("whoBtn");
  await click("plPick-p1");
  await click("whoBtn");
  await click("plDel-p2");
  await click("plDelNo-p2");
  await click("plDel-p2");
  await click("plDelYes-p2");
  await click("plDel-p1");
  await click("plDelNo-p1");
  await click("whoClose");

  const need = [
    "playBtn", "musicBtn", "whoBtn", "whoClose", "plDone", "plAdd",
    "minusBtn", "plusBtn", "bakeBtn", "shopBtn", "retryBtn", "continueBtn",
    "upBtn", "downBtn", "nextBtn", "shopBack",
    "top-pepperoni", "top-mushroom", "top-olive", "top-cheese",
    ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => "slice" + i),
    ..."star-goggles,tall-hat,bow,gold-wrench,cape,moon-boots,antenna,crown".split(",").map(id => "hat-" + id),
    "plPick-p1", "plDel-p1", "plDelNo-p1", "plDel-p2", "plDelNo-p2", "plDelYes-p2",
  ];
  const missed = need.filter(id => !clicked.has(id));
  if (missed.length) throw new Error("never clicked: " + missed.join(", "));
  if (errors.length) throw new Error("page errors: " + errors.slice(0, 5).join(" | "));
  console.log("fuzz: PASS (" + clicked.size + " button clicks)");
} catch (e) {
  console.log("fuzz: FAIL at " + step, e.message, errors.length ? "\npage errors: " + errors.join(" | ") : "");
  process.exitCode = 1;
} finally {
  await browser.close();
}
