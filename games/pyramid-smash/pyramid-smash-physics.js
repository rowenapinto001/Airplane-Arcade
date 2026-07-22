import { createBall, getBallType } from "./pyramid-smash-balls.js";
import { OBJECT_TYPES } from "./pyramid-smash-levels.js";

export const WORLD_WIDTH = 1100;
export const WORLD_HEIGHT = 620;

const MAX_DT = 1 / 24;
const STEP = 1 / 120;
const FLOOR_Y = WORLD_HEIGHT + 170;
const SUPPORT_TOLERANCE = 6;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function typeConfig(type) {
  return OBJECT_TYPES[type] || OBJECT_TYPES.normal;
}

function bodySpeed(body) {
  return Math.hypot(body.vx || 0, body.vy || 0);
}

function slidingRetention(object) {
  return Math.max(0.986, Math.min(0.996, 0.997 - object.friction * 0.006));
}

function isBoxOverlap(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}

function addEffect(world, effect) {
  world.effects.push({ age: 0, life: 0.7, ...effect });
}

export function createWorld(level) {
  const platforms = clone(level.platforms).map((platform) => ({
    ...platform,
    baseX: platform.x,
    baseY: platform.y,
    vx: 0,
    tilt: 0,
  }));
  const objects = clone(level.objects).map((object, index) => {
    const config = typeConfig(object.type);
    return {
      ...object,
      id: object.id || `object-${index + 1}`,
      x0: object.x,
      y0: object.y,
      vx: 0,
      vy: 0,
      angle: 0,
      angularVelocity: 0,
      mass: config.mass,
      bounce: config.bounce,
      friction: config.friction,
      strength: config.strength,
      health: config.breakable ? 0.8 : 1.15 + config.strength * 0.45,
      required: object.required ?? config.required ?? true,
      bonus: Boolean(config.bonus || object.type === "bonus"),
      removed: false,
      destroyed: false,
      directHits: 0,
      railDirection: 1,
      sleepTime: 0,
      hitFlash: 0,
      config,
    };
  });
  return {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    level,
    launcher: { x: 112, y: 455 },
    gravity: 880,
    wind: level.wind || 0,
    time: 0,
    shotActive: false,
    settlingTimer: 0,
    platforms,
    barriers: clone(level.barriers || []),
    objects,
    balls: [],
    effects: [],
    totalRequired: objects.filter((object) => object.required).length,
    totalBonus: objects.filter((object) => object.bonus).length,
  };
}

export function launchBall(world, ballTypeId, angle, power) {
  const type = getBallType(ballTypeId);
  const clampedPower = Math.max(0.12, Math.min(1, power));
  const speed = 320 + clampedPower * 570;
  const ball = createBall(type.id, world.launcher.x, world.launcher.y, {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed,
  });
  world.balls.push(ball);
  world.shotActive = true;
  world.settlingTimer = 0;
  addEffect(world, { kind: "launch", x: ball.x, y: ball.y, color: type.color, life: 0.35 });
  return ball;
}

export function updatePhysics(world, dt) {
  const safeDt = Math.min(MAX_DT, Math.max(0, dt));
  const steps = Math.max(1, Math.ceil(safeDt / STEP));
  const step = safeDt / steps;
  for (let i = 0; i < steps; i += 1) {
    stepWorld(world, step);
  }
  world.effects = world.effects
    .map((effect) => ({ ...effect, age: effect.age + safeDt }))
    .filter((effect) => effect.age < effect.life);
}

export function isWorldSettled(world) {
  const activeBall = world.balls.some((ball) => ball.active);
  const unsettledObject = world.objects.some(
    (object) => !object.removed && (bodySpeed(object) > 18 || (!isObjectSupported(world, object) && object.y < FLOOR_Y - 40)),
  );
  return !activeBall && !unsettledObject;
}

export function settleLowSpeed(world) {
  for (const object of world.objects) {
    if (bodySpeed(object) < 20) {
      object.vx = 0;
      object.vy = 0;
      object.angularVelocity = 0;
    }
  }
}

export function requiredRemaining(world) {
  return world.objects.filter((object) => object.required && !object.removed).length;
}

