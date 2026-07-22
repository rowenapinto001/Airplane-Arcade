export const GAME_CATALOG = [
  {
    id: "football",
    name: "Simple Football",
    shortName: "Football",
    description: "Tap to sprint, bump the ball, and score first in a funny one-button match.",
    longDescription:
      "A fast tap-based football match with dummy players, simple collisions, countdowns, goal celebrations, penalties for tied matches, and a fair solo opponent.",
    image: "../assets/games/football.svg",
    accent: "#2fb36d",
    modes: ["solo", "two"],
    difficulties: ["easy", "normal", "hard"],
    defaultDifficulty: "normal",
    defaultTarget: 3,
    hasPlayerSetup: true,
    instructions: [
      "Tap your action key repeatedly to chase the ball.",
      "Tap near the ball to kick it toward the other goal.",
      "First to 3 goals wins. The match timer changes with difficulty.",
      "If full time ends level, a penalty shootout begins with a moving goalkeeper.",
      "Solo mode adds a computer dummy whose reaction speed follows the difficulty.",
    ],
    controls: {
      solo: ["Player 1: A or Space", "Pause: P or Escape"],
      two: ["Player 1: A or Space", "Player 2: L or Enter", "Pause: P or Escape"],
    },
  },
  {
    id: "basketball",
    name: "Basket & Ball",
    shortName: "Basket",
    description: "Hold, aim, and release at the right moment to sink clean shots.",
    longDescription:
      "A timing and power basketball challenge with moving aim, gravity, ball trails, turn-based two-player play, and score animations.",
    image: "../assets/games/basketball.svg",
    accent: "#ff8a3d",
    modes: ["solo", "two"],
    difficulties: ["easy", "normal", "hard"],
    challenges: ["rush", "target"],
    defaultDifficulty: "normal",
    hasPlayerSetup: true,
    instructions: [
      "Hold your action key to fill the power meter.",
      "Release while the angle indicator points toward the basket.",
      "Clean timing scores 2 points. Normal baskets score 1 point.",
      "Two-player mode alternates turns for 5 throws each.",
    ],
    controls: {
      solo: ["Player 1: hold and release A or Space", "Mouse: press and release the court"],
      two: ["Player 1: hold and release A or Space", "Player 2: hold and release L or Enter"],
    },
  },
  {
    id: "memory",
    name: "Memory Match",
    shortName: "Memory",
    description: "Flip cards, find pairs, and outremember the clock or your friend.",
    longDescription:
      "A card-matching game with solo star ratings, two-player turns, keyboard navigation, mouse controls, and match history.",
    image: "../assets/games/memory.svg",
    accent: "#7f59e8",
    modes: ["solo", "two"],
    difficulties: ["easy", "normal", "hard"],
    defaultDifficulty: "normal",
    hasPlayerSetup: true,
    instructions: [
      "Reveal two cards and look for matching symbols.",
      "A match stays open and scores a point.",
      "In two-player mode, a correct match earns another turn.",
      "Use the mouse or move focus with Arrow keys and reveal with Enter or Space.",
    ],
    controls: {
      solo: ["Mouse: click cards", "Keyboard: Arrow keys, Enter or Space"],
      two: ["Shared mouse or keyboard", "Keyboard: Arrow keys, Enter or Space"],
    },
  },
  {
    id: "sky-ludo",
    name: "Sky Ludo",
    shortName: "Ludo",
    description: "Roll the dice, move your travel tokens safely home, and play solo against the computer or with a friend.",
    longDescription:
      "An original offline airport-themed Ludo board game with Solo Duel, Solo Classic, local Two Player mode, fair dice, safe spaces, captures, blocks, exact home rolls, computer opponents, autosaves, and local statistics.",
    image: "../assets/games/sky-ludo.svg",
    accent: "#38aee2",
    modes: ["solo", "two"],
    difficulties: ["easy", "normal", "hard"],
    badges: ["Board Game", "Computer Opponents"],
    defaultDifficulty: "normal",
    hasPlayerSetup: true,
    instructions: [
      "Roll a 6 to leave the airport terminal and move a token onto its starting square.",
      "Move tokens around the runway path, use safe star spaces, form blocks, and capture on non-safe squares.",
      "Use exact rolls to enter the coloured home path and finish all tokens in the central Sky Home.",
      "Solo modes add fair computer opponents. Two Player mode shares the same mouse or keyboard on one laptop.",
      "Matches autosave locally after completed moves, captures, home arrivals, and turn changes.",
    ],
    controls: {
      solo: ["Roll dice: Space or Enter", "Select token: mouse or Arrow keys then Enter", "Pause: Escape"],
      two: ["Shared mouse or keyboard", "Roll dice: Space or Enter", "Select token: Arrow keys then Enter", "Pause: Escape"],
    },
  },
  {
    id: "archery",
    name: "Archery",
    shortName: "Archery",
    description: "Aim for the centre, score across three rounds, and finish with the highest total.",
    longDescription:
      "A colourful target range with a fictional launcher, moving crosshair challenge, four scoring rings, and exactly three turn-based rounds.",
    image: "../assets/games/archery.svg",
    accent: "#46c7d9",
    modes: ["solo", "two"],
    difficulties: ["easy", "normal", "hard"],
    badges: ["Three Rounds"],
    defaultDifficulty: "normal",
    hasPlayerSetup: true,
    instructions: [
      "Aim at the circular target board and fire one shot per turn.",
      "Score 25, 50, 75, or 100 points based on distance from the centre.",
      "A miss outside the target scores 0. Boundary hits award the higher ring value.",
      "Each player gets exactly three shots. Equal two-player totals make both players winners.",
    ],
    controls: {
      solo: ["Mouse: move and click to shoot", "Keyboard: Arrow keys to aim, Space or Enter to shoot", "Pause: P or Escape"],
      two: ["Shared mouse or keyboard", "Arrow keys aim, Space or Enter shoots", "Pause: P or Escape"],
    },
  },
  {
    id: "cake-maker",
    name: "Cake Maker",
    shortName: "Cake",
    description: "Design your own cake, add a personal message, and start an optional birthday celebration.",
    longDescription:
      "A relaxing creative cake studio with live preview, layer-by-layer flavours, toppings, candles, saved cakes, and optional birthday party mode.",
    image: "../assets/games/cake-maker.svg",
    accent: "#ef5b63",
    modes: ["solo"],
    difficulties: ["normal"],
    badges: ["Creative", "Party Mode"],
    defaultDifficulty: "normal",
    hasPlayerSetup: false,
    instructions: [
      "Choose flavours, shape, layers, icing, decorations, candles, and cake writing.",
      "Use the live preview to drag toppings and candles while you edit.",
      "Save finished cakes locally in My Cakes and open, edit, duplicate, rename, or delete them later.",
      "Birthday Party Mode is optional and starts only when you choose it.",
    ],
    controls: {
      solo: ["Mouse: choose tools and drag decorations", "Keyboard: Tab through controls, Z to undo", "Pause: Escape"],
    },
  },
  {
    id: "pyramid-smash",
    name: "Pyramid Smash",
    shortName: "Pyramid",
    description: "Launch balls, smash cargo pyramids, earn stars, and unlock a 25-level physics campaign.",
    longDescription:
      "A fully offline cargo-pyramid physics game with solo campaign play, local two-player turns, seven ball types, special cargo boxes, star ratings, Flight Coins, and Endless Structure Mode after the finale.",
    image: "../assets/games/pyramid-smash.svg",
    accent: "#ff8a3d",
    modes: ["solo", "two"],
    difficulties: ["normal"],
    badges: ["Physics", "25 Levels"],
    defaultDifficulty: "normal",
    hasPlayerSetup: true,
    instructions: [
      "Aim the launcher and throw limited balls at the cargo pyramid.",
      "Clear every required box by breaking it or knocking it off the platforms.",
      "Use standard, heavy, bouncy, sticky, split, air, and precision balls strategically.",
      "Earn up to three stars per level, unlock all 25 stages, and finish Level 25 to open Endless Structure Mode.",
      "Two-player mode gives each local player one full turn on the same level.",
    ],
    controls: {
      solo: ["Mouse: drag from launcher and release", "Keyboard: Arrow keys aim, Space throws", "Next Ball: N", "Pause: Escape"],
      two: ["Shared mouse or keyboard", "Arrow keys aim, Space throws", "Next Ball: N", "Pause: Escape"],
    },
  },
  {
    id: "runway-circuit",
    name: "Runway Circuit",
    shortName: "Circuit",
    description: "Race three-lap airport circuits, upgrade cars, beat five AI rivals, and unlock time trials.",
    longDescription:
      "A fully offline top-down car-racing campaign with five airport circuits, exactly three laps per race, five local AI opponents, car selection, Flight Coin upgrades, checkpoints, obstacles, time trials, and ghost records.",
    image: "../assets/games/runway-circuit.svg",
    accent: "#38aee2",
    modes: ["solo"],
    difficulties: ["easy", "normal", "hard"],
    badges: ["Racing", "Computer Opponents", "5 Levels", "3 Laps"],
    defaultDifficulty: "normal",
    hasPlayerSetup: false,
    instructions: [
      "Choose Easy, Normal, or Hard, then race one of five airport circuits against five local computer-controlled cars.",
      "Every race is exactly three laps and each lap counts only after checkpoints are crossed in order.",
      "Use boost, handbrake drifts, road grip, and clean overtakes while avoiding cones, carts, gates, oil, wind, and barriers.",
      "Earn stars and Flight Coins to unlock levels, upgrade cars, and open Time Trial with local ghost cars after Level 5.",
    ],
    controls: {
      solo: [
        "Accelerate: W or Up Arrow",
        "Brake / reverse: S or Down Arrow",
        "Steer: A/D or Left/Right Arrow",
        "Handbrake / drift: Space",
        "Boost: Shift",
        "Reset to checkpoint: R",
        "Pause: Escape",
      ],
    },
  },
  {
    id: "cloud-ridge-rally",
    name: "Cloud Ridge Rally",
    shortName: "Rally",
    description: "Drive across wild sky roads, manage fuel, perform stunts, and climb as far as possible.",
    longDescription:
      "An original solo physics driving game with uneven cloud roads, fuel management, Flight Coins, checkpoints, campaign levels, endless journeys, vehicle upgrades, and locally saved progress.",
    image: "../assets/games/cloud-ridge-rally.svg",
    accent: "#38aee2",
    modes: ["solo"],
    difficulties: ["easy", "normal", "hard"],
    badges: ["Driving", "Physics"],
    defaultDifficulty: "normal",
    hasPlayerSetup: false,
    instructions: [
      "Drive from left to right across hills, valleys, bridges, ramps, rocks, and cloud roads.",
      "Manage fuel by collecting energy pickups and coasting when possible.",
      "Collect Flight Coins, Boarding Stars, Lost Luggage Tokens, and Golden Propellers.",
      "Upgrade vehicles in the garage and unlock campaign levels sequentially.",
      "Jump from the ground with W or Up Arrow, then balance in the air with W/S or Up/Down Arrow.",
      "Use Space for the selected special ability and R to restart a run.",
    ],
    controls: {
      solo: [
        "Accelerate: D or Right Arrow",
        "Brake / reverse: A or Left Arrow",
        "Jump: W or Up Arrow",
        "Air balance: W/S or Up/Down Arrow",
        "Ability: Space",
        "Restart: R",
        "Pause: Escape",
      ],
    },
  },
  {
    id: "red-eye-run",
    name: "Red-Eye Run",
    shortName: "Red-Eye",
    description: "Run while the watchkeeper looks away, freeze when its eyes turn red, and reach the finish safely.",
    longDescription:
      "An original solo stop-and-go survival race with 15 local dummy opponents, a friendly airport watchkeeper robot, momentum-based movement, fair red-light detection, qualification and first-place modes, and locally saved rewards.",
    image: "../assets/games/red-eye-run.svg",
    accent: "#ef5b63",
    modes: ["solo"],
    difficulties: ["easy", "normal", "hard"],
    badges: ["Computer Opponents", "Stop-and-Go"],
    defaultDifficulty: "normal",
    hasPlayerSetup: false,
    instructions: [
      "Race 15 computer-controlled dummy contestants toward the boarding arch.",
      "Run during green, slow down during warning, and freeze completely when the watchkeeper's eyes turn red.",
      "Momentum matters: sprinting and diving are useful, but sliding during red can trigger detection.",
      "Qualification Race accepts the first 8 finishers. First Place Challenge only rewards the first finisher.",
      "Results, Freeze Stars, cosmetics, difficulty, countdown, and controls are saved locally.",
    ],
    controls: {
      solo: [
        "Move: W/A/S/D or Arrow keys",
        "Sprint: Shift",
        "Dive and freeze: Space",
        "Pause: Escape",
      ],
    },
  },
];

