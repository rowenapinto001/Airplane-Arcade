export const COURSE = {
  width: 820,
  startY: 2580,
  finishY: 230,
  spectatorX: 900,
  qualifiedX: -80,
  boundaryPadding: 52,
};

export function createContestant(profile, index, isPlayer = false) {
  const laneCount = 8;
  const lane = index % laneCount;
  const row = Math.floor(index / laneCount);
  return {
    id: profile.id,
    name: profile.name,
    color: profile.color,
    accent: profile.accent,
    accessory: profile.accessory,
    personality: profile.personality || "balanced",
    isPlayer,
    x: 116 + lane * 84 + (row % 2) * 18,
    y: COURSE.startY + row * 58,
    vx: 0,
    vy: 0,
    radius: 22,
    state: "racing",
    eliminated: false,
    qualified: false,
    placement: null,
    speed: profile.speed || 1,
    reaction: profile.reaction || 0.5,
    risk: profile.risk || 0.4,
    diveCooldown: 0,
    diveTimer: 0,
    standTimer: 0,
    bodyAngle: 0,
    lastScanX: 0,
    lastScanY: 0,
    successfulFreezes: 0,
    pushed: false,
    ai: profile.ai || null,
  };
}

export function updateContestantMovement(contestant, input, config, dt) {
  if (contestant.eliminated || contestant.qualified) {
    contestant.vx *= 0.84;
    contestant.vy *= 0.84;
    return;
  }

  contestant.diveCooldown = Math.max(0, contestant.diveCooldown - dt);
  contestant.diveTimer = Math.max(0, contestant.diveTimer - dt);
  contestant.standTimer = Math.max(0, contestant.standTimer - dt);

  if (input.dive && contestant.diveCooldown <= 0 && contestant.diveTimer <= 0 && contestant.standTimer <= 0) {
    contestant.diveTimer = 0.34;
    contestant.standTimer = 0.78;
    contestant.diveCooldown = 2.1;
    contestant.vy -= 520;
    contestant.vx += (input.x || 0) * 135;
  }

  const diving = contestant.diveTimer > 0;
  const standing = !diving && contestant.standTimer > 0;
  const maxSpeed = (input.sprint ? 405 : 278) * contestant.speed;
  const sideSpeed = (input.sprint ? 250 : 190) * contestant.speed;
  const accel = input.sprint ? 1120 : 920;

  if (!diving && !standing) {
    contestant.vx += input.x * sideSpeed * dt * 4.8;
    contestant.vy += input.y * accel * dt;
    contestant.vx = clamp(contestant.vx, -sideSpeed, sideSpeed);
    contestant.vy = clamp(contestant.vy, -maxSpeed, maxSpeed * 0.55);
  }

  const friction = config.playerFriction * (input.sprint ? 0.74 : 1);
  contestant.vx = applyFriction(contestant.vx, friction, dt);
  contestant.vy = applyFriction(contestant.vy, friction * (input.sprint ? 0.78 : 1), dt);

  contestant.x += contestant.vx * dt;
  contestant.y += contestant.vy * dt;
  contestant.x = clamp(contestant.x, COURSE.boundaryPadding, COURSE.width - COURSE.boundaryPadding);
  contestant.y = clamp(contestant.y, COURSE.finishY - 80, COURSE.startY + 140);
  contestant.bodyAngle += (Math.atan2(contestant.vx, -contestant.vy || -1) * 0.14 - contestant.bodyAngle) * 0.08;

  if (diving) contestant.state = "diving";
  else if (standing) contestant.state = "standing";
  else if (Math.hypot(contestant.vx, contestant.vy) > 185) contestant.state = input.sprint ? "sprinting" : "running";
  else if (Math.hypot(contestant.vx, contestant.vy) > 18) contestant.state = "walking";
  else contestant.state = "frozen";
}

export function resolveContestantCollisions(contestants) {
  for (let i = 0; i < contestants.length; i += 1) {
    for (let j = i + 1; j < contestants.length; j += 1) {
      const a = contestants[i];
      const b = contestants[j];
      if (a.eliminated || b.eliminated || a.qualified || b.qualified) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(0.001, Math.hypot(dx, dy));
      const overlap = a.radius + b.radius - dist;
      if (overlap <= 0) continue;
      const nx = dx / dist;
      const ny = dy / dist;
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;
      a.vx -= nx * 20;
      b.vx += nx * 20;
      a.vy -= ny * 10;
      b.vy += ny * 10;
      a.pushed = true;
      b.pushed = true;
    }
  }
}

export function registerFinishers(contestants, finishers, mode) {
  const limit = mode === "champion" ? 1 : 8;
  const newlyFinished = [];
  for (const contestant of contestants) {
    if (contestant.eliminated || contestant.qualified) continue;
    if (contestant.y + contestant.radius > COURSE.finishY) continue;
    contestant.qualified = true;
    contestant.state = "qualified";
    contestant.placement = finishers.length + 1;
    contestant.finishDistance = COURSE.startY - COURSE.finishY;
    contestant.vx = 0;
    contestant.vy = 0;
    contestant.x = COURSE.qualifiedX + contestant.placement * 42;
    contestant.y = COURSE.finishY - 76;
    finishers.push(contestant.id);
    newlyFinished.push(contestant);
  }
  return { newlyFinished, limit, slotsFilled: finishers.length >= limit };
}

export function movementDetected(contestant, config) {
  const drift = Math.hypot(contestant.x - contestant.lastScanX, contestant.y - contestant.lastScanY);
  const speed = Math.hypot(contestant.vx, contestant.vy);
  const bodyMoving = Math.abs(contestant.bodyAngle) > 0.16 && speed > config.velocityTolerance * 0.55;
  return drift > config.tolerance || speed > config.velocityTolerance || bodyMoving || contestant.state === "diving" || contestant.state === "standing";
}

export function markScanOrigins(contestants) {
  for (const contestant of contestants) {
    contestant.lastScanX = contestant.x;
    contestant.lastScanY = contestant.y;
  }
}

export function teleportToSpectator(contestant, order = 0) {
  contestant.eliminated = true;
  contestant.finishDistance = Math.max(0, COURSE.startY - contestant.y);
  contestant.state = "spectator";
  contestant.vx = 0;
  contestant.vy = 0;
  contestant.x = COURSE.spectatorX;
  contestant.y = 420 + order * 38;
}

export function velocityLabel(contestant, config) {
  const speed = Math.hypot(contestant.vx, contestant.vy);
  if (speed < config.velocityTolerance * 0.42) return "Safe";
  if (speed < config.velocityTolerance * 1.4) return "Moving";
  return "Too Fast to Stop";
}

function applyFriction(value, friction, dt) {
  if (Math.abs(value) < 0.5) return 0;
  const factor = Math.max(0, 1 - friction * dt);
  return value * factor;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