export function bonusCollected(world) {
  return world.objects.filter((object) => object.bonus && object.removed).length;
}

export function removedRequired(world) {
  return world.objects.filter((object) => object.required && object.removed).length;
}

function stepWorld(world, dt) {
  world.time += dt;
  updatePlatforms(world, dt);
  updateObjects(world, dt);
  resolveObjectPairs(world);
  updateBalls(world, dt);
  removeFallenObjects(world);
}

function updatePlatforms(world, dt) {
  for (const platform of world.platforms) {
    const previousX = platform.x;
    const previousY = platform.y;
    if (platform.kind === "moving") {
      platform.x = platform.baseX + Math.sin(world.time * 0.9 + platform.phase) * 70;
    } else if (platform.kind === "rotating") {
      platform.tilt = Math.sin(world.time * 0.75 + platform.phase) * 0.07;
    } else if (platform.kind === "tilting") {
      platform.tilt = Math.sin(world.time * 0.55 + platform.phase) * 0.045;
    }
    platform.vx = (platform.x - previousX) / Math.max(dt, 0.001);
    const dx = platform.x - previousX;
    const dy = platform.y - previousY;
    if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
      for (const object of world.objects) {
        if (object.removed) continue;
        const onTop =
          Math.abs(object.y + object.h / 2 - platform.y) < 3 &&
          object.x > platform.x - platform.w / 2 - object.w / 2 &&
          object.x < platform.x + platform.w / 2 + object.w / 2;
        if (onTop && bodySpeed(object) < 28) {
          object.x += dx;
          object.y += dy;
        }
      }
    }
  }
}

function updateObjects(world, dt) {
  for (const object of world.objects) {
    if (object.removed) continue;
    object.hitFlash = Math.max(0, object.hitFlash - dt * 5);
    if (object.rail && bodySpeed(object) < 28) {
      object.x += object.rail.speed * object.railDirection * dt;
      if (object.x < object.rail.min || object.x > object.rail.max) {
        object.x = Math.max(object.rail.min, Math.min(object.rail.max, object.x));
        object.railDirection *= -1;
      }
    }
    object.vy += (world.gravity - (object.config.lift || 0)) * dt;
    object.x += object.vx * dt;
    object.y += object.vy * dt;
    object.angle += object.angularVelocity * dt;
    object.vx *= Math.pow(0.996, dt * 60);
    object.angularVelocity *= Math.pow(0.985, dt * 60);
    resolveObjectStatic(world, object);
    const supported = isObjectSupported(world, object);
    if (!supported && Math.abs(object.vy) < 10) {
      object.vy += world.gravity * dt * 0.7;
      object.sleepTime = 0;
    } else if (bodySpeed(object) < 12 && supported) {
      object.sleepTime += dt;
      if (object.sleepTime > 0.5) {
        object.vx = 0;
        object.vy = 0;
        object.angularVelocity = 0;
      }
    } else {
      object.sleepTime = 0;
    }
  }
}

function resolveObjectStatic(world, object) {
  for (const platform of world.platforms) {
    const left = platform.x - platform.w / 2;
    const right = platform.x + platform.w / 2;
    const top = platform.y;
    const bottom = platform.y + platform.h;
    const overlapX = object.x + object.w / 2 > left && object.x - object.w / 2 < right;
    const overlapY = object.y + object.h / 2 > top && object.y - object.h / 2 < bottom;
    if (overlapX && overlapY && object.vy >= -80) {
      object.y = top - object.h / 2;
      object.vy = object.vy > 55 ? -object.vy * object.bounce * 0.25 : 0;
      object.vx = object.vx * slidingRetention(object) + platform.vx * 0.05;
      object.angularVelocity *= 0.78;
    }
  }
  for (const barrier of world.barriers) {
    if (!isBoxOverlap(object, barrier)) continue;
    const dx = object.x - barrier.x;
    const px = (object.w + barrier.w) / 2 - Math.abs(dx);
    const dy = object.y - barrier.y;
    const py = (object.h + barrier.h) / 2 - Math.abs(dy);
    if (px < py) {
      object.x += Math.sign(dx || 1) * px;
      object.vx = -object.vx * 0.18;
    } else {
      object.y += Math.sign(dy || 1) * py;
      object.vy = -object.vy * 0.12;
    }
    object.angularVelocity += object.vx * 0.004;
  }
}

