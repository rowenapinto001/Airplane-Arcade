const GRAVITY = 980;
const GROUND_EPSILON = 0.5;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (length < 0.001) return { x: 0, y: 0, length: 0 };
  return { x: x / length, y: y / length, length };
}

export function pointInRect(point, rect, pad = 0) {
  return (
    point.x >= rect.x - pad &&
    point.x <= rect.x + rect.w + pad &&
    point.y >= rect.y - pad &&
    point.y <= rect.y + rect.h + pad
  );
}

export function centeredRect(obstacle) {
  return {
    x: obstacle.x - obstacle.w / 2,
    y: obstacle.y - obstacle.h / 2,
    w: obstacle.w,
    h: obstacle.h,
  };
}

export function circleRectOverlap(circle, rect, pad = 0) {
  const cx = clamp(circle.x, rect.x - pad, rect.x + rect.w + pad);
  const cy = clamp(circle.y, rect.y - pad, rect.y + rect.h + pad);
  return Math.hypot(circle.x - cx, circle.y - cy) <= circle.radius + pad;
}

export function createStartSlots(course, count) {
  const slots = [];
  const columns = 4;
  const gapX = 58;
  const gapY = 54;
  for (let i = 0; i < count; i += 1) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    slots.push({
      x: course.start.x + (col - 1.5) * gapX,
      y: course.start.y + row * gapY,
    });
  }
  return slots;
}

export function createObstacleStates(course) {
  const states = {};
  for (const obstacle of course.obstacles) {
    states[obstacle.id] = {
      time: Math.random() * 2,
      x: obstacle.x,
      y: obstacle.y,
      previousX: obstacle.x,
      previousY: obstacle.y,
      tiltX: 0,
      tiltY: 0,
      open: true,
    };
  }
  return states;
}

export function updateObstacleStates(course, obstacleStates, contestants, dt) {
  for (const obstacle of course.obstacles) {
    const state = obstacleStates[obstacle.id];
    if (!state) continue;
    state.time += dt;
    state.previousX = state.x;
    state.previousY = state.y;
    state.x = obstacle.x;
    state.y = obstacle.y;

    if (obstacle.type === "movingWing") {
      const offset = Math.sin(state.time * obstacle.speed) * obstacle.range;
      state.x = obstacle.x + (obstacle.axis === "x" ? offset : 0);
      state.y = obstacle.y + (obstacle.axis === "y" ? offset : 0);
    }

    if (obstacle.type === "bouncingSuitcase" || obstacle.type === "rollingWheel") {
      const t = Math.sin(state.time * (Math.abs(obstacle.speed) / 85));
      state.x = obstacle.x + t * obstacle.w * 0.5;
      state.y = obstacle.y;
    }

    if (obstacle.type === "cargoCrusher") {
      const offset = Math.sin(state.time * Math.abs(obstacle.speed)) * obstacle.range;
      state.x = obstacle.x + (obstacle.axis === "x" ? offset : 0);
      state.y = obstacle.y + (obstacle.axis === "y" ? offset : 0);
    }

    if (obstacle.type === "closingGate") {
      const cycle = (state.time % obstacle.period) / obstacle.period;
      state.open = cycle < obstacle.openRatio;
    }

    if (obstacle.type === "tiltingPlatform") {
      let loadX = 0;
      let loadY = 0;
      let count = 0;
      const rect = centeredRect(obstacle);
      for (const contestant of contestants) {
        if (contestant.finished || contestant.falling || contestant.z > 12) continue;
        if (!pointInRect(contestant, rect, contestant.radius)) continue;
        loadX += (contestant.x - obstacle.x) / Math.max(1, obstacle.w / 2);
        loadY += (contestant.y - obstacle.y) / Math.max(1, obstacle.h / 2);
        count += 1;
      }
      const targetX = count ? clamp(loadX / count, -1, 1) * obstacle.maxTilt : 0;
      const targetY = count ? clamp(loadY / count, -1, 1) * obstacle.maxTilt : 0;
      state.tiltX += (targetX - state.tiltX) * Math.min(1, dt * 2.2);
      state.tiltY += (targetY - state.tiltY) * Math.min(1, dt * 2.2);
    }
  }
}

