import { terrainAt, obstacleNear } from "./rally-terrain.js";

export function createVehicleState(vehicle, stats, startX = 120) {
  return {
    vehicleId: vehicle.id,
    x: startX,
    y: 250,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    wheelSpin: 0,
    fuel: stats.fuelCapacity,
    maxFuel: stats.fuelCapacity,
    abilityCooldown: 0,
    abilityTimer: 0,
    cushionReady: false,
    crashed: false,
    crashReason: "",
    upsideDownTimer: 0,
    grounded: false,
    frontContact: false,
    rearContact: false,
    lastGrounded: true,
    airtime: 0,
    wheelieTime: 0,
    flips: 0,
    flipAccumulator: 0,
    hardLanding: false,
    checkpointX: startX,
    distance: 0,
  };
}

export function updateVehiclePhysics(state, terrain, vehicle, stats, input, dt) {
  const env = terrain.environment;
  const gravity = env.gravity;
  const gripBonus = state.abilityTimer > 0 && vehicle.ability === "grip-lock" ? 1.45 : 1;
  const fuelSaver = state.abilityTimer > 0 && vehicle.ability === "fuel-saver" ? 0.42 : 1;
  const airStabiliser = state.abilityTimer > 0 && vehicle.ability === "air-stabiliser";
  const throttle = input.accelerate ? 1 : input.brake ? -0.58 : 0;

  state.abilityCooldown = Math.max(0, state.abilityCooldown - dt);
  state.abilityTimer = Math.max(0, state.abilityTimer - dt);
  state.hardLanding = false;

  const rear = wheelPoint(state, -36);
  const front = wheelPoint(state, 42);
  const rearGround = terrainAt(terrain, rear.x);
  const frontGround = terrainAt(terrain, front.x);
  const wheelRadius = 24;
  const rearDepth = rear.y + wheelRadius - rearGround.y;
  const frontDepth = front.y + wheelRadius - frontGround.y;
  state.rearContact = rearDepth >= 0;
  state.frontContact = frontDepth >= 0;
  state.grounded = state.rearContact || state.frontContact;

  const slope = state.grounded
    ? (state.rearContact && state.frontContact ? (rearGround.angle + frontGround.angle) / 2 : state.rearContact ? rearGround.angle : frontGround.angle)
    : 0;

  if (state.grounded) {
    const depth = Math.max(0, rearDepth, frontDepth);
    if (depth > 0) state.y -= depth * Math.min(1, stats.suspension);
    const traction = stats.grip * env.traction * gripBonus;
    const drive = throttle * stats.engine * traction;
    const tangentX = Math.cos(slope);
    const tangentY = Math.sin(slope);
    state.vx += tangentX * drive * dt / stats.weight;
    state.vy += tangentY * drive * dt / stats.weight;
    if (input.brake && state.vx > -80) state.vx -= stats.brake * dt / stats.weight;
    state.vx *= Math.max(0.90, 0.992 - Math.abs(slope) * 0.012);
    state.vy *= 0.985;
    state.angle += (slope - state.angle) * Math.min(1, dt * (5.2 / stats.weight) * stats.stability);
    state.angularVelocity *= 0.68;
    if (!state.lastGrounded && state.airtime > 0.32) {
      const landingAngle = Math.abs(normaliseAngle(state.angle - slope));
      state.hardLanding = landingAngle > 0.82 || Math.abs(state.vy) > 720;
      state.lastAirTime = state.airtime;
      state.lastLandingHard = state.hardLanding;
    }
    state.airtime = 0;
  } else {
    state.vy += gravity * dt;
    const airRotate = (input.tiltBack ? -1 : 0) + (input.tiltForward ? 1 : 0);
    state.angularVelocity += airRotate * stats.airControl * 2.4 * dt;
    if (airStabiliser) state.angularVelocity += normaliseAngle(-state.angle) * dt * 3.2;
    state.airtime += dt;
  }

  state.vx += env.wind * 160 * dt;
  state.vx = clamp(state.vx, -stats.maxSpeed * 0.55, stats.maxSpeed);
  state.x += state.vx * dt;
  state.y += state.vy * dt;
  state.angle += state.angularVelocity * dt;
  state.angularVelocity *= state.grounded ? 0.78 : 0.994;
  state.wheelSpin += state.vx * dt * 0.05;
  state.distance = Math.max(state.distance, state.x);

  if (Math.abs(state.vx) < 3 && !input.accelerate && !input.brake && state.grounded) {
    state.vx *= 0.86;
    state.angularVelocity *= 0.7;
  }

  updateFuel(state, stats, input, dt, fuelSaver);
  updateStuntState(state, dt);
  applyObstacleImpact(state, terrain);
  detectCrash(state, terrain, stats);
  state.lastGrounded = state.grounded;
}

