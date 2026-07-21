export const UPGRADE_TYPES = [
  { id: "engine", label: "Engine", stat: "engine", step: 0.12 },
  { id: "grip", label: "Grip", stat: "grip", step: 0.1 },
  { id: "suspension", label: "Suspension", stat: "suspension", step: 0.08 },
  { id: "fuelTank", label: "Fuel Tank", stat: "fuelCapacity", step: 0.1 },
  { id: "stability", label: "Stability", stat: "stability", step: 0.08 },
  { id: "airControl", label: "Air Control", stat: "airControl", step: 0.1 },
  { id: "brake", label: "Brake Power", stat: "brake", step: 0.1 },
];

export const VEHICLES = [
  {
    id: "baggage-buggy",
    name: "Baggage Buggy",
    description: "Starter buggy with balanced handling and gentle fuel use.",
    unlock: { type: "starter", label: "Starter vehicle" },
    color: "#46c7d9",
    trim: "#ffd35a",
    ability: "fuel-saver",
    stats: {
      engine: 520,
      brake: 420,
      grip: 1,
      suspension: 0.72,
      weight: 1,
      fuelCapacity: 100,
      maxSpeed: 760,
      airControl: 1,
      stability: 1,
      fuelUse: 1,
    },
  },
  {
    id: "cloud-rover",
    name: "Cloud Rover",
    description: "Soft suspension for bumpy cloud roads.",
    unlock: { type: "level", value: 3, label: "Reach Level 3" },
    color: "#7f59e8",
    trim: "#eaf8ff",
    ability: "cloud-cushion",
    stats: {
      engine: 500,
      brake: 410,
      grip: 1.04,
      suspension: 0.98,
      weight: 1.08,
      fuelCapacity: 108,
      maxSpeed: 720,
      airControl: 0.9,
      stability: 1.14,
      fuelUse: 1.02,
    },
  },
  {
    id: "runway-jeep",
    name: "Runway Jeep",
    description: "Powerful climber with a hungry engine.",
    unlock: { type: "coins", value: 420, label: "420 Flight Coins" },
    color: "#2fb36d",
    trim: "#132035",
    ability: "grip-lock",
    stats: {
      engine: 680,
      brake: 470,
      grip: 1.12,
      suspension: 0.78,
      weight: 1.12,
      fuelCapacity: 94,
      maxSpeed: 790,
      airControl: 0.82,
      stability: 1.04,
      fuelUse: 1.18,
    },
  },
  {
    id: "cargo-truck",
    name: "Cargo Truck",
    description: "Heavy, stable, and hard to flip.",
    unlock: { type: "level", value: 5, label: "Reach Level 5" },
    color: "#ff8a3d",
    trim: "#5a321f",
    ability: "cloud-cushion",
    stats: {
      engine: 470,
      brake: 500,
      grip: 1.06,
      suspension: 0.84,
      weight: 1.45,
      fuelCapacity: 118,
      maxSpeed: 650,
      airControl: 0.62,
      stability: 1.44,
      fuelUse: 1.08,
    },
  },
  {
    id: "jet-kart",
    name: "Jet Kart",
    description: "Fast, light, and wild in the air.",
    unlock: { type: "coins", value: 760, label: "760 Flight Coins" },
    color: "#ef5b63",
    trim: "#ffffff",
    ability: "turbo-propeller",
    stats: {
      engine: 760,
      brake: 390,
      grip: 0.92,
      suspension: 0.62,
      weight: 0.82,
      fuelCapacity: 86,
      maxSpeed: 920,
      airControl: 1.22,
      stability: 0.78,
      fuelUse: 1.25,
    },
  },
  {
    id: "moon-hopper",
    name: "Moon Hopper",
    description: "Strong air control for low-gravity tracks.",
    unlock: { type: "level", value: 9, label: "Reach Level 9" },
    color: "#dfe7ff",
    trim: "#7f59e8",
    ability: "air-stabiliser",
    stats: {
      engine: 560,
      brake: 360,
      grip: 0.82,
      suspension: 0.92,
      weight: 0.9,
      fuelCapacity: 102,
      maxSpeed: 760,
      airControl: 1.55,
      stability: 0.96,
      fuelUse: 0.98,
    },
  },
  {
    id: "rescue-tractor",
    name: "Rescue Tractor",
    description: "Slow, grippy, and excellent on steep climbs.",
    unlock: { type: "stars", value: 18, label: "Earn 18 Stars" },
    color: "#ffd35a",
    trim: "#2fb36d",
    ability: "grip-lock",
    stats: {
      engine: 610,
      brake: 540,
      grip: 1.32,
      suspension: 0.75,
      weight: 1.24,
      fuelCapacity: 112,
      maxSpeed: 610,
      airControl: 0.74,
      stability: 1.28,
      fuelUse: 1.04,
    },
  },
  {
    id: "propeller-buggy",
    name: "Propeller Buggy",
    description: "A cheerful air-boost buggy for risky gaps.",
    unlock: { type: "propellers", value: 3, label: "Find 3 Golden Propellers" },
    color: "#38aee2",
    trim: "#ff8a3d",
    ability: "turbo-propeller",
    stats: {
      engine: 640,
      brake: 420,
      grip: 1,
      suspension: 0.82,
      weight: 0.94,
      fuelCapacity: 98,
      maxSpeed: 850,
      airControl: 1.18,
      stability: 0.98,
      fuelUse: 1.12,
    },
  },
];