export function platformRects(course, obstacleStates = {}) {
  const output = course.platforms.map((platform) => ({ ...platform, moving: false }));
  for (const obstacle of course.obstacles) {
    if (obstacle.type !== "movingWing") continue;
    const state = obstacleStates[obstacle.id] || obstacle;
    output.push({
      x: state.x - obstacle.w / 2,
      y: state.y - obstacle.h / 2,
      w: obstacle.w,
      h: obstacle.h,
      kind: "moving-wing",
      moving: true,
      dx: (state.x || obstacle.x) - (state.previousX || obstacle.x),
      dy: (state.y || obstacle.y) - (state.previousY || obstacle.y),
      obstacleId: obstacle.id,
    });
  }
  return output;
}

export function findPlatformAt(course, obstacleStates, x, y, radius = 0) {
  return platformRects(course, obstacleStates).find((platform) => pointInRect({ x, y }, platform, radius * 0.72)) || null;
}

export function getCheckpointSpawn(course, checkpointIndex) {
  if (checkpointIndex <= 0) return { x: course.start.x, y: course.start.y };
  const checkpoint = course.checkpoints[Math.min(checkpointIndex - 1, course.checkpoints.length - 1)];
  return { x: checkpoint.x, y: checkpoint.y + 72 };
}

export function checkCheckpoint(contestant, course) {
  let reached = false;
  course.checkpoints.forEach((checkpoint, index) => {
    if (index + 1 <= contestant.checkpointIndex) return;
    const rect = {
      x: checkpoint.x - checkpoint.w / 2,
      y: checkpoint.y - checkpoint.h / 2,
      w: checkpoint.w,
      h: checkpoint.h,
    };
    if (pointInRect(contestant, rect, contestant.radius) || contestant.y <= checkpoint.y) {
      contestant.checkpointIndex = index + 1;
      reached = true;
    }
  });
  return reached;
}

export function startFall(contestant) {
  if (contestant.falling || contestant.finished) return false;
  contestant.falling = true;
  contestant.fallTimer = 0.82;
  contestant.vx = 0;
  contestant.vy = 0;
  contestant.vz = 0;
  contestant.z = 0;
  contestant.falls += 1;
  contestant.stumble = 0.55;
  return true;
}

export function respawnContestant(contestant, course) {
  const spawn = getCheckpointSpawn(course, contestant.checkpointIndex);
  contestant.x = spawn.x + contestant.spawnOffsetX;
  contestant.y = spawn.y + contestant.spawnOffsetY;
  contestant.z = 0;
  contestant.vx = 0;
  contestant.vy = 0;
  contestant.vz = 0;
  contestant.falling = false;
  contestant.fallTimer = 0;
  contestant.protection = 1.2;
  contestant.diveTimer = 0;
  contestant.checkpointsUsed += 1;
}

