import { centeredRect, findPlatformAt, normalize, pointInRect } from "./runway-rumble-physics.js";

export const RUNWAY_DIFFICULTY = {
  easy: {
    aiSpeed: 0.78,
    aiSkillSpread: 0.12,
    mistakeChance: 0.34,
    mistakeDuration: 0.55,
    obstacleCaution: 1.2,
    recoveryDelay: 0.34,
    playerTimeGrace: 1.12,
    acceleration: 690,
    maxSpeed: 230,
    jumpVelocity: 380,
    diveImpulse: 185,
    diveCooldown: 1.45,
    friction: 0.86,
    slipperyFriction: 0.965,
  },
  normal: {
    aiSpeed: 0.9,
    aiSkillSpread: 0.1,
    mistakeChance: 0.16,
    mistakeDuration: 0.38,
    obstacleCaution: 0.86,
    recoveryDelay: 0.22,
    playerTimeGrace: 1,
    acceleration: 720,
    maxSpeed: 245,
    jumpVelocity: 390,
    diveImpulse: 205,
    diveCooldown: 1.25,
    friction: 0.84,
    slipperyFriction: 0.97,
  },
  hard: {
    aiSpeed: 0.98,
    aiSkillSpread: 0.06,
    mistakeChance: 0.06,
    mistakeDuration: 0.25,
    obstacleCaution: 0.64,
    recoveryDelay: 0.12,
    playerTimeGrace: 0.92,
    acceleration: 740,
    maxSpeed: 255,
    jumpVelocity: 395,
    diveImpulse: 215,
    diveCooldown: 1.15,
    friction: 0.835,
    slipperyFriction: 0.972,
  },
};

export function difficultyConfig(difficulty) {
  return RUNWAY_DIFFICULTY[difficulty] || RUNWAY_DIFFICULTY.normal;
}

export function createAiBrain(index, difficulty, course) {
  const config = difficultyConfig(difficulty);
  const routeRoll = Math.random();
  const skill = Math.max(0.62, Math.min(1, config.aiSpeed + (Math.random() - 0.5) * config.aiSkillSpread));
  return {
    waypointIndex: 1,
    route: chooseRoute(course.id, routeRoll, difficulty),
    skill,
    mistakeTimer: 0,
    waitTimer: 0,
    lastFallTimer: 0,
    lateralBias: (Math.random() - 0.5) * 24,
    diveTimer: 0.7 + Math.random() * 1.5,
    nameSeed: index,
  };
}

export function routeForBrain(course, brain) {
  const route = brain.route || "center";
  if (course.id === "baggage-belt-blitz") {
    return route === "risky"
      ? routePoints(course, [[490, 2535], [660, 2130], [675, 1650], [660, 1130], [520, 710], [490, 205]])
      : routePoints(course, [[490, 2535], [280, 2140], [300, 1660], [290, 1140], [490, 710], [490, 205]]);
  }
  if (course.id === "wing-walk-wobble") {
    return route === "right"
      ? routePoints(course, [[490, 2535], [490, 2140], [675, 1770], [490, 1320], [490, 900], [490, 220]])
      : routePoints(course, [[490, 2535], [490, 2140], [305, 1770], [490, 1320], [490, 900], [490, 220]]);
  }
  if (course.id === "sky-crown-final") {
    return route === "right"
      ? routePoints(course, [[490, 2535], [490, 2140], [675, 1780], [490, 1370], [490, 930], [490, 520], [490, 165]])
      : routePoints(course, [[490, 2535], [490, 2140], [310, 1780], [490, 1370], [490, 930], [490, 520], [490, 165]]);
  }
  if (course.id === "cargo-chaos") {
    return route === "risky"
      ? routePoints(course, [[490, 2535], [490, 2140], [690, 1660], [490, 1160], [490, 720], [490, 225]])
      : routePoints(course, [[490, 2535], [490, 2140], [260, 1660], [490, 1160], [490, 720], [490, 225]]);
  }
  return course.waypoints;
}

function routePoints(course, points) {
  return points.map(([x, y], index) => ({ x, y, label: course.waypoints[index]?.label || "" }));
}

function chooseRoute(courseId, roll, difficulty) {
  const riskyBias = difficulty === "hard" ? 0.64 : difficulty === "normal" ? 0.44 : 0.25;
  if (["baggage-belt-blitz", "cargo-chaos"].includes(courseId)) return roll < riskyBias ? "risky" : "safe";
  if (["wing-walk-wobble", "sky-crown-final"].includes(courseId)) return roll < 0.5 ? "left" : "right";
  return "center";
}

