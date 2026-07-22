import { carStatsWithUpgrades } from "./circuit-cars.js";
import { COMPUTER_NAMES, RACER_COUNT, TOTAL_LAPS, sampleTrack, trackPointWithOffset } from "./circuit-levels.js";

const TWO_PI = Math.PI * 2;

export function createRace(level, options = {}) {
  const racers = spawnRacers(level, options);
  return {
    level,
    difficulty: options.difficulty || "normal",
    mode: options.mode || "race",
    racers,
    player: racers[0],
    obstacles: level.obstacles.map((obstacle, index) => ({ ...obstacle, id: `obstacle-${index + 1}`, phase: index * 0.9 })),
    time: 0,
    countdown: 3.2,
    phase: "countdown",
    message: "3",
    finalLapShown: false,
    lapNotice: "",
    lapNoticeTimer: 0,
    checkpointNotice: "",
    checkpointNoticeTimer: 0,
    wrongWayTimer: 0,
    positionChanges: 0,
    finished: false,
  };
}

export function spawnRacers(level, options = {}) {
  const upgrades = options.upgrades || {};
  const playerCar = carStatsWithUpgrades(options.playerCar || "runway-rookie", upgrades[options.playerCar || "runway-rookie"]);
  const aiCars = ["cargo-cruiser", "sky-sprint", "curve-comet", "runway-rookie", options.champion ? "jetline-gt" : "cargo-cruiser"];
  return Array.from({ length: options.timeTrial ? 1 : RACER_COUNT }, (_, index) => {
    const isPlayer = index === 0;
    const carStats = isPlayer
      ? playerCar
      : carStatsWithUpgrades(aiCars[index - 1] || "runway-rookie", upgrades[aiCars[index - 1]] || {});
    const gridRow = Math.floor(index / 2);
    const gridCol = index % 2;
    const startProgress = 0.975 - gridRow * 0.006;
    const offset = gridCol === 0 ? -22 : 22;
    const point = trackPointWithOffset(level, startProgress, offset);
    return {
      id: isPlayer ? "player" : `ai-${index}`,
      name: isPlayer ? options.playerName || "Player" : COMPUTER_NAMES[index - 1],
      isPlayer,
      carId: carStats.id,
      stats: carStats,
      x: point.x,
      y: point.y,
      angle: point.angle,
      speed: 0,
      lateral: 0,
      progress: startProgress,
      previousProgress: startProgress,
      lap: 1,
      checkpointIndex: 0,
      nextCheckpoint: level.checkpoints[0],
      lapStartTime: 0,
      lapTimes: [],
      bestLap: null,
      finishTime: null,
      finalPosition: null,
      position: index + 1,
      previousPosition: index + 1,
      boost: carStats.boostCapacity * 0.55,
      boostActive: false,
      boostFlash: 0,
      driftAmount: 0,
      wrongWay: false,
      missedCheckpoint: false,
      respawnTimer: 0,
      resetCount: 0,
      collisions: 0,
      majorCollisions: 0,
      overtakes: 0,
      stuckTimer: 0,
      routeHistory: [],
      lastCheckpointProgress: startProgress,
      ai: { targetOffset: offset, mistakeTimer: 0, mistakeSteer: 0, patience: 0 },
    };
  });
}

export function updateRacePhysics(race, inputs, aiInputs, dt) {
  if (race.phase === "countdown") {
    race.countdown -= dt;
    race.message = race.countdown > 2.2 ? "3" : race.countdown > 1.2 ? "2" : race.countdown > 0.2 ? "1" : "GO";
    if (race.countdown <= 0) {
      race.phase = "racing";
      race.message = "";
    }
    return;
  }
  if (race.phase !== "racing") return;
  race.time += dt;
  race.lapNoticeTimer = Math.max(0, race.lapNoticeTimer - dt);
  race.checkpointNoticeTimer = Math.max(0, race.checkpointNoticeTimer - dt);
  updateObstacles(race, dt);
  for (const racer of race.racers) {
    const input = racer.isPlayer ? inputs : aiInputs.get(racer.id) || {};
    updateCarPhysics(race, racer, input, dt);
  }
  resolveCarCollisions(race);
  for (const racer of race.racers) {
    detectCheckpoint(race, racer);
    updateRaceHistory(race, racer);
  }
  updateRacePositions(race);
}