export const COMING_SOON = [
  {
    id: "puzzle",
    name: "Cargo Puzzle",
    description: "A compact packing puzzle planned for the next hangar.",
    image: "../assets/games/puzzle.svg",
  },
  {
    id: "reaction",
    name: "Signal Snap",
    description: "A reaction-speed game with lights, tones, and close calls.",
    image: "../assets/games/reaction.svg",
  },
  {
    id: "platform",
    name: "Cloud Hopper",
    description: "A platform game concept with springy skies and silly jumps.",
    image: "../assets/games/platform.svg",
  },
];

export const MODE_LABELS = {
  solo: "Solo",
  two: "Two Players",
};

export const DIFFICULTY_LABELS = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

export const DIFFICULTY_DETAILS = {
  football: {
    easy: "Bigger goals, longer match, stronger player taps, and a slower computer.",
    normal: "Balanced goals, timing, ball speed, and computer reactions.",
    hard: "Smaller goals, shorter match, tighter kicks, faster ball, and a sharper computer.",
  },
  basketball: {
    easy: "Wide rim, slow aim, no wind, more time, and more limited-ball attempts.",
    normal: "Moving basket, balanced aim speed, standard time, and standard attempts.",
    hard: "Narrow rim, faster aim, moving basket, wind, less time, and fewer chances.",
  },
  memory: {
    easy: "4 x 3 board, longer mismatch preview, and more forgiving star goals.",
    normal: "4 x 4 board with balanced preview timing and star goals.",
    hard: "6 x 4 board, shorter mismatch preview, and stricter star goals.",
  },
  "sky-ludo": {
    easy: "Computer players prioritise releasing tokens and simple moves, with occasional missed captures.",
    normal: "Computer players balance releasing, advancing, capturing, safe spaces, blocks, and home progress.",
    hard: "Computer players score legal moves for captures, safety, blocks, risk, and efficient exact-home progress.",
  },
  archery: {
    easy: "Large target, stable crosshair, no wind, and a very gentle aim challenge.",
    normal: "Standard target size with smooth crosshair sway and light aiming pressure.",
    hard: "Smaller target, stronger fair sway, and light wind that nudges the shot.",
  },
  "cake-maker": {
    normal: "Creative sandbox mode with no timer, score, winner, or loser.",
  },
  "pyramid-smash": {
    normal: "A handcrafted 25-level physics campaign with limited balls, local turns, saved stars, and fair offline simulation.",
  },
  "runway-circuit": {
    easy: "Lower AI pace, more steering assist, gentler obstacle timing, and forgiving checkpoint recovery.",
    normal: "Balanced car speed, AI pressure, checkpoint spacing, boost rewards, and obstacle timing.",
    hard: "Faster fair AI, reduced steering assist, tighter recovery, quicker obstacles, and stronger penalty for mistakes.",
  },
  "cloud-ridge-rally": {
    easy: "Longer rolling routes with wider recovery roads, more fuel, and forgiving crash checks.",
    normal: "Long-distance routes with paced checkpoints, spaced obstacles, fuel planning, and varied terrain sections.",
    hard: "Very long sky roads with stricter fuel planning, steeper sections, and fair but stronger obstacle pressure.",
  },
  "red-eye-run": {
    easy: "Longer green phases, slower watchkeeper turns, forgiving movement tolerance, and more dummy mistakes.",
    normal: "Balanced green and red phases, fair momentum detection, and believable computer opponents.",
    hard: "Less predictable green phases, faster turns, stricter fair detection, and skilled computer opponents.",
  },
};

export const CHALLENGE_LABELS = {
  rush: "Timed Rush",
  target: "Limited Balls",
};

export function getGame(gameId) {
  return GAME_CATALOG.find((game) => game.id === gameId) || null;
}

export function getGameName(gameId) {
  return getGame(gameId)?.name || "Unknown Game";
}