export function updateContestantPhysics(contestant, input, course, obstacleStates, config, dt) {
  const events = [];
  if (contestant.finished || contestant.eliminated) return events;

  contestant.animationTime += dt;
  contestant.protection = Math.max(0, contestant.protection - dt);
  contestant.jumpCooldown = Math.max(0, contestant.jumpCooldown - dt);
  contestant.diveCooldown = Math.max(0, contestant.diveCooldown - dt);
  contestant.diveTimer = Math.max(0, contestant.diveTimer - dt);
  contestant.stumble = Math.max(0, contestant.stumble - dt);
  contestant.padCooldown = Math.max(0, contestant.padCooldown - dt);

  if (contestant.falling) {
    contestant.fallTimer -= dt;
    contestant.z = -Math.sin((contestant.fallTimer / 0.82) * Math.PI) * 38;
    if (contestant.fallTimer <= 0) {
      respawnContestant(contestant, course);
      events.push("respawn");
    }
    return events;
  }

  const onGround = contestant.z <= GROUND_EPSILON;
  const platform = findPlatformAt(course, obstacleStates, contestant.x, contestant.y, contestant.radius);
  if (platform?.moving && onGround) {
    contestant.x += platform.dx || 0;
    contestant.y += platform.dy || 0;
  }

  const slippery = isInsideObstacle(contestant, course, "slipperyCloud");
  const move = normalize(input.x || 0, input.y || 0);
  const airFactor = onGround ? 1 : 0.45;
  const traction = slippery ? 0.48 : 1;
  const accel = config.acceleration * airFactor * traction;
  contestant.vx += move.x * accel * dt;
  contestant.vy += move.y * accel * dt;

  if (input.jump && onGround && contestant.jumpCooldown <= 0) {
    contestant.vz = config.jumpVelocity;
    contestant.jumpCooldown = 0.42;
    contestant.jumps += 1;
    events.push("jump");
  }

  if (input.dive && contestant.diveCooldown <= 0 && contestant.diveTimer <= 0) {
    const facing = normalize(contestant.facingX, contestant.facingY || -1);
    contestant.vx += facing.x * config.diveImpulse;
    contestant.vy += facing.y * config.diveImpulse;
    contestant.diveTimer = 0.36;
    contestant.diveCooldown = config.diveCooldown;
    contestant.stumble = 0.34;
    events.push("dive");
  }

  const maxSpeed = contestant.diveTimer > 0 ? config.maxSpeed * 1.35 : config.maxSpeed * contestant.speedMultiplier;
  const currentSpeed = Math.hypot(contestant.vx, contestant.vy);
  if (currentSpeed > maxSpeed) {
    contestant.vx = (contestant.vx / currentSpeed) * maxSpeed;
    contestant.vy = (contestant.vy / currentSpeed) * maxSpeed;
  }

  applyObstacles(contestant, course, obstacleStates, dt, events);

  const friction = onGround ? (slippery ? config.slipperyFriction : config.friction) : 0.985;
  contestant.vx *= Math.pow(friction, dt * 60);
  contestant.vy *= Math.pow(friction, dt * 60);
  contestant.x += contestant.vx * dt;
  contestant.y += contestant.vy * dt;

  contestant.vz -= GRAVITY * dt;
  contestant.z += contestant.vz * dt;
  if (contestant.z <= 0) {
    contestant.z = 0;
    contestant.vz = 0;
  }

  const facing = normalize(contestant.vx, contestant.vy);
  if (facing.length > 10) {
    contestant.facingX = facing.x;
    contestant.facingY = facing.y;
  }

  if (checkCheckpoint(contestant, course)) events.push("checkpoint");

  const groundedPlatform = findPlatformAt(course, obstacleStates, contestant.x, contestant.y, contestant.radius * 0.38);
  if (contestant.z <= GROUND_EPSILON && !groundedPlatform) {
    if (startFall(contestant)) events.push("fall");
  }

  return events;
}

function isInsideObstacle(contestant, course, type) {
  return course.obstacles.some((obstacle) => obstacle.type === type && pointInRect(contestant, centeredRect(obstacle), contestant.radius));
}