export function updateCarPhysics(race, car, input, dt) {
  if (car.finishTime !== null) {
    car.speed *= Math.pow(0.94, dt * 60);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    return;
  }
  if (car.respawnTimer > 0) {
    car.respawnTimer -= dt;
    car.speed = 0;
    return;
  }

  const trackInfo = nearestTrackInfo(race.level, car.x, car.y);
  const surface = surfaceAt(race.level, trackInfo.progress, trackInfo.distanceFromCenter);
  const offroadRatio = Math.max(0, (Math.abs(trackInfo.distanceFromCenter) - race.level.roadWidth / 2) / race.level.roadWidth);
  const onRoad = offroadRatio <= 0.05;
  const surfaceGrip = surface.grip * (onRoad ? 1 : Math.max(0.42, 1 - offroadRatio * 0.85));
  const surfaceSpeed = surface.speed * (onRoad ? 1 : Math.max(0.44, 1 - offroadRatio * 0.8));
  const speedAbs = Math.abs(car.speed);
  const steerLoss = 1 - Math.min(0.34, speedAbs / (car.stats.speed * 2.8));
  const drift = Boolean(input.handbrake && speedAbs > 70);
  const boostAllowed = input.boost && car.boost > 0 && car.speed > 40;
  car.boostActive = Boolean(boostAllowed);
  car.boostFlash = Math.max(0, car.boostFlash - dt);

  if (input.accelerate) car.speed += car.stats.acceleration * surface.accel * dt;
  if (input.brake) {
    if (car.speed > 16) car.speed -= car.stats.braking * surface.brake * dt;
    else car.speed -= car.stats.reverse * dt;
  }
  if (!input.accelerate && !input.brake) {
    car.speed *= Math.pow(0.988, dt * 60);
  }
  if (boostAllowed) {
    car.speed += car.stats.acceleration * 0.95 * dt;
    car.boost = Math.max(0, car.boost - 34 * dt);
    car.boostFlash = 0.25;
  }

  const maxSpeed = car.stats.speed * surfaceSpeed * (boostAllowed ? 1.22 : 1);
  car.speed = Math.max(-car.stats.reverse, Math.min(maxSpeed, car.speed));
  const steeringInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const steeringAssist = input.steeringAssist || 0;
  const assistedInput = steeringInput + steeringAssist;
  const driftGrip = drift ? Math.max(0.42, car.stats.drift * surfaceGrip) : surfaceGrip;
  const turnRate = car.stats.steering * steerLoss * (0.34 + Math.min(1, speedAbs / 180)) * (boostAllowed ? 0.82 : 1);
  car.angle = normalizeAngle(car.angle + assistedInput * turnRate * dt * Math.sign(car.speed || 1));
  car.driftAmount = drift ? Math.min(1, car.driftAmount + dt * 2.8) : Math.max(0, car.driftAmount - dt * 2.2);

  car.lateral += assistedInput * speedAbs * (drift ? 0.25 : 0.08) * dt;
  car.lateral *= Math.pow(driftGrip, dt * 42);
  car.x += Math.cos(car.angle) * car.speed * dt + Math.cos(car.angle + Math.PI / 2) * car.lateral * dt;
  car.y += Math.sin(car.angle) * car.speed * dt + Math.sin(car.angle + Math.PI / 2) * car.lateral * dt;
  if (surface.type === "wind") {
    car.x += Math.cos(trackInfo.angle + Math.PI / 2) * surface.wind * dt;
    car.y += Math.sin(trackInfo.angle + Math.PI / 2) * surface.wind * dt;
  }

  applyBoundaryAssist(race, car, trackInfo, dt);
  collideObstacles(race, car, dt);
  const nextTrackInfo = nearestTrackInfo(race.level, car.x, car.y);
  car.previousProgress = car.progress;
  car.progress = nextTrackInfo.progress;
  const progressDelta = signedProgressDelta(car.previousProgress, car.progress);
  car.wrongWay = car.speed > 40 && progressDelta < -0.004;
  if (car.isPlayer && car.wrongWay) {
    race.wrongWayTimer = 1.1;
    race.checkpointNotice = "Wrong way";
    race.checkpointNoticeTimer = 0.9;
  }
  if (Math.abs(car.speed) < 8 && speedAbs < 10) car.stuckTimer += dt;
  else car.stuckTimer = 0;
  if (car.stuckTimer > 3.2 || Math.abs(nextTrackInfo.distanceFromCenter) > race.level.roadWidth * 1.45) {
    respawnCar(race, car, "recovery");
  }
  if (surface.type === "boost" && car.speed > 80) {
    car.boost = Math.min(car.stats.boostCapacity, car.boost + 18 * dt);
    car.speed = Math.min(car.stats.speed * 1.2, car.speed + 65 * dt);
  }
  if (drift && speedAbs > 130 && Math.abs(steeringInput) > 0) {
    car.boost = Math.min(car.stats.boostCapacity, car.boost + 5 * dt);
  }
}