function resolveObjectPairs(world) {
  const objects = world.objects.filter((object) => !object.removed);
  for (let i = 0; i < objects.length; i += 1) {
    for (let j = i + 1; j < objects.length; j += 1) {
      resolveObjectPair(objects[i], objects[j]);
    }
  }
}

function resolveObjectPair(a, b) {
  if (!isBoxOverlap(a, b)) return;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const px = (a.w + b.w) / 2 - Math.abs(dx);
  const py = (a.h + b.h) / 2 - Math.abs(dy);
  const invA = 1 / Math.max(0.1, a.mass);
  const invB = 1 / Math.max(0.1, b.mass);
  const totalInv = invA + invB;
  if (px < py) {
    const normal = Math.sign(dx || 1);
    a.x -= normal * px * (invA / totalInv);
    b.x += normal * px * (invB / totalInv);
    const relative = (b.vx - a.vx) * normal;
    if (relative < 0) {
      const impulse = -(1 + Math.min(a.bounce, b.bounce)) * relative / totalInv;
      a.vx -= normal * impulse * invA;
      b.vx += normal * impulse * invB;
      a.angularVelocity -= normal * impulse * 0.003;
      b.angularVelocity += normal * impulse * 0.003;
    }
  } else {
    const normal = Math.sign(dy || 1);
    a.y -= normal * py * (invA / totalInv);
    b.y += normal * py * (invB / totalInv);
    transferSupportFriction(a, b);
    const relative = (b.vy - a.vy) * normal;
    if (relative < 0) {
      const impulse = -(1 + Math.min(a.bounce, b.bounce)) * relative / totalInv;
      a.vy -= normal * impulse * invA;
      b.vy += normal * impulse * invB;
      a.vx *= slidingRetention(a);
      b.vx *= slidingRetention(b);
    }
  }
}

function updateBalls(world, dt) {
  for (const ball of world.balls) {
    if (!ball.active) continue;
    ball.vx += world.wind * (ball.windScale || 1) * dt;
    ball.vy += world.gravity * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.spin += ball.vx * dt * 0.05;
    resolveBallStatic(world, ball);
    for (const object of world.objects) {
      if (!object.removed) resolveBallObject(world, ball, object);
    }
    ball.vx *= Math.pow(ball.friction, dt * 60);
    if (ball.y > FLOOR_Y || ball.x > WORLD_WIDTH + 240 || ball.x < -160) {
      ball.active = false;
    }
    if (bodySpeed(ball) < 16 && ball.y > 470) {
      ball.sleepTime += dt;
      if (ball.sleepTime > 0.7) ball.active = false;
    } else {
      ball.sleepTime = 0;
    }
  }
}

function resolveBallStatic(world, ball) {
  for (const platform of world.platforms) {
    const left = platform.x - platform.w / 2;
    const right = platform.x + platform.w / 2;
    const top = platform.y;
    const withinX = ball.x + ball.radius > left && ball.x - ball.radius < right;
    if (withinX && ball.y + ball.radius > top && ball.y < top + platform.h && ball.vy > 0) {
      ball.y = top - ball.radius;
      ball.vy = -ball.vy * ball.bounce * 0.6;
      ball.vx = (ball.vx + platform.vx * 0.16) * 0.88;
      if (Math.abs(ball.vy) < 52) ball.vy = 0;
    }
  }
  for (const barrier of world.barriers) {
    const closestX = Math.max(barrier.x - barrier.w / 2, Math.min(ball.x, barrier.x + barrier.w / 2));
    const closestY = Math.max(barrier.y - barrier.h / 2, Math.min(ball.y, barrier.y + barrier.h / 2));
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance < ball.radius) {
      const nx = dx / distance;
      const ny = dy / distance;
      const push = ball.radius - distance;
      ball.x += nx * push;
      ball.y += ny * push;
      const velocityAlongNormal = ball.vx * nx + ball.vy * ny;
      if (velocityAlongNormal < 0) {
        ball.vx -= (1 + ball.bounce) * velocityAlongNormal * nx;
        ball.vy -= (1 + ball.bounce) * velocityAlongNormal * ny;
      }
    }
  }
}

