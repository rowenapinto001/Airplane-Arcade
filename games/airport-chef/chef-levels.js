export const DIFFICULTY = {
  easy: {
    id: "easy",
    label: "Easy",
    patienceMultiplier: 1.28,
    spawnMultiplier: 1.18,
    goalMultiplier: 0.82,
    cookMultiplier: 1.08,
    scoreMultiplier: 0.88,
    tipMultiplier: 0.9,
    mistakePenalty: 0.65,
  },
  normal: {
    id: "normal",
    label: "Normal",
    patienceMultiplier: 1,
    spawnMultiplier: 1,
    goalMultiplier: 1,
    cookMultiplier: 1,
    scoreMultiplier: 1,
    tipMultiplier: 1,
    mistakePenalty: 1,
  },
  hard: {
    id: "hard",
    label: "Hard",
    patienceMultiplier: 0.78,
    spawnMultiplier: 0.82,
    goalMultiplier: 1.18,
    cookMultiplier: 0.92,
    scoreMultiplier: 1.16,
    tipMultiplier: 1.15,
    mistakePenalty: 1.25,
  },
};

export const KITCHEN_THEMES = {
  "runway-cafe": {
    id: "runway-cafe",
    name: "Runway Cafe",
    unlockLevel: 1,
    floor: "#f3d7a4",
    floorLine: "#e5bf7d",
    counter: "#456c86",
    counterTop: "#d8ecf4",
    wall: "#aee4ef",
    accent: "#f47b43",
    shadow: "rgba(23, 50, 68, 0.22)",
  },
  "cloud-kitchen": {
    id: "cloud-kitchen",
    name: "Cloud Kitchen",
    unlockLevel: 5,
    floor: "#c9e9f2",
    floorLine: "#9bd5e6",
    counter: "#526caa",
    counterTop: "#edf6ff",
    wall: "#d7f7ff",
    accent: "#5cb4df",
    shadow: "rgba(35, 63, 100, 0.2)",
  },
  "night-terminal": {
    id: "night-terminal",
    name: "Night Terminal",
    unlockLevel: 9,
    floor: "#39435e",
    floorLine: "#525f82",
    counter: "#1f293f",
    counterTop: "#b9ccf0",
    wall: "#1b2940",
    accent: "#ffd35a",
    shadow: "rgba(0, 0, 0, 0.35)",
  },
  "tropical-airport": {
    id: "tropical-airport",
    name: "Tropical Airport",
    unlockLevel: 13,
    floor: "#c2df90",
    floorLine: "#92be65",
    counter: "#258e83",
    counterTop: "#ffe29c",
    wall: "#a9eadc",
    accent: "#ef5b63",
    shadow: "rgba(39, 87, 65, 0.22)",
  },
  "moon-station": {
    id: "moon-station",
    name: "Moon Station Cafe",
    unlockLevel: 17,
    floor: "#d6d9e9",
    floorLine: "#b7bad0",
    counter: "#4c538d",
    counterTop: "#f1f4ff",
    wall: "#262943",
    accent: "#a687ff",
    shadow: "rgba(16, 18, 42, 0.3)",
  },
};

export const UPGRADE_DEFINITIONS = [
  { id: "grillSpeed", name: "Faster Grill", description: "Grill food a little faster.", max: 5, cost: 60 },
  { id: "grillSize", name: "Larger Grill", description: "Extra grill space for busy burger levels.", max: 3, cost: 90 },
  { id: "boilerSpeed", name: "Faster Noodle Boiler", description: "Boil noodles and dumplings faster.", max: 5, cost: 60 },
  { id: "drinkMachine", name: "Larger Drink Machine", description: "Shorter drink and smoothie waits.", max: 5, cost: 55 },
  { id: "blenderSpeed", name: "Faster Blender", description: "Smoothies finish faster.", max: 5, cost: 55 },
  { id: "freshness", name: "Longer Freshness", description: "Ready food stays perfect longer.", max: 4, cost: 75 },
  { id: "patience", name: "Passenger Patience", description: "Passengers wait slightly longer.", max: 4, cost: 80 },
  { id: "traySlot", name: "Extra Tray Slot", description: "Carry one extra prepared component per tray.", max: 3, cost: 95 },
  { id: "cleaningSpeed", name: "Faster Cleaning", description: "Burned stations recover faster.", max: 4, cost: 65 },
  { id: "walkingSpeed", name: "Walking Speed", description: "Chefs move faster around the kitchen.", max: 5, cost: 70 },
];

const POOLS = {
  starter: ["cloud-burger", "orange-takeoff", "cloud-cupcake", "gate-club"],
  burger: ["cloud-burger", "runway-cheeseburger", "jumbo-paneer-burger", "gate-club", "orange-takeoff", "berry-boarding-smoothie"],
  noodle: ["terminal-noodles", "skyline-spicy-noodles", "pilot-coffee", "tropical-toastie", "runway-cheeseburger", "cloud-cupcake"],
  dessert: ["cloud-cupcake", "runway-sundae", "pista-gate-pudding", "berry-boarding-smoothie", "pilot-coffee", "tropical-toastie"],
  grand: [
    "cloud-burger",
    "runway-cheeseburger",
    "jumbo-paneer-burger",
    "gate-club",
    "tropical-toastie",
    "captain-veggie-stack",
    "terminal-noodles",
    "skyline-spicy-noodles",
    "moon-dumpling-bowl",
    "orange-takeoff",
    "berry-boarding-smoothie",
    "pilot-coffee",
    "cloud-cupcake",
    "runway-sundae",
    "pista-gate-pudding",
  ],
};