function applyBoundaryAssist(race, car, trackInfo, dt) {
  const edge = race.level.roadWidth / 2;
  const outside = Math.abs(trackInfo.distanceFromCenter) - edge;
  if (outside <= 0) return;
  const normalDirection = trackInfo.distanceFromCenter > 0 ? -1 : 1;
  const normalAngle = trackInfo.angle + Math.PI / 2;
  const strength = Math.min(1, outside / edge);
  car.x += Math.cos(normalAngle) * normalDirection * strength * 90 * dt;
  car.y += Math.sin(normalAngle) * normalDirection * strength * 90 * dt;
  car.speed *= Math.pow(0.965, dt * 60);
}

function updateObstacles(race, dt) {
  for (const obstacle of race.obstacles) {
    obstacle.time = (obstacle.time || 0) + dt;
  }
}

function collideObstacles(race, car, dt) {
  for (const obstacle of race.obstacles) {
    const shape = obstacleShape(race, obstacle);
    if (!shape.active) continue;
    const dx = car.x - shape.x;
    const dy = car.y - shape.y;
    const distance = Math.hypot(dx, dy) || 1;
    const radius = shape.radius + 15;
    if (distance > radius) continue;
    if (shape.type === "boost" || shape.type === "speed-bump") {
      car.speed *= shape.type === "speed-bump" ? 0.88 : 1.08;
      continue;
    }
    if (shape.type === "oil") {
      car.lateral += 120 * dt * (Math.random() > 0.5 ? 1 : -1);
      car.speed *= 0.985;
      continue;
    }
    const nx = dx / distance;
    const ny = dy / distance;
    const push = radius - distance;
    car.x += nx * push;
    car.y += ny * push;
    car.speed *= 0.62;
    car.lateral += (nx * Math.sin(car.angle) - ny * Math.cos(car.angle)) * 90;
    car.collisions += 1;
    if (Math.abs(car.speed) > 120 || shape.major) car.majorCollisions += 1;
    if (car.isPlayer) {
      race.checkpointNotice = "Obstacle hit";
      race.checkpointNoticeTimer = 0.75;
    }
  }
}

export function obstacleShape(race, obstacle) {
  const speedScale = race.difficulty?.obstacleSpeed || 1;
  const time = (obstacle.time || 0) * speedScale + obstacle.phase;
  let offset = obstacle.offset || 0;
  let active = true;
  if (obstacle.amplitude) offset += Math.sin(time * TWO_PI / obstacle.period) * obstacle.amplitude;
  if (obstacle.type === "closing-gate") active = Math.sin(time * TWO_PI / obstacle.period) > -0.15;
  const point = trackPointWithOffset(race.level, obstacle.progress, offset);
  const radius = obstacle.radius || Math.max(obstacle.w || 40, obstacle.h || 24) / 2;
  return {
    ...point,
    type: obstacle.type,
    radius,
    active,
    angle: point.angle + (obstacle.type === "rotating-arm" || obstacle.type === "sign-arm" ? time : 0),
    major: ["closing-gate", "moving-bridge", "rotating-arm", "wind-turbine"].includes(obstacle.type),
  };
}

