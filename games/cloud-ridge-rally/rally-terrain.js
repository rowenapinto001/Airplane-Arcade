import { getEnvironment, getLevel } from "./rally-levels.js";

function seededNoise(seed) {
  let value = seed * 9301 + 49297;
  return () => {
    value = (value * 233280 + 49297) % 2147483647;
    return value / 2147483647;
  };
}

export function generateTerrain({ mode, levelId = 1, environmentId = "runway", distance = 1800, difficultyScale = 1 }) {
  const level = mode === "campaign" ? getLevel(levelId) : null;
  const environment = getEnvironment(level?.environment || environmentId);
  const length = mode === "campaign" ? level.distance : distance;
  const baseDifficulty = mode === "campaign" ? level.difficulty : Math.max(0.75, Math.min(1.9, distance / 2100));
  const difficulty = clamp(baseDifficulty * difficultyScale, 0.55, 2.2);
  const random = seededNoise((level?.id || 17) * 31 + environment.id.length * 7 + Math.floor(length / 100) + Math.floor(difficultyScale * 100));
  const config = level || endlessConfig(length, environment.id);
  const sections = createTerrainSections(length, config, environment, difficulty, random);
  const points = createTerrainPoints(sections, environment, difficulty, random);
  const checkpoints = (level?.checkpoints || createEndlessCheckpoints(length)).map((x) => ({
    id: `checkpoint-${Math.round(x)}`,
    x,
    reached: false,
  }));
  const safeZones = checkpointSafeZones(checkpoints, length);
  const pickups = createPickups(length, points, random, difficulty, mode, config, sections, safeZones);
  const obstacles = createObstacles(length, points, random, difficulty, environment.id, config, sections, safeZones);
  const finish = mode === "campaign" ? { x: length, reached: false } : null;

  return {
    mode,
    level,
    environment,
    length,
    difficulty,
    difficultyScale,
    sections,
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
    distance: terrain.length + 12000,
    difficultyScale: terrain.difficultyScale || 1,
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

function endlessConfig(length, environmentId) {
  const expectedAverageSpeed = {
    runway: 320,
    canyon: 292,
    frost: 258,
    desert: 284,
    storm: 266,
    moon: 252,
    islands: 276,
    volcano: 262,
  }[environmentId] || 290;
  return {
    id: 17,
    expectedAverageSpeed,
    majorSections: Math.max(18, Math.floor(length / 5200)),
    recoverySectionFrequency: 4,
    obstacleDensity: "medium",
    minimumObstacleGapSeconds: 9,
    fuelIntervalSeconds: 30,
    terrainDifficulty: "medium",
  };
}

function createTerrainSections(length, config, environment, difficulty, random) {
  const sections = [];
  const startLength = 2600;
  const finalLength = clamp((config.expectedAverageSpeed || 290) * 22, 5200, 7600);
  const middleCount = Math.max(8, (config.majorSections || 18) - 2);
  const rawLengths = Array.from({ length: middleCount }, (_, index) => 0.78 + random() * 0.48 + (index % 5 === 3 ? 0.22 : 0));
  const middleLength = Math.max(1000, length - startLength - finalLength);
  const totalRaw = rawLengths.reduce((sum, value) => sum + value, 0);
  let x = 0;
  let y = environment.id === "moon" ? 385 : 430;

  sections.push(section("start", 0, startLength, y, y - 8, 8, 0));
  x = startLength;
  y -= 8;

  for (let i = 0; i < middleCount; i += 1) {
    const sectionLength = i === middleCount - 1
      ? Math.max(900, length - finalLength - x)
      : Math.max(1600, rawLengths[i] / totalRaw * middleLength);
    const type = pickSectionType(i, config, environment.id);
    const nextY = nextSectionY(y, type, difficulty, random);
    const amp = sectionAmplitude(type, environment.id, difficulty, random);
    const waves = type === "recovery" || type === "bridge" || type === "scenic" ? 0.5 : 1 + Math.floor(random() * 2);
    sections.push(section(type, x, Math.min(length - finalLength, x + sectionLength), y, nextY, amp, waves));
    x += sectionLength;
    y = nextY;
  }

  const finalType = environment.id === "islands" || environment.id === "moon" ? "final-jump" : "final-climb";
  const finalEnd = nextSectionY(y, finalType, difficulty, random);
  sections.push(section(finalType, Math.max(x, length - finalLength), length, y, finalEnd, sectionAmplitude(finalType, environment.id, difficulty, random), 1.5));
  sections.push(section("finish-recovery", length, length + 1200, finalEnd, finalEnd, 6, 0));
  return sections;
}

function section(type, start, end, startY, endY, amplitude, waves) {
  return { type, start, end, startY, endY, amplitude, waves };
}

function pickSectionType(index, config, environmentId) {
  const recoveryEvery = Math.max(3, config.recoverySectionFrequency || 3);
  if (index % recoveryEvery === recoveryEvery - 1) return index % 2 ? "recovery" : "scenic";
  const palettes = {
    runway: ["gentle", "climb", "coin-trail", "downhill", "ramp"],
    canyon: ["climb", "bridge", "rocky", "valley", "cargo-challenge"],
    frost: ["gentle", "braking", "downhill", "recovery", "ramp"],
    desert: ["dune", "open", "climb", "valley", "fuel-section"],
    storm: ["gentle", "windy-climb", "valley", "recovery", "downhill"],
    moon: ["moon-hop", "landing-zone", "valley", "ramp", "recovery"],
    islands: ["island-run", "cloud-gap", "landing-zone", "ramp", "bridge"],
    volcano: ["warning-road", "climb", "vent-section", "recovery", "downhill"],
  };
  const palette = palettes[environmentId] || palettes.runway;
  return palette[index % palette.length];
}

function nextSectionY(currentY, type, difficulty, random) {
  const amount = (44 + random() * 68) * Math.min(1.45, difficulty);
  let next = currentY;
  if (type.includes("climb") || type === "dune" || type === "ramp" || type === "final-climb") next -= amount;
  else if (type.includes("downhill") || type === "valley" || type === "cloud-gap") next += amount * 0.86;
  else if (type.includes("jump") || type === "moon-hop") next += amount * 0.28;
  else next += (random() - 0.5) * 34;
  if (next < 235 || next > 535) next = currentY - Math.sign(next - currentY || 1) * amount * 0.58;
  return clamp(next, 235, 535);
}

function sectionAmplitude(type, environmentId, difficulty, random) {
  const base = {
    start: 4,
    recovery: 8,
    scenic: 10,
    open: 12,
    bridge: 6,
    "landing-zone": 9,
    gentle: 24,
    braking: 18,
    "coin-trail": 28,
    downhill: 24,
    climb: 30,
    "windy-climb": 26,
    dune: 38,
    valley: 58,
    rocky: 42,
    ramp: 48,
    "cloud-gap": 46,
    "island-run": 34,
    "moon-hop": 54,
    "fuel-section": 20,
    "cargo-challenge": 32,
    "vent-section": 42,
    "warning-road": 18,
    "final-climb": 44,
    "final-jump": 58,
    "finish-recovery": 4,
  }[type] || 28;
  const envFactor = environmentId === "moon" ? 0.72 : environmentId === "storm" ? 0.88 : 1;
  return base * envFactor * (0.78 + difficulty * 0.18 + random() * 0.18);
}

function createTerrainPoints(sections, environment, difficulty, random) {
  const points = [];
  const step = 90;
  points.push({ x: -360, y: sections[0].startY });
  points.push({ x: -120, y: sections[0].startY });
  for (const part of sections) {
    const start = points.length && points[points.length - 1].x >= part.start ? points[points.length - 1].x + step : part.start;
    for (let x = start; x <= part.end; x += step) {
      const t = clamp((x - part.start) / Math.max(1, part.end - part.start), 0, 1);
      const smooth = t * t * (3 - 2 * t);
      const base = part.startY + (part.endY - part.startY) * smooth;
      const wave = Math.sin(t * Math.PI * part.waves) * part.amplitude;
      const detail = Math.sin(t * Math.PI * (part.waves + 1.5) + part.start * 0.003) * part.amplitude * 0.18;
      let y = base + wave + detail + (random() - 0.5) * part.amplitude * 0.06;
      if (part.type === "bridge" || part.type === "recovery" || part.type === "landing-zone" || part.type === "finish-recovery") {
        y = base + Math.sin(t * Math.PI) * part.amplitude * 0.22;
      }
      if (environment.id === "moon") y -= 18;
      if (environment.id === "canyon" && part.type === "valley") y += 30;
      if (environment.id === "islands" && part.type === "cloud-gap") y -= Math.sin(t * Math.PI) * 26;
      points.push({ x, y: clamp(y, 215, 555) });
    }
  }
  return points;
}

function checkpointSafeZones(checkpoints, length) {
  const zones = checkpoints.map((checkpoint) => ({
    start: checkpoint.x - 900,
    end: checkpoint.x + 980,
  }));
  zones.push({ start: length - 3600, end: length + 500 });
  zones.push({ start: 0, end: 1700 });
  return zones;
}

function inSafeZone(x, safeZones) {
  return safeZones.some((zone) => x >= zone.start && x <= zone.end);
}

function sectionAt(sections, x) {
  return sections.find((part) => x >= part.start && x <= part.end) || sections[sections.length - 1];
}

function createPickups(length, points, random, difficulty, mode, config, sections, safeZones) {
  const pickups = [];
  for (const part of sections) {
    if (part.type === "start" || part.type === "finish-recovery") continue;
    const quietSection = part.type === "scenic" || part.type === "warning-road";
    for (let x = part.start + 520 + random() * 280; x < part.end - 420; x += 1350 + random() * 900) {
      if (quietSection && random() < 0.58) continue;
      const group = part.type === "ramp" || part.type === "moon-hop" || part.type === "final-jump" ? "arc" : part.type === "valley" ? "valley" : "line";
      const count = group === "arc" ? 7 : group === "valley" ? 6 : 5;
      for (let i = 0; i < count; i += 1) {
        const px = x + i * 130;
        if (px > length - 900) continue;
        const ground = samplePoints(points, px);
        const lift = group === "arc"
          ? 70 + Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 84
          : group === "valley"
            ? 52 + Math.sin(i * 0.8) * 22
            : 46;
        pickups.push({
          id: `coin-${Math.round(px)}`,
          type: "coin",
          x: px,
          y: ground.y - lift,
          radius: 15,
          value: 1,
        });
      }
    }
  }

  const fuelSpacing = clamp((config.expectedAverageSpeed || 290) * (config.fuelIntervalSeconds || 30) * 0.42, 2600, 5200);
  for (let x = 1200; x < length - 2400; x += fuelSpacing + random() * fuelSpacing * 0.36) {
    const ground = samplePoints(points, x);
    const sizeRoll = random();
    const section = sectionAt(sections, x);
    const size = section.type.includes("climb") || section.type === "dune" || sizeRoll > 0.76 ? "large" : sizeRoll > 0.38 ? "medium" : "small";
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
  for (const zone of safeZones.slice(0, -2)) {
    const x = clamp(zone.start + 360, 1000, length - 1500);
    const ground = samplePoints(points, x);
    pickups.push({
      id: `checkpoint-fuel-${Math.round(x)}`,
      type: "fuel",
      size: "large",
      x,
      y: ground.y - 68,
      radius: 24,
      value: 75,
    });
  }
  const rareTypes = ["boarding-star", "luggage-token", "golden-propeller"];
  for (let i = 0; i < 3; i += 1) {
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

function createObstacles(length, points, random, difficulty, environmentId, config, sections, safeZones) {
  const obstacles = [];
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
  const density = {
    low: 0.78,
    "low-medium": 0.9,
    medium: 1,
    "medium-high": 1.12,
    high: 1.24,
    varied: 1.18,
  }[config.obstacleDensity] || 1;
  const minGap = Math.max(1550, (config.expectedAverageSpeed || 290) * (config.minimumObstacleGapSeconds || 9) / density);
  const pool = names[environmentId] || names.runway;
  let x = 2600 + random() * 900;
  let index = 0;
  while (x < length - 4200) {
    const current = sectionAt(sections, x);
    const allowed = !["start", "recovery", "scenic", "open", "landing-zone", "fuel-section", "finish-recovery"].includes(current.type);
    const slope = slopeNear(points, x);
    if (!allowed || inSafeZone(x, safeZones) || Math.abs(slope) > 0.52) {
      x += 650;
      continue;
    }
    const canGroup = !["low", "low-medium"].includes(config.obstacleDensity);
    const groupChance = canGroup
      ? current.type.includes("challenge") || current.type.includes("vent") || current.type === "rocky"
        ? 0.3
        : config.obstacleDensity === "high" || config.obstacleDensity === "varied"
          ? 0.12
          : 0.04
      : 0;
    const groupSize = random() < groupChance && current.end - x > 2100 ? 2 + Math.floor(random() * 2) : 1;
    for (let j = 0; j < groupSize; j += 1) {
      const obstacleX = x + j * (1300 + random() * 520);
      if (obstacleX > current.end - 700 || inSafeZone(obstacleX, safeZones)) continue;
      const kind = pool[(index + j) % pool.length];
      const ground = samplePoints(points, obstacleX);
      obstacles.push({
        id: `${kind}-${Math.round(obstacleX)}`,
        kind,
        x: obstacleX,
        y: ground.y,
        width: kind.includes("bridge") || kind.includes("gap") ? 112 : 56,
        height: kind.includes("turbine") ? 96 : 44,
        strength: 0.55 + difficulty * 0.22,
        phase: random() * Math.PI * 2,
      });
    }
    index += groupSize;
    x += minGap + groupSize * 620 + random() * minGap * 0.42;
  }
  return obstacles;
}

function slopeNear(points, x) {
  const a = samplePoints(points, x - 90);
  const b = samplePoints(points, x + 90);
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createEndlessCheckpoints(length) {
  const checkpoints = [];
  for (let x = 8000; x < length; x += 8000) checkpoints.push(x);
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