function resolveBallObject(world, ball, object) {
  const closestX = Math.max(object.x - object.w / 2, Math.min(ball.x, object.x + object.w / 2));
  const closestY = Math.max(object.y - object.h / 2, Math.min(ball.y, object.y + object.h / 2));
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  const distance = Math.hypot(dx, dy) || 1;
  if (distance >= ball.radius) return;

  const nx = dx / distance;
  const ny = dy / distance;
  const push = ball.radius - distance + 0.2;
  ball.x += nx * push * 0.72;
  ball.y += ny * push * 0.72;

  const relativeX = ball.vx - object.vx;
  const relativeY = ball.vy - object.vy;
  const velocityAlongNormal = relativeX * nx + relativeY * ny;
  const impact = Math.max(80, Math.abs(velocityAlongNormal) * ball.impact * ball.mass);
  object.directHits += 1;
  object.hitFlash = 1;
  object.vx -= nx * impact / Math.max(0.2, object.mass) * 0.32;
  object.vy -= ny * impact / Math.max(0.2, object.mass) * 0.32;
  object.angularVelocity += (ny * ball.vx - nx * ball.vy) * 0.004;
  cascadeStackImpulse(world, object, -nx, impact);
  if (velocityAlongNormal < 0) {
    ball.vx -= (1 + ball.bounce) * velocityAlongNormal * nx;
    ball.vy -= (1 + ball.bounce) * velocityAlongNormal * ny;
  }
  ball.vx *= ball.sticky ? 0.38 : 0.9;
  ball.vy *= ball.sticky ? 0.38 : 0.9;

  damageObject(world, object, impact, ball);
  if (object.config.spring && impact > 120) springBurst(world, object);
  if (object.config.mystery && impact > 140) {
    object.vx -= 170;
    addEffect(world, { kind: "mystery", x: object.x, y: object.y, color: object.config.accent, life: 0.55 });
  }
  if (ball.split && !ball.splitDone && impact > 135) splitBall(world, ball, nx, ny);
  addEffect(world, { kind: "spark", x: closestX, y: closestY, color: object.config.accent, life: 0.42, power: Math.min(1.6, impact / 260) });
}

function damageObject(world, object, impact, ball) {
  if (object.removed) return;
  const lockedPenalty = object.config.locked && object.directHits < 2 ? 0.25 : 1;
  object.health -= (impact / (240 * object.strength)) * lockedPenalty;
  const strongHit = impact > 350 * object.strength;
  if (object.health <= 0 || object.config.breakable || (object.config.locked && strongHit)) {
    cascadeStackImpulse(world, object, Math.sign(object.vx) || 1, impact * 0.9);
    object.removed = true;
    object.destroyed = true;
    addEffect(world, {
      kind: object.bonus ? "bonus" : "break",
      x: object.x,
      y: object.y,
      color: object.config.color,
      accent: object.config.accent,
      life: object.bonus ? 1 : 0.65,
    });
  } else if (ball.sticky) {
    object.vx += ball.vx * 0.18;
    object.vy += ball.vy * 0.12;
  }
}

function springBurst(world, object) {
  addEffect(world, { kind: "spring", x: object.x, y: object.y, color: object.config.color, life: 0.55 });
  for (const target of world.objects) {
    if (target === object || target.removed) continue;
    const dx = target.x - object.x;
    const dy = target.y - object.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 145 || distance < 1) continue;
    const force = (145 - distance) * 3.2;
    target.vx += (dx / distance) * force;
    target.vy += (dy / distance) * force - 65;
  }
}

function splitBall(world, ball, nx, ny) {
  ball.splitDone = true;
  const baseAngle = Math.atan2(ball.vy, ball.vx);
  for (const offset of [-0.48, 0.48]) {
    const speed = Math.max(230, bodySpeed(ball) * 0.72);
    const child = createBall("precision", ball.x + nx * 10, ball.y + ny * 10, {
      x: Math.cos(baseAngle + offset) * speed,
      y: Math.sin(baseAngle + offset) * speed,
    });
    child.radius = 10;
    child.mass = 0.48;
    child.color = "#ef5b63";
    child.accent = "#fff4c8";
    world.balls.push(child);
  }
}