function resolveCarCollisions(race) {
  for (let i = 0; i < race.racers.length; i += 1) {
    for (let j = i + 1; j < race.racers.length; j += 1) {
      const a = race.racers[i];
      const b = race.racers[j];
      if (a.respawnTimer > 0 || b.respawnTimer > 0 || a.finishTime !== null || b.finishTime !== null) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 1;
      const minDistance = 31;
      if (distance >= minDistance) continue;
      const nx = dx / distance;
      const ny = dy / distance;
      const push = (minDistance - distance) / 2;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
      const relative = (b.speed - a.speed) * 0.12;
      a.speed -= relative / Math.max(0.6, a.stats.weight);
      b.speed += relative / Math.max(0.6, b.stats.weight);
      a.lateral -= push * 9;
      b.lateral += push * 9;
      a.collisions += 1;
      b.collisions += 1;
      if (Math.abs(relative) > 15) {
        a.majorCollisions += 1;
        b.majorCollisions += 1;
      }
    }
  }
}

export function detectCheckpoint(race, car) {
  if (car.finishTime !== null || race.phase !== "racing") return;
  const delta = signedProgressDelta(car.previousProgress, car.progress);
  if (delta < -0.01) return;
  const checkpoint = race.level.checkpoints[car.checkpointIndex];
  if (checkpoint && crossedProgress(car.previousProgress, car.progress, checkpoint.progress)) {
    car.checkpointIndex += 1;
    car.nextCheckpoint = race.level.checkpoints[car.checkpointIndex] || null;
    car.lastCheckpointProgress = checkpoint.progress;
    car.missedCheckpoint = false;
    if (car.isPlayer) {
      race.checkpointNotice = `Checkpoint ${car.checkpointIndex}/${race.level.checkpoints.length}`;
      race.checkpointNoticeTimer = 0.7;
    }
  }
  if (crossedFinish(car.previousProgress, car.progress) && delta > 0) {
    if (car.checkpointIndex >= race.level.checkpoints.length) {
      registerLap(race, car);
    } else if (car.isPlayer) {
      car.missedCheckpoint = true;
      race.checkpointNotice = "Checkpoint missed";
      race.checkpointNoticeTimer = 1.3;
    }
  }
}

export function registerLap(race, car) {
  const lapTime = race.time - car.lapStartTime;
  car.lapTimes.push(lapTime);
  car.bestLap = car.bestLap === null ? lapTime : Math.min(car.bestLap, lapTime);
  car.lapStartTime = race.time;
  car.checkpointIndex = 0;
  car.nextCheckpoint = race.level.checkpoints[0];
  car.boost = Math.min(car.stats.boostCapacity, car.boost + 24);
  if (car.lap >= TOTAL_LAPS) {
    car.finishTime = race.time;
    car.finalPosition = car.position;
    car.speed *= 0.72;
    if (car.isPlayer) {
      race.finished = true;
      race.phase = "finished";
      car.finalPosition = car.position;
    }
    return;
  }
  car.lap += 1;
  if (car.isPlayer) {
    race.lapNotice = car.lap === TOTAL_LAPS ? "Final Lap" : `Lap ${car.lap}`;
    race.lapNoticeTimer = 1.2;
    if (car.lap === TOTAL_LAPS) race.finalLapShown = true;
  }
}

function updateRaceHistory(race, car) {
  if (!car.isPlayer || race.phase !== "racing") return;
  const last = car.routeHistory[car.routeHistory.length - 1];
  if (!last || race.time - last.t >= 0.18) {
    car.routeHistory.push({ t: race.time, x: car.x, y: car.y, angle: car.angle, progress: car.progress });
    if (car.routeHistory.length > 720) car.routeHistory.shift();
  }
}

export function updateRacePositions(race) {
  const sorted = [...race.racers].sort((a, b) => raceDistance(b, race.level) - raceDistance(a, race.level));
  sorted.forEach((car, index) => {
    car.previousPosition = car.position;
    car.position = index + 1;
    if (car.isPlayer && car.previousPosition > car.position) {
      car.overtakes += car.previousPosition - car.position;
      race.positionChanges += car.previousPosition - car.position;
      car.boost = Math.min(car.stats.boostCapacity, car.boost + 8);
    }
  });
}

