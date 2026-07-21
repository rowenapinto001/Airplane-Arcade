export const GAME_CATALOG = [
  {
    id: "football",
    name: "Simple Football",
    shortName: "Football",
    description: "Tap to sprint, bump the ball, and score first in a funny one-button match.",
    longDescription:
      "A fast tap-based football match with dummy players, simple collisions, countdowns, goal celebrations, and a fair solo opponent.",
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
    id: "sumo",
    name: "Sumo",
    shortName: "Sumo",
    description: "Push your opponent out of the circle. First to 5 points wins.",
    longDescription:
      "Push your opponent out of the circle in a funny circular-ring match with rounded dummy wrestlers, momentum, short charges, knockouts, countdowns, and first-to-five scoring.",
    image: "../assets/games/sumo.svg",
    accent: "#de5b8c",
    modes: ["solo", "two"],
    difficulties: ["easy", "normal", "hard"],
    defaultDifficulty: "normal",
    hasPlayerSetup: true,
    instructions: [
      "Move around the circular ring and face your opponent.",
      "Use your push key for a short forward charge.",
      "Push the opponent completely outside the ring to score 1 point.",
      "There is no timer. First to 5 points wins the match.",
    ],
    controls: {
      solo: ["Player 1: WASD to move, Space to push", "Pause: P or Escape"],
      two: ["Player 1: WASD and Space", "Player 2: Arrow keys and Enter", "Pause: P or Escape"],
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
    id: "cloud-crew-clash",
    name: "Cloud Crew Clash",
    shortName: "Cloud Crew",
    description: "Launch your crew, choose strategic sky routes, capture stations, and defeat the computer rival.",
    longDescription:
      "A solo sky-terminal crowd strategy game with a rotating Crew Launcher, route choices, boost portals, missions, crew types, and a fair computer rival.",
    image: "../assets/games/cloud-crew-clash.svg",
    accent: "#2aa7c9",
    modes: ["solo"],
    difficulties: ["easy", "normal", "hard"],
    badges: ["Strategy", "Campaign"],
    defaultDifficulty: "normal",
    hasPlayerSetup: false,
    instructions: [
      "Aim the Crew Launcher toward a route, then hold launch to send tiny crew across the sky terminal.",
      "Capture stations, collect Sky Energy, and use portals to shift the size, speed, or protection of your crew.",
      "Use Rally Beacon, Cloud Shield, and Turbo Launch to redirect, protect, and surge at the right moment.",
      "Complete campaign missions to earn stars, Flight Badges, crew types, and permanent upgrades.",
    ],
    controls: {
      solo: ["Mouse: aim and hold to launch", "Keyboard: A/D or Arrow keys aim, Space launches", "Abilities: 1, 2, 3", "Pause: Escape"],
    },
  },
];

export const COMING_SOON = [
  {
    id: "racing",
    name: "Runway Rally",
    description: "A tiny racing lane challenge planned for a future update.",
    image: "../assets/games/racing.svg",
  },
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
  sumo: {
    easy: "Slower computer reactions, weaker push timing, and more forgiving edge pressure.",
    normal: "Balanced movement, push force, cooldowns, and centre-seeking computer play.",
    hard: "Sharper positioning, faster reactions, better edge recovery, and strategic pushes.",
  },
  archery: {
    easy: "Large target, stable crosshair, no wind, and a very gentle aim challenge.",
    normal: "Standard target size with smooth crosshair sway and light aiming pressure.",
    hard: "Smaller target, stronger fair sway, and light wind that nudges the shot.",
  },
  "cake-maker": {
    normal: "Creative sandbox mode with no timer, score, winner, or loser.",
  },
  "cloud-crew-clash": {
    easy: "Slower rival decisions, less frequent abilities, gentler routes, and more time to learn crowd control.",
    normal: "Balanced rival route choices, fair ability use, useful upgrades, and steady mission pressure.",
    hard: "Sharper route switching, better defense timing, smarter station pressure, and fully visible fair upgrades.",
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