export function updateComputerAI(contestant, course, obstacleStates, difficulty, dt) {
  const config = difficultyConfig(difficulty);
  const brain = contestant.ai;
  const route = routeForBrain(course, brain);
  brain.lastFallTimer = Math.max(0, brain.lastFallTimer - dt);
  brain.waitTimer = Math.max(0, brain.waitTimer - dt);
  brain.mistakeTimer = Math.max(0, brain.mistakeTimer - dt);
  brain.diveTimer = Math.max(0, brain.diveTimer - dt);

  if (contestant.falling) {
    brain.lastFallTimer = config.recoveryDelay;
    return { x: 0, y: 0, jump: false, dive: false };
  }
  if (brain.lastFallTimer > 0) return { x: 0, y: 0, jump: false, dive: false };

  if (Math.random() < config.mistakeChance * dt && brain.mistakeTimer <= 0) {
    brain.mistakeTimer = config.mistakeDuration * (0.7 + Math.random() * 0.8);
  }

  const currentTarget = nextTarget(contestant, route, brain);
  let tx = currentTarget.x + brain.lateralBias;
  let ty = currentTarget.y;
  const avoid = obstacleAvoidance(contestant, course, obstacleStates, config);
  tx += avoid.x;
  ty += avoid.y;
  if (avoid.wait) brain.waitTimer = Math.max(brain.waitTimer, 0.22 + config.obstacleCaution * 0.12);

  if (brain.mistakeTimer > 0) {
    tx += Math.sin(brain.mistakeTimer * 11 + brain.nameSeed) * 120;
    ty += 55;
  }

  const dir = normalize(tx - contestant.x, ty - contestant.y);
  const shouldWait = brain.waitTimer > 0;
  const jump = shouldJumpGap(contestant, course, obstacleStates) || avoid.jump;
  const dive =
    !shouldWait &&
    brain.diveTimer <= 0 &&
    contestant.diveCooldown <= 0 &&
    contestant.y > course.finish.y + 520 &&
    Math.random() < 0.35 * dt;
  if (dive) brain.diveTimer = 3.4 + Math.random() * 2.2;
  return {
    x: shouldWait ? 0 : dir.x,
    y: shouldWait ? 0 : dir.y,
    jump,
    dive,
  };
}

function nextTarget(contestant, route, brain) {
  let target = route[Math.min(brain.waypointIndex, route.length - 1)];
  if (!target) return route[route.length - 1];
  if (Math.hypot(target.x - contestant.x, target.y - contestant.y) < 96 || contestant.y < target.y + 28) {
    brain.waypointIndex = Math.min(route.length - 1, brain.waypointIndex + 1);
    target = route[brain.waypointIndex];
  }
  return target;
}

function obstacleAvoidance(contestant, course, obstacleStates, config) {
  const output = { x: 0, y: 0, wait: false, jump: false };
  for (const obstacle of course.obstacles) {
    const dy = obstacle.y - contestant.y;
    if (dy > 90 || dy < -360) continue;
    const state = obstacleStates[obstacle.id] || obstacle;
    if (obstacle.type === "closingGate" && !state.open && Math.abs(contestant.x - obstacle.x) < obstacle.w * 0.44) {
      output.wait = Math.abs(dy) < 210 * config.obstacleCaution;
      output.y += 80;
    }
    if ((obstacle.type === "bouncingSuitcase" || obstacle.type === "rollingWheel") && Math.abs(state.y - contestant.y) < 160) {
      const side = contestant.x < state.x ? -1 : 1;
      output.x += side * 150;
    }
    if (obstacle.type === "rotatingBar" && Math.abs(obstacle.y - contestant.y) < 150) {
      output.x += Math.sin((state.time || 0) * 4 + contestant.ai.nameSeed) * 80;
    }
    if (obstacle.type === "windTurbine" && pointInRect(contestant, centeredRect(obstacle), 80)) {
      output.x -= obstacle.dirX * 120;
      output.y -= obstacle.dirY * 80;
    }
    if (obstacle.type === "jumpPad" && Math.abs(contestant.x - obstacle.x) < obstacle.w && Math.abs(contestant.y - obstacle.y) < 160) {
      output.x += (obstacle.x - contestant.x) * 0.35;
      output.jump = true;
    }
  }
  return output;
}

function shouldJumpGap(contestant, course, obstacleStates) {
  if (contestant.z > 2 || contestant.jumpCooldown > 0) return false;
  const forward = { x: contestant.x + contestant.facingX * 18, y: contestant.y + contestant.facingY * 62 };
  const farther = { x: contestant.x + contestant.facingX * 18, y: contestant.y + contestant.facingY * 120 };
  const current = findPlatformAt(course, obstacleStates, contestant.x, contestant.y, contestant.radius * 0.25);
  const near = findPlatformAt(course, obstacleStates, forward.x, forward.y, contestant.radius * 0.25);
  const far = findPlatformAt(course, obstacleStates, farther.x, farther.y, contestant.radius * 0.25);
  return Boolean(current && !near && far);
}