export function raceDistance(car, level) {
  const completedLaps = Math.max(0, car.lap - 1);
  const finishBonus = car.finishTime !== null ? level.length * 0.2 : 0;
  return completedLaps * level.length + car.progress * level.length + car.checkpointIndex * 4 + finishBonus;
}

export function respawnCar(race, car, reason = "reset") {
  const progress = car.lastCheckpointProgress || 0.975;
  const point = trackPointWithOffset(race.level, progress, car.ai?.targetOffset || 0);
  car.x = point.x;
  car.y = point.y;
  car.angle = point.angle;
  car.speed = 0;
  car.lateral = 0;
  car.progress = progress;
  car.previousProgress = progress;
  car.respawnTimer = reason === "manual" ? 0.5 : 0.9;
  car.resetCount += reason === "manual" || car.isPlayer ? 1 : 0;
  car.stuckTimer = 0;
  if (car.isPlayer) {
    race.checkpointNotice = "Respawned at checkpoint";
    race.checkpointNoticeTimer = 1.1;
  }
}

export function nearestTrackInfo(track, x, y) {
  let best = null;
  for (const segment of track.segments) {
    const vx = segment.b.x - segment.a.x;
    const vy = segment.b.y - segment.a.y;
    const lengthSq = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((x - segment.a.x) * vx + (y - segment.a.y) * vy) / lengthSq));
    const px = segment.a.x + vx * t;
    const py = segment.a.y + vy * t;
    const dx = x - px;
    const dy = y - py;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(vy, vx);
    const signed = Math.sign(Math.cos(angle + Math.PI / 2) * dx + Math.sin(angle + Math.PI / 2) * dy) * distance;
    const routeDistance = segment.start + segment.length * t;
    const progress = routeDistance / track.length;
    if (!best || distance < best.distance) {
      best = { x: px, y: py, distance, distanceFromCenter: signed, routeDistance, progress, angle, segment };
    }
  }
  return best;
}

export function surfaceAt(track, progress, distanceFromCenter = 0) {
  const match = track.surfaces.find((surface) => {
    const inside = surface.from <= surface.to
      ? progress >= surface.from && progress <= surface.to
      : progress >= surface.from || progress <= surface.to;
    if (!inside) return false;
    if (surface.side === 1) return distanceFromCenter > 0;
    if (surface.side === -1) return distanceFromCenter < 0;
    return true;
  });
  const type = match?.type || (Math.abs(distanceFromCenter) > track.roadWidth / 2 ? "cloud-gravel" : "asphalt");
  const table = {
    asphalt: { type, grip: 0.985, speed: 1, accel: 1, brake: 1 },
    concrete: { type, grip: 0.995, speed: 1.04, accel: 1.05, brake: 1.04 },
    wet: { type, grip: 0.91, speed: 0.94, accel: 0.96, brake: 0.84 },
    oil: { type, grip: 0.76, speed: 0.88, accel: 0.85, brake: 0.7 },
    "cloud-gravel": { type, grip: 0.84, speed: 0.72, accel: 0.72, brake: 0.88 },
    boost: { type, grip: 0.96, speed: 1.13, accel: 1.16, brake: 0.94 },
    wind: { type, grip: 0.94, speed: 0.96, accel: 1, brake: 0.9, wind: match?.strength || 64 },
  };
  return table[type] || table.asphalt;
}

export function crossedProgress(previous, current, target) {
  if (previous <= current) return previous < target && current >= target;
  return target > previous || target <= current;
}

function crossedFinish(previous, current) {
  return previous > 0.88 && current < 0.16;
}

export function signedProgressDelta(previous, current) {
  let delta = current - previous;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  return delta;
}

export function angleDifference(target, current) {
  let delta = normalizeAngle(target - current);
  if (delta > Math.PI) delta -= TWO_PI;
  return delta;
}

export function normalizeAngle(angle) {
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

export function formatRaceTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--.--";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, "0")}`;
}

export function ordinal(value) {
  const number = Number(value);
  const suffix = number % 10 === 1 && number % 100 !== 11 ? "st" : number % 10 === 2 && number % 100 !== 12 ? "nd" : number % 10 === 3 && number % 100 !== 13 ? "rd" : "th";
  return `${number}${suffix}`;
}
