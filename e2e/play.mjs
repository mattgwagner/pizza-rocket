// Three orders and one flight, scripted, then screenshots at 1920x1080 and 1366x768.
// Usage: node e2e/play.mjs
import { launch, pageUrl } from "./pw.mjs";
import { mkdirSync } from "node:fs";
mkdirSync(new URL("../shots/", import.meta.url), { recursive: true });
const shot = (page, name) => page.screenshot({ path: new URL(`../shots/${name}.png`, import.meta.url).pathname });
const browser = await launch();
const errors = [];
let step = "start";
const ok = (cond, msg) => { if (!cond) throw new Error(`[${step}] ${msg}`); };

async function open(vp) {
  const page = await browser.newPage({ viewport: vp });
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  return page;
}
async function boot(page) {
  await page.goto(pageUrl("?debug&test"));
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith("pizzarocket")) localStorage.removeItem(k); });
  await page.goto(pageUrl("?debug&test"));
  await page.waitForFunction(() => window.__pizza, null, { timeout: 5000 });
}
async function fit(page) {
  return page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll("button, input")) {
      if (el.hidden || el.closest("[hidden]")) continue;
      const dlg = el.closest("dialog");
      if (dlg && !dlg.open) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) bad.push((el.id || el.textContent || "").trim().slice(0, 40));
    }
    return bad;
  });
}
async function solve(page, extra = 0, mid) {
  const order = await page.evaluate(() => __pizza.order);
  ok(order && order.question && !/math|worksheet|picture-graph|scaled-bar/i.test(order.question), "ticket leaked a topic label: " + (order && order.question));
  if (order.skill === "fraction-slices") {
    for (let i = 0; i < order.pepperoni; i++) await page.click("#slice" + i);
  } else {
    await page.fill("#countInput", String(order.answer + extra));
    await page.click("#top-" + order.topping);
  }
  await page.click("#bakeBtn");
  if (mid) {
    await page.waitForTimeout(180);
    await shot(page, mid);
  }
  await page.waitForFunction(() => __pizza.screen === "result", null, { timeout: 4000 });
}

