# Simmer & Serve

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/yandreload/cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/yandreload/cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

A frantic little cooking game for the [make.fun "Make the best cooking game" bounty](https://make.fun/bounty/best-cooking-game-20261125-0137). It runs in a desktop browser from static files, offline, with no network request.

## How to play

You are the only chef in a small kitchen. Tickets arrive on the order board — cook what they ask for before their patience runs out.

- **Move** with WASD or arrow keys, or click anywhere to walk there.
- **E or Space** to interact: pick up ingredients from the crates, chop them on the board (hold E), cook patties on the stove, take a plate, build the dish on the plating counter, and serve it at the window.
- **P** pause, **M** mute, **R** restart the shift.

Recipes: Garden Salad (chopped lettuce + chopped tomato), Cheesy Burger (bun + cooked patty + cheese), Deluxe Burger (day 2+), Double Melt (day 3). Serve fast to build a combo — three strikes from unserved orders and the shift is over. Each day lasts 150 seconds and gets busier; earn enough coins for up to 3 stars.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

## Layout

- `game/index.html` — the page that hosts the game.
- `game/src/config.js` — tuning, recipes, kitchen layout, colours.
- `game/src/random.js` — seeded random numbers (deterministic screenshots).
- `game/src/audio.js` — all sound and music, synthesized live with WebAudio.
- `game/src/input.js` — keyboard and pointer input.
- `game/src/kitchen.js` — the world: chef, stations, orders, plates, score.
- `game/src/autopilot.js` — a scripted pair of hands that plays the real game.
- `game/src/render.js` — everything drawn on the canvas.
- `game/src/shots.js` — the staged screenshot scenes (`?shot=start|assembly|serve|end`).
- `game/src/main.js` — boot and the game loop.
- `main.ts` — the entrypoint that hands the game in.
- `screenshots/` — 3–4 real renders of the game's own code.

## License

MIT — see [LICENSE](LICENSE).
