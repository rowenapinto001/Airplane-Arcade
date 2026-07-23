# Airplane Arcade

Airplane Arcade is a Manifest V3 Chrome extension containing a small offline mini-game arcade. It includes a compact popup launcher and a full arcade page with ten playable games:

- Basket & Ball
- Cloud Ridge Rally
- Cake Maker
- Simple Football
- Fish Grab Frenzy
- Sky Ludo
- Memory Match
- Archery
- Sky Hangman
- Runway Circuit

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
  /sky-ludo/
  /sky-hangman/
  /fish-grab-frenzy/
  /archery/
  /cake-maker/
  /runway-circuit/
  /cloud-ridge-rally/
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

Sky Ludo:
- Roll dice: `Space` or `Enter`
- Select token: mouse, or Arrow keys then `Enter`
- Pause: `Escape`
- Solo modes use fair local computer opponents; Two Player mode shares one laptop

Sky Hangman:
- Guess letters: `A` through `Z` or click the on-screen keyboard
- Meaning hint: `H`
- Restart confirmation: `R`
- Continue from results: `Enter`
- Pause: `Escape`
- Two Player mode uses local secret-word entry and clears secret words after the match

Fish Grab Frenzy:
- Solo grab: `Space` or `Enter`
- Player 1 grab: `A` or `Space`
- Player 2 grab: `L` or `Enter`
- Pause: `Escape`
- Normal Fish score +1, Bomb Fish score -1, and the first cat to 5 points wins

Archery:
- Mouse: move to aim and click to shoot
- Keyboard: Arrow keys move the crosshair
- Shoot: `Space` or `Enter`
- Pause: `P` or `Escape`

Cake Maker:
- Mouse: choose cake options and drag toppings or candles
- Undo: `Z`
- Save: `S`
- Party Mode: `B`
- Pause: `Escape`

Runway Circuit:
- Accelerate: `W` or Up Arrow
- Brake / reverse: `S` or Down Arrow
- Steer: `A` / `D` or Left / Right Arrow
- Handbrake / drift: `Space`
- Boost: `Shift`
- Reset to checkpoint: `R`
- Pause: `Escape`

Controls can be changed from **Settings**.

## Difficulty Levels

Simple Football, Basket & Ball, Memory Match, Sky Ludo, Sky Hangman, Fish Grab Frenzy, Archery, Runway Circuit, and Cloud Ridge Rally support **Easy**, **Normal**, and **Hard** from the game setup screen. Cake Maker is a creative sandbox with no timer, score, winner, or loser.

- Easy uses more forgiving rules, such as smaller Memory boards, wider basketball rims, longer timers, bigger football goals, simpler Sky Ludo AI, short Sky Hangman words with more lives, slower Fish Grab Frenzy computer cats, larger Archery targets, slower Runway Circuit AI cars, and easier Rally routes.
- Normal is the balanced default.
- Hard increases pressure with larger Memory boards, tighter basketball timing, wind, shorter timers, smaller football goals, stronger Sky Ludo move evaluation, longer Sky Hangman words with fewer lives, faster Fish Grab Frenzy computer cats, smaller Archery targets, faster Runway Circuit rivals, and tougher Rally routes.

## Offline Operation

All code, artwork, icons, Cake Maker assets, Sky Hangman assets, Fish Grab Frenzy assets, Sky Ludo assets, Rally assets, Runway Circuit assets, party music, and sounds are local files inside the extension. There are no APIs, CDNs, external fonts, accounts, analytics, ads, iframes, or internet-loaded assets. Progress, settings, saved cakes, saved Ludo matches, word-game statistics, Fish Grab Frenzy reaction records, race records, and ghost data are saved with `chrome.storage.local`, so no sign-in is required.

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
