import { labelsFor, matchesControl, shouldPreventScroll } from "../../shared/controls.js";
import { getData, recordGameResult, updateData } from "../../shared/storage.js";
import { ABILITIES, VEHICLES, getVehicle, isVehicleUnlocked, upgradedStats, upgradeCost } from "./rally-vehicles.js";
import { CAMPAIGN_LEVELS, environmentList, getEnvironment, getLevel, levelStars, worldUnitsToMetres } from "./rally-levels.js";
import { collectNear, extendEndlessTerrain, generateTerrain } from "./rally-terrain.js";
import { activateAbility, createVehicleState, updateVehiclePhysics } from "./rally-physics.js";
import { createRallyRenderer } from "./rally-renderer.js";
import { garageSummary, garageVehicleCards, upgradeRows } from "./rally-garage.js";

const DIFFICULTY = {
  easy: { fuel: 1.24, terrain: 0.9, coins: 1, damage: 0.78, endlessDistance: 64000, label: "Long routes with gentler hills, more fuel, and forgiving crashes." },
  normal: { fuel: 0.96, terrain: 1.1, coins: 1, damage: 1, endlessDistance: 76000, label: "Long-distance routes with tougher fuel, stunts, and progression." },
  hard: { fuel: 0.82, terrain: 1.3, coins: 1.18, damage: 1.2, endlessDistance: 90000, label: "Very long routes, steeper ridges, tighter fuel, and higher rewards." },
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatDistance(value) {
  return `${worldUnitsToMetres(value)}m`;
}

function formatMetres(value) {
  return `${Math.max(0, Math.floor(value || 0))}m`;
}

export function createCloudRidgeRallyGame(context) {
  const { root, audio, data, options, onExit, onResult } = context;
  const controls = options.controls;
  const renderer = createRallyRenderer();
  let currentData = clone(data);
  let records = currentData.progress.cloudRidgeRallyRecords;
  let canvas = null;
  let ctx = null;
  let resizeObserver = null;
  let raf = 0;
  let lastTime = 0;
  let resultSaved = false;
  const keys = new Set();
  const timers = new Set();
  let state = createMenuState();

  function createMenuState() {
    return {
      screen: "intro",
      difficulty: options.difficulty || records.selectedDifficulty || "normal",
      selectedMode: records.recentMode || "campaign",
      selectedLevel: records.recentLevel || records.highestUnlockedLevel || 1,
      selectedEnvironment: records.selectedEnvironment || "runway",
      selectedVehicle: records.selectedVehicle || "baggage-buggy",
      settings: {
        reduceMotion: Boolean(currentData.settings.reduceMotion),
        cameraShake: records.cameraShake !== false,
        simpleControls: Boolean(records.simpleControls),
      },
      time: 0,
      run: null,
      overlay: null,
    };
  }

  function initializeGame() {
    bindEvents();
    markRecentlyPlayed();
    renderIntro();
  }

  function startGame() {
    if (state.run?.phase === "playing") startLoop();
  }

  async function markRecentlyPlayed() {
    currentData = await updateData((draft) => {
      draft.progress.recentlyPlayed = "cloud-ridge-rally";
      return draft;
    });
    records = currentData.progress.cloudRidgeRallyRecords;
    await onResult?.({ gameId: "cloud-ridge-rally", summary: "Cloud Ridge Rally opened" });
  }

  function shell(title, subtitle = "Solo sky-road driving campaign") {
    teardownCanvas();
    root.className = "arcade-view cloud-ridge-rally-game";
    root.replaceChildren();
    const bar = el("section", "game-bar rally-game-bar");
    const heading = el("div", "game-title");
    heading.append(el("h1", "", "Cloud Ridge Rally"), el("p", "", subtitle));
    const actions = el("div", "game-actions");
    actions.append(
      actionButton("Campaign", "", renderCampaignMap),
      actionButton("Garage", "", renderGarage),
      actionButton("Stats", "", renderStats),
      actionButton("Arcade", "", () => renderConfirm("Return to Arcade?", "Your rally progress is already saved locally.", exitToArcade)),
    );
    bar.append(heading, miniStats(), actions);
    root.append(bar);
    if (title) {
      const sr = el("span", "rally-screen-title", title);
      sr.setAttribute("aria-live", "polite");
      root.append(sr);
    }
  }

  function miniStats() {
    const summary = garageSummary(records);
    const wrap = el("div", "rally-mini-stats");
    wrap.append(statPill("Coins", String(summary.coins)), statPill("Stars", String(summary.stars)), statPill("Level", String(summary.level)), statPill("Vehicle", summary.vehicle));
    return wrap;
  }

  function statPill(label, value) {
    const pill = el("span");
    pill.append(el("small", "", label), el("strong", "", value));
    return pill;
  }

  function renderIntro() {
    shell("Game introduction");
    const panel = el("section", "rally-menu-panel");
    panel.append(
      el("h2", "", "Drive the sky roads"),
      el("p", "", "Travel long cloud-road distances, manage fuel, collect Flight Coins, perform stunts, and unlock vehicles across original airport-inspired routes."),
    );
    const grid = el("div", "rally-info-grid");
    [
      ["Campaign", "12 longer-distance levels with checkpoints, star goals, and unlocks."],
      ["Endless Journey", "Drive a longer open route through one environment."],
      ["Garage", "Upgrade engine, grip, suspension, fuel tank, stability, air control, and brakes."],
      ["Offline", "Progress and controls stay in local browser storage."],
    ].forEach(([title, copy]) => {
      const card = el("article", "rally-info-card");
      card.append(el("h3", "", title), el("p", "", copy));
      grid.append(card);
    });
    const actions = el("div", "rally-menu-actions");
    actions.append(
      actionButton("Start Campaign", "primary-action", renderCampaignMap),
      actionButton("Endless Journey", "", renderEndlessSelection),
      actionButton("Tutorial", "", renderTutorial),
      actionButton("Garage", "", renderGarage),
    );
    panel.append(grid, difficultyPicker(), actions);
    root.append(panel);
  }

  function renderTutorial() {
    shell("Tutorial", "Laptop-friendly driving controls");
    const panel = el("section", "rally-menu-panel");
    panel.append(el("h2", "", "Training Briefing"));
    const list = el("div", "rally-info-grid");
    [
      ["Accelerate", `${labelsFor(controls.accelerate)} pushes the vehicle forward and uses fuel.`],
      ["Brake / Reverse", `${labelsFor(controls.brake)} slows down, then reverses.`],
      ["Jump", `${labelsFor(controls.jump)} pops the vehicle upward from the ground.`],
      ["Air Balance", `${labelsFor(controls.tiltBack)} tilts backward in the air. ${labelsFor(controls.tiltForward)} tilts forward.`],
      ["Ability", `${labelsFor(controls.ability)} activates the selected vehicle ability.`],
      ["Crash Rules", "A long upside-down slide, cabin hit, falling away, or empty fuel ends the run."],
      ["Stunts", "Jumps, flips, wheelies, perfect landings, and near-crash recoveries build combos."],
    ].forEach(([title, copy]) => {
      const card = el("article", "rally-info-card");
      card.append(el("h3", "", title), el("p", "", copy));
      list.append(card);
    });
    const actions = el("div", "rally-menu-actions");
    actions.append(actionButton("Test Drive", "primary-action", () => startRun({ mode: "campaign", levelId: 1 })), actionButton("Back", "", renderIntro));
    panel.append(list, settingsPanel(), actions);
    root.append(panel);
  }

  function difficultyPicker() {
    const group = el("section", "rally-choice-row");
    group.append(el("span", "field-label", "Difficulty"));
    const buttons = el("div", "segmented");
    ["easy", "normal", "hard"].forEach((difficulty) => {
      const button = actionButton(difficulty[0].toUpperCase() + difficulty.slice(1), difficulty === state.difficulty ? "is-selected" : "", async () => {
        state.difficulty = difficulty;
        currentData = await updateData((draft) => {
          draft.progress.cloudRidgeRallyRecords.selectedDifficulty = difficulty;
          return draft;
        });
        records = currentData.progress.cloudRidgeRallyRecords;
        renderIntro();
      });
      buttons.append(button);
    });
    group.append(buttons, el("p", "rally-note", DIFFICULTY[state.difficulty].label));
    return group;
  }

  function settingsPanel() {
    const card = el("section", "rally-settings-inline");
    card.append(el("span", "field-label", "Rally Settings"));
    card.append(toggleButton("Simple Controls", state.settings.simpleControls, async (enabled) => {
      await updateRallySettings({ simpleControls: enabled });
      renderTutorial();
    }));
    card.append(toggleButton("Camera Shake", state.settings.cameraShake, async (enabled) => {
      await updateRallySettings({ cameraShake: enabled });
      renderTutorial();
    }));
    return card;
  }

  async function updateRallySettings(patch) {
    state.settings = { ...state.settings, ...patch };
    currentData = await updateData((draft) => {
      Object.assign(draft.progress.cloudRidgeRallyRecords, patch);
      return draft;
    });
    records = currentData.progress.cloudRidgeRallyRecords;
  }

  function toggleButton(label, active, handler) {
    const button = actionButton(`${label}: ${active ? "On" : "Off"}`, active ? "is-selected" : "", () => handler(!active));
    button.setAttribute("aria-pressed", String(active));
    return button;
  }

  function renderCampaignMap() {
    shell("Campaign map", "Sequential sky-road rally levels");
    const panel = el("section", "rally-menu-panel");
    const header = el("div", "rally-section-header");
    header.append(el("div", "", ""), actionButton("Endless Journey", "", renderEndlessSelection));
    panel.append(el("h2", "", "Campaign Map"), header);
    const grid = el("div", "rally-level-grid");
    for (const level of CAMPAIGN_LEVELS) {
      const unlocked = level.id <= (records.highestUnlockedLevel || 1);
      const stars = records.stars?.[String(level.id)] || 0;
      const card = actionButton("", `rally-level-card ${unlocked ? "" : "is-locked"}`, () => {
        if (unlocked) renderLevelInfo(level.id);
      });
      card.disabled = !unlocked;
      card.append(
        el("span", "card-meta", `Level ${level.id}`),
        el("strong", "", level.name),
        el("p", "", level.objective),
        el("span", "rally-stars", `${"★".repeat(stars)}${"☆".repeat(3 - stars)}`),
      );
      grid.append(card);
    }
    panel.append(grid);
    root.append(panel);
  }

  function renderLevelInfo(levelId) {
    const level = getLevel(levelId);
    const env = getEnvironment(level.environment);
    shell("Level information", `${level.name} - ${env.name}`);
    const panel = el("section", "rally-menu-panel");
    panel.append(el("h2", "", level.name), el("p", "", level.objective));
    const facts = el("dl", "rally-facts");
    [
      ["Environment", env.name],
      ["Recommended", getVehicle(level.recommendedVehicle).name],
      ["Distance", formatDistance(level.distance)],
      ["Checkpoints", String(level.checkpoints.length)],
      ["Challenge", level.challenge],
      ["Stars", level.stars.join(" | ")],
    ].forEach(([term, value]) => {
      facts.append(el("dt", "", term), el("dd", "", value));
    });
    const actions = el("div", "rally-menu-actions");
    actions.append(
      actionButton("Start Level", "primary-action", () => startRun({ mode: "campaign", levelId: level.id })),
      actionButton("Garage", "", renderGarage),
      actionButton("Back to Map", "", renderCampaignMap),
    );
    panel.append(facts, vehicleStrip(), actions);
    root.append(panel);
  }

  function renderEndlessSelection() {
    shell("Endless Mode selection", "Choose an environment and drive for distance");
    const panel = el("section", "rally-menu-panel");
    panel.append(el("h2", "", "Endless Journey"));
    const grid = el("div", "rally-env-grid");
    environmentList().forEach((environment) => {
      const best = records.bestEndless?.[environment.id] || 0;
      const card = actionButton("", `rally-env-card ${state.selectedEnvironment === environment.id ? "is-selected" : ""}`, async () => {
        state.selectedEnvironment = environment.id;
        currentData = await updateData((draft) => {
          draft.progress.cloudRidgeRallyRecords.selectedEnvironment = environment.id;
          return draft;
        });
        records = currentData.progress.cloudRidgeRallyRecords;
        renderEndlessSelection();
      });
      card.style.setProperty("--env", environment.ground);
      card.append(el("strong", "", environment.name), el("span", "", `Best ${formatMetres(best)}`));
      grid.append(card);
    });
    const actions = el("div", "rally-menu-actions");
    actions.append(actionButton("Start Endless", "primary-action", () => startRun({ mode: "endless", environmentId: state.selectedEnvironment })), actionButton("Garage", "", renderGarage), actionButton("Back", "", renderIntro));
    panel.append(grid, vehicleStrip(), actions);
    root.append(panel);
  }

  function vehicleStrip() {
    const strip = el("section", "rally-vehicle-strip");
    const vehicle = getVehicle(records.selectedVehicle);
    const ability = ABILITIES[vehicle.ability];
    strip.append(el("span", "field-label", "Selected Vehicle"), vehicleBadge(vehicle), el("p", "", `${vehicle.description} Ability: ${ability?.name || "None"}.`));
    return strip;
  }

  function vehicleBadge(vehicle) {
    const badge = el("div", "rally-vehicle-badge");
    badge.style.setProperty("--vehicle", vehicle.color);
    badge.style.setProperty("--trim", vehicle.trim);
    badge.append(el("i"), el("strong", "", vehicle.name));
    return badge;
  }

  function renderGarage() {
    shell("Vehicle garage", "Airport hangar upgrades and vehicle selection");
    const panel = el("section", "rally-garage-panel");
    panel.append(el("h2", "", "Maintenance Hangar"), el("p", "", "Spend Flight Coins on balanced upgrades and choose a vehicle for campaign or endless runs."));
    const grid = el("div", "rally-garage-grid");
    for (const vehicle of garageVehicleCards(records)) {
      const card = el("article", `rally-vehicle-card ${vehicle.selected ? "is-selected" : ""} ${vehicle.unlocked ? "" : "is-locked"}`);
      card.append(vehicleBadge(vehicle), el("p", "", vehicle.unlocked ? vehicle.description : `Locked: ${vehicle.unlock.label}`), statBars(vehicle.stats));
      const actions = el("div", "rally-card-actions");
      if (vehicle.unlocked) {
        actions.append(actionButton(vehicle.selected ? "Selected" : "Select Vehicle", vehicle.selected ? "is-selected" : "primary-action", () => selectVehicle(vehicle.id)), actionButton("Upgrade", "", () => renderUpgradeScreen(vehicle.id)), actionButton("Test Drive", "", () => startRun({ mode: "campaign", levelId: 1, vehicleId: vehicle.id })));
      } else if (vehicle.unlock.type === "coins" && records.flightCoins >= vehicle.unlock.value) {
        actions.append(actionButton("Unlock Vehicle", "primary-action", () => unlockVehicle(vehicle.id)));
      }
      card.append(actions);
      grid.append(card);
    }
    panel.append(grid, actionButton("Vehicle Customisation", "", renderCustomisation));
    root.append(panel);
  }

  function statBars(stats) {
    const wrap = el("div", "rally-stat-bars");
    [
      ["Engine", stats.engine / 800],
      ["Grip", stats.grip / 1.5],
      ["Fuel", stats.fuelCapacity / 150],
      ["Air", stats.airControl / 1.7],
    ].forEach(([label, value]) => {
      const row = el("div", "rally-stat-row");
      row.append(el("span", "", label));
      const bar = el("i");
      bar.style.width = `${Math.min(100, Math.round(value * 100))}%`;
      row.append(el("b", "", ""));
      row.querySelector("b").append(bar);
      wrap.append(row);
    });
    return wrap;
  }

  async function selectVehicle(vehicleId) {
    currentData = await updateData((draft) => {
      draft.progress.cloudRidgeRallyRecords.selectedVehicle = vehicleId;
      return draft;
    });
    records = currentData.progress.cloudRidgeRallyRecords;
    audio.play("button");
    renderGarage();
  }

  async function unlockVehicle(vehicleId) {
    const vehicle = getVehicle(vehicleId);
    if (vehicle.unlock.type !== "coins" || records.flightCoins < vehicle.unlock.value) return;
    currentData = await updateData((draft) => {
      const record = draft.progress.cloudRidgeRallyRecords;
      record.flightCoins -= vehicle.unlock.value;
      if (!record.unlockedVehicles.includes(vehicleId)) record.unlockedVehicles.push(vehicleId);
      record.selectedVehicle = vehicleId;
      return draft;
    });
    records = currentData.progress.cloudRidgeRallyRecords;
    audio.play("rallyUnlock");
    renderVehicleUnlock(vehicle);
  }

  function renderUpgradeScreen(vehicleId) {
    const vehicle = getVehicle(vehicleId);
    shell("Vehicle upgrade screen", `${vehicle.name} upgrades`);
    const panel = el("section", "rally-upgrade-panel");
    panel.append(el("h2", "", vehicle.name), vehicleBadge(vehicle), el("p", "", `${records.flightCoins} Flight Coins available.`));
    const grid = el("div", "rally-upgrade-grid");
    for (const upgrade of upgradeRows(vehicle, records)) {
      const row = el("article", "rally-upgrade-card");
      row.append(el("h3", "", upgrade.label), el("p", "", `Level ${upgrade.level}/5: ${upgrade.current} → ${upgrade.next}`));
      row.append(actionButton(upgrade.maxed ? "Maxed" : `Buy ${upgrade.cost}`, upgrade.maxed ? "is-selected" : "primary-action", () => buyUpgrade(vehicle.id, upgrade.id, upgrade.cost, upgrade.maxed)));
      grid.append(row);
    }
    panel.append(grid, actionButton("Back to Garage", "", renderGarage));
    root.append(panel);
  }

  async function buyUpgrade(vehicleId, upgradeId, cost, maxed) {
    if (maxed || records.flightCoins < cost) return;
    currentData = await updateData((draft) => {
      const record = draft.progress.cloudRidgeRallyRecords;
      record.flightCoins -= cost;
      record.upgrades[vehicleId][upgradeId] = Math.min(5, (record.upgrades[vehicleId][upgradeId] || 0) + 1);
      return draft;
    });
    records = currentData.progress.cloudRidgeRallyRecords;
    audio.play("rallyUpgrade");
    renderUpgradeScreen(vehicleId);
  }

  function renderCustomisation() {
    shell("Vehicle customisation", "Locally saved hangar cosmetics");
    const panel = el("section", "rally-menu-panel");
    panel.append(el("h2", "", "Skins and Accessories"), el("p", "", "Vehicle skins unlock through Boarding Stars, Lost Luggage Tokens, Golden Propellers, and campaign progress."));
    const grid = el("div", "rally-info-grid");
    ["Sky Blue", "Sunset Trim", "Cargo Stripe", "Frost Shine", "Volcano Glow", "Moon Dust"].forEach((skin, index) => {
      const unlocked = index < 2 || (records.boardingStars || 0) >= index * 2 || (records.goldenPropellers || 0) >= 2;
      const card = el("article", `rally-info-card ${unlocked ? "" : "is-muted"}`);
      card.append(el("h3", "", skin), el("p", "", unlocked ? "Unlocked locally." : "Locked by collectibles."));
      grid.append(card);
    });
    panel.append(grid, actionButton("Back to Garage", "primary-action", renderGarage));
    root.append(panel);
  }

  function renderStats() {
    shell("Statistics", "Local Cloud Ridge Rally records");
    const panel = el("section", "rally-menu-panel");
    panel.append(el("h2", "", "Rally Statistics"));
    const facts = el("dl", "rally-facts");
    [
      ["Flight Coins", records.flightCoins],
      ["Highest Level", records.highestUnlockedLevel],
      ["Total Stars", garageSummary(records).stars],
      ["Best Stunt Combo", records.bestStuntCombo],
      ["Longest Jump", `${Math.floor(records.longestJump || 0)}m`],
      ["Longest Wheelie", `${(records.longestWheelie || 0).toFixed(1)}s`],
      ["Total Distance", `${Math.floor(records.totalDistance || 0)}m`],
      ["Fuel Collected", `${Math.floor(records.totalFuelCollected || 0)}%`],
    ].forEach(([term, value]) => facts.append(el("dt", "", term), el("dd", "", String(value || 0))));
    panel.append(facts, actionButton("Back", "primary-action", renderIntro));
    root.append(panel);
  }

  function startRun({ mode, levelId = 1, environmentId = "runway", vehicleId = records.selectedVehicle }) {
    resultSaved = false;
    const vehicle = getVehicle(vehicleId || records.selectedVehicle || "baggage-buggy");
    const stats = upgradedStats(vehicle, records.upgrades?.[vehicle.id] || {});
    const difficulty = DIFFICULTY[state.difficulty] || DIFFICULTY.normal;
    stats.fuelCapacity = Math.round(stats.fuelCapacity * difficulty.fuel);
    const terrain = generateTerrain({ mode, levelId, environmentId, distance: difficulty.endlessDistance, difficultyScale: difficulty.terrain });
    const vehicleState = createVehicleState(vehicle, stats, 120);
    vehicleState.maxFuel = stats.fuelCapacity;
    vehicleState.fuel = stats.fuelCapacity;
    state.run = {
      mode,
      phase: "playing",
      level: mode === "campaign" ? getLevel(levelId) : null,
      terrain,
      vehicle,
      stats,
      vehicleState,
      camera: { x: 0, y: 0 },
      input: createInputState(),
      coins: 0,
      collectedCoins: 0,
      rare: { boardingStars: 0, luggageTokens: 0, goldenPropellers: 0 },
      stunts: [],
      messages: [],
      comboMultiplier: 1,
      pendingBonus: 0,
      checkpointIndex: 0,
      checkpointRestarts: 0,
      crashTimer: 0,
      completed: false,
      challengeComplete: false,
      lowFuelSounded: false,
      startedAt: performance.now(),
    };
    renderGameplay();
    startLoop();
  }

  function createInputState() {
    return { accelerate: false, brake: false, jump: false, tiltBack: false, tiltForward: false, ability: false };
  }

  function renderGameplay() {
    root.className = "arcade-view cloud-ridge-rally-game is-playing";
    root.replaceChildren();
    const canvasWrap = el("section", "rally-canvas-wrap");
    canvas = document.createElement("canvas");
    canvas.id = "cloudRidgeRallyCanvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Cloud Ridge Rally side-scrolling vehicle course with hills, fuel, coins, checkpoints, and obstacles.");
    const overlay = el("div", "game-overlay");
    overlay.id = "rallyOverlay";
    canvasWrap.append(canvas, overlay);
    const controlsPanel = el("section", "rally-bottom-controls");
    controlsPanel.append(
      actionButton("Pause", "", pauseGame),
      actionButton("Restart", "", () => renderRestartConfirm()),
      actionButton("Jump", "", () => triggerJump()),
      actionButton("Ability", "primary-action", () => triggerAbility()),
      actionButton("Garage", "", () => renderConfirm("Return to Garage?", "This ends the current run and keeps earned progress.", renderGarage)),
      actionButton("Arcade", "", () => renderConfirm("Return to Arcade?", "This ends the current run and returns to the library.", exitToArcade)),
    );
    root.append(canvasWrap, controlsPanel);
    ctx = canvas.getContext("2d");
    resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvasWrap);
    resizeCanvas();
  }

  function startLoop() {
    cancelAnimationFrame(raf);
    lastTime = performance.now();
    const tick = (time) => {
      const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
      lastTime = time;
      update(dt);
      draw();
      if (state.run?.phase === "playing" || state.run?.phase === "crashing") raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function update(dt) {
    if (!state.run || state.run.phase === "paused") return;
    state.time += dt * 1000;
    const run = state.run;
    syncInput();
    run.messages.forEach((message) => {
      message.life -= dt;
    });
    run.messages = run.messages.filter((message) => message.life > 0);
    if (run.phase === "crashing") {
      run.crashTimer -= dt;
      if (run.crashTimer <= 0) showCrashResult();
      return;
    }
    extendEndlessTerrain(run.terrain, run.vehicleState.x);
    updateVehiclePhysics(run.vehicleState, run.terrain, run.vehicle, run.stats, run.input, dt);
    handleCollections();
    detectStunts(dt);
    checkCheckpoints();
    checkCompletion();
    if (run.vehicleState.fuel / run.vehicleState.maxFuel < 0.18 && !run.lowFuelSounded) {
      run.lowFuelSounded = true;
      addMessage("Low Fuel", 0);
      audio.play("rallyCrash");
    }
    if (run.vehicleState.crashed) endRun("crash", run.vehicleState.crashReason);
  }

  function syncInput() {
    const input = state.run.input;
    input.accelerate = hasKey(controls.accelerate) || keys.has("ArrowRight");
    input.brake = hasKey(controls.brake) || keys.has("ArrowLeft");
    input.jump = hasKey(controls.jump);
    const simple = state.settings.simpleControls;
    input.tiltBack = hasKey(controls.tiltBack) || keys.has("ArrowUp") || (simple && input.accelerate && !state.run.vehicleState.grounded);
    input.tiltForward = hasKey(controls.tiltForward) || keys.has("ArrowDown") || (simple && input.brake && !state.run.vehicleState.grounded);
  }

  function hasKey(codes) {
    return codes.some((code) => keys.has(code));
  }

  function handleCollections() {
    const run = state.run;
    const vehicle = run.vehicleState;
    for (const pickup of collectNear(run.terrain, vehicle.x, vehicle.y, 64)) {
      if (pickup.type === "coin") {
        run.coins += 1;
        run.collectedCoins += 1;
        audio.play("rallyCoin");
      } else if (pickup.type === "fuel") {
        const amount = vehicle.maxFuel * (pickup.value / 100);
        vehicle.fuel = Math.min(vehicle.maxFuel, vehicle.fuel + amount);
        run.lowFuelSounded = false;
        run.rare.fuelCollected = (run.rare.fuelCollected || 0) + pickup.value;
        addMessage(`Fuel +${pickup.value}%`, 0);
        audio.play("rallyFuel");
      } else {
        if (pickup.type === "boarding-star") run.rare.boardingStars += 1;
        if (pickup.type === "luggage-token") run.rare.luggageTokens += 1;
        if (pickup.type === "golden-propeller") run.rare.goldenPropellers += 1;
        addMessage(rareName(pickup.type), 8);
        audio.play("rallyUnlock");
      }
    }
  }

  function rareName(type) {
    if (type === "boarding-star") return "Boarding Star";
    if (type === "luggage-token") return "Lost Luggage";
    return "Golden Propeller";
  }

  function detectStunts(dt) {
    const run = state.run;
    const vehicle = run.vehicleState;
    if (!vehicle.grounded) {
      if (vehicle.airtime > 0.45 && !run.stunts.includes("Air Time")) awardStunt("Air Time", 4);
      if (vehicle.airtime > 0.9 && !run.stunts.includes("High Jump")) awardStunt("High Jump", 7);
      if (vehicle.flips >= 1 && !run.stunts.includes(vehicle.angularVelocity < 0 ? "Back Flip" : "Front Flip")) {
        awardStunt(vehicle.angularVelocity < 0 ? "Back Flip" : "Front Flip", 14);
      }
      if (vehicle.flips >= 2 && !run.stunts.includes("Double Flip")) awardStunt("Double Flip", 26);
    } else {
      if (!vehicle.lastGrounded && vehicle.lastAirTime > 0.32) {
        awardStunt(vehicle.lastLandingHard ? "Near-Crash Recovery" : "Perfect Landing", vehicle.lastLandingHard ? 10 : 12);
        vehicle.lastAirTime = 0;
        vehicle.lastLandingHard = false;
      }
      if (vehicle.wheelieTime > 0.45 && !run.stunts.includes("Wheelie")) awardStunt("Wheelie", 5);
      if (vehicle.wheelieTime > 1.4 && !run.stunts.includes("Long Wheelie")) awardStunt("Long Wheelie", 13);
    }
    if (run.comboMultiplier > 1) run.comboMultiplier = Math.max(1, run.comboMultiplier - dt * 0.06);
  }

  function awardStunt(name, bonus) {
    const run = state.run;
    if (run.stunts.includes(name) && !name.includes("Landing")) return;
    run.stunts.push(name);
    run.comboMultiplier = Math.min(5, run.comboMultiplier + 0.45);
    const award = Math.round(bonus * run.comboMultiplier);
    run.pendingBonus += award;
    run.coins += award;
    addMessage(name, award);
    audio.play("rallyStunt");
  }

  function addMessage(text, bonus = 0) {
    state.run.messages.unshift({ text, bonus, life: 1.5 });
  }

  function checkCheckpoints() {
    const run = state.run;
    for (const checkpoint of run.terrain.checkpoints) {
      if (checkpoint.reached || run.vehicleState.x < checkpoint.x) continue;
      checkpoint.reached = true;
      run.checkpointIndex += 1;
      run.vehicleState.checkpointX = checkpoint.x;
      run.coins += 10;
      run.vehicleState.fuel = Math.min(run.vehicleState.maxFuel, run.vehicleState.fuel + run.vehicleState.maxFuel * 0.12);
      addMessage("Checkpoint", 10);
      showCheckpointOverlay(checkpoint.x);
      audio.play("rallyCheckpoint");
    }
  }

  function showCheckpointOverlay(x) {
    const overlay = root.querySelector("#rallyOverlay");
    if (!overlay) return;
    overlay.classList.add("is-visible", "is-compact");
    overlay.innerHTML = "";
    const panel = el("div", "game-overlay-panel rally-mini-overlay");
    panel.append(el("h2", "", "Checkpoint Reached"), el("p", "", `Saved at ${formatDistance(x)}. Fuel restored and +10 Flight Coins.`));
    overlay.append(panel);
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      hideOverlay();
    }, 900);
    timers.add(timer);
  }

  function checkCompletion() {
    const run = state.run;
    if (run.mode !== "campaign" || !run.terrain.finish) return;
    if (run.vehicleState.x >= run.terrain.finish.x) {
      run.completed = true;
      run.challengeComplete = challengeMet(run);
      completeLevel();
    }
  }

  function challengeMet(run) {
    const challenge = run.level.challenge.toLowerCase();
    if (challenge.includes("without flipping")) return !run.stunts.some((stunt) => stunt.includes("Flip"));
    if (challenge.includes("luggage")) return run.rare.luggageTokens > 0;
    if (challenge.includes("long jump")) return run.stunts.includes("High Jump") || run.stunts.includes("Air Time");
    if (challenge.includes("25% fuel")) return run.vehicleState.fuel / run.vehicleState.maxFuel >= 0.25;
    if (challenge.includes("no checkpoint")) return run.checkpointRestarts === 0;
    if (challenge.includes("perfect landing")) return run.stunts.includes("Perfect Landing");
    if (challenge.includes("golden propeller")) return run.rare.goldenPropellers > 0;
    if (challenge.includes("near-crash")) return run.stunts.includes("Near-Crash Recovery");
    if (challenge.includes("backflip")) return run.stunts.includes("Back Flip");
    if (challenge.includes("air ability")) return run.vehicleState.abilityTimer > 0 || run.stunts.includes("Air Time");
    if (challenge.includes("double flip")) return run.stunts.includes("Double Flip");
    if (challenge.includes("combo")) return run.comboMultiplier > 1.3;
    return false;
  }

  function triggerAbility() {
    if (!state.run || state.run.phase !== "playing") return;
    const ability = ABILITIES[state.run.vehicle.ability];
    if (activateAbility(state.run.vehicleState, state.run.vehicle, ability, state.run.stats)) {
      addMessage(ability.name, 0);
      audio.play("rallyAccelerate");
    }
  }

  function triggerJump() {
    if (!state.run || state.run.phase !== "playing") return;
    const vehicle = state.run.vehicleState;
    if (!vehicle.grounded || vehicle.jumpCooldown > 0 || vehicle.crashed) return;
    const direction = vehicle.vx < -10 ? -1 : 1;
    const lift = 430 + state.run.stats.suspension * 80;
    vehicle.vy -= lift;
    vehicle.vx += direction * Math.max(45, Math.abs(vehicle.vx) * 0.04);
    vehicle.angularVelocity -= direction * 0.45;
    vehicle.grounded = false;
    vehicle.frontContact = false;
    vehicle.rearContact = false;
    vehicle.jumpCooldown = 0.55;
    addMessage("Jump", 0);
    audio.play("rallyJump");
  }

  function endRun(reason, message = "") {
    const run = state.run;
    if (!run || run.phase !== "playing") return;
    run.phase = "crashing";
    run.crashTimer = 1.1;
    run.vehicleState.crashed = true;
    run.vehicleState.crashReason = message || reason;
    run.pendingBonus = 0;
    audio.play("rallyCrash");
  }

  async function completeLevel() {
    const run = state.run;
    if (!run || run.phase !== "playing") return;
    run.phase = "complete";
    cancelAnimationFrame(raf);
    const result = resultFromRun("complete");
    const stars = levelStars(run.level, result);
    result.stars = stars;
    await saveRallyResult(result);
    audio.play("rallyComplete");
    showCompleteResult(result);
  }

  async function showCrashResult() {
    const run = state.run;
    if (!run || run.phase !== "crashing") return;
    run.phase = "result";
    cancelAnimationFrame(raf);
    const result = resultFromRun("crash");
    await saveRallyResult(result);
    const best = records.bestEndless?.[run.terrain.environment.id] || records.bestCampaignDistance || 0;
    const overlay = root.querySelector("#rallyOverlay");
    overlay.classList.add("is-visible");
    overlay.innerHTML = "";
    const panel = el("div", "game-overlay-panel rally-result-card");
    panel.append(
      el("h2", "", "Run Over"),
      el("p", "", run.vehicleState.crashReason || "The vehicle needs a hangar reset."),
      resultGrid([
        ["Distance", formatMetres(result.distance)],
        ["Flight Coins", result.coins],
        ["Stunts", result.stunts.length],
        ["Previous Best", formatMetres(best)],
      ]),
      resultActions(false),
    );
    overlay.append(panel);
  }

  function showCompleteResult(result) {
    const overlay = root.querySelector("#rallyOverlay");
    overlay.classList.add("is-visible");
    overlay.innerHTML = "";
    const panel = el("div", "game-overlay-panel rally-result-card");
    const unlockCopy = result.unlockedLevel ? `New level unlocked: Level ${result.unlockedLevel}.` : "Completed level can be replayed anytime.";
    panel.append(
      el("h2", "", "Level Complete"),
      el("p", "", unlockCopy),
      el("div", "rally-big-stars", `${"★".repeat(result.stars)}${"☆".repeat(3 - result.stars)}`),
      resultGrid([
        ["Distance", formatMetres(result.distance)],
        ["Flight Coins", result.coins],
        ["Stunts", result.stunts.length],
        ["Fuel Left", `${Math.floor(result.fuelLeft)}%`],
      ]),
      resultActions(true),
    );
    overlay.append(panel);
  }

  function resultGrid(items) {
    const grid = el("dl", "rally-result-grid");
    items.forEach(([term, value]) => {
      grid.append(el("dt", "", term), el("dd", "", String(value)));
    });
    return grid;
  }

  function resultActions(completed) {
    const actions = el("div", "overlay-actions");
    actions.append(
      actionButton(completed ? "Next Level" : "Restart", "primary-action", () => {
        if (completed && state.run.level?.id < CAMPAIGN_LEVELS.length) startRun({ mode: "campaign", levelId: state.run.level.id + 1 });
        else restartGame();
      }),
      actionButton("Return to Garage", "", renderGarage),
      actionButton("Campaign Map", "", renderCampaignMap),
      actionButton("Return to Arcade", "", exitToArcade),
    );
    return actions;
  }

  function resultFromRun(outcome) {
    const run = state.run;
    const worldDistance = Math.max(0, run.vehicleState.distance - 120);
    const distance = worldUnitsToMetres(worldDistance);
    const totalCoins = run.terrain.totalCoins || 1;
    return {
      gameId: "cloud-ridge-rally",
      mode: "solo",
      rallyMode: run.mode,
      difficulty: state.difficulty,
      winner: outcome === "complete" ? "solo" : "computer",
      score: Math.floor(distance),
      distance,
      worldDistance,
      coins: run.coins,
      coinsCollected: run.collectedCoins,
      totalCoins,
      stunts: [...run.stunts],
      combo: Math.floor(run.comboMultiplier),
      fuelLeft: (run.vehicleState.fuel / run.vehicleState.maxFuel) * 100,
      completed: outcome === "complete",
      level: run.level?.id || null,
      environment: run.terrain.environment.id,
      vehicle: run.vehicle.id,
      rare: { ...run.rare },
      challengeComplete: run.challengeComplete,
      summary: outcome === "complete"
        ? `${run.level.name} complete - ${formatMetres(distance)}`
        : `${run.terrain.environment.name} - ${formatMetres(distance)}`,
    };
  }

  async function saveRallyResult(result) {
    if (resultSaved) return;
    resultSaved = true;
    await saveResult(result);
    currentData = await getData();
    records = currentData.progress.cloudRidgeRallyRecords;
    await onResult?.(result);
  }

  async function saveResult(result) {
    await recordGameResult(result);
  }

  function renderVehicleUnlock(vehicle) {
    shell("Vehicle-unlock screen");
    const panel = el("section", "rally-menu-panel rally-unlock-panel");
    panel.append(el("h2", "", "Vehicle Unlocked"), vehicleBadge(vehicle), el("p", "", `${vehicle.name} is ready in the hangar.`));
    panel.append(actionButton("Drive It", "primary-action", () => startRun({ mode: "campaign", levelId: Math.min(records.highestUnlockedLevel, 12), vehicleId: vehicle.id })), actionButton("Back to Garage", "", renderGarage));
    root.append(panel);
  }

  async function pauseGame() {
    if (!state.run || state.run.phase !== "playing") return;
    state.run.phase = "paused";
    cancelAnimationFrame(raf);
    const overlay = root.querySelector("#rallyOverlay");
    overlay.classList.add("is-visible");
    overlay.innerHTML = "";
    const panel = el("div", "game-overlay-panel");
    panel.append(el("h2", "", "Paused"), el("p", "", "The engine is idling in the clouds."));
    const actions = el("div", "overlay-actions");
    actions.append(actionButton("Resume", "primary-action", resumeGame), actionButton("Restart", "", renderRestartConfirm), actionButton("Garage", "", renderGarage), actionButton("Arcade", "", exitToArcade));
    panel.append(actions);
    overlay.append(panel);
  }

  function resumeGame() {
    if (!state.run || state.run.phase !== "paused") return;
    hideOverlay();
    state.run.phase = "playing";
    lastTime = performance.now();
    startLoop();
  }

  function restartGame() {
    if (!state.run) return renderIntro();
    const { mode, level, terrain, vehicle } = state.run;
    startRun({ mode, levelId: level?.id || 1, environmentId: terrain.environment.id, vehicleId: vehicle.id });
  }

  function renderRestartConfirm() {
    renderConfirm("Restart Run?", "Restart from the beginning of this route.", restartGame);
  }

  function renderConfirm(title, copy, confirm) {
    if (state.run?.phase === "playing") {
      state.run.phase = "paused";
      cancelAnimationFrame(raf);
    }
    const overlay = root.querySelector("#rallyOverlay") || el("div", "game-overlay is-visible");
    overlay.classList.add("is-visible");
    overlay.innerHTML = "";
    const panel = el("div", "game-overlay-panel");
    panel.append(el("h2", "", title), el("p", "", copy));
    const actions = el("div", "overlay-actions");
    actions.append(actionButton("Stay", "primary-action", () => {
      if (state.run?.phase === "paused") resumeGame();
      else hideOverlay();
    }), actionButton(title.includes("Arcade") ? "Return to Arcade" : "Confirm", "", confirm));
    panel.append(actions);
    overlay.append(panel);
    if (!overlay.parentElement) root.append(overlay);
  }

  function hideOverlay() {
    const overlay = root.querySelector("#rallyOverlay");
    if (!overlay) return;
    overlay.classList.remove("is-visible", "is-compact");
    overlay.innerHTML = "";
  }

  function draw() {
    if (!ctx || !canvas || !state.run) return;
    renderer.draw(ctx, canvas, state);
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = Math.max(720, Math.floor(canvas.parentElement.clientWidth || rect.width || 960));
    const height = Math.max(560, Math.floor(canvas.parentElement.clientHeight || rect.height || 620));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    draw();
  }

  function bindEvents() {
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);
  }

  function handleKeydown(event) {
    if (shouldPreventScroll(event, controls)) event.preventDefault();
    keys.add(event.code);
    if (matchesControl(event, controls.pause)) {
      event.preventDefault();
      state.run?.phase === "paused" ? resumeGame() : pauseGame();
    }
    if (matchesControl(event, controls.restart)) {
      event.preventDefault();
      renderRestartConfirm();
    }
    if (matchesControl(event, controls.jump) && !event.repeat) {
      event.preventDefault();
      triggerJump();
    }
    if (matchesControl(event, controls.ability) && !event.repeat) {
      event.preventDefault();
      triggerAbility();
    }
  }

  function handleKeyup(event) {
    keys.delete(event.code);
  }

  function actionButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = className;
    button.addEventListener("click", () => {
      audio.play("button");
      handler();
    });
    return button;
  }

  function exitToArcade() {
    destroyGame();
    onExit();
  }

  function teardownCanvas() {
    cancelAnimationFrame(raf);
    resizeObserver?.disconnect();
    resizeObserver = null;
    canvas = null;
    ctx = null;
  }

  function destroyGame() {
    teardownCanvas();
    for (const timer of timers) window.clearTimeout(timer);
    timers.clear();
    keys.clear();
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("keyup", handleKeyup);
    root.innerHTML = "";
    state.run = null;
  }

  return {
    initializeGame,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    destroyGame,
    saveResult,
    loadVehicle: selectVehicle,
    loadLevel: (levelId) => startRun({ mode: "campaign", levelId }),
    generateTerrain,
    updateVehiclePhysics,
    collectFuel: handleCollections,
    collectCoin: handleCollections,
    jump: triggerJump,
    activateAbility: triggerAbility,
    detectStunt: detectStunts,
    reachCheckpoint: checkCheckpoints,
    completeLevel,
    endRun,
  };
}
