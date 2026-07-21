import { getEnvironment, getLevel } from "./rally-levels.js";

function seededNoise(seed) {
  let value = seed * 9301 + 49297;
  return () => {
    value = (value * 233280 + 49297) % 2147483647;
    return value / 2147483647;
  };
}

export function generateTerrain({ mode, levelId = 1, environmentId = "runway", distance = 1800 }) {
  const level = mode === "campaign" ? getLevel(levelId) : null;
  const environment = getEnvironment(level?.environment || environmentId);
  const length = mode === "campaign" ? level.distance : distance;
  const difficulty = mode === "campaign" ? level.difficulty : Math.max(0.75, Math.min(1.9, distance / 2100));
  const random = seededNoise((level?.id || 17) * 31 + environment.id.length * 7 + Math.floor(length / 100));
  const points = [];
  const step = 80;
  let y = 410;

  for (let x = -240; x <= length + 900; x += step) {
    const valley = Math.sin(x / (230 - difficulty * 28)) * 58 * difficulty;
    const ridge = Math.sin(x / (112 + difficulty * 12) + levelId * 0.7) * 34 * difficulty;
    const jitter = (random() - 0.5) * 42 * difficulty;
    y += (valley + ridge + jitter) * 0.08;
    y = Math.max(210, Math.min(530, y));
    if (environment.id === "islands" && x > 700 && Math.floor(x / 520) % 3 === 1) y -= 72;
    if (environment.id === "moon") y -= 26;
    if (environment.id === "canyon" && Math.floor(x / 650) % 2 === 1) y += 42;
    points.push({ x, y });
  }

  const pickups = createPickups(length, points, random, difficulty, mode);
  const obstacles = createObstacles(length, points, random, difficulty, environment.id);
  const checkpoints = (level?.checkpoints || createEndlessCheckpoints(length)).map((x) => ({
    id: `checkpoint-${Math.round(x)}`,
    x,
    reached: false,
  }));
  const finish = mode === "campaign" ? { x: length, reached: false } : null;

  return {
    mode,
    level,
    environment,
    length,
    difficulty,
    points,
    pickups,
    obstacles,
    checkpoints,
    finish,
    totalCoins: pickups.filter((pickup) => pickup.type === "coin").length,
  };
}

export function extendEndlessTerrain(terrain, vehicleX) {
  if (terrain.mode !== "endless" || vehicleX < terrain.length - 900) return terrain;
  const extra = generateTerrain({
    mode: "endless",
    environmentId: terrain.environment.id,
    distance: terrain.length + 1200,
  });
  terrain.length = extra.length;
  terrain.points = extra.points;
  terrain.pickups.push(...extra.pickups.filter((pickup) => pickup.x > vehicleX + 600));
  terrain.obstacles.push(...extra.obstacles.filter((obstacle) => obstacle.x > vehicleX + 600));
  terrain.checkpoints = extra.checkpoints;
  terrain.totalCoins = terrain.pickups.filter((pickup) => pickup.type === "coin").length;
  return terrain;
}

export function terrainAt(terrain, x) {
  const points = terrain.points;
  if (x <= points[0].x) return { y: points[0].y, angle: 0 };
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (x < a.x || x > b.x) continue;
    const t = (x - a.x) / (b.x - a.x);
    const smooth = t * t * (3 - 2 * t);
    const y = a.y + (b.y - a.y) * smooth;
    return { y, angle: Math.atan2(b.y - a.y, b.x - a.x) };
  }
  const last = points[points.length - 1];
  return { y: last.y, angle: 0 };
}

export function collectNear(terrain, x, y, radius) {
  const collected = [];
  for (const pickup of terrain.pickups) {
    if (pickup.collected) continue;
    if (Math.hypot(pickup.x - x, pickup.y - y) <= radius + pickup.radius) {
      pickup.collected = true;
      collected.push(pickup);
    }
  }
  return collected;
}

