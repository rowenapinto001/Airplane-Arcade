export const MISSION_TYPES = {
  hubAssault: "Hub Assault",
  coreCapture: "Sky Core Capture",
  stationControl: "Three-Station Control",
  cargoEscort: "Cargo Escort",
  energyRace: "Energy Race",
};

export const CREW_TYPES = {
  basic: {
    id: "basic",
    name: "Basic Crew",
    description: "Balanced movement and health.",
    speed: 74,
    health: 10,
    damage: 3,
    capture: 1,
    carry: 1,
    unlockLevel: 1,
    symbol: "B",
  },
  runner: {
    id: "runner",
    name: "Runner Crew",
    description: "Faster movement with lower health.",
    speed: 96,
    health: 7,
    damage: 2.5,
    capture: 0.9,
    carry: 1,
    unlockLevel: 3,
    symbol: "R",
  },
  guard: {
    id: "guard",
    name: "Guard Crew",
    description: "Slower, sturdier, and better at holding stations.",
    speed: 60,
    health: 15,
    damage: 3,
    capture: 1.35,
    carry: 1,
    unlockLevel: 5,
    symbol: "G",
  },
  engineer: {
    id: "engineer",
    name: "Engineer Crew",
    description: "Repairs friendly structures and captures faster.",
    speed: 68,
    health: 9,
    damage: 2.4,
    capture: 1.55,
    carry: 1,
    unlockLevel: 7,
    symbol: "E",
  },
  collector: {
    id: "collector",
    name: "Collector Crew",
    description: "Carries extra Sky Energy and avoids combat when possible.",
    speed: 72,
    health: 8,
    damage: 2,
    capture: 0.9,
    carry: 3,
    unlockLevel: 8,
    symbol: "C",
  },
};

export const TEMP_UPGRADES = {
  launchRate: {
    id: "launchRate",
    name: "Launch Speed",
    cost: 18,
    description: "Crew Launcher releases faster this level.",
  },
  crewHealth: {
    id: "crewHealth",
    name: "Crew Health",
    cost: 20,
    description: "New crew get extra health this level.",
  },
  crewSpeed: {
    id: "crewSpeed",
    name: "Crew Speed",
    cost: 18,
    description: "New crew move faster this level.",
  },
  cooldowns: {
    id: "cooldowns",
    name: "Ability Cooldowns",
    cost: 22,
    description: "Abilities recharge sooner this level.",
  },
  repairHub: {
    id: "repairHub",
    name: "Repair Hub",
    cost: 16,
    description: "Repairs the Departure Hub immediately.",
  },
};

export const PERMANENT_UPGRADES = {
  launchRate: {
    id: "launchRate",
    name: "Launcher Tune",
    cost: 2,
    max: 4,
    description: "Slightly faster launch rate.",
  },
  hubStrength: {
    id: "hubStrength",
    name: "Hub Bracing",
    cost: 2,
    max: 4,
    description: "Departure Hub starts with more health.",
  },
  rallyDuration: {
    id: "rallyDuration",
    name: "Beacon Battery",
    cost: 2,
    max: 3,
    description: "Rally Beacon lasts longer.",
  },
  shieldDuration: {
    id: "shieldDuration",
    name: "Cloud Weave",
    cost: 2,
    max: 3,
    description: "Cloud Shield lasts longer.",
  },
  energyCollection: {
    id: "energyCollection",
    name: "Energy Nets",
    cost: 2,
    max: 4,
    description: "Collected Sky Energy is worth slightly more.",
  },
};

export const PORTAL_TYPES = {
  growth: { name: "Crew Growth", icon: "+", detail: "Adds extra nearby crew." },
  echo: { name: "Crew Echo", icon: "E", detail: "Copies every few passing crew." },
  speed: { name: "Speed Stream", icon: ">>", detail: "Temporarily increases speed." },
  shield: { name: "Shield Cloud", icon: "S", detail: "Adds temporary protection." },
  heavy: { name: "Heavy Boots", icon: "H", detail: "Harder to push but slower." },
  jump: { name: "Jump Route", icon: "J", detail: "Moves crew to another platform." },
  split: { name: "Split Route", icon: "Y", detail: "Sends a copy toward another route." },
  magnet: { name: "Magnet Route", icon: "M", detail: "Attracts nearby energy." },
  heal: { name: "Healing Mist", icon: "+", detail: "Restores damaged crew." },
};

const HUBS = {
  player: { x: 76, y: 280, radius: 44 },
  rival: { x: 924, y: 280, radius: 44 },
};

