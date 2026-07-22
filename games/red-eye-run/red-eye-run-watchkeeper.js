export const DIFFICULTY = {
  easy: {
    id: "easy",
    label: "Easy",
    greenMin: 4.8,
    greenMax: 7.2,
    warning: 1.35,
    redMin: 2.0,
    redMax: 3.0,
    turnSpeed: 0.95,
    tolerance: 13,
    velocityTolerance: 38,
    playerFriction: 9.2,
    aiMistake: 0.18,
    aiSkill: 0.72,
  },
  normal: {
    id: "normal",
    label: "Normal",
    greenMin: 3.4,
    greenMax: 5.8,
    warning: 0.95,
    redMin: 2.4,
    redMax: 3.8,
    turnSpeed: 1.35,
    tolerance: 8.5,
    velocityTolerance: 26,
    playerFriction: 7.4,
    aiMistake: 0.12,
    aiSkill: 0.84,
  },
  hard: {
    id: "hard",
    label: "Hard",
    greenMin: 2.2,
    greenMax: 5.0,
    warning: 0.62,
    redMin: 2.8,
    redMax: 4.8,
    turnSpeed: 1.85,
    tolerance: 5.6,
    velocityTolerance: 17,
    playerFriction: 6.1,
    aiMistake: 0.07,
    aiSkill: 0.93,
  },
};

export function createWatchkeeper(difficulty = "normal") {
  const config = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  return {
    phase: "green",
    timer: randomRange(config.greenMin, config.greenMax),
    phaseElapsed: 0,
    redCount: 0,
    config,
    rotation: 0,
    targetRotation: 0,
    scanSweep: 0,
    message: "Green signal",
  };
}

export function updateWatchkeeper(watchkeeper, dt) {
  const previous = watchkeeper.phase;
  watchkeeper.timer -= dt;
  watchkeeper.phaseElapsed += dt;
  watchkeeper.scanSweep = (watchkeeper.scanSweep + dt * 1.8) % 1;

  if (watchkeeper.phase === "green") {
    watchkeeper.targetRotation = Math.PI;
    watchkeeper.message = watchkeeper.timer < Math.max(0.8, watchkeeper.config.warning * 1.05)
      ? "Prepare to Freeze"
      : "Run";
    if (watchkeeper.timer <= 0) startWarningPhase(watchkeeper);
  } else if (watchkeeper.phase === "warning") {
    watchkeeper.targetRotation = 0;
    watchkeeper.message = "Prepare to Freeze";
    if (watchkeeper.timer <= 0) startRedPhase(watchkeeper);
  } else if (watchkeeper.phase === "red") {
    watchkeeper.targetRotation = 0;
    watchkeeper.message = "Freeze";
    if (watchkeeper.timer <= 0) startGreenPhase(watchkeeper);
  }

  const turn = Math.min(1, dt * watchkeeper.config.turnSpeed * 4.2);
  watchkeeper.rotation += (watchkeeper.targetRotation - watchkeeper.rotation) * turn;
  return previous !== watchkeeper.phase ? watchkeeper.phase : null;
}

export function startGreenPhase(watchkeeper) {
  watchkeeper.phase = "green";
  watchkeeper.phaseElapsed = 0;
  watchkeeper.timer = randomRange(watchkeeper.config.greenMin, watchkeeper.config.greenMax);
  watchkeeper.targetRotation = Math.PI;
  watchkeeper.message = "Run";
}

export function startWarningPhase(watchkeeper) {
  watchkeeper.phase = "warning";
  watchkeeper.phaseElapsed = 0;
  watchkeeper.timer = watchkeeper.config.warning;
  watchkeeper.targetRotation = 0;
  watchkeeper.message = "Prepare to Freeze";
}

export function startRedPhase(watchkeeper) {
  watchkeeper.phase = "red";
  watchkeeper.phaseElapsed = 0;
  watchkeeper.timer = randomRange(watchkeeper.config.redMin, watchkeeper.config.redMax);
  watchkeeper.redCount += 1;
  watchkeeper.targetRotation = 0;
  watchkeeper.message = "Freeze";
}

export function watchkeeperSignal(watchkeeper) {
  if (watchkeeper.phase === "red") return "RED";
  if (watchkeeper.phase === "warning") return "WARNING";
  return "GREEN";
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}