export function activateAbility(state, vehicle, ability, stats) {
  if (!ability || state.abilityCooldown > 0 || state.fuel < ability.fuelCost || state.crashed) return false;
  state.fuel = Math.max(0, state.fuel - ability.fuelCost);
  state.abilityCooldown = ability.cooldown;
  state.abilityTimer = ability.duration;
  if (vehicle.ability === "turbo-propeller") {
    state.vx += 290;
    state.vy -= state.grounded ? 80 : 38;
  }
  if (vehicle.ability === "cloud-cushion") state.cushionReady = true;
  if (vehicle.ability === "air-stabiliser") state.angularVelocity *= 0.45;
  if (vehicle.ability === "grip-lock" && state.grounded) state.vx += 90;
  if (vehicle.ability === "fuel-saver") state.fuel = Math.min(state.maxFuel, state.fuel + stats.fuelCapacity * 0.04);
  return true;
}

export function wheelPoint(state, offsetX) {
  const cos = Math.cos(state.angle);
  const sin = Math.sin(state.angle);
  return {
    x: state.x + offsetX * cos,
    y: state.y + offsetX * sin + 22,
  };
}

export function cabinPoint(state) {
  return {
    x: state.x,
    y: state.y - 30,
  };
}

function updateFuel(state, stats, input, dt, fuelSaver) {
  const activeUse = input.accelerate || input.brake ? 5.8 * stats.fuelUse * fuelSaver : 0.18;
  state.fuel = Math.max(0, state.fuel - activeUse * dt);
}

function updateStuntState(state, dt) {
  if (!state.grounded) {
    state.flipAccumulator += state.angularVelocity * dt;
    const wholeFlips = Math.trunc(Math.abs(state.flipAccumulator) / (Math.PI * 2));
    state.flips = Math.max(state.flips, wholeFlips);
  }
  const frontLift = !state.frontContact && state.rearContact && Math.abs(state.vx) > 90;
  state.wheelieTime = frontLift ? state.wheelieTime + dt : 0;
  if (state.grounded) state.flipAccumulator = 0;
}

function applyObstacleImpact(state, terrain) {
  const obstacle = obstacleNear(terrain, state.x, state.y, 42);
  if (!obstacle) return;
  const shove = obstacle.kind.includes("turbine") || obstacle.kind.includes("vent") ? -190 : 130;
  state.vx -= obstacle.strength * shove;
  state.vy -= obstacle.kind.includes("ramp") || obstacle.kind.includes("vent") ? 210 : 70;
  state.angularVelocity += (state.vx > 0 ? 1 : -1) * obstacle.strength * 1.5;
}

function detectCrash(state, terrain, stats) {
  if (state.y > 920 || state.x < -260) {
    state.crashed = true;
    state.crashReason = "Fell outside the route";
    return;
  }

  const ground = terrainAt(terrain, state.x);
  const cabin = cabinPoint(state);
  const cabinHit = cabin.y > ground.y - 10 && Math.abs(normaliseAngle(state.angle - ground.angle)) > 1.15 && Math.abs(state.vy) > 310;
  if (cabinHit && !state.cushionReady) {
    state.crashed = true;
    state.crashReason = "Cabin hit the ground";
    return;
  }
  if (cabinHit && state.cushionReady) {
    state.cushionReady = false;
    state.vy *= -0.18;
    state.angularVelocity *= 0.22;
  }

  const upsideDown = Math.cos(state.angle) < -0.55;
  state.upsideDownTimer = upsideDown && state.grounded ? state.upsideDownTimer + 1 / 60 : Math.max(0, state.upsideDownTimer - 0.05);
  if (state.upsideDownTimer > 2 / Math.max(0.72, stats.stability)) {
    state.crashed = true;
    state.crashReason = "Upside down too long";
    return;
  }

  if (state.fuel <= 0 && Math.abs(state.vx) < 18 && state.grounded) {
    state.crashed = true;
    state.crashReason = "Out of fuel";
  }
}

function normaliseAngle(angle) {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
