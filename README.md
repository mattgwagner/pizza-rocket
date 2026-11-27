# Pizza Rocket

A cat crew runs a pizza kitchen on a space station and flies the orders out to planets. The order board is a picture graph or a bar graph. Reading it is the job.

Brief: mattgwagner/pizza-rocket#2.

## Run it

- `bun server.ts` (or `npm start`) serves it on http://127.0.0.1:4861
- `npm run check` runs both gates. If Chromium closes itself on launch, run `TMPDIR=$HOME/.cache/pw-tmp npm run check`.
- Deploy: `npx -y wrangler@4 deploy`, then compare `sha256sum public/index.html` with `curl -s https://pizza-rocket.mattgwagner.workers.dev | sha256sum`.

## How it's built

Everything is `public/index.html`: Canvas 2D and Web Audio, no image or audio files, no requests off the page. Music is off until the Music button is pressed.

- **Kitchen.** Each ticket is one question: how many for one row, how many more one row wants than another, or how many in all. The board is either a picture graph (a key of 1, 2, 4, 5, or 10, and later a half pizza) or a bar graph whose side numbers jump by 2, 5, or 10, sometimes stopping between the lines. A few tickets are one pizza split into 8 slices. The count is the − / + buttons or the number box, then a topping. Bake. Too many and Crumbs eats the extras. Too few, or the wrong topping, and Waffles says what to look at, with one retry. Nothing on screen names a school topic. The topic stays on the order as `skill` for tuning.
- **Flight.** Every 2 good orders, then every 3, Captain Biscuit flies the box. Up and Down buttons (or the arrow keys, or W and S) steer for 24 seconds. Three bumps drop a pizza and cost a few tips. The run ends on the alien's planet.
- **Planets.** Zorp is open first. A new planet opens every 2 deliveries: Glimmy, then Bonk, then The Fuzzles.
- **Hat Rack.** Eight hats and stickers. Tips and hats are saved per player in `localStorage` (`pizzarocket.players`, `pizzarocket.v1.<id>`), each read and write in try/catch. `?test` uses `pizzarocket.test.*` instead.
- **Who am I?** The title screen asks for a name the first time. Each player has their own tips, hats, and tickets.
- **Hooks.** `?debug` or `?test` sets `window.__pizza` (screen, order, `pump(ms)`, `debugOrder`). `?test=title|who|kitchen|crumbs|fraction|bar|flight|delivery|shop` opens that screen.

## Tests

- `e2e/fuzz.mjs`: builds every kind of ticket and checks the pictured count matches the answer, then clicks every button from the title through the kitchen, a flight, and the hat rack. No console errors.
- `e2e/play.mjs`: three orders and one scripted flight at 1920×1080, a reload that keeps the tips, then the same screens at 1366×768 with every button inside the window. Screenshots land in `shots/`.