try {
  const page = await open({ width: 1920, height: 1080 });
  await boot(page);
  step = "title";
  ok(await page.isVisible("#playBtn"), "play button shows");
  ok((await page.locator("h1").first().textContent()) === "Pizza Rocket", "title heading");
  await shot(page, "01-title");

  step = "who am I";
  await page.click("#playBtn");
  ok(await page.isVisible("#whoDlg"), "first play asks Who am I?");
  ok((await page.textContent("#whoTitle")) === "Who am I?", "the screen is called Who am I?");
  await page.fill("#plName", "Tester");
  await shot(page, "02-who");
  await page.click("#plDone");
  await page.waitForFunction(() => __pizza.screen === "kitchen");
  ok((await page.textContent("#tipCount")).includes("0 tips"), "starts with no tips");

  step = "order 1 too many";
  ok((await page.textContent("#question")).length > 0, "ticket shows");
  await shot(page, "03-kitchen");
  await solve(page, 2, "03b-oven");
  ok((await page.evaluate(() => __pizza.result.kind)) === "crumbs", "too many brings Crumbs");
  ok((await page.textContent("#hint")).includes("BRRUP"), "Crumbs burps instead of a red mark");
  await shot(page, "04-crumbs");
  await page.click("#continueBtn");
  await page.waitForFunction(() => __pizza.screen === "kitchen");

  step = "order 2";
  await solve(page, 0);
  ok((await page.evaluate(() => __pizza.result.kind)) === "ok", "exact count is a good bake");
  await shot(page, "04b-perfect");
  ok((await page.textContent("#continueBtn")).includes("rocket"), "two good orders go to the rocket");
  await page.click("#continueBtn");
  await page.waitForFunction(() => __pizza.screen === "flight");

  step = "flight";
  await page.click("#upBtn");
  await page.click("#downBtn");
  await page.evaluate(() => { __pizza.hold("up"); __pizza.pump(1800); });
  ok((await page.evaluate(() => __pizza.screen)) === "flight", "still flying after a short hop");
  await shot(page, "05-flight");
  await page.evaluate(() => __pizza.pump(30000));
  await page.waitForFunction(() => __pizza.screen === "delivery");
  ok((await page.textContent("#delText")).length > 10, "delivery line shows");
  await page.evaluate(() => __pizza.pump(1200));
  await shot(page, "06-delivery");
  await page.click("#nextBtn");
  await page.waitForFunction(() => __pizza.screen === "kitchen");

  step = "order 3";
  await solve(page, 0);
  await page.click("#continueBtn");
  await page.waitForFunction(() => __pizza.screen === "kitchen");
  const save = await page.evaluate(() => ({ shift: __pizza.save.shift, flights: __pizza.save.flights, tips: __pizza.tips }));
  ok(save.shift === 3, "three orders finished, shift " + save.shift);
  ok(save.flights === 1, "one flight, got " + save.flights);
  ok(save.tips > 0, "tips saved");

  step = "fraction and bar";
  await page.evaluate(() => __pizza.debugOrder("fraction"));
  const pepN = await page.evaluate(() => __pizza.order.pepperoni);
  for (let i = 0; i < pepN; i++) await page.click("#slice" + i);
  await shot(page, "07-fraction");
  const tapped = await page.evaluate((pep) => {
    const pie = __pizza.pie;
    if (!pie) return false;
    const r = document.getElementById("c").getBoundingClientRect();
    const ang = -Math.PI / 2 + (pep + 0.5) * (Math.PI / 4);
    const x = r.left + pie.cx + Math.cos(ang) * pie.r * 0.55;
    const y = r.top + pie.cy + Math.sin(ang) * pie.r * 0.55;
    document.getElementById("c").dispatchEvent(new MouseEvent("click", { clientX: x, clientY: y, bubbles: true }));
    return __pizza.slices === pep + 1;
  }, pepN);
  ok(tapped, "the pizza itself toggles a slice");
  await page.evaluate(() => __pizza.debugOrder("bar"));
  await shot(page, "08-bar");

  step = "hat rack";
  await page.click("#shopBtn");
  await page.waitForFunction(() => __pizza.screen === "shop");
  ok(await page.locator("#hatGrid button").count() === 8, "eight hats");
  await page.click("#hat-bow");
  ok(await page.evaluate(() => __pizza.save.hats.includes("bow")), "bow tie bought");
  await shot(page, "09-shop");
  await page.click("#shopBack");
  await page.reload();
  await page.waitForFunction(() => window.__pizza);
  await page.click("#playBtn");
  ok((await page.evaluate(() => __pizza.tips)) > 0, "tips survive a reload");
  ok(await page.evaluate(() => __pizza.save.hats.includes("bow")), "hats survive a reload");

  step = "shot hook";
  await page.goto(pageUrl("?debug&test=flight"));
  await page.waitForFunction(() => __pizza.screen === "flight");
  ok(await page.isVisible("#upBtn"), "flight hook shows the steer buttons");

  step = "1366 fit";
  const small = await open({ width: 1366, height: 768 });
  await boot(small);
  await small.click("#playBtn");
  await small.fill("#plName", "Small");
  await small.click("#plDone");
  await small.waitForFunction(() => __pizza.screen === "kitchen");
  let bad = await fit(small);
  ok(!bad.length, "kitchen buttons fit: " + bad.join(", "));
  await shot(small, "10-1366-kitchen");
  await solveOn(small);
  await small.click("#continueBtn");
  await small.waitForFunction(() => __pizza.screen === "kitchen");
  await solveOn(small);
  await small.click("#continueBtn");
  await small.waitForFunction(() => __pizza.screen === "flight");
  bad = await fit(small);
  ok(!bad.length, "flight buttons fit: " + bad.join(", "));
  await small.evaluate(() => __pizza.pump(1600));
  await shot(small, "13-1366-flight");
  await small.goto(pageUrl("?debug&test=fraction"));
  await small.waitForFunction(() => __pizza.order && __pizza.order.skill === "fraction-slices");
  bad = await fit(small);
  ok(!bad.length, "slice buttons fit: " + bad.join(", "));
  await shot(small, "11-1366-fraction");
  await small.goto(pageUrl("?debug&test=shop"));
  await small.waitForFunction(() => __pizza.screen === "shop");
  bad = await fit(small);
  ok(!bad.length, "shop buttons fit: " + bad.join(", "));
  await shot(small, "12-1366-shop");

  ok(!errors.length, "no page errors: " + errors.join(" | "));
  console.log("play: PASS");
} catch (e) {
  console.log("play: FAIL at " + step, e.message, errors.length ? "\npage errors: " + errors.join(" | ") : "");
  process.exitCode = 1;
} finally {
  await browser.close();
}

async function solveOn(page) {
  const order = await page.evaluate(() => __pizza.order);
  if (order.skill === "fraction-slices") {
    for (let i = 0; i < order.pepperoni; i++) await page.click("#slice" + i);
  } else {
    await page.fill("#countInput", String(order.answer));
    await page.click("#top-" + order.topping);
  }
  await page.click("#bakeBtn");
  await page.waitForFunction(() => __pizza.screen === "result");
}
