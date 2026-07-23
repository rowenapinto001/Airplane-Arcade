const GAME_CATALOG_ITEMS = [
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
    id: "sky-hangman",
    name: "Sky Hangman",
    shortName: "Hangman",
    description: "Guess the hidden word before airport problems delay the flight. Play solo or challenge a friend.",
    longDescription:
      "A fully offline, family-friendly word guessing game with solo and local two-player modes, airport-themed non-violent mistake scenes, 15 word categories, hints, Classic, Quick Word, Phrase, Category Challenge, Survival mode, scoring, streaks, and local statistics.",
    image: "../assets/games/sky-hangman.svg",
    accent: "#46c7d9",
    modes: ["solo", "two"],
    difficulties: ["easy", "normal", "hard"],
    badges: ["Word Game", "Family Friendly"],
    defaultDifficulty: "normal",
    hasPlayerSetup: true,
    instructions: [
      "Guess the hidden word one letter at a time with the on-screen keyboard or physical keyboard.",
      "Correct letters reveal every matching position. Incorrect letters add cute airport problems around the airplane.",
      "Use Category, Meaning, and Reveal Letter hints without revealing the whole word.",
      "Two Player mode lets one player enter a secret word, pass the laptop, and swap roles fairly.",
      "Classic, Quick Word, Phrase Mode, Category Challenge, and Survival Mode all work offline.",
    ],
    controls: {
      solo: ["Letters: A-Z keyboard or click letter buttons", "Hint: H", "Restart confirmation: R", "Pause: Escape"],
      two: ["Shared keyboard or mouse", "Secret words are typed locally and cleared after matches", "Pause: Escape"],
    },
  },
  {
    id: "fish-grab-frenzy",
    name: "Fish Grab Frenzy",
    shortName: "Fish Grab",
    description: "React fast with four cartoon cats, grab safe fish, and avoid Bomb Fish.",
    longDescription:
      "A fully offline reaction game with exactly four cartoon cats around a table, solo and local two-player modes, fair random fish timing, Bomb Fish traps, computer opponents, first-to-five scoring, and locally saved reaction stats.",
    image: "../assets/games/fish-grab-frenzy.svg",
    accent: "#2fb36d",
    modes: ["solo", "two"],
    difficulties: ["easy", "normal", "hard"],
    badges: ["Reaction", "Computer Opponents", "First to 5"],
    defaultDifficulty: "normal",
    hasPlayerSetup: true,
    instructions: [
      "Each match has exactly four cats around the table.",
      "Wait for the fish to appear. Grabbing too early locks that cat out for the round.",
      "Normal Fish give +1. Bomb Fish give -1, and scores can go below zero.",
      "The first cat to 5 points wins. There is no match timer.",
      "Solo mode uses one human cat and three local computer cats. Two-player mode uses two human cats and two computer cats.",
    ],
    controls: {
      solo: ["Grab: Space or Enter", "Pause: Escape"],
      two: ["Player 1: A or Space", "Player 2: L or Enter", "Pause: Escape"],
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
];

const GAME_ORDER = [
  "basketball",
  "cloud-ridge-rally",
  "cake-maker",
  "football",
  "fish-grab-frenzy",
  "sky-ludo",
  "memory",
  "archery",
  "sky-hangman",
  "runway-circuit",
];

export const GAME_CATALOG = GAME_ORDER.map((gameId) => GAME_CATALOG_ITEMS.find((game) => game.id === gameId)).filter(Boolean);

export const COMING_SOON = [
  {
    id: "puzzle",
    name: "Cargo Puzzle",
    description: "A compact packing puzzle planned for the next hangar.",
    image: "../assets/games/puzzle.svg",
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
  "sky-hangman": {
    easy: "Short common words, 8 mistakes, category visible, and one free meaning hint.",
    normal: "Moderate words, 6 mistakes, category visible, and hints reduce the final score.",
    hard: "Longer words, 5 mistakes, hidden category until hinted, and Reveal Letter can cost a mistake.",
  },
  "fish-grab-frenzy": {
    easy: "Computer cats react slowly, miss more safe fish, and make more Bomb Fish mistakes.",
    normal: "Computer cats react at a balanced pace with fair Bomb Fish awareness.",
    hard: "Computer cats react quickly, avoid most Bomb Fish, and punish slow grabs.",
  },
  archery: {
    easy: "Large target, stable crosshair, no wind, and a very gentle aim challenge.",
    normal: "Standard target size with smooth crosshair sway and light aiming pressure.",
    hard: "Smaller target, stronger fair sway, and light wind that nudges the shot.",
  },
  "cake-maker": {
    normal: "Creative sandbox mode with no timer, score, winner, or loser.",
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
