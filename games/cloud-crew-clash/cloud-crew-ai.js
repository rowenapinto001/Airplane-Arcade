export const AI_DIFFICULTY = {
  easy: {
    decisionDelay: 2.2,
    launchBurst: 1.8,
    restTime: 1.4,
    mistakeChance: 0.42,
    abilityChance: 0.22,
    upgradeChance: 0.3,
    reactionRange: 130,
  },
  normal: {
    decisionDelay: 1.45,
    launchBurst: 2.35,
    restTime: 0.95,
    mistakeChance: 0.18,
    abilityChance: 0.46,
    upgradeChance: 0.52,
    reactionRange: 180,
  },
  hard: {
    decisionDelay: 0.95,
    launchBurst: 2.8,
    restTime: 0.55,
    mistakeChance: 0.07,
    abilityChance: 0.68,
    upgradeChance: 0.74,
    reactionRange: 235,
  },
};

export function createComputerAI(difficulty = "normal") {
  return {
    config: AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.normal,
    decisionTimer: 0.25,
    launchTimer: 0,
    restTimer: 0,
    routeId: "attack",
    status: "Scanning routes",
    abilityTimer: 2,
    upgradeTimer: 4,
  };
}

export function updateComputerAI(state, level, dt) {
  const ai = state.ai;
  const cfg = ai.config;
  ai.decisionTimer -= dt;
  ai.abilityTimer -= dt;
  ai.upgradeTimer -= dt;

  if (ai.decisionTimer <= 0) {
    ai.routeId = chooseRoute(state, level, cfg);
    ai.status = statusForRoute(ai.routeId);
    ai.decisionTimer = cfg.decisionDelay + Math.random() * cfg.decisionDelay;
    ai.launchTimer = cfg.launchBurst;
    ai.restTimer = cfg.restTime;
  }

  if (ai.launchTimer > 0) {
    state.rivalLaunching = true;
    ai.launchTimer -= dt;
  } else {
    state.rivalLaunching = false;
    ai.restTimer -= dt;
    if (ai.restTimer <= 0) ai.decisionTimer = Math.min(ai.decisionTimer, 0.05);
  }

  if (ai.abilityTimer <= 0) {
    const ability = chooseAbility(state, cfg);
    if (ability) state.pendingAiAbility = ability;
    ai.abilityTimer = 4.5 + Math.random() * 4.5;
  }

  if (ai.upgradeTimer <= 0) {
    state.pendingAiUpgrade = chooseUpgrade(state, cfg);
    ai.upgradeTimer = 5 + Math.random() * 5;
  }
}

function chooseRoute(state, level, cfg) {
  const routes = level.routes;
  if (!routes.length) return "attack";
  if (Math.random() < cfg.mistakeChance) return routes[Math.floor(Math.random() * routes.length)].id;

  if (level.mission === "energyRace") return routeAvailable(level, "energy") ? "energy" : "safe";
  if (level.mission === "cargoEscort") return "attack";
  if (level.mission === "stationControl") {
    const station = level.stations.find((item) => item.type === "station" && item.owner !== "rival");
    if (station?.y < 240 && routeAvailable(level, "safe")) return "safe";
    if (station?.y > 340 && routeAvailable(level, "energy")) return "energy";
    return "attack";
  }
  if (level.mission === "coreCapture") {
    const core = level.stations.find((item) => item.type === "core");
    if (core?.owner === "player" && routeAvailable(level, "risky")) return "risky";
    return "attack";
  }

  const playerPressure = state.units.filter((unit) => unit.team === "player" && unit.x > 600).length;
  if (playerPressure > 10 && routeAvailable(level, "risky")) return "risky";
  return routeAvailable(level, "attack") ? "attack" : routes[0].id;
}

function routeAvailable(level, routeId) {
  return level.routes.some((route) => route.id === routeId);
}

function statusForRoute(routeId) {
  if (routeId === "safe") return "Guarding upper bridge";
  if (routeId === "energy") return "Collecting Sky Energy";
  if (routeId === "risky") return "Pressing risky route";
  return "Attacking centre lane";
}

function chooseAbility(state, cfg) {
  if (Math.random() > cfg.abilityChance) return null;
  const rivalUnits = state.units.filter((unit) => unit.team === "rival");
  const playerUnits = state.units.filter((unit) => unit.team === "player");
  if (!rivalUnits.length) return null;
  const closeFight = rivalUnits.some((rival) =>
    playerUnits.some((unit) => Math.hypot(unit.x - rival.x, unit.y - rival.y) < cfg.reactionRange),
  );
  if (closeFight && state.rivalAbilities.shield.ready <= 0) return "shield";
  if (rivalUnits.length < playerUnits.length && state.rivalAbilities.turbo.ready <= 0) return "turbo";
  if (state.rivalAbilities.rally.ready <= 0) return "rally";
  return null;
}

function chooseUpgrade(state, cfg) {
  if (Math.random() > cfg.upgradeChance || state.rivalEnergy < 16) return null;
  if (state.rivalHub.health < state.rivalHub.maxHealth * 0.45) return "repairHub";
  if (state.rivalTemp.launchRate < 2) return "launchRate";
  if (state.rivalTemp.crewHealth < 2) return "crewHealth";
  if (state.rivalTemp.crewSpeed < 2) return "crewSpeed";
  return "cooldowns";
}