function applyObstacles(contestant, course, obstacleStates, dt, events) {
  for (const obstacle of course.obstacles) {
    const state = obstacleStates[obstacle.id] || obstacle;
    if (obstacle.type === "conveyor" && pointInRect(contestant, centeredRect(obstacle), contestant.radius)) {
      const dir = normalize(obstacle.dirX, obstacle.dirY);
      contestant.vx += dir.x * obstacle.speed * dt * 4.4;
      contestant.vy += dir.y * obstacle.speed * dt * 4.4;
    }

    if (obstacle.type === "windTurbine" && pointInRect(contestant, centeredRect(obstacle), contestant.radius)) {
      contestant.vx += obstacle.dirX * obstacle.strength * dt;
      contestant.vy += obstacle.dirY * obstacle.strength * dt;
    }

    if (obstacle.type === "closingGate") {
      const gate = centeredRect(obstacle);
      if (!state.open && pointInRect(contestant, gate, contestant.radius)) {
        contestant.y += 135 * dt;
        contestant.vy = Math.max(contestant.vy, 95);
        contestant.stumble = Math.max(contestant.stumble, 0.18);
        events.push("obstacle");
      }
    }

    if (obstacle.type === "jumpPad" && pointInRect(contestant, centeredRect(obstacle), contestant.radius) && contestant.padCooldown <= 0 && contestant.z <= 4) {
      contestant.vx += obstacle.pushX || 0;
      contestant.vy += obstacle.pushY || -220;
      contestant.vz = Math.max(contestant.vz, obstacle.jump || 360);
      contestant.padCooldown = 1.1;
      contestant.jumps += 1;
      events.push("jumpPad");
    }

    if (obstacle.type === "tiltingPlatform" && pointInRect(contestant, centeredRect(obstacle), contestant.radius) && contestant.z <= 4) {
      contestant.vx += state.tiltX * 95 * dt;
      contestant.vy += state.tiltY * 95 * dt;
    }

    if (obstacle.type === "rotatingBar") {
      const hit = rotatingBarHit(contestant, obstacle, state);
      if (hit) {
        contestant.vx += hit.x * 220 * dt + hit.tx * Math.sign(obstacle.speed) * 90 * dt;
        contestant.vy += hit.y * 220 * dt + hit.ty * Math.sign(obstacle.speed) * 90 * dt;
        contestant.stumble = Math.max(contestant.stumble, 0.28);
        contestant.obstacleHits += 1;
        contestant.rotatingBarHits += 1;
        events.push("bar");
      }
    }

    if (obstacle.type === "bouncingSuitcase" || obstacle.type === "rollingWheel") {
      const radius = obstacle.radius || 34;
      const dx = contestant.x - state.x;
      const dy = contestant.y - state.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      if (d < contestant.radius + radius) {
        contestant.vx += (dx / d) * 185;
        contestant.vy += (dy / d) * 150 + (obstacle.type === "rollingWheel" ? 85 : 0);
        contestant.stumble = Math.max(contestant.stumble, 0.33);
        contestant.obstacleHits += 1;
        events.push("obstacle");
      }
    }

    if (obstacle.type === "cargoCrusher") {
      const rect = {
        x: state.x - obstacle.w / 2,
        y: state.y - obstacle.h / 2,
        w: obstacle.w,
        h: obstacle.h,
      };
      if (pointInRect(contestant, rect, contestant.radius)) {
        const dx = contestant.x - state.x;
        const dy = contestant.y - state.y;
        const dir = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx || 1) : 0;
        contestant.vx += dir * 260 * dt;
        contestant.vy += Math.sign(dy || 1) * 105 * dt;
        contestant.stumble = Math.max(contestant.stumble, 0.3);
        contestant.obstacleHits += 1;
        events.push("obstacle");
      }
    }
  }
}

function rotatingBarHit(contestant, obstacle, state) {
  if (contestant.z > 24) return null;
  const angle = state.time * obstacle.speed;
  const half = obstacle.length / 2;
  const ax = obstacle.x + Math.cos(angle) * half;
  const ay = obstacle.y + Math.sin(angle) * half;
  const bx = obstacle.x - Math.cos(angle) * half;
  const by = obstacle.y - Math.sin(angle) * half;
  const projection = projectPointToSegment(contestant.x, contestant.y, ax, ay, bx, by);
  const dx = contestant.x - projection.x;
  const dy = contestant.y - projection.y;
  const d = Math.max(0.001, Math.hypot(dx, dy));
  if (d > contestant.radius + obstacle.width / 2) return null;
  return {
    x: dx / d,
    y: dy / d,
    tx: -Math.sin(angle),
    ty: Math.cos(angle),
  };
}

function projectPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / Math.max(1, dx * dx + dy * dy), 0, 1);
  return { x: ax + dx * t, y: ay + dy * t };
}

export function resolveContestantCollisions(contestants, dt) {
  for (let i = 0; i < contestants.length; i += 1) {
    const a = contestants[i];
    if (a.finished || a.falling || a.eliminated) continue;
    for (let j = i + 1; j < contestants.length; j += 1) {
      const b = contestants[j];
      if (b.finished || b.falling || b.eliminated) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.max(0.001, Math.hypot(dx, dy));
      const min = a.radius + b.radius;
      if (d >= min) continue;
      const overlap = (min - d) * 0.5;
      const nx = dx / d;
      const ny = dy / d;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;
      a.vx -= nx * 28 * dt;
      a.vy -= ny * 28 * dt;
      b.vx += nx * 28 * dt;
      b.vy += ny * 28 * dt;
      a.stumble = Math.max(a.stumble, 0.08);
      b.stumble = Math.max(b.stumble, 0.08);
    }
  }
}

export function finishReached(contestant, course) {
  if (course.final) return distance(contestant, course.finish) <= course.finish.radius + contestant.radius && contestant.z <= 36;
  return contestant.y <= course.finish.y + 45 && Math.abs(contestant.x - course.finish.x) <= 290;
}
