# Airplane Arcade

Airplane Arcade is a Manifest V3 Chrome extension containing a small offline mini-game arcade. It includes a compact popup launcher and a full arcade page with four playable games:

- Simple Football
- Basket & Ball
- Memory Match
- Sumo

The extension uses vanilla HTML, CSS, JavaScript, Canvas, local SVG art, local PNG icons, local WAV sounds, and `chrome.storage.local`.

## Folder Structure

```text
/manifest.json
/popup/
  popup.html
  popup.css
  popup.js
/arcade/
  index.html
  arcade.css
  arcade.js
/games/
  /football/
  /basketball/
  /memory/
  /sumo/
/shared/
  audio.js
  controls.js
  game-state.js
  navigation.js
  storage.js
/assets/
  /icons/
  /characters/
  /games/
  /sounds/
```

## Load The Extension

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder: `Airplane-Arcade`.
5. Click the extension icon to open the popup, or use **Open Arcade** to launch the full page.

## Controls

Simple Football:
- Player 1: `A` or `Space`
- Player 2: `L` or `Enter`
- Pause: `P` or `Escape`
- Mouse: click the left or right side of the field to tap that player

Basket & Ball:
- Player 1: hold and release `A` or `Space`
- Player 2: hold and release `L` or `Enter`
- Pause: `P` or `Escape`
- Mouse: press and release the court or the action button

Memory Match:
- Mouse: click cards
- Keyboard: Arrow keys move focus
- Reveal: `Enter` or `Space`
- Pause: `P` or `Escape`

Sumo:
- Player 1: `W`, `A`, `S`, `D` to move; `Space` to push
- Player 2: Arrow keys to move; `Enter` to push
- Pause: `P` or `Escape`
- Mouse: use the on-screen push buttons

Controls can be changed from **Settings**.

## Difficulty Levels

Each game supports **Easy**, **Normal**, and **Hard** from the game setup screen.

- Easy uses more forgiving rules, such as smaller Memory boards, wider basketball rims, longer timers, bigger football goals, larger Sumo rings, and slower AI.
- Normal is the balanced default.
- Hard increases pressure with larger Memory boards, tighter basketball timing, wind, shorter timers, smaller football goals, tighter Sumo rings, and stronger AI.

## Offline Operation

All code, artwork, icons, and sounds are local files inside the extension. There are no APIs, CDNs, external fonts, accounts, analytics, ads, iframes, or internet-loaded assets. Progress and settings are saved with `chrome.storage.local`, so no sign-in is required.

## Add Another Game

1. Add a folder under `/games/new-game/`.
2. Export a factory with the same lifecycle methods used by the existing games:
   - `initializeGame()`
   - `startGame()`
   - `pauseGame()`
   - `resumeGame()`
   - `restartGame()`
   - `destroyGame()`
   - `saveResult()`
3. Add metadata to `/shared/game-state.js`.
4. Import the factory in `/arcade/arcade.js` and add it to `GAME_FACTORIES`.
5. Store results through `recordGameResult()` in `/shared/storage.js`.

## Known Limitations

- Music is a simple local loop and only starts after a user action.
- The games are designed for laptop and desktop screens first.
- Solo AI in Simple Football is intentionally lightweight and playful rather than realistic.