export function obstacleNear(terrain, x, y, radius) {
  for (const obstacle of terrain.obstacles) {
    if (Math.abs(obstacle.x - x) > obstacle.width + radius) continue;
    const ground = terrainAt(terrain, obstacle.x);
    const oy = ground.y - obstacle.height / 2;
    if (Math.hypot(obstacle.x - x, oy - y) < radius + Math.max(obstacle.width, obstacle.height) * 0.38) {
      return obstacle;
    }
  }
  return null;
}

function createPickups(length, points, random, difficulty, mode) {
  const pickups = [];
  const coinSpacing = Math.max(70, 120 - difficulty * 18);
  for (let x = 180; x < length - 80; x += coinSpacing) {
    const ground = samplePoints(points, x);
    const arc = Math.sin(x / 180) > 0.55 ? 86 : 48;
    pickups.push({
      id: `coin-${Math.round(x)}`,
      type: "coin",
      x,
      y: ground.y - arc - random() * 18,
      radius: 15,
      value: 1,
    });
  }
  for (let x = 420; x < length - 120; x += 430 + random() * 130) {
    const ground = samplePoints(points, x);
    const sizeRoll = random();
    const size = sizeRoll > 0.82 ? "large" : sizeRoll > 0.48 ? "medium" : "small";
    pickups.push({
      id: `fuel-${Math.round(x)}`,
      type: "fuel",
      size,
      x,
      y: ground.y - 64,
      radius: size === "large" ? 24 : size === "medium" ? 20 : 17,
      value: size === "large" ? 75 : size === "medium" ? 40 : 20,
    });
  }
  const rareTypes = ["boarding-star", "luggage-token", "golden-propeller"];
  for (let i = 0; i < (mode === "campaign" ? 2 : 3); i += 1) {
    const x = length * (0.35 + i * 0.22) + (random() - 0.5) * 120;
    const ground = samplePoints(points, x);
    pickups.push({
      id: `${rareTypes[i % rareTypes.length]}-${Math.round(x)}`,
      type: rareTypes[i % rareTypes.length],
      x,
      y: ground.y - 122 - random() * 40,
      radius: 20,
      value: 1,
    });
  }
  return pickups;
}

function createObstacles(length, points, random, difficulty, environmentId) {
  const obstacles = [];
  const count = Math.floor(length / 460);
  const names = {
    runway: ["rolling-luggage", "baggage-cart", "puddle"],
    canyon: ["cargo-crate", "broken-bridge", "loose-rock"],
    frost: ["ice-ramp", "loose-rock", "puddle"],
    desert: ["sand-pit", "marker-crate", "heat-bump"],
    storm: ["wind-turbine", "puddle", "rolling-luggage"],
    moon: ["crater", "loose-rock", "moon-bump"],
    islands: ["cloud-gap", "rising-platform", "baggage-cart"],
    volcano: ["heat-vent", "loose-rock", "lava-rock"],
  };
  const pool = names[environmentId] || names.runway;
  for (let i = 0; i < count; i += 1) {
    const x = 520 + i * 430 + random() * 130;
    if (x > length - 160) continue;
    const kind = pool[i % pool.length];
    const ground = samplePoints(points, x);
    obstacles.push({
      id: `${kind}-${Math.round(x)}`,
      kind,
      x,
      y: ground.y,
      width: kind.includes("bridge") || kind.includes("gap") ? 112 : 56,
      height: kind.includes("turbine") ? 96 : 44,
      strength: 0.55 + difficulty * 0.22,
      phase: random() * Math.PI * 2,
    });
  }
  return obstacles;
}

function createEndlessCheckpoints(length) {
  const checkpoints = [];
  for (let x = 650; x < length; x += 650) checkpoints.push(x);
  return checkpoints;
}

function samplePoints(points, x) {
  if (x <= points[0].x) return points[0];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (x < a.x || x > b.x) continue;
    const t = (x - a.x) / (b.x - a.x);
    return { x, y: a.y + (b.y - a.y) * t };
  }
  return points[points.length - 1];
}