export const ABILITIES = {
  "turbo-propeller": {
    name: "Turbo Propeller",
    cooldown: 7.5,
    duration: 1.1,
    fuelCost: 4,
    description: "Short forward boost for ramps and long climbs.",
  },
  "cloud-cushion": {
    name: "Cloud Cushion",
    cooldown: 9,
    duration: 1.8,
    fuelCost: 3,
    description: "Softens the next hard landing.",
  },
  "grip-lock": {
    name: "Grip Lock",
    cooldown: 8,
    duration: 2.4,
    fuelCost: 3,
    description: "Temporarily increases wheel traction.",
  },
  "fuel-saver": {
    name: "Fuel Saver",
    cooldown: 10,
    duration: 4,
    fuelCost: 0,
    description: "Reduces fuel use for a short stretch.",
  },
  "air-stabiliser": {
    name: "Air Stabiliser",
    cooldown: 8,
    duration: 2.2,
    fuelCost: 3,
    description: "Gently rotates toward a safe landing angle.",
  },
};

export function getVehicle(vehicleId) {
  return VEHICLES.find((vehicle) => vehicle.id === vehicleId) || VEHICLES[0];
}

export function defaultUpgradeLevels() {
  return Object.fromEntries(VEHICLES.map((vehicle) => [vehicle.id, Object.fromEntries(UPGRADE_TYPES.map((type) => [type.id, 0]))]));
}

export function upgradeCost(vehicleId, upgradeId, level) {
  const vehicleIndex = Math.max(0, VEHICLES.findIndex((vehicle) => vehicle.id === vehicleId));
  const upgradeIndex = Math.max(0, UPGRADE_TYPES.findIndex((type) => type.id === upgradeId));
  return 60 + vehicleIndex * 35 + upgradeIndex * 12 + level * level * 48;
}

export function upgradedStats(vehicle, upgrades = {}) {
  const stats = { ...vehicle.stats };
  for (const upgrade of UPGRADE_TYPES) {
    const level = Math.max(0, Math.min(5, Number(upgrades[upgrade.id] || 0)));
    if (!level) continue;
    if (upgrade.stat === "fuelCapacity") {
      stats.fuelCapacity *= 1 + level * upgrade.step;
    } else if (upgrade.stat === "engine" || upgrade.stat === "brake" || upgrade.stat === "maxSpeed") {
      stats[upgrade.stat] *= 1 + level * upgrade.step;
    } else {
      stats[upgrade.stat] += level * upgrade.step;
    }
  }
  stats.maxSpeed = Math.min(980, stats.maxSpeed + (upgrades.engine || 0) * 18);
  stats.fuelCapacity = Math.round(stats.fuelCapacity);
  return stats;
}

export function isVehicleUnlocked(vehicle, records) {
  if (vehicle.unlock.type === "starter") return true;
  if (vehicle.unlock.type === "level") return (records.highestUnlockedLevel || 1) >= vehicle.unlock.value;
  if (vehicle.unlock.type === "coins") return records.unlockedVehicles?.includes(vehicle.id);
  if (vehicle.unlock.type === "stars") return totalStars(records) >= vehicle.unlock.value;
  if (vehicle.unlock.type === "propellers") return (records.goldenPropellers || 0) >= vehicle.unlock.value;
  return false;
}

export function totalStars(records) {
  return Object.values(records.stars || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}
