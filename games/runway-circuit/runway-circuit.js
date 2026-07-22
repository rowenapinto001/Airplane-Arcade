import { labelsFor, matchesControl, shouldPreventScroll } from "../../shared/controls.js";
import { getData, recordGameResult, updateData } from "../../shared/storage.js";
import { CAR_TYPES, UPGRADE_KEYS, canUseCar, defaultCarUpgrades, getCarDefinition, statBars, upgradeCost } from "./circuit-cars.js";
import { CIRCUIT_LEVELS, DIFFICULTY, TOTAL_LAPS, difficultyConfig, getCircuitLevel } from "./circuit-levels.js";
import { createAiInputMap } from "./circuit-ai.js";
import { createRace, formatRaceTime, ordinal, respawnCar, updateRacePhysics } from "./circuit-physics.js";
import { calculateRaceResult, levelUnlockText } from "./circuit-results.js";
import { createCircuitRenderer } from "./circuit-renderer.js";

const DEFAULT_CONTROLS = {
  up: ["KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  handbrake: ["Space"],
  boost: ["ShiftLeft", "ShiftRight"],
  reset: ["KeyR"],
  pause: ["Escape"],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function el(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function createRunwayCircuitGame(context) {
  const { root, audio, data, options, onExit, onSetup, onResult } = context;
  const controls = options.controls || DEFAULT_CONTROLS;
  const renderer = createCircuitRenderer();
  let currentData = clone(data);
  let records = currentData.progress.runwayCircuitRecords;
  let canvas = null;
  let ctx = null;
  let resizeObserver = null;
  let raf = 0;
  let lastTime = 0;
  let resultSaving = false;
  const keys = new Set();
  const pressed = new Set();
  let state = initialState();

  function initialState() {
    return {
      screen: "intro",
      phase: "menu",
      difficulty: options.difficulty || records?.selectedDifficulty || "normal",
      selectedLevel: records?.selectedLevel || Math.min(records?.highestUnlockedLevel || 1, 5),
      selectedCar: records?.selectedCar || "runway-rookie",
      cameraDistance: records?.cameraDistance || 1,
      cameraShake: records?.cameraShake !== false,
      showGhost: records?.showGhost !== false,
      race: null,
      ghostPoint: null,
    };
  }

  async function initializeGame() {
    currentData = await getData();
    records = currentData.progress.runwayCircuitRecords;
    state = initialState();
    bindEvents();
    await markRecentlyPlayed();
    if (options.continueCampaign) renderLevelDetails(records.highestUnlockedLevel || 1);
    else renderIntro();
  }

  function startGame() {
    if (state.phase === "playing") startLoop();
  }

  async function markRecentlyPlayed() {
    currentData = await updateData((draft) => {
      draft.progress.recentlyPlayed = "runway-circuit";
      draft.progress.runwayCircuitRecords.selectedDifficulty = state.difficulty;
      return draft;
    });
    records = currentData.progress.runwayCircuitRecords;
    await onResult?.({ gameId: "runway-circuit", summary: "Runway Circuit opened" });
  }

  function shell(title, subtitle = "") {
    teardownCanvas();
    root.className = "arcade-view runway-circuit-game";
    root.replaceChildren();
    const bar = el("section", "game-bar circuit-game-bar");
    const heading = el("div", "game-title");
    heading.append(el("h1", "", "Runway Circuit"), el("p", "", subtitle || "Offline airport circuit racing"));
    const actions = el("div", "game-actions");
    actions.append(
      actionButton("Tutorial", "", renderTutorial),
      actionButton("Stats", "", renderStats),
      actionButton("Arcade", "", renderReturnConfirm),
    );
    bar.append(heading, quickStats(), actions);
    root.append(bar);
    if (title) {
      const sr = el("span", "circuit-screen-title", title);
      sr.setAttribute("aria-live", "polite");
      root.append(sr);
    }
  }

  function quickStats() {
    const strip = el("div", "score-strip circuit-mini-stats");
    strip.append(
      miniStat("Level", records?.highestUnlockedLevel || 1),
      miniStat("Wins", records?.totalWins || 0),
      miniStat("Coins", records?.flightCoins || 0),
    );
    return strip;
  }

  function miniStat(label, value) {
    const item = el("span");
    item.append(el("small", "", label), el("strong", "", String(value)));
    return item;
  }

  function renderIntro() {
    state.phase = "menu";
    state.screen = "intro";
    shell("Game introduction", "Race five airport circuits against five fair computer-controlled cars.");
    const panel = el("section", "circuit-menu-panel");
    panel.append(
      el("span", "card-meta", "Original offline racing"),
      el("h2", "", "Three Laps, Six Cars, Five Circuits"),
      el("p", "", "Pick a car, tune it with Flight Coins, race exactly three laps, pass checkpoints in order, and unlock harder airport circuits."),
    );
    const grid = el("div", "circuit-info-grid");
    [
      ["Exactly 3 laps", "Every race and time trial ends only after Lap 3 is completed in the correct direction."],
      ["Fair AI racers", "Five computer cars use the same checkpoints, collision rules, and track boundaries."],
      ["Track variety", "Straights, circular turns, S-curves, hairpins, bridges, oil, wind, gates, and boost pads."],
      ["Offline progress", "Cars, upgrades, stars, records, ghosts, and settings stay in local storage."],
    ].forEach(([title, copy]) => grid.append(infoCard(title, copy)));
    const actions = el("div", "circuit-menu-actions");
    actions.append(
      actionButton("Play Campaign", "primary-action", renderLevelMap),
      actionButton("Car Selection", "", renderCarSelection),
      actionButton("Upgrades", "", renderUpgrades),
      actionButton(records?.timeTrialUnlocked ? "Time Trial" : "Time Trial Locked", "", renderTimeTrialSelection),
      actionButton(records?.tutorialComplete ? "Replay Tutorial" : "Tutorial", "", renderTutorial),
    );
    panel.append(grid, setupStrip(), actions);
    root.append(panel);
  }

  function infoCard(title, copy) {
    const card = el("article", "circuit-info-card");
    card.append(el("h3", "", title), el("p", "", copy));
    return card;
  }

  function setupStrip() {
    const strip = el("section", "circuit-choice-row");
    strip.append(
      pill("Difficulty", DIFFICULTY[state.difficulty]?.label || "Normal"),
      pill("Car", getCarDefinition(state.selectedCar).name),
      pill("Selected Level", state.selectedLevel),
      pill("Champion", records?.championBadge ? "Earned" : "Not yet"),
    );
    return strip;
  }

  function pill(label, value) {
    const node = el("span", "circuit-pill");
    node.append(el("small", "", label), el("strong", "", String(value)));
    return node;
  }

  function renderTutorial() {
    state.screen = "tutorial";
    shell("Tutorial", "Learn controls, checkpoints, laps, and boost.");
    const panel = el("section", "circuit-menu-panel");
    panel.append(el("span", "card-meta", "Tutorial"), el("h2", "", "Race the circuit in order"));
    const list = el("ul", "instructions-list");
    [
      `Accelerate with ${labelsFor(controls.up)} and brake or reverse with ${labelsFor(controls.down)}.`,
      `Steer with ${labelsFor([controls.left[0], controls.right[0]])}. Hold ${labelsFor(controls.handbrake)} to drift through sharp turns.`,
      `Use ${labelsFor(controls.boost)} when the boost meter has energy. Boost is limited and makes turning harder.`,
      `Use ${labelsFor(controls.reset)} to return to your latest valid checkpoint if you miss a turn.`,
      "A lap counts only after every checkpoint is crossed in order and the finish line is crossed forward.",
    ].forEach((line) => list.append(el("li", "", line)));
    const actions = el("div", "circuit-menu-actions");
    actions.append(
      actionButton("Mark Complete", "primary-action", async () => {
        currentData = await updateData((draft) => {
          draft.progress.runwayCircuitRecords.tutorialComplete = true;
          return draft;
        });
        records = currentData.progress.runwayCircuitRecords;
        renderLevelMap();
      }),
      actionButton("Back", "", renderIntro),
    );
    panel.append(list, actions);
    root.append(panel);
  }

  function renderDifficulty() {
    state.screen = "difficulty";
    shell("Difficulty selection", "Choose racer speed, obstacle timing, and steering assistance.");
    const panel = el("section", "circuit-menu-panel");
    panel.append(el("span", "card-meta", "Difficulty"), el("h2", "", "Race Difficulty"));
    const grid = el("div", "circuit-choice-grid");
    Object.values(DIFFICULTY).forEach((config) => {
      const card = actionButton("", `circuit-choice-card ${state.difficulty === config.label.toLowerCase() ? "is-selected" : ""}`, async () => {
        state.difficulty = config.label.toLowerCase();
        currentData = await updateData((draft) => {
          draft.progress.runwayCircuitRecords.selectedDifficulty = state.difficulty;
          return draft;
        });
        records = currentData.progress.runwayCircuitRecords;
        renderDifficulty();
      });
      card.append(el("strong", "", config.label), el("span", "", config.unlockText));
      grid.append(card);
    });
    const actions = el("div", "circuit-menu-actions");
    actions.append(actionButton("Level Map", "primary-action", renderLevelMap), actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderLevelMap() {
    state.screen = "level-map";
    shell("Track map", "Choose one of five airport circuits.");
    const panel = el("section", "circuit-map-panel");
    panel.append(el("span", "card-meta", "Campaign"), el("h2", "", "Runway Circuit Track Map"));
    const map = el("div", "circuit-level-map");
    const highest = records?.highestUnlockedLevel || 1;
    for (const level of CIRCUIT_LEVELS) {
      const locked = level.id > highest;
      const best = records?.bestPositions?.[String(level.id)];
      const card = actionButton("", `circuit-level-node ${locked ? "is-locked" : ""} ${state.selectedLevel === level.id ? "is-selected" : ""}`, () => {
        if (!locked) renderLevelDetails(level.id);
      });
      card.disabled = locked;
      card.setAttribute("aria-label", locked ? `Level ${level.id} locked` : `Open level ${level.id} ${level.name}`);
      card.append(
        el("strong", "", `${level.id}. ${level.name}`),
        el("span", "", level.environment),
        el("small", "", locked ? "Locked" : best ? `Best ${ordinal(best)}` : level.unlockRequirement),
      );
      map.append(card);
    }
    const actions = el("div", "circuit-menu-actions");
    actions.append(
      actionButton("Difficulty", "", renderDifficulty),
      actionButton("Car Selection", "", renderCarSelection),
      actionButton("Back", "", renderIntro),
    );
    panel.append(map, actions);
    root.append(panel);
  }

  function renderCarSelection() {
    state.screen = "cars";
    shell("Car selection", "Pick one of five original airport racers.");
    const panel = el("section", "circuit-menu-panel");
    panel.append(el("span", "card-meta", "Garage"), el("h2", "", "Choose Your Car"));
    const grid = el("div", "circuit-car-grid");
    Object.values(CAR_TYPES).forEach((car) => {
      const locked = !canUseCar(records, car.id);
      const card = actionButton("", `circuit-car-card ${state.selectedCar === car.id ? "is-selected" : ""}`, async () => {
        if (locked) return;
        state.selectedCar = car.id;
        currentData = await updateData((draft) => {
          draft.progress.runwayCircuitRecords.selectedCar = car.id;
          return draft;
        });
        records = currentData.progress.runwayCircuitRecords;
        renderCarSelection();
      });
      card.disabled = locked;
      card.append(carSwatch(car), el("strong", "", car.name), el("p", "", locked ? "Unlock after completing Level 5." : car.description));
      const bars = el("div", "circuit-stat-bars");
      for (const [label, value] of statBars(car.id, records?.carUpgrades?.[car.id] || {})) {
        const row = el("span");
        row.append(el("small", "", label), meter(value));
        bars.append(row);
      }
      card.append(bars);
      grid.append(card);
    });
    const actions = el("div", "circuit-menu-actions");
    actions.append(actionButton("Race", "primary-action", () => renderLevelDetails(state.selectedLevel)), actionButton("Upgrades", "", renderUpgrades), actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function carSwatch(car) {
    const swatch = el("span", "circuit-car-swatch");
    swatch.style.setProperty("--car", car.color);
    swatch.style.setProperty("--accent", car.accent);
    return swatch;
  }

  function meter(value) {
    const meterNode = el("i", "circuit-meter");
    const fill = el("b");
    fill.style.width = `${Math.round(value * 100)}%`;
    meterNode.append(fill);
    return meterNode;
  }

  function renderUpgrades() {
    state.screen = "upgrades";
    shell("Car upgrades", "Spend Flight Coins on balanced car upgrades.");
    const panel = el("section", "circuit-menu-panel");
    const car = getCarDefinition(state.selectedCar);
    const upgradeRecord = records?.carUpgrades?.[state.selectedCar] || {};
    panel.append(el("span", "card-meta", `Flight Coins ${records?.flightCoins || 0}`), el("h2", "", `${car.name} Upgrades`));
    const grid = el("div", "circuit-upgrade-grid");
    for (const key of UPGRADE_KEYS) {
      const level = upgradeRecord[key] || 0;
      const cost = upgradeCost(state.selectedCar, key, level);
      const maxed = level >= 5;
      const affordable = (records?.flightCoins || 0) >= cost;
      const card = el("article", "circuit-upgrade-card");
      card.append(el("h3", "", key[0].toUpperCase() + key.slice(1)), el("p", "", `Level ${level}/5`), meter(level / 5));
      const buy = actionButton(maxed ? "Maxed" : `Upgrade - ${cost}`, maxed || !affordable ? "" : "primary-action", async () => {
        if (maxed || !affordable) return;
        currentData = await updateData((draft) => {
          const record = draft.progress.runwayCircuitRecords;
          record.flightCoins -= cost;
          record.carUpgrades[state.selectedCar][key] = level + 1;
          return draft;
        });
        records = currentData.progress.runwayCircuitRecords;
        renderUpgrades();
      });
      buy.disabled = maxed || !affordable;
      card.append(buy);
      grid.append(card);
    }
    const actions = el("div", "circuit-menu-actions");
    actions.append(actionButton("Car Selection", "", renderCarSelection), actionButton("Level Map", "primary-action", renderLevelMap), actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderLevelDetails(levelId = state.selectedLevel, mode = "race") {
    state.selectedLevel = Number(levelId) || 1;
    const level = getCircuitLevel(state.selectedLevel);
    state.screen = "level-details";
    shell("Level details", `${level.name} - exactly 3 laps.`);
    const panel = el("section", "circuit-preview-panel");
    const best = records?.bestPositions?.[String(level.id)];
    panel.append(el("span", "card-meta", level.environment), el("h2", "", `${level.id}. ${level.name}`), el("p", "", level.description));
    const grid = el("div", "circuit-info-grid");
    [
      ["Laps", `${TOTAL_LAPS} / ${TOTAL_LAPS}`],
      ["Racers", mode === "time-trial" ? "Time Trial solo" : "1 player + 5 computer cars"],
      ["Checkpoints", String(level.checkpoints.length)],
      ["Unlock", level.unlockRequirement],
      ["Best", best ? ordinal(best) : "No finish yet"],
      ["Bonus", level.bonusObjective],
      ["Difficulty", DIFFICULTY[state.difficulty].label],
      ["Car", getCarDefinition(state.selectedCar).name],
    ].forEach(([title, copy]) => grid.append(infoCard(title, copy)));
    const actions = el("div", "circuit-menu-actions");
    actions.append(
      actionButton(mode === "time-trial" ? "Start Time Trial" : "Start Race", "primary-action", () => startRace(level.id, { timeTrial: mode === "time-trial" })),
      actionButton("Change Car", "", renderCarSelection),
      actionButton("Difficulty", "", renderDifficulty),
      actionButton("Track Map", "", renderLevelMap),
    );
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderTimeTrialSelection() {
    state.screen = "time-trial";
    shell("Time Trial", "Unlocked after winning the Grand Airport Circuit.");
    const panel = el("section", "circuit-map-panel");
    panel.append(el("span", "card-meta", "3-lap solo mode"), el("h2", "", records?.timeTrialUnlocked ? "Choose Time Trial Track" : "Time Trial Locked"));
    if (!records?.timeTrialUnlocked) {
      panel.append(el("p", "", "Finish Level 5 in first place to unlock time trial and ghost car records."));
    }
    const map = el("div", "circuit-level-map");
    for (const level of CIRCUIT_LEVELS) {
      const card = actionButton("", "circuit-level-node", () => {
        if (records?.timeTrialUnlocked) renderLevelDetails(level.id, "time-trial");
      });
      card.disabled = !records?.timeTrialUnlocked;
      const best = records?.timeTrialBest?.[String(level.id)];
      card.append(el("strong", "", level.name), el("span", "", best ? formatRaceTime(best.totalTime) : "No ghost yet"), el("small", "", "Exactly 3 laps"));
      map.append(card);
    }
    const actions = el("div", "circuit-menu-actions");
    actions.append(actionButton("Ghost Settings", "", renderGhostSettings), actionButton("Back", "", renderIntro));
    panel.append(map, actions);
    root.append(panel);
  }

  function renderGhostSettings() {
    state.screen = "ghost";
    shell("Ghost settings", "Ghost cars are local saved route data and have no collision.");
    const panel = el("section", "circuit-menu-panel");
    panel.append(el("span", "card-meta", "Local ghost"), el("h2", "", "Ghost Car Settings"));
    const row = el("div", "circuit-choice-row");
    const toggle = actionButton(state.showGhost ? "Ghost On" : "Ghost Off", state.showGhost ? "primary-action" : "", async () => {
      state.showGhost = !state.showGhost;
      currentData = await updateData((draft) => {
        draft.progress.runwayCircuitRecords.showGhost = state.showGhost;
        return draft;
      });
      records = currentData.progress.runwayCircuitRecords;
      renderGhostSettings();
    });
    row.append(toggle, pill("Saved ghosts", Object.keys(records?.ghostData || {}).length));
    const actions = el("div", "circuit-menu-actions");
    actions.append(actionButton("Time Trial", "primary-action", renderTimeTrialSelection), actionButton("Back", "", renderIntro));
    panel.append(row, actions);
    root.append(panel);
  }

  function startRace(levelId, { timeTrial = false } = {}) {
    const level = getCircuitLevel(levelId);
    const upgrades = records?.carUpgrades || defaultCarUpgrades();
    const race = createRace(level, {
      mode: timeTrial ? "time-trial" : "race",
      timeTrial,
      playerCar: state.selectedCar,
      upgrades,
      difficulty: state.difficulty,
      playerName: options.player1 || "Player",
      champion: Boolean(records?.championBadge),
    });
    race.difficulty = difficultyConfig(state.difficulty);
    race.difficultyId = state.difficulty;
    state.race = race;
    state.phase = "playing";
    state.screen = "race";
    resultSaving = false;
    renderGameplay();
    startLoop();
  }

  function renderGameplay() {
    root.className = "arcade-view runway-circuit-game is-playing";
    root.replaceChildren();
    const race = state.race;
    const bar = el("section", "game-bar circuit-game-bar");
    const title = el("div", "game-title");
    title.append(el("h1", "", race.mode === "time-trial" ? "Runway Circuit: Time Trial" : "Runway Circuit"), el("p", "", `${race.level.name} - ${TOTAL_LAPS} laps - ${DIFFICULTY[state.difficulty].label}`));
    const actions = el("div", "game-actions");
    actions.append(actionButton("Pause", "primary-action", pauseGame), actionButton("Restart", "", restartGame), actionButton("Map", "", renderExitToMapConfirm), actionButton("Arcade", "", renderReturnConfirm));
    bar.append(title, liveStats(), actions);
    const stage = el("section", "circuit-stage");
    canvas = document.createElement("canvas");
    canvas.className = "circuit-canvas";
    canvas.setAttribute("aria-label", "Runway Circuit top-down airport racing track with cars, obstacles, checkpoints, mini-map, and HUD.");
    stage.append(canvas, overlay("circuitOverlay"));
    ctx = canvas.getContext("2d");
    root.append(bar, stage);
    resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
    draw();
  }

  function liveStats() {
    const strip = el("div", "score-strip circuit-live-stats");
    strip.id = "circuitHud";
    strip.append(miniStat("Position", "1st"), miniStat("Lap", "1/3"), miniStat("Time", "0:00.00"), miniStat("Boost", "0"));
    return strip;
  }

  function overlay(id) {
    const node = el("div", "game-overlay");
    node.id = id;
    return node;
  }

  function startLoop() {
    cancelAnimationFrame(raf);
    lastTime = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function loop(now) {
    if (state.phase !== "playing" || !state.race) return;
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
    lastTime = now;
    const aiInputs = createAiInputMap(state.race, difficultyConfig(state.difficulty), dt);
    updateRacePhysics(state.race, currentInput(), aiInputs, dt);
    updateGhost();
    updateLiveHud();
    if (state.race.phase === "finished" && !resultSaving) finishRace();
    draw();
    if (state.phase === "playing") raf = requestAnimationFrame(loop);
  }

  function currentInput() {
    return {
      accelerate: controls.up.some((code) => keys.has(code)),
      brake: controls.down.some((code) => keys.has(code)),
      left: controls.left.some((code) => keys.has(code)),
      right: controls.right.some((code) => keys.has(code)),
      handbrake: controls.handbrake.some((code) => keys.has(code)),
      boost: controls.boost.some((code) => keys.has(code)),
      steeringAssist: steeringAssist(),
    };
  }

  function steeringAssist() {
    const player = state.race?.player;
    if (!player) return 0;
    const config = difficultyConfig(state.difficulty);
    return config.steeringAssist * (player.wrongWay ? -1 : 0);
  }

  function updateGhost() {
    if (!state.race || state.race.mode !== "time-trial" || !state.showGhost) {
      state.ghostPoint = null;
      return;
    }
    const ghost = records?.ghostData?.[String(state.race.level.id)];
    if (!ghost?.length) {
      state.ghostPoint = null;
      return;
    }
    state.ghostPoint = ghost.reduce((best, point) => (Math.abs(point.t - state.race.time) < Math.abs(best.t - state.race.time) ? point : best), ghost[0]);
  }

  function updateLiveHud() {
    const hud = document.querySelector("#circuitHud");
    const race = state.race;
    if (!hud || !race) return;
    const values = hud.querySelectorAll("strong");
    if (values[0]) values[0].textContent = ordinal(race.player.position);
    if (values[1]) values[1].textContent = `${Math.min(TOTAL_LAPS, race.player.lap)}/${TOTAL_LAPS}`;
    if (values[2]) values[2].textContent = formatRaceTime(race.time);
    if (values[3]) values[3].textContent = `${Math.round((race.player.boost / race.player.stats.boostCapacity) * 100)}%`;
  }

  async function finishRace() {
    resultSaving = true;
    cancelAnimationFrame(raf);
    const result = calculateRaceResult(state.race);
    await saveResult(result);
    renderResults(result);
  }

  async function saveResult(result = null) {
    if (!result && state.race) result = calculateRaceResult(state.race);
    if (!result) return;
    currentData = await recordGameResult({
      ...result,
      winner: result.completed && result.finalPosition === 1 ? "solo" : null,
      tutorialComplete: records?.tutorialComplete,
      cameraDistance: state.cameraDistance,
      cameraShake: state.cameraShake,
      showGhost: state.showGhost,
    });
    records = currentData.progress.runwayCircuitRecords;
    await onResult?.(result);
  }

  function renderResults(result) {
    state.phase = "menu";
    state.screen = "results";
    const level = getCircuitLevel(result.level);
    shell(result.champion ? "Championship celebration" : "Race results", result.summary);
    const panel = el("section", `circuit-result-panel ${result.finalPosition === 1 ? "is-win" : ""}`);
    panel.append(el("span", "card-meta", result.completed ? "Result saved" : "Attempt saved"), el("h2", "", `${result.positionLabel} Place`), el("p", "", levelUnlockText(level, result)));
    const grid = el("div", "circuit-info-grid");
    [
      ["Total", formatRaceTime(result.totalTime)],
      ["Lap 1", formatRaceTime(result.lapTimes[0])],
      ["Lap 2", formatRaceTime(result.lapTimes[1])],
      ["Lap 3", formatRaceTime(result.lapTimes[2])],
      ["Best lap", formatRaceTime(result.bestLap)],
      ["Fastest racer", `${result.fastestRacer} ${formatRaceTime(result.fastestRacerLap)}`],
      ["Overtakes", String(result.overtakes)],
      ["Collisions", String(result.collisions)],
      ["Flight Coins", `+${result.flightCoins}`],
      ["Stars", `${result.stars}/3`],
    ].forEach(([title, copy]) => grid.append(infoCard(title, copy)));
    const actions = el("div", "circuit-menu-actions");
    actions.append(
      result.unlocked && result.level < 5 ? actionButton("Next Level", "primary-action", () => renderLevelDetails(result.level + 1)) : actionButton("Replay", "primary-action", () => startRace(result.level, { timeTrial: result.circuitMode === "time-trial" })),
      actionButton("Change Car", "", renderCarSelection),
      actionButton("View Upgrades", "", renderUpgrades),
      actionButton("Track Map", "", renderLevelMap),
      actionButton("Arcade", "", () => {
        destroyGame();
        onExit();
      }),
    );
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderStats() {
    state.screen = "stats";
    shell("Runway Circuit statistics", "Local race records and upgrades.");
    const panel = el("section", "circuit-menu-panel");
    panel.append(el("span", "card-meta", "Local stats"), el("h2", "", "Circuit Records"));
    const grid = el("div", "circuit-info-grid");
    [
      ["Highest level", `${records?.highestUnlockedLevel || 1}/5`],
      ["Total wins", records?.totalWins || 0],
      ["Total races", records?.totalRaces || 0],
      ["Flight Coins", records?.flightCoins || 0],
      ["Stars", Object.values(records?.stars || {}).reduce((sum, value) => sum + Number(value || 0), 0)],
      ["Overtakes", records?.totalOvertakes || 0],
      ["Best selected car", getCarDefinition(records?.selectedCar || "runway-rookie").name],
      ["Time Trial", records?.timeTrialUnlocked ? "Unlocked" : "Locked"],
    ].forEach(([title, copy]) => grid.append(infoCard(title, String(copy))));
    const actions = el("div", "circuit-menu-actions");
    actions.append(actionButton("Track Map", "primary-action", renderLevelMap), actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function pauseGame() {
    if (state.phase !== "playing" || !state.race) return;
    state.phase = "paused";
    cancelAnimationFrame(raf);
    const overlayNode = document.querySelector("#circuitOverlay");
    overlayNode?.classList.add("is-visible");
    const card = el("div", "circuit-pause-card");
    card.append(el("h2", "", "Paused"), el("p", "", "Race physics, AI, boost, and engine effects are stopped."));
    const actions = el("div", "circuit-menu-actions");
    actions.append(actionButton("Resume", "primary-action", resumeGame), actionButton("Restart", "", restartGame), actionButton("Map", "", renderExitToMapConfirm), actionButton("Arcade", "", renderReturnConfirm));
    card.append(actions);
    overlayNode?.replaceChildren(card);
  }

  function resumeGame() {
    if (!state.race) return;
    state.phase = "playing";
    const overlayNode = document.querySelector("#circuitOverlay");
    overlayNode?.classList.remove("is-visible");
    overlayNode?.replaceChildren();
    startLoop();
  }

  function restartGame() {
    if (!state.race) return;
    const levelId = state.race.level.id;
    const timeTrial = state.race.mode === "time-trial";
    startRace(levelId, { timeTrial });
  }

  function renderExitToMapConfirm() {
    cancelAnimationFrame(raf);
    shell("Exit race confirmation", "Leave the current race?");
    const panel = el("section", "circuit-result-panel");
    panel.append(el("h2", "", "Return to track map?"), el("p", "", "The current unfinished race will not be saved."));
    const actions = el("div", "circuit-menu-actions");
    actions.append(actionButton("Track Map", "primary-action", renderLevelMap), actionButton("Cancel", "", resumeOrIntro));
    panel.append(actions);
    root.append(panel);
  }

  function renderReturnConfirm() {
    cancelAnimationFrame(raf);
    shell("Return-to-arcade confirmation", "Confirm before leaving Runway Circuit.");
    const panel = el("section", "circuit-result-panel");
    panel.append(el("h2", "", "Return to Airplane Arcade?"), el("p", "", "Saved circuit records will stay local."));
    const actions = el("div", "circuit-menu-actions");
    actions.append(
      actionButton("Return to Arcade", "primary-action", () => {
        destroyGame();
        onExit();
      }),
      actionButton("Cancel", "", resumeOrIntro),
    );
    panel.append(actions);
    root.append(panel);
  }

  function resumeOrIntro() {
    if (state.race && ["playing", "paused"].includes(state.phase)) {
      renderGameplay();
      resumeGame();
    } else {
      renderIntro();
    }
  }

  function bindEvents() {
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
  }

  function onKeyDown(event) {
    if (shouldPreventScroll(event, controls)) event.preventDefault();
    if (pressed.has(event.code)) return;
    pressed.add(event.code);
    keys.add(event.code);
    if (matchesControl(event, controls.pause)) {
      if (state.phase === "playing") pauseGame();
      else if (state.phase === "paused") resumeGame();
    }
    if (state.phase === "playing" && matchesControl(event, controls.reset) && state.race) {
      respawnCar(state.race, state.race.player, "manual");
      audio.play("circuitCheckpoint");
    }
  }

  function onKeyUp(event) {
    pressed.delete(event.code);
    keys.delete(event.code);
  }

  function actionButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", () => {
      audio.play("button");
      handler();
    });
    return button;
  }

  function teardownCanvas() {
    cancelAnimationFrame(raf);
    raf = 0;
    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = null;
    canvas = null;
    ctx = null;
  }

  function draw() {
    if (!canvas || !ctx || !state.race) return;
    renderer.draw(ctx, canvas, {
      ...state,
      difficultyLabel: DIFFICULTY[state.difficulty]?.label || "Normal",
      reduceMotion: Boolean(currentData.settings.reduceMotion),
    });
  }

  function destroyGame() {
    teardownCanvas();
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    keys.clear();
    pressed.clear();
    state.phase = "destroyed";
    state.race = null;
  }

  return {
    initializeGame,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    destroyGame,
    saveResult,
    loadTrack: renderLevelDetails,
    spawnRacers: startRace,
    updatePlayerCar: currentInput,
    updateComputerAI: createAiInputMap,
    updateCarPhysics: updateRacePhysics,
    detectCheckpoint: null,
    registerLap: null,
    updateRacePosition: null,
    activateBoost: null,
    respawnCar: () => state.race && respawnCar(state.race, state.race.player, "manual"),
    completeRace: finishRace,
  };
}
