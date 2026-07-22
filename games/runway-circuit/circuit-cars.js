export const CAR_TYPES = {
  "runway-rookie": {
    id: "runway-rookie",
    name: "Runway Rookie",
    description: "Balanced starter car with friendly handling.",
    color: "#38aee2",
    accent: "#ffffff",
    speed: 320,
    acceleration: 280,
    braking: 360,
    reverse: 120,
    steering: 2.75,
    grip: 0.88,
    drift: 0.62,
    weight: 1,
    collision: 0.9,
    boostCapacity: 100,
  },
  "cargo-cruiser": {
    id: "cargo-cruiser",
    name: "Cargo Cruiser",
    description: "Heavy, steady, and forgiving after collisions.",
    color: "#c7824f",
    accent: "#ffd35a",
    speed: 292,
    acceleration: 235,
    braking: 390,
    reverse: 110,
    steering: 2.28,
    grip: 0.94,
    drift: 0.48,
    weight: 1.28,
    collision: 1.18,
    boostCapacity: 88,
  },
  "sky-sprint": {
    id: "sky-sprint",
    name: "Sky Sprint",
    description: "Fast and light, but loose on wet or oily surfaces.",
    color: "#ef5b63",
    accent: "#fff4c8",
    speed: 350,
    acceleration: 315,
    braking: 330,
    reverse: 125,
    steering: 2.58,
    grip: 0.77,
    drift: 0.82,
    weight: 0.86,
    collision: 0.72,
    boostCapacity: 112,
  },
  "curve-comet": {
    id: "curve-comet",
    name: "Curve Comet",
    description: "Sharp steering and strong brakes for technical tracks.",
    color: "#7f59e8",
    accent: "#dff8ff",
    speed: 310,
    acceleration: 275,
    braking: 420,
    reverse: 118,
    steering: 3.18,
    grip: 0.91,
    drift: 0.75,
    weight: 0.96,
    collision: 0.82,
    boostCapacity: 96,
  },
  "jetline-gt": {
    id: "jetline-gt",
    name: "Jetline GT",
    description: "Champion car with huge speed and demanding control.",
    color: "#132035",
    accent: "#ffd35a",
    speed: 382,
    acceleration: 330,
    braking: 350,
    reverse: 128,
    steering: 2.48,
    grip: 0.72,
    drift: 0.88,
    weight: 0.92,
    collision: 0.78,
    boostCapacity: 122,
    unlock: "champion",
  },
};

export const UPGRADE_KEYS = ["engine", "acceleration", "grip", "brakes", "steering", "boost", "stability"];

export function defaultCarUpgrades() {
  return Object.fromEntries(
    Object.keys(CAR_TYPES).map((carId) => [
      carId,
      Object.fromEntries(UPGRADE_KEYS.map((key) => [key, 0])),
    ]),
  );
}

export function getCarDefinition(carId = "runway-rookie") {
  return CAR_TYPES[carId] || CAR_TYPES["runway-rookie"];
}

export function upgradeCost(carId, upgradeKey, level = 0) {
  const base = carId === "jetline-gt" ? 54 : 38;
  const keyIndex = Math.max(0, UPGRADE_KEYS.indexOf(upgradeKey));
  return base + keyIndex * 5 + level * 24;
}

export function canUseCar(records, carId) {
  const car = getCarDefinition(carId);
  if (!car.unlock) return true;
  return Boolean(records?.championBadge) || records?.unlockedCars?.includes(carId);
}

export function carStatsWithUpgrades(carId, upgrades = {}) {
  const car = getCarDefinition(carId);
  const levels = {
    engine: upgrades.engine || 0,
    acceleration: upgrades.acceleration || 0,
    grip: upgrades.grip || 0,
    brakes: upgrades.brakes || 0,
    steering: upgrades.steering || 0,
    boost: upgrades.boost || 0,
    stability: upgrades.stability || 0,
  };
  return {
    ...car,
    speed: car.speed * (1 + levels.engine * 0.045),
    acceleration: car.acceleration * (1 + levels.acceleration * 0.055),
    braking: car.braking * (1 + levels.brakes * 0.055),
    steering: car.steering * (1 + levels.steering * 0.04),
    grip: Math.min(0.98, car.grip + levels.grip * 0.025 + levels.stability * 0.01),
    drift: Math.min(0.94, car.drift + levels.stability * 0.018),
    collision: car.collision * (1 + levels.stability * 0.04),
    boostCapacity: car.boostCapacity + levels.boost * 12,
    upgradeLevels: levels,
  };
}

export function statBars(carId, upgrades = {}) {
  const stats = carStatsWithUpgrades(carId, upgrades);
  return [
    ["Speed", stats.speed / 400],
    ["Accel", stats.acceleration / 370],
    ["Grip", stats.grip],
    ["Brakes", stats.braking / 460],
    ["Steer", stats.steering / 3.5],
    ["Boost", stats.boostCapacity / 150],
  ].map(([label, value]) => [label, Math.max(0.08, Math.min(1, value))]);
}