export const CHEF_LEVELS = [
  level(1, "Training Cafe", 82, 4, 420, 13.5, 2, "runway-cafe", POOLS.starter.slice(0, 2), "Learn trays, burgers, drinks, and passenger patience."),
  level(2, "Training Cafe", 92, 5, 560, 12.8, 3, "runway-cafe", POOLS.starter, "Desserts and club sandwiches join the board."),
  level(3, "Training Cafe", 102, 6, 720, 12.2, 3, "runway-cafe", [...POOLS.starter, "terminal-noodles"], "Noodle boiler unlocked."),
  level(4, "Training Cafe Finale", 112, 7, 910, 11.4, 3, "runway-cafe", [...POOLS.starter, "terminal-noodles", "runway-cheeseburger"], "Finish the training cafe and earn your first badge."),
  level(5, "Burger Gate", 118, 8, 1120, 10.8, 4, "cloud-kitchen", POOLS.burger, "Cloud Kitchen and smoothies unlocked."),
  level(6, "Burger Gate", 124, 9, 1320, 10.2, 4, "cloud-kitchen", [...POOLS.burger, "tropical-toastie"], "Toasties make the queue more colourful."),
  level(7, "Burger Gate", 132, 10, 1540, 9.7, 4, "cloud-kitchen", POOLS.burger, "Paneer burgers add grill pressure."),
  level(8, "Burger Gate Finale", 140, 11, 1780, 9.2, 5, "cloud-kitchen", [...POOLS.burger, "pilot-coffee"], "The coffee machine opens for late passengers."),
  level(9, "Noodle Terminal", 146, 11, 1960, 8.8, 5, "night-terminal", POOLS.noodle, "Night Terminal and spicy noodles unlocked."),
  level(10, "Noodle Terminal", 154, 12, 2240, 8.4, 5, "night-terminal", [...POOLS.noodle, "runway-sundae"], "Dessert rushes begin mid-shift."),
  level(11, "Noodle Terminal", 162, 13, 2510, 8.0, 5, "night-terminal", [...POOLS.noodle, "captain-veggie-stack"], "Tall sandwiches test your prep timing."),
  level(12, "Noodle Terminal Finale", 170, 14, 2830, 7.7, 6, "night-terminal", POOLS.noodle.concat(["captain-veggie-stack", "runway-sundae"]), "Beat the late terminal dinner service."),
  level(13, "Dessert Departures", 172, 14, 3050, 7.4, 6, "tropical-airport", POOLS.dessert, "Tropical Airport theme unlocked."),
  level(14, "Dessert Departures", 180, 15, 3340, 7.1, 6, "tropical-airport", [...POOLS.dessert, "pista-gate-pudding"], "Pista desserts join the dessert counter."),
  level(15, "Dessert Departures", 188, 16, 3680, 6.8, 6, "tropical-airport", POOLS.dessert.concat(["terminal-noodles", "cloud-burger"]), "Sweet orders mix with hot food again."),
  level(16, "Dessert Departures Finale", 196, 17, 4050, 6.5, 7, "tropical-airport", POOLS.dessert.concat(POOLS.noodle), "Beat a packed holiday departure wave."),
  level(17, "Grand Airport Kitchen", 202, 17, 4300, 6.3, 7, "moon-station", POOLS.grand, "Moon Station Cafe and dumpling bowls unlocked."),
  level(18, "Grand Airport Kitchen", 210, 18, 4680, 6.1, 7, "moon-station", POOLS.grand, "Passenger patience is shorter and orders stack quickly."),
  level(19, "Grand Airport Kitchen", 218, 19, 5120, 5.8, 8, "moon-station", POOLS.grand, "Full menu mastery test."),
  level(20, "Grand Airport Kitchen Finale", 230, 20, 5600, 5.5, 8, "moon-station", POOLS.grand, "Clear the finale to unlock Endless Rush and the Airport Master Chef badge."),
];

function level(number, chapter, duration, targetOrders, targetScore, spawnEvery, maxActive, theme, recipePool, unlockText) {
  return {
    id: number,
    number,
    chapter,
    name: `Level ${number}: ${chapter}`,
    duration,
    targetOrders,
    targetScore,
    spawnEvery,
    maxActive,
    theme,
    recipePool,
    unlockText,
  };
}

export function getChefLevel(number) {
  return CHEF_LEVELS.find((levelData) => levelData.number === Number(number)) || CHEF_LEVELS[0];
}

export function difficultyConfig(id) {
  return DIFFICULTY[id] || DIFFICULTY.normal;
}

export function adjustedLevelGoals(level, difficultyId) {
  const difficulty = difficultyConfig(difficultyId);
  return {
    duration: level.duration,
    targetOrders: Math.max(2, Math.round(level.targetOrders * difficulty.goalMultiplier)),
    targetScore: Math.max(120, Math.round(level.targetScore * difficulty.scoreMultiplier)),
    spawnEvery: Math.max(3.4, level.spawnEvery * difficulty.spawnMultiplier),
    maxActive: Math.max(2, Math.round(level.maxActive + (difficultyId === "hard" ? 1 : difficultyId === "easy" ? -1 : 0))),
  };
}

export function unlockedThemes(record) {
  const highest = record?.highestUnlockedLevel || 1;
  const stored = new Set(record?.unlockedThemes || ["runway-cafe"]);
  for (const theme of Object.values(KITCHEN_THEMES)) {
    if (highest >= theme.unlockLevel) stored.add(theme.id);
  }
  return [...stored];
}

export function upgradeCost(upgrade, level = 0) {
  return Math.round(upgrade.cost * (1 + level * 0.62));
}

export function totalStars(record) {
  return Object.values(record?.stars || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}