const ROUTES = [
  {
    id: "safe",
    name: "Safe Route",
    style: "safe",
    hint: "Longer bridges, fewer enemies, smaller rewards.",
    points: [
      { x: 118, y: 284 },
      { x: 235, y: 188 },
      { x: 430, y: 150 },
      { x: 635, y: 174 },
      { x: 814, y: 232 },
      { x: 890, y: 278 },
    ],
  },
  {
    id: "attack",
    name: "Attack Route",
    style: "attack",
    hint: "Direct path to structures with heavier defense.",
    points: [
      { x: 116, y: 280 },
      { x: 268, y: 282 },
      { x: 460, y: 280 },
      { x: 660, y: 280 },
      { x: 828, y: 280 },
      { x: 890, y: 280 },
    ],
  },
  {
    id: "energy",
    name: "Energy Route",
    style: "energy",
    hint: "Collects Sky Energy before pushing forward.",
    points: [
      { x: 116, y: 284 },
      { x: 248, y: 395 },
      { x: 450, y: 420 },
      { x: 648, y: 396 },
      { x: 814, y: 336 },
      { x: 890, y: 286 },
    ],
  },
  {
    id: "risky",
    name: "Risky Route",
    style: "risky",
    hint: "Shorter route with hazards and stronger bonuses.",
    points: [
      { x: 116, y: 280 },
      { x: 300, y: 222 },
      { x: 510, y: 222 },
      { x: 702, y: 222 },
      { x: 890, y: 278 },
    ],
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function level(id, config) {
  return {
    id,
    width: 1000,
    height: 560,
    title: config.title,
    mission: config.mission,
    objective: config.objective,
    target: config.target || 100,
    missionHint: config.missionHint,
    tutorial: config.tutorial || "",
    routes: clone(ROUTES.slice(0, config.routeCount || 4)),
    hubs: clone(HUBS),
    stations: config.stations || [],
    portals: config.portals || [],
    hazards: config.hazards || [],
    energyCapsules: config.energyCapsules || [],
    abilities: config.abilities || [],
    rivalEnabled: config.rivalEnabled ?? id >= 3,
    enemyLaunchRate: config.enemyLaunchRate || 1,
    suggestedCrew: config.suggestedCrew || "basic",
    starConditions: [
      "Complete the mission.",
      "Complete it with at least 40% Departure Hub health.",
      "Complete it with at least 70% Departure Hub health and the bonus station captured.",
    ],
  };
}

export const CLOUD_CREW_LEVELS = [
  level(1, {
    title: "Departure Drill",
    mission: "hubAssault",
    objective: "Destroy the Rival Hub with basic launching.",
    missionHint: "Hold launch and aim along the only highlighted route.",
    tutorial: "Aim the Crew Launcher, hold launch, and send the crew to the Rival Hub.",
    routeCount: 1,
    portals: [{ id: "p1-growth", type: "growth", x: 410, y: 150, routeId: "safe", label: "+3 Crew", value: 3 }],
    energyCapsules: [{ id: "e1", x: 560, y: 160, value: 5 }],
  }),
  level(2, {
    title: "Two Bridges",
    mission: "energyRace",
    objective: "Collect 45 Sky Energy from the two route styles.",
    target: 45,
    missionHint: "The energy route is slower but pays back quickly. The rival joins in the next mission.",
    routeCount: 3,
    portals: [
      { id: "p2-growth", type: "growth", x: 382, y: 420, routeId: "energy", label: "+5 Crew", value: 5 },
      { id: "p2-speed", type: "speed", x: 610, y: 174, routeId: "safe", label: "Speed Stream", value: 4 },
    ],
    stations: [{ id: "bonus", name: "Bonus Weather Post", x: 505, y: 360, radius: 30, type: "bonus" }],
    energyCapsules: [
      { id: "e2a", x: 328, y: 395, value: 8 },
      { id: "e2b", x: 512, y: 420, value: 8 },
      { id: "e2c", x: 690, y: 365, value: 8 },
    ],
  }),
  level(3, {
    title: "Rival Arrivals",
    mission: "hubAssault",
    objective: "Destroy the Rival Hub while rival crew pushes back.",
    missionHint: "Direct attacks work, but the risky route can build momentum.",
    routeCount: 4,
    portals: [
      { id: "p3-echo", type: "echo", x: 514, y: 222, routeId: "risky", label: "Echo 3", value: 3 },
      { id: "p3-heavy", type: "heavy", x: 650, y: 280, routeId: "attack", label: "Heavy Boots", value: 4 },
    ],
    hazards: [{ id: "h3-cart", type: "cart", x: 560, y: 280, w: 54, h: 34, routeId: "attack", speed: 1 }],
    stations: [{ id: "bonus", name: "Bonus Gate Desk", x: 515, y: 332, radius: 28, type: "bonus" }],
  }),
  level(4, {
    title: "Beacon Bend",
    mission: "coreCapture",
    objective: "Capture the central Sky Core.",
    missionHint: "Use Rally Beacon to pull crew from one bridge to the core.",
    routeCount: 4,
    abilities: ["rally"],
    stations: [
      { id: "core", name: "Sky Core", x: 506, y: 282, radius: 38, type: "core" },
      { id: "bonus", name: "Bonus Lookout", x: 402, y: 176, radius: 26, type: "bonus" },
    ],
    portals: [
      { id: "p4-magnet", type: "magnet", x: 420, y: 420, routeId: "energy", label: "Magnet Route", value: 5 },
      { id: "p4-heal", type: "heal", x: 642, y: 174, routeId: "safe", label: "Healing Mist", value: 8 },
    ],
    energyCapsules: [{ id: "e4", x: 470, y: 420, value: 10 }],
  }),
  level(5, {
    title: "Station Sweep",
    mission: "stationControl",
    objective: "Capture all three control stations.",
    missionHint: "Guard Crew unlocks here and holds stations well.",
    routeCount: 4,
    abilities: ["rally"],
    stations: [
      { id: "s1", name: "North Station", x: 420, y: 154, radius: 29, type: "station" },
      { id: "s2", name: "Centre Station", x: 510, y: 282, radius: 31, type: "station" },
      { id: "s3", name: "South Station", x: 430, y: 420, radius: 29, type: "station" },
      { id: "bonus", name: "Bonus Ramp Desk", x: 648, y: 386, radius: 25, type: "bonus" },
    ],
    portals: [{ id: "p5-split", type: "split", x: 315, y: 282, routeId: "attack", label: "Split Route", value: 1, targetRouteId: "energy" }],
    hazards: [{ id: "h5-gate", type: "gate", x: 610, y: 280, w: 58, h: 28, routeId: "attack", speed: 1.1 }],
  }),
  level(6, {
    title: "Cloud Shield Crossing",
    mission: "coreCapture",
    objective: "Capture and hold the Sky Core through rival pressure.",
    missionHint: "Save Cloud Shield for crowded bridge fights.",
    routeCount: 4,
    abilities: ["rally", "shield"],
    stations: [
      { id: "core", name: "Sky Core", x: 504, y: 280, radius: 40, type: "core" },
      { id: "bonus", name: "Bonus Cloud Dock", x: 622, y: 196, radius: 26, type: "bonus" },
    ],
    portals: [
      { id: "p6-shield", type: "shield", x: 386, y: 222, routeId: "risky", label: "Shield Cloud", value: 5 },
      { id: "p6-jump", type: "jump", x: 644, y: 396, routeId: "energy", label: "Jump Route", value: 1, targetRouteId: "attack", targetIndex: 3 },
    ],
    hazards: [{ id: "h6-wind", type: "wind", x: 520, y: 222, w: 70, h: 30, routeId: "risky", speed: 1.4 }],
  }),
  level(7, {
    title: "Foggy Runway",
    mission: "energyRace",
    objective: "Collect 70 Sky Energy while hazards move across routes.",
    target: 70,
    missionHint: "Route switching beats waiting in slow fog.",
    routeCount: 4,
    abilities: ["rally", "shield"],
    stations: [
      { id: "energy", name: "Energy Station", x: 506, y: 420, radius: 31, type: "energy" },
      { id: "bonus", name: "Bonus Beacon Tower", x: 695, y: 225, radius: 24, type: "bonus" },
    ],
    portals: [
      { id: "p7-speed", type: "speed", x: 332, y: 395, routeId: "energy", label: "Speed Stream", value: 5 },
      { id: "p7-heavy", type: "heavy", x: 508, y: 280, routeId: "attack", label: "Heavy Boots", value: 5 },
    ],
    hazards: [
      { id: "h7-fog", type: "fog", x: 588, y: 420, w: 90, h: 46, routeId: "energy", speed: 0.8 },
      { id: "h7-ice", type: "ice", x: 420, y: 150, w: 76, h: 34, routeId: "safe", speed: 1 },
    ],
    energyCapsules: [
      { id: "e7a", x: 374, y: 420, value: 12 },
      { id: "e7b", x: 560, y: 410, value: 12 },
      { id: "e7c", x: 714, y: 346, value: 10 },
    ],
  }),
  level(8, {
    title: "Cargo Drift",
    mission: "cargoEscort",
    objective: "Escort the cargo capsule to the Rival Hub side.",
    missionHint: "Friendly crew push cargo forward. Rival crew push it back.",
    routeCount: 4,
    abilities: ["rally", "shield"],
    cargo: { x: 300, y: 280, progress: 0.18 },
    stations: [{ id: "bonus", name: "Bonus Cargo Scanner", x: 500, y: 164, radius: 25, type: "bonus" }],
    portals: [
      { id: "p8-heal", type: "heal", x: 418, y: 280, routeId: "attack", label: "Healing Mist", value: 9 },
      { id: "p8-echo", type: "echo", x: 646, y: 280, routeId: "attack", label: "Echo 2", value: 2 },
    ],
    hazards: [{ id: "h8-conveyor", type: "conveyor", x: 536, y: 280, w: 92, h: 30, routeId: "attack", speed: 1.2 }],
  }),
  level(9, {
    title: "Turbo Terminal",
    mission: "stationControl",
    objective: "Capture all stations against a faster rival strategy.",
    missionHint: "Turbo Launch unlocks here. Surge after the rival spends energy.",
    routeCount: 4,
    abilities: ["rally", "shield", "turbo"],
    enemyLaunchRate: 1.12,
    stations: [
      { id: "s1", name: "North Station", x: 420, y: 150, radius: 29, type: "station" },
      { id: "s2", name: "Centre Station", x: 506, y: 282, radius: 31, type: "station" },
      { id: "s3", name: "South Station", x: 420, y: 420, radius: 29, type: "station" },
      { id: "bonus", name: "Bonus Turbo Desk", x: 638, y: 222, radius: 25, type: "bonus" },
    ],
    portals: [
      { id: "p9-growth", type: "growth", x: 320, y: 222, routeId: "risky", label: "+8 Crew", value: 8 },
      { id: "p9-magnet", type: "magnet", x: 608, y: 420, routeId: "energy", label: "Magnet Route", value: 7 },
    ],
    hazards: [
      { id: "h9-turbine", type: "wind", x: 520, y: 222, w: 76, h: 34, routeId: "risky", speed: 1.7 },
      { id: "h9-cart", type: "cart", x: 620, y: 280, w: 54, h: 34, routeId: "attack", speed: 1.4 },
    ],
  }),
  level(10, {
    title: "Sky Core Showdown",
    mission: "hubAssault",
    objective: "Defeat the rival commander and destroy the Rival Hub.",
    missionHint: "Use multiple routes, capture the bonus station, and protect the central bridge.",
    routeCount: 4,
    abilities: ["rally", "shield", "turbo"],
    enemyLaunchRate: 1.22,
    commander: { x: 750, y: 280, health: 130, maxHealth: 130, active: true },
    stations: [
      { id: "core", name: "Sky Core", x: 506, y: 280, radius: 38, type: "core" },
      { id: "energy", name: "Energy Station", x: 492, y: 420, radius: 31, type: "energy" },
      { id: "bonus", name: "Bonus Final Beacon", x: 420, y: 150, radius: 27, type: "bonus" },
    ],
    portals: [
      { id: "p10-growth", type: "growth", x: 300, y: 222, routeId: "risky", label: "+8 Crew", value: 8 },
      { id: "p10-split", type: "split", x: 520, y: 280, routeId: "attack", label: "Split Route", value: 1, targetRouteId: "safe" },
      { id: "p10-shield", type: "shield", x: 646, y: 174, routeId: "safe", label: "Shield Cloud", value: 5 },
      { id: "p10-jump", type: "jump", x: 650, y: 396, routeId: "energy", label: "Jump Route", value: 1, targetRouteId: "attack", targetIndex: 4 },
    ],
    hazards: [
      { id: "h10-gate", type: "gate", x: 596, y: 280, w: 62, h: 30, routeId: "attack", speed: 1.4 },
      { id: "h10-fog", type: "fog", x: 560, y: 420, w: 94, h: 46, routeId: "energy", speed: 0.9 },
    ],
  }),
];

export function getCloudCrewLevel(levelNumber) {
  return clone(CLOUD_CREW_LEVELS[Math.max(0, Math.min(CLOUD_CREW_LEVELS.length - 1, levelNumber - 1))]);
}

export function totalStars(stars) {
  return Object.values(stars || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}