function removeFallenObjects(world) {
  for (const object of world.objects) {
    if (object.removed) continue;
    const belowWorld = object.y > FLOOR_Y;
    const fullyPastPlatform = object.y > 540 && !world.platforms.some((platform) => {
      const left = platform.x - platform.w / 2 - object.w / 2;
      const right = platform.x + platform.w / 2 + object.w / 2;
      return object.x > left && object.x < right && object.y < platform.y + 115;
    });
    if (belowWorld || fullyPastPlatform || object.x < -130 || object.x > WORLD_WIDTH + 130) {
      cascadeStackImpulse(world, object, Math.sign(object.vx) || 1, 180);
      object.removed = true;
      addEffect(world, { kind: object.bonus ? "bonus" : "fall", x: object.x, y: Math.min(object.y, WORLD_HEIGHT - 24), color: object.config.color, life: 0.6 });
    }
  }
}

function transferSupportFriction(a, b) {
  const upper = a.y < b.y ? a : b;
  const lower = upper === a ? b : a;
  const upperBottom = upper.y + upper.h / 2;
  const lowerTop = lower.y - lower.h / 2;
  const horizontal = overlapAmount(upper.x, upper.w, lower.x, lower.w);
  if (Math.abs(upperBottom - lowerTop) > SUPPORT_TOLERANCE || horizontal < Math.min(upper.w, lower.w) * 0.18) return;
  const drag = (lower.vx - upper.vx) * 0.24;
  upper.vx += drag;
  lower.vx -= drag * 0.08 * (upper.mass / Math.max(0.2, lower.mass));
  upper.angularVelocity += drag * 0.006;
  upper.sleepTime = 0;
  lower.sleepTime = 0;
}

function cascadeStackImpulse(world, source, direction, impact) {
  const pushDirection = direction || Math.sign(source.vx) || 1;
  for (const target of world.objects) {
    if (target === source || target.removed) continue;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const aboveSource = target.y < source.y + source.h * 0.15 && target.y > source.y - source.h * 3.3;
    const sameRowNeighbor = Math.abs(dy) < source.h * 0.55 && Math.abs(dx) < source.w * 1.45;
    const stackedNeighbor =
      aboveSource &&
      Math.abs(dx) < source.w * 1.35 &&
      target.y + target.h / 2 <= source.y + source.h / 2 + SUPPORT_TOLERANCE;
    if (!sameRowNeighbor && !stackedNeighbor) continue;
    const distanceFalloff = 1 - Math.min(1, Math.hypot(dx, dy) / (source.w * 3.4));
    const force = Math.max(24, impact * distanceFalloff * (stackedNeighbor ? 0.34 : 0.14));
    target.vx += pushDirection * force / Math.max(0.4, target.mass);
    if (stackedNeighbor) target.vy += Math.min(140, force * 0.38);
    target.angularVelocity += pushDirection * force * 0.005;
    target.sleepTime = 0;
    target.hitFlash = Math.max(target.hitFlash || 0, 0.28);
  }
}

function isObjectSupported(world, object) {
  const bottom = object.y + object.h / 2;
  for (const platform of world.platforms) {
    const top = platform.y;
    const overlap = overlapAmount(object.x, object.w, platform.x, platform.w);
    if (Math.abs(bottom - top) <= SUPPORT_TOLERANCE && overlap > object.w * 0.28) return true;
  }
  for (const other of world.objects) {
    if (other === object || other.removed) continue;
    const otherTop = other.y - other.h / 2;
    const overlap = overlapAmount(object.x, object.w, other.x, other.w);
    if (Math.abs(bottom - otherTop) <= SUPPORT_TOLERANCE && overlap > Math.min(object.w, other.w) * 0.16) return true;
  }
  return false;
}

function overlapAmount(ax, aw, bx, bw) {
  return Math.max(0, Math.min(ax + aw / 2, bx + bw / 2) - Math.max(ax - aw / 2, bx - bw / 2));
}
