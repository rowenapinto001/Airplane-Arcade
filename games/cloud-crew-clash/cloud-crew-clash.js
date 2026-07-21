import { labelsFor, matchesControl, shouldPreventScroll } from "../../shared/controls.js";
import { getData, recordGameResult, updateData } from "../../shared/storage.js";
import {
  CLOUD_CREW_LEVELS,
  CREW_TYPES,
  PERMANENT_UPGRADES,
  PORTAL_TYPES,
  TEMP_UPGRADES,
  getCloudCrewLevel,
  totalStars,
} from "./cloud-crew-levels.js";
import { createComputerAI, updateComputerAI } from "./cloud-crew-ai.js";
import { createCloudCrewRenderer } from "./cloud-crew-renderer.js";

const MAX_UNITS = 190;
const PLAYER = "player";
const RIVAL = "rival";
const ABILITIES = {
  rally: {
    id: "rally",
    name: "Rally Beacon",
    key: "1",
    cooldown: 11,
    duration: 5,
    radius: 92,
    description: "Pulls nearby friendly crew toward a new route point.",
  },
  shield: {
    id: "shield",
    name: "Cloud Shield",
    key: "2",
    cooldown: 14,
    duration: 4,
    radius: 86,
    description: "Protects crew in a soft cloud field.",
  },
  turbo: {
    id: "turbo",
    name: "Turbo Launch",
    key: "3",
    cooldown: 17,
    duration: 5,
    radius: 0,
    description: "Temporarily increases launcher speed.",
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`;
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

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const min = Math.floor(safe / 60);
  return `${min}:${String(safe % 60).padStart(2, "0")}`;
}

export function createCloudCrewClashGame(context) {
  const { root, audio, data, options, onExit, onSetup, onResult } = context;
  const controls = options.controls;
  const renderer = createCloudCrewRenderer();
  let currentData = clone(data);
  let records = currentData.progress.cloudCrewRecords;
  let canvas = null;
  let ctx = null;
  let resizeObserver = null;
  let raf = 0;
  let resultSaved = false;
  let lastTime = 0;
  let state = createMenuState();
  const keys = new Set();

  function createMenuState() {
    return {
      screen: "intro",
      difficulty: records.selectedDifficulty || options.difficulty || "normal",
      crewType: records.selectedCrewType || "basic",
      levelNumber: records.recentLevel || records.highestUnlockedLevel || 1,
      confirmTarget: null,
      paused: false,
    };
  }

  function initializeGame() {
    root.className = "arcade-view cloud-crew-game";
    bindWindowEvents();
    markRecentlyPlayed();
    renderIntro();
  }

  function startGame() {
    startLoop();
  }

  async function markRecentlyPlayed() {
    currentData = await updateData((draft) => {
      draft.progress.recentlyPlayed = "cloud-crew-clash";
      return draft;
    });
    records = currentData.progress.cloudCrewRecords;
    await onResult?.({ gameId: "cloud-crew-clash", summary: "Cloud Crew Clash opened" });
  }

  function shell(title, subtitle = "") {
    root.className = "arcade-view cloud-crew-game";
    root.replaceChildren();
    const bar = el("section", "game-bar cloud-game-bar");
    const heading = el("div", "game-title");
    heading.append(el("h1", "", "Cloud Crew Clash"), el("p", "", subtitle || "Solo sky-terminal strategy campaign"));
    const actions = el("div", "game-actions");
    actions.append(
      actionButton("Level Map", "", renderLevelMap),
      actionButton("Settings", "", renderSettingsScreen),
      actionButton("Arcade", "", () => renderExitConfirm("arcade")),
    );
    bar.append(heading, quickStats(), actions);
    root.append(bar);
    if (title) {
      const sr = el("span", "cloud-screen-title", title);
      sr.setAttribute("aria-live", "polite");
      root.append(sr);
    }
  }

  function quickStats() {
    const stats = el("div", "score-strip cloud-mini-stats");
    stats.append(
      miniStat("Unlocked", `Lv ${records.highestUnlockedLevel}`),
      miniStat("Stars", String(totalStars(records.stars))),
      miniStat("Badges", String(records.flightBadges)),
    );
    return stats;
  }

  function miniStat(label, value) {
    const item = el("span");
    item.append(el("small", "", label), el("strong", "", value));
    return item;
  }

  function actionButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (className) button.className = className;
    button.addEventListener("click", () => {
      audio.play("button");
      handler();
    });
    return button;
  }

  function renderIntro() {
    state.screen = "intro";
    teardownCanvas();
    shell("Game introduction", "Launch crew through floating routes and outsmart the rival hub.");
    const panel = el("section", "cloud-menu-panel");
    panel.append(
      el("span", "card-meta", "Game introduction"),
      el("h2", "", "Command a crew across the sky terminal"),
      el(
        "p",
        "",
        "Aim the Crew Launcher, release tiny crew, choose routes, capture stations, collect Sky Energy, and complete campaign missions against a fair computer rival.",
      ),
    );
    const cards = el("div", "cloud-info-grid");
    [
      ["Crew Launcher", "Mouse aims and holds to launch. Keyboard aim uses A/D or Arrow keys."],
      ["Portals", "Floating rings explain their effect with labels like Crew Growth, Shield Cloud, and Jump Route."],
      ["Abilities", "Rally Beacon, Cloud Shield, and Turbo Launch unlock as the campaign grows."],
      ["Campaign", "Ten offline levels unlock sequentially with stars and Flight Badges."],
    ].forEach(([title, copy]) => cards.append(infoCard(title, copy)));
    const actions = el("div", "cloud-menu-actions");
    actions.append(
      actionButton("Choose Difficulty", "primary-action", renderDifficultyScreen),
      actionButton("Campaign Level Map", "", renderLevelMap),
      actionButton("Permanent Upgrades", "", renderPermanentUpgrades),
    );
    panel.append(cards, actions);
    root.append(panel);
  }

  function infoCard(title, copy) {
    const card = el("article", "cloud-info-card");
    card.append(el("h3", "", title), el("p", "", copy));
    return card;
  }

  function renderDifficultyScreen() {
    state.screen = "difficulty";
    teardownCanvas();
    shell("Difficulty selection", "Pick how quickly the rival reacts.");
    const panel = el("section", "cloud-menu-panel");
    panel.append(el("span", "card-meta", "Difficulty selection"), el("h2", "", "Rival Strategy"));
    const grid = el("div", "cloud-choice-grid");
    [
      ["easy", "Easy", "Slower decisions, fewer abilities, and more learning room."],
      ["normal", "Normal", "Balanced route choices, upgrades, attacks, and defense."],
      ["hard", "Hard", "Sharper route switching, better timing, and fair pressure."],
    ].forEach(([id, label, copy]) => {
      const button = choiceCard(label, copy, state.difficulty === id, async () => {
        state.difficulty = id;
        currentData = await updateData((draft) => {
          draft.progress.cloudCrewRecords.selectedDifficulty = id;
          return draft;
        });
        records = currentData.progress.cloudCrewRecords;
        renderDifficultyScreen();
      });
      grid.append(button);
    });
    const actions = el("div", "cloud-menu-actions");
    actions.append(actionButton("Choose Crew", "primary-action", renderCrewScreen), actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderCrewScreen() {
    state.screen = "crew";
    teardownCanvas();
    shell("Crew selection", "Choose one primary crew type before a mission.");
    const panel = el("section", "cloud-menu-panel");
    panel.append(el("span", "card-meta", "Crew selection"), el("h2", "", "Primary Crew"));
    const grid = el("div", "cloud-choice-grid");
    Object.values(CREW_TYPES).forEach((crew) => {
      const unlocked = isCrewUnlocked(crew);
      const copy = unlocked ? crew.description : `Unlocks after Level ${crew.unlockLevel}.`;
      const card = choiceCard(crew.name, copy, state.crewType === crew.id, async () => {
        if (!unlocked) return;
        state.crewType = crew.id;
        currentData = await updateData((draft) => {
          draft.progress.cloudCrewRecords.selectedCrewType = crew.id;
          return draft;
        });
        records = currentData.progress.cloudCrewRecords;
        renderCrewScreen();
      });
      card.disabled = !unlocked;
      card.append(el("span", "cloud-crew-symbol", crew.symbol));
      grid.append(card);
    });
    const actions = el("div", "cloud-menu-actions");
    actions.append(actionButton("Campaign Level Map", "primary-action", renderLevelMap), actionButton("Back", "", renderDifficultyScreen));
    panel.append(grid, actions);
    root.append(panel);
  }

  function choiceCard(title, copy, active, handler) {
    const button = actionButton("", "cloud-choice-card", handler);
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", String(active));
    button.append(el("strong", "", title), el("span", "", copy));
    return button;
  }

  function isCrewUnlocked(crew) {
    if (crew.unlockLevel <= records.highestUnlockedLevel) return true;
    if (crew.id === "runner" && records.flightBadges >= 2) return true;
    return false;
  }

  function renderLevelMap() {
    state.screen = "map";
    teardownCanvas();
    shell("Campaign level map", "Replay completed levels or continue from the highest unlocked level.");
    const panel = el("section", "cloud-map-panel");
    const header = el("div", "cloud-section-header");
    const h = el("div");
    h.append(el("span", "card-meta", "Campaign level map"), el("h2", "", "Floating Terminal Campaign"));
    header.append(h, actionButton("Permanent Upgrades", "", renderPermanentUpgrades));
    const grid = el("div", "cloud-level-grid");
    CLOUD_CREW_LEVELS.forEach((level) => {
      const unlocked = level.id <= records.highestUnlockedLevel;
      const stars = records.stars[String(level.id)] || 0;
      const card = el("article", `cloud-level-card ${unlocked ? "" : "is-locked"}`);
      card.append(el("span", "card-meta", `Level ${level.id}`), el("h3", "", level.title), el("p", "", level.objective), starRow(stars));
      const play = actionButton(stars ? "Replay Level" : "Play Level", stars ? "" : "primary-action", () => renderLevelInfo(level.id));
      play.disabled = !unlocked;
      card.append(play);
      grid.append(card);
    });
    panel.append(header, grid);
    root.append(panel);
  }

  function starRow(count) {
    const row = el("div", "cloud-stars");
    for (let i = 1; i <= 3; i += 1) row.append(el("span", i <= count ? "is-earned" : "", "*"));
    return row;
  }

  function renderLevelInfo(levelNumber = state.levelNumber) {
    state.screen = "briefing";
    state.levelNumber = levelNumber;
    teardownCanvas();
    const level = getCloudCrewLevel(levelNumber);
    shell("Level information", `${level.title}: ${level.objective}`);
    const panel = el("section", "cloud-briefing-panel");
    const main = el("div", "cloud-briefing-main");
    main.append(
      el("span", "card-meta", `Level ${level.id} | ${missionLabel(level.mission)}`),
      el("h2", "", level.title),
      el("p", "", level.missionHint),
    );
    const list = el("ul", "instructions-list");
    level.starConditions.forEach((condition) => list.append(el("li", "", condition)));
    main.append(el("span", "field-label", "Star conditions"), list);
    const portalGrid = el("div", "cloud-portal-list");
    if (level.portals.length) {
      level.portals.forEach((portal) => {
        const info = PORTAL_TYPES[portal.type];
        portalGrid.append(infoCard(portal.label || info.name, info.detail));
      });
    } else {
      portalGrid.append(infoCard("No portals", "This opening mission keeps the route simple."));
    }
    const side = el("aside", "cloud-briefing-side");
    side.append(
      el("span", "field-label", "Mission instructions"),
      infoCard("Objective", level.objective),
      infoCard("Crew", CREW_TYPES[state.crewType]?.name || "Basic Crew"),
      infoCard("Difficulty", state.difficulty),
      el("span", "field-label", "Portal preview"),
      portalGrid,
    );
    const actions = el("div", "cloud-menu-actions");
    actions.append(
      actionButton("Start Mission", "primary-action", () => loadLevel(level.id)),
      actionButton("Tutorial", "", () => renderTutorial(level.id)),
      actionButton("Crew Selection", "", renderCrewScreen),
      actionButton("Back to Level Map", "", renderLevelMap),
    );
    panel.append(main, side, actions);
    root.append(panel);
  }

  function missionLabel(mission) {
    return {
      hubAssault: "Hub Assault",
      coreCapture: "Sky Core Capture",
      stationControl: "Three-Station Control",
      cargoEscort: "Cargo Escort",
      energyRace: "Energy Race",
    }[mission] || "Mission";
  }

  function renderTutorial(levelNumber = 1) {
    state.screen = "tutorial";
    teardownCanvas();
    const level = getCloudCrewLevel(levelNumber);
    shell("Tutorial", "Practice aiming, launching, portals, and objective play.");
    const panel = el("section", "cloud-menu-panel");
    panel.append(el("span", "card-meta", "Tutorial"), el("h2", "", level.tutorial || "Cloud Crew briefing"));
    const list = el("ul", "instructions-list");
    [
      `Aim: ${labelsFor([controls.left[0], controls.right[0]])} or move the mouse over the battlefield.`,
      `Launch: hold ${labelsFor(controls.launch)} or hold the left mouse button.`,
      "Route arrows show where crew will travel. Portals label their effect before crew reaches them.",
      "Capture stations by keeping more friendly crew nearby than rival crew.",
      "Use temporary upgrades with Sky Energy during the level.",
    ].forEach((line) => list.append(el("li", "", line)));
    const actions = el("div", "cloud-menu-actions");
    actions.append(actionButton("Start Tutorial Mission", "primary-action", () => loadLevel(levelNumber)), actionButton("Back", "", () => renderLevelInfo(levelNumber)));
    panel.append(list, actions);
    root.append(panel);
  }

  function renderSettingsScreen() {
    state.screen = "settings";
    teardownCanvas();
    shell("Settings", "Cloud Crew Clash settings are stored locally.");
    const panel = el("section", "cloud-menu-panel");
    panel.append(el("span", "card-meta", "Settings"), el("h2", "", "Cloud Crew Settings"));
    const choices = el("div", "cloud-choice-grid");
    choices.append(infoCard("Selected difficulty", state.difficulty), infoCard("Selected crew", CREW_TYPES[state.crewType]?.name || "Basic Crew"));
    const row = el("div", "cloud-menu-actions");
    row.append(
      actionButton("Change Difficulty", "", renderDifficultyScreen),
      actionButton("Change Crew Type", "", renderCrewScreen),
      actionButton(currentData.settings.sound ? "Sound On" : "Sound Off", "", async () => {
        await audio.setSound(!currentData.settings.sound);
        currentData = await getData();
        records = currentData.progress.cloudCrewRecords;
        renderSettingsScreen();
      }),
      actionButton("Back to Level Map", "primary-action", renderLevelMap),
    );
    panel.append(choices, row);
    root.append(panel);
  }

  function renderPermanentUpgrades() {
    state.screen = "upgrades";
    teardownCanvas();
    shell("Permanent upgrade screen", "Spend Flight Badges earned from completed levels.");
    const panel = el("section", "cloud-menu-panel");
    panel.append(el("span", "card-meta", "Permanent upgrade screen"), el("h2", "", `${records.flightBadges} Flight Badges`));
    const grid = el("div", "cloud-choice-grid");
    Object.values(PERMANENT_UPGRADES).forEach((upgrade) => {
      const level = records.permanentUpgrades[upgrade.id] || 0;
      const button = choiceCard(`${upgrade.name} ${level}/${upgrade.max}`, `${upgrade.description} Cost ${upgrade.cost}.`, false, () => buyPermanentUpgrade(upgrade.id));
      button.disabled = level >= upgrade.max || records.flightBadges < upgrade.cost;
      grid.append(button);
    });
    const actions = el("div", "cloud-menu-actions");
    actions.append(actionButton("Back to Level Map", "primary-action", renderLevelMap));
    panel.append(grid, actions);
    root.append(panel);
  }

  async function buyPermanentUpgrade(upgradeId) {
    const upgrade = PERMANENT_UPGRADES[upgradeId];
    if (!upgrade) return;
    currentData = await updateData((draft) => {
      const record = draft.progress.cloudCrewRecords;
      const level = record.permanentUpgrades[upgradeId] || 0;
      if (level >= upgrade.max || record.flightBadges < upgrade.cost) return draft;
      record.flightBadges -= upgrade.cost;
      record.permanentUpgrades[upgradeId] = level + 1;
      return draft;
    });
    records = currentData.progress.cloudCrewRecords;
    audio.play("cloudAbility");
    renderPermanentUpgrades();
  }

  function loadLevel(levelNumber) {
    resultSaved = false;
    const level = getCloudCrewLevel(levelNumber);
    const crew = CREW_TYPES[state.crewType] || CREW_TYPES.basic;
    const permanent = records.permanentUpgrades;
    const playerMaxHealth = 100 + (permanent.hubStrength || 0) * 12;
    const rivalMaxHealth = 100 + (level.id > 7 ? 12 : 0);
    state = {
      ...state,
      screen: "playing",
      level,
      levelNumber,
      crewType: state.crewType,
      difficulty: state.difficulty,
      playerHub: { ...level.hubs.player, health: playerMaxHealth, maxHealth: playerMaxHealth, flash: 0 },
      rivalHub: { ...level.hubs.rival, health: rivalMaxHealth, maxHealth: rivalMaxHealth, flash: 0 },
      launcher: { x: 126, y: 280, angle: -0.12, baseRate: 0.28, spawnTimer: 0 },
      selectedRouteId: level.routes[0].id,
      aimingPoint: { x: 340, y: 250 },
      units: [],
      particles: [],
      energyCapsules: clone(level.energyCapsules || []),
      cargo: level.cargo ? clone(level.cargo) : null,
      commander: level.commander ? clone(level.commander) : null,
      ai: createComputerAI(state.difficulty),
      rivalEnabled: level.rivalEnabled,
      launching: false,
      rivalLaunching: false,
      rivalSpawnTimer: 0,
      launchMeter: 0,
      playerEnergy: 12,
      rivalEnergy: 12,
      playerTemp: { launchRate: 0, crewHealth: 0, crewSpeed: 0, cooldowns: 0 },
      rivalTemp: { launchRate: 0, crewHealth: 0, crewSpeed: 0, cooldowns: 0 },
      abilities: createAbilities(level.abilities, PLAYER),
      rivalAbilities: createAbilities(level.abilities, RIVAL),
      abilityMarkers: [],
      pendingAbility: null,
      pendingAiAbility: null,
      pendingAiUpgrade: null,
      missionProgress: 0,
      rivalObjectiveProgress: 0,
      elapsed: 0,
      crewLaunched: 0,
      rivalCrewLaunched: 0,
      stationsCaptured: 0,
      energyCollected: 0,
      objectiveText: level.objective,
      status: "Mission started",
      paused: false,
      over: false,
      moveSoundTimer: 1.8,
      lastStationOwners: {},
      keyboardAim: 0,
      reduceMotion: Boolean(currentData.settings.reduceMotion),
      selectedCrewStats: crew,
    };
    for (const station of state.level.stations) {
      station.owner = "neutral";
      station.capture = 0;
      state.lastStationOwners[station.id] = "neutral";
    }
    renderGameplay();
    startLoop();
  }

  function createAbilities(unlocked, team) {
    const output = {};
    Object.values(ABILITIES).forEach((ability) => {
      output[ability.id] = {
        ...ability,
        unlocked: unlocked.includes(ability.id),
        ready: 0,
        active: 0,
        team,
      };
    });
    return output;
  }

  function renderGameplay() {
    teardownCanvas();
    root.className = "arcade-view cloud-crew-game is-playing";
    root.replaceChildren();
    const top = el("section", "cloud-topbar");
    top.append(
      statPanel("Level", String(state.level.id), state.level.title),
      statPanel("Mission", missionLabel(state.level.mission), state.level.objective),
      healthPanel("Departure Hub", "playerHub"),
      healthPanel("Rival Hub", "rivalHub"),
      actionButton("Pause", "primary-action", pauseGame),
      actionButton("Restart Level", "", () => renderRestartConfirm()),
      actionButton("Level Map", "", () => renderExitConfirm("map")),
    );

    const layout = el("section", "cloud-play-layout");
    const left = el("aside", "cloud-side-panel");
    left.append(
      el("h2", "", "Departure Hub"),
      liveLine("Crew", "playerCrewCount"),
      liveLine("Launch Speed", "launchSpeed"),
      liveLine("Crew Type", "crewType"),
      liveLine("Sky Energy", "skyEnergy"),
    );
    const field = el("section", "cloud-field-wrap");
    canvas = document.createElement("canvas");
    canvas.id = "cloudCrewCanvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Cloud Crew Clash floating battlefield with hubs, paths, portals, stations, hazards, and crew.");
    field.append(canvas, overlayNode());
    ctx = canvas.getContext("2d");
    bindCanvasEvents();
    observeCanvas();
    const right = el("aside", "cloud-side-panel");
    right.append(
      el("h2", "", "Rival Hub"),
      liveLine("Rival Crew", "rivalCrewCount"),
      liveLine("Rival Status", "rivalStatus"),
      liveLine("Objective", "objectiveProgress"),
      liveLine("Rival Upgrades", "rivalUpgrades"),
    );
    layout.append(left, field, right);

    const bottom = el("section", "cloud-bottom-panel");
    bottom.append(renderAbilityPanel(), renderTempUpgradePanel());
    root.append(top, layout, bottom);
    resizeCanvas();
    updateHud();
  }

  function statPanel(label, value, detail) {
    const panel = el("div", "cloud-stat-panel");
    panel.append(el("span", "field-label", label), el("strong", "", value), el("small", "", detail));
    return panel;
  }

  function healthPanel(label, key) {
    const panel = el("div", "cloud-health-panel");
    panel.append(el("span", "field-label", label));
    const meter = el("div", "cloud-meter");
    const fill = el("i");
    fill.id = `${key}Meter`;
    meter.append(fill);
    panel.append(meter, el("strong", "", "100%"));
    panel.querySelector("strong").id = `${key}Text`;
    return panel;
  }

  function liveLine(label, id) {
    const row = el("div", "cloud-live-row");
    row.append(el("span", "", label), el("strong", "", ""));
    row.querySelector("strong").id = id;
    return row;
  }

  function overlayNode() {
    const overlay = el("div", "game-overlay");
    overlay.id = "cloudCrewOverlay";
    return overlay;
  }

  function renderAbilityPanel() {
    const panel = el("div", "cloud-ability-panel");
    panel.append(el("span", "field-label", "Abilities"));
    Object.values(ABILITIES).forEach((ability) => {
      const button = actionButton(`${ability.key} ${ability.name}`, "cloud-ability-button", () => activateAbility(ability.id));
      button.id = `ability-${ability.id}`;
      button.append(el("i"));
      panel.append(button);
    });
    return panel;
  }

  function renderTempUpgradePanel() {
    const panel = el("div", "cloud-upgrade-panel");
    panel.append(el("span", "field-label", "Temporary upgrades"));
    Object.values(TEMP_UPGRADES).forEach((upgrade) => {
      const button = actionButton(`${upgrade.name} (${upgrade.cost})`, "cloud-temp-button", () => buyTempUpgrade(upgrade.id, PLAYER));
      button.id = `temp-${upgrade.id}`;
      panel.append(button);
    });
    return panel;
  }

  function bindCanvasEvents() {
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerUp);
  }

  function observeCanvas() {
    resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(canvas);
  }

  function resizeCanvas() {
    if (!canvas || !state.level) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(680, Math.floor(rect.width || 820));
    const height = Math.max(430, Math.floor(rect.height || 500));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function teardownCanvas() {
    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = null;
    canvas = null;
    ctx = null;
  }

  function handlePointerMove(event) {
    if (state.screen !== "playing" || !canvas) return;
    const point = renderer.toWorldPoint(canvas, state.level, event.clientX, event.clientY);
    state.aimingPoint = point;
    aimLauncherAt(point);
  }

  function handlePointerDown(event) {
    if (state.screen !== "playing" || !canvas || state.paused || state.over) return;
    const point = renderer.toWorldPoint(canvas, state.level, event.clientX, event.clientY);
    if (state.pendingAbility) {
      placeAbility(state.pendingAbility, point, PLAYER);
      state.pendingAbility = null;
      updateHud();
      return;
    }
    state.launching = true;
    aimLauncherAt(point);
    canvas.setPointerCapture?.(event.pointerId);
  }

  function handlePointerUp(event) {
    if (state.screen !== "playing") return;
    state.launching = false;
    canvas?.releasePointerCapture?.(event.pointerId);
  }

  function aimLauncherAt(point) {
    const dx = point.x - state.launcher.x;
    const dy = point.y - state.launcher.y;
    state.launcher.angle = clamp(Math.atan2(dy, dx), -0.9, 0.9);
    state.selectedRouteId = closestRouteForAngle(state.launcher.angle);
  }

  function closestRouteForAngle(angle) {
    let best = state.level.routes[0].id;
    let bestScore = Infinity;
    state.level.routes.forEach((route) => {
      const start = route.points[0];
      const next = route.points[1] || start;
      const routeAngle = Math.atan2(next.y - start.y, next.x - start.x);
      const score = Math.abs(normalizeAngle(angle - routeAngle));
      if (score < bestScore) {
        bestScore = score;
        best = route.id;
      }
    });
    return best;
  }

  function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  function bindWindowEvents() {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  }

  function handleKeyDown(event) {
    if (shouldPreventScroll(event, controls) || ["Digit1", "Digit2", "Digit3"].includes(event.code)) event.preventDefault();
    if (matchesControl(event, controls.pause)) {
      if (state.screen === "playing" && !state.paused) pauseGame();
      else if (state.screen === "playing" && state.paused) resumeGame();
      return;
    }
    if (state.screen !== "playing" || state.paused || state.over) return;
    keys.add(event.code);
    if (matchesControl(event, controls.launch)) state.launching = true;
    if (matchesControl(event, controls.ability1)) activateAbility("rally");
    if (matchesControl(event, controls.ability2)) activateAbility("shield");
    if (matchesControl(event, controls.ability3)) activateAbility("turbo");
  }

  function handleKeyUp(event) {
    keys.delete(event.code);
    if (state.screen === "playing" && matchesControl(event, controls.launch)) state.launching = false;
  }

  function startLoop() {
    cancelAnimationFrame(raf);
    lastTime = performance.now();
    const tick = (time) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      if (state.screen === "playing" && !state.paused && !state.over) updateLevel(dt);
      if (state.screen === "playing" && ctx && canvas) renderer.draw(ctx, canvas, state, state.level, time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function updateLevel(dt) {
    state.elapsed += dt;
    updateKeyboardAim(dt);
    updateMovementSound(dt);
    updateAbilityTimers(dt);
    if (state.rivalEnabled) {
      updateComputerAI(state, state.level, dt);
      applyComputerDecisions();
    }
    updateSpawning(dt);
    updateEnergyCapsules(dt);
    updateUnits(dt);
    updateStations(dt);
    updateCargo(dt);
    updateCommander(dt);
    updateMarkers(dt);
    updateParticles(dt);
    updateHubs(dt);
    updateMission(dt);
    updateHud();
  }

  function updateKeyboardAim(dt) {
    const left = controls.left.some((code) => keys.has(code));
    const right = controls.right.some((code) => keys.has(code));
    if (!left && !right) return;
    state.launcher.angle += (right ? 1 : 0) * dt * 1.7;
    state.launcher.angle -= (left ? 1 : 0) * dt * 1.7;
    state.launcher.angle = clamp(state.launcher.angle, -0.9, 0.9);
    state.selectedRouteId = closestRouteForAngle(state.launcher.angle);
  }

  function updateMovementSound(dt) {
    state.moveSoundTimer -= dt;
    if (state.moveSoundTimer <= 0 && state.units.length > 8) {
      audio.play("cloudMove");
      state.moveSoundTimer = 2.6;
    }
  }

  function updateAbilityTimers(dt) {
    [state.abilities, state.rivalAbilities].forEach((group) => {
      Object.values(group).forEach((ability) => {
        ability.ready = Math.max(0, ability.ready - dt);
        ability.active = Math.max(0, ability.active - dt);
      });
    });
  }

  function applyComputerDecisions() {
    if (state.pendingAiUpgrade) {
      buyTempUpgrade(state.pendingAiUpgrade, RIVAL);
      state.pendingAiUpgrade = null;
    }
    if (state.pendingAiAbility) {
      const point = chooseAiAbilityPoint(state.pendingAiAbility);
      placeAbility(state.pendingAiAbility, point, RIVAL);
      state.pendingAiAbility = null;
    }
  }

  function chooseAiAbilityPoint(type) {
    const rivalUnits = state.units.filter((unit) => unit.team === RIVAL);
    if (!rivalUnits.length) return { x: 720, y: 280 };
    const front = rivalUnits.reduce((best, unit) => (unit.x < best.x ? unit : best), rivalUnits[0]);
    if (type === "rally") return routeTargetForTeam(RIVAL, state.ai.routeId, 2);
    return { x: front.x, y: front.y };
  }

  function updateSpawning(dt) {
    if (state.launching) {
      state.launchMeter = Math.min(1, state.launchMeter + dt * 2.5);
      state.launcher.spawnTimer -= dt;
      while (state.launcher.spawnTimer <= 0) {
        spawnCrew(PLAYER, state.selectedRouteId);
        state.launcher.spawnTimer += launchInterval(PLAYER);
      }
    } else {
      state.launchMeter = Math.max(0, state.launchMeter - dt * 1.4);
      state.launcher.spawnTimer = Math.min(state.launcher.spawnTimer, launchInterval(PLAYER));
    }

    if (state.rivalEnabled && state.rivalLaunching) {
      state.rivalSpawnTimer -= dt;
      while (state.rivalSpawnTimer <= 0) {
        spawnCrew(RIVAL, state.ai.routeId);
        state.rivalSpawnTimer += launchInterval(RIVAL) / (state.level.enemyLaunchRate || 1);
      }
    } else {
      state.rivalSpawnTimer = Math.min(state.rivalSpawnTimer, launchInterval(RIVAL));
    }
  }

  function launchInterval(team) {
    const temp = team === PLAYER ? state.playerTemp : state.rivalTemp;
    const permanent = team === PLAYER ? records.permanentUpgrades.launchRate || 0 : 0;
    const turbo = team === PLAYER ? state.abilities.turbo.active > 0 : state.rivalAbilities.turbo.active > 0;
    const rateBoost = 1 + temp.launchRate * 0.16 + permanent * 0.08 + (turbo ? 0.85 : 0);
    return Math.max(0.07, 0.28 / rateBoost);
  }

  function spawnCrew(team, routeId, overrides = {}) {
    if (state.units.length >= MAX_UNITS) return null;
    const route = getRoute(routeId) || state.level.routes[0];
    const crew = team === PLAYER ? CREW_TYPES[state.crewType] || CREW_TYPES.basic : CREW_TYPES.basic;
    const temp = team === PLAYER ? state.playerTemp : state.rivalTemp;
    const hub = team === PLAYER ? state.playerHub : state.rivalHub;
    const points = team === PLAYER ? route.points : [...route.points].reverse();
    const health = crew.health + temp.crewHealth * 2 + (overrides.health || 0);
    const speed = crew.speed + temp.crewSpeed * 5 + (overrides.speed || 0);
    const unit = {
      id: uid("crew"),
      team,
      routeId,
      routePoints: clone(points),
      pathIndex: 1,
      x: hub.x + (team === PLAYER ? 32 : -32) + (Math.random() - 0.5) * 12,
      y: hub.y + (Math.random() - 0.5) * 22,
      vx: 0,
      vy: 0,
      health,
      maxHealth: health,
      speed,
      damage: crew.damage,
      capture: crew.capture,
      carryPower: crew.carry,
      radius: 7,
      state: "Moving",
      attackTimer: 0,
      portalHits: {},
      shield: overrides.shield || 0,
      boosted: overrides.boosted || 0,
      slowed: 0,
      stunned: 0,
      heavy: overrides.heavy || 0,
      magnet: 0,
      carrying: 0,
      symbol: team === PLAYER ? crew.symbol : "R",
    };
    state.units.push(unit);
    if (team === PLAYER) state.crewLaunched += 1;
    else state.rivalCrewLaunched += 1;
    if (team === PLAYER && state.crewLaunched % 5 === 1) audio.play("cloudLaunch");
    return unit;
  }

  function updateUnits(dt) {
    for (const unit of state.units) {
      unit.attackTimer = Math.max(0, unit.attackTimer - dt);
      unit.shield = Math.max(0, unit.shield - dt);
      unit.boosted = Math.max(0, unit.boosted - dt);
      unit.slowed = Math.max(0, unit.slowed - dt);
      unit.stunned = Math.max(0, unit.stunned - dt);
      unit.heavy = Math.max(0, unit.heavy - dt);
      unit.magnet = Math.max(0, unit.magnet - dt);
      if (unit.health <= 0) continue;
      const enemy = findEnemy(unit);
      if (enemy) fight(unit, enemy, dt);
      else moveUnit(unit, dt);
      applyStationWork(unit, dt);
      applyPortals(unit);
      applyHazards(unit, dt);
      collectEnergy(unit);
      handleHubContact(unit);
      if (unit.team === PLAYER && state.crewType === "engineer") repairNearbyHub(unit, dt);
    }
    state.units = state.units.filter((unit) => unit.health > 0 && unit.x > -80 && unit.x < state.level.width + 80 && unit.y > -80 && unit.y < state.level.height + 80);
  }

  function findEnemy(unit) {
    let best = null;
    let bestDistance = 24;
    for (const other of state.units) {
      if (other.team === unit.team || other.health <= 0) continue;
      const d = Math.hypot(unit.x - other.x, unit.y - other.y);
      if (d < bestDistance) {
        best = other;
        bestDistance = d;
      }
    }
    if (state.commander?.active && unit.team === PLAYER && state.commander.health > 0) {
      const d = Math.hypot(unit.x - state.commander.x, unit.y - state.commander.y);
      if (d < 34 && d < bestDistance + 14) return state.commander;
    }
    return best;
  }

  function fight(unit, enemy) {
    unit.state = "Fighting";
    if (unit.attackTimer > 0) return;
    unit.attackTimer = 0.34;
    const shieldFactor = enemy.shield > 0 ? 0.48 : 1;
    const damage = unit.damage * shieldFactor;
    enemy.health -= damage;
    const angle = Math.atan2(enemy.y - unit.y, enemy.x - unit.x);
    if ("x" in enemy) {
      enemy.x += Math.cos(angle) * (enemy.heavy > 0 ? 1.2 : 3.5);
      enemy.y += Math.sin(angle) * (enemy.heavy > 0 ? 1.2 : 3.5);
    }
    addParticle(enemy.x, enemy.y, "#ffd35a", "star", 0.32);
    if (Math.random() < 0.28) audio.play("cloudImpact");
    if (enemy.health <= 0) {
      addParticle(enemy.x, enemy.y, "#ffffff", "puff", 0.5);
      if (unit.team === PLAYER) state.playerEnergy += 1;
      else state.rivalEnergy += 1;
    }
  }

  function moveUnit(unit, dt) {
    if (unit.stunned > 0) {
      unit.state = "Stunned";
      return;
    }
    const marker = activeRallyFor(unit.team);
    const target = marker ? marker : unit.routePoints[unit.pathIndex] || enemyHubFor(unit.team);
    const dx = target.x - unit.x;
    const dy = target.y - unit.y;
    const d = Math.max(0.001, Math.hypot(dx, dy));
    let speed = unit.speed;
    if (unit.boosted > 0) speed *= 1.42;
    if (unit.slowed > 0) speed *= 0.5;
    if (unit.heavy > 0) speed *= 0.72;
    if (unit.magnet > 0 && nearestEnergy(unit)) speed *= 1.1;
    unit.vx = (dx / d) * speed;
    unit.vy = (dy / d) * speed;
    unit.x += unit.vx * dt;
    unit.y += unit.vy * dt;
    unit.state = unit.carrying > 0 ? "Carrying energy" : unit.boosted > 0 ? "Boosted" : unit.slowed > 0 ? "Slowed" : "Moving";
    if (d < 18 && !marker) unit.pathIndex = Math.min(unit.pathIndex + 1, unit.routePoints.length);
    keepNearPath(unit);
  }

  function keepNearPath(unit) {
    const point = unit.routePoints[Math.min(unit.pathIndex, unit.routePoints.length - 1)];
    if (!point) return;
    const previous = unit.routePoints[Math.max(0, unit.pathIndex - 1)];
    const projection = projectPointToSegment(unit, previous, point);
    const d = distance(unit, projection);
    if (d > 58) {
      unit.x += (projection.x - unit.x) * 0.08;
      unit.y += (projection.y - unit.y) * 0.08;
    }
  }

  function projectPointToSegment(point, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / Math.max(1, dx * dx + dy * dy), 0, 1);
    return { x: a.x + dx * t, y: a.y + dy * t };
  }

  function activeRallyFor(team) {
    return state.abilityMarkers.find((marker) => marker.type === "rally" && marker.team === team && marker.life > 0);
  }

  function enemyHubFor(team) {
    return team === PLAYER ? state.rivalHub : state.playerHub;
  }

  function applyStationWork(unit) {
    for (const station of state.level.stations) {
      if (distance(unit, station) <= station.radius + 12) {
        unit.state = "Capturing";
      }
    }
  }

  function updateStations(dt) {
    for (const station of state.level.stations) {
      let player = 0;
      let rival = 0;
      for (const unit of state.units) {
        if (distance(unit, station) > station.radius + 20) continue;
        if (unit.team === PLAYER) player += unit.capture;
        else rival += unit.capture;
      }
      station.capture = clamp((station.capture || 0) + (player - rival) * dt * 13, -100, 100);
      const before = station.owner || "neutral";
      if (station.capture >= 100) station.owner = PLAYER;
      else if (station.capture <= -100) station.owner = RIVAL;
      else if (Math.abs(station.capture) < 5) station.owner = "neutral";
      if (before !== station.owner) {
        if (station.owner === PLAYER) {
          state.stationsCaptured += 1;
          state.status = `${station.name} captured`;
          audio.play("cloudStation");
        }
        addParticle(station.x, station.y, station.owner === PLAYER ? "#2aa7c9" : "#ff944d", "star", 0.8);
      }
      if (station.type === "energy" && station.owner === PLAYER) addEnergy(PLAYER, dt * 2.2);
      if (station.type === "energy" && station.owner === RIVAL) addEnergy(RIVAL, dt * 2.2);
    }
  }

  function collectEnergy(unit) {
    for (const capsule of state.energyCapsules) {
      if (capsule.collected) continue;
      const range = unit.magnet > 0 ? 62 : 20;
      if (distance(unit, capsule) <= range) {
        capsule.collected = true;
        capsule.respawn = state.level.mission === "energyRace" ? 8 : 9999;
        unit.carrying = 1;
        addEnergy(unit.team, capsule.value * unit.carryPower);
        addParticle(capsule.x, capsule.y, "#ffd35a", "star", 0.6);
        audio.play("cloudEnergy");
      }
    }
  }

  function nearestEnergy(unit) {
    return state.energyCapsules.find((capsule) => !capsule.collected && distance(unit, capsule) < 90);
  }

  function addEnergy(team, amount) {
    const bonus = team === PLAYER ? 1 + (records.permanentUpgrades.energyCollection || 0) * 0.08 : 1;
    const value = Math.max(0, amount * bonus);
    if (team === PLAYER) {
      state.playerEnergy += value;
      state.energyCollected += value;
    } else {
      state.rivalEnergy += value;
    }
  }

  function applyPortals(unit) {
    for (const portal of state.level.portals) {
      if (portal.routeId !== unit.routeId && portal.type !== "jump") continue;
      if (unit.portalHits[portal.id]) continue;
      if (Math.hypot(unit.x - portal.x, unit.y - portal.y) > 30) continue;
      unit.portalHits[portal.id] = true;
      applyPortalEffect(unit, portal);
    }
  }

  function applyPortalEffect(unit, portal) {
    addParticle(portal.x, portal.y, "#ffffff", "star", 0.7);
    audio.play("cloudPortal");
    if (portal.type === "growth") {
      const count = Math.min(8, portal.value || 3);
      for (let i = 0; i < count; i += 1) spawnNear(unit, unit.routeId, { health: -2, speed: -4 });
    }
    if (portal.type === "echo") {
      if ((unit.id.length + Math.floor(unit.x)) % (portal.value || 3) === 0) spawnNear(unit, unit.routeId, { health: -1 });
    }
    if (portal.type === "speed") unit.boosted = Math.max(unit.boosted, portal.value || 4);
    if (portal.type === "shield") unit.shield = Math.max(unit.shield, portal.value || 4);
    if (portal.type === "heavy") unit.heavy = Math.max(unit.heavy, portal.value || 4);
    if (portal.type === "magnet") unit.magnet = Math.max(unit.magnet, portal.value || 5);
    if (portal.type === "heal") unit.health = Math.min(unit.maxHealth, unit.health + (portal.value || 8));
    if (portal.type === "split") {
      const target = portal.targetRouteId || alternateRoute(unit.routeId);
      spawnNear(unit, target, { health: -1 });
    }
    if (portal.type === "jump") {
      const route = getRoute(portal.targetRouteId || alternateRoute(unit.routeId));
      if (route) {
        unit.routeId = route.id;
        unit.routePoints = unit.team === PLAYER ? clone(route.points) : clone([...route.points].reverse());
        unit.pathIndex = clamp(portal.targetIndex || 2, 1, unit.routePoints.length - 1);
        const target = unit.routePoints[unit.pathIndex];
        unit.x = target.x + (Math.random() - 0.5) * 20;
        unit.y = target.y + (Math.random() - 0.5) * 20;
      }
    }
  }

  function alternateRoute(routeId) {
    const options = state.level.routes.map((route) => route.id).filter((id) => id !== routeId);
    return options[0] || routeId;
  }

  function spawnNear(source, routeId, overrides = {}) {
    const unit = spawnCrew(source.team, routeId, overrides);
    if (!unit) return null;
    unit.x = source.x + (Math.random() - 0.5) * 18;
    unit.y = source.y + (Math.random() - 0.5) * 18;
    unit.pathIndex = Math.max(source.pathIndex || 1, 1);
    return unit;
  }

  function updateEnergyCapsules(dt) {
    for (const capsule of state.energyCapsules) {
      if (!capsule.collected) continue;
      capsule.respawn -= dt;
      if (capsule.respawn <= 0) {
        capsule.collected = false;
        capsule.respawn = 0;
      }
    }
  }

  function applyHazards(unit, dt) {
    for (const hazard of state.level.hazards) {
      if (Math.abs(unit.x - hazard.x) > hazard.w / 2 + 18 || Math.abs(unit.y - hazard.y) > hazard.h / 2 + 18) continue;
      if (hazard.type === "wind") {
        unit.x += (unit.team === PLAYER ? -1 : 1) * 20 * dt;
        unit.slowed = Math.max(unit.slowed, 0.5);
      } else if (hazard.type === "gate") {
        unit.stunned = Math.max(unit.stunned, 0.25);
      } else if (hazard.type === "cart") {
        unit.x += (unit.team === PLAYER ? -1 : 1) * 40 * dt;
        unit.health -= 1.2 * dt;
      } else if (hazard.type === "ice") {
        unit.x += unit.vx * dt * 0.45;
        unit.y += unit.vy * dt * 0.45;
      } else if (hazard.type === "conveyor") {
        unit.x += (unit.team === PLAYER ? 1 : -1) * 28 * dt;
      } else {
        unit.slowed = Math.max(unit.slowed, 0.75);
      }
    }
  }

  function handleHubContact(unit) {
    const target = enemyHubFor(unit.team);
    if (distance(unit, target) > target.radius + 8) return;
    const damage = unit.damage * 1.2 + (unit.heavy > 0 ? 1 : 0);
    target.health = Math.max(0, target.health - damage);
    target.flash = 1;
    unit.health = 0;
    addParticle(target.x, target.y, unit.team === PLAYER ? "#2aa7c9" : "#ff944d", "star", 0.5);
    audio.play("cloudHub");
  }

  function repairNearbyHub(unit, dt) {
    if (distance(unit, state.playerHub) < state.playerHub.radius + 38) {
      state.playerHub.health = Math.min(state.playerHub.maxHealth, state.playerHub.health + dt * 1.2);
      unit.state = "Returning to hub";
    }
  }

  function updateCargo() {
    if (!state.cargo) return;
    let push = 0;
    for (const unit of state.units) {
      const d = distance(unit, state.cargo);
      if (d < 66) push += unit.team === PLAYER ? 1 : -1;
    }
    state.cargo.progress = clamp(state.cargo.progress + push * 0.0007, 0, 1);
    state.cargo.x = 160 + state.cargo.progress * 690;
    state.cargo.y = 280 + Math.sin(state.cargo.progress * Math.PI * 2) * 10;
    state.missionProgress = state.cargo.progress * 100;
  }

  function updateCommander(dt) {
    const cmd = state.commander;
    if (!cmd?.active || cmd.health <= 0) {
      if (cmd) cmd.active = false;
      return;
    }
    for (const unit of state.units) {
      if (unit.team !== PLAYER || distance(unit, cmd) > 42) continue;
      unit.health -= dt * 4;
      if (Math.random() < dt * 2) addParticle(unit.x, unit.y, "#ff944d", "star", 0.35);
    }
    if (cmd.health <= 0) {
      cmd.active = false;
      addEnergy(PLAYER, 20);
      addParticle(cmd.x, cmd.y, "#ffd35a", "star", 1);
    }
  }

  function updateMarkers(dt) {
    for (const marker of state.abilityMarkers) {
      marker.life -= dt;
      if (marker.type === "shield") {
        for (const unit of state.units) {
          if (unit.team === marker.team && distance(unit, marker) <= marker.radius) unit.shield = Math.max(unit.shield, 0.5);
        }
      }
    }
    state.abilityMarkers = state.abilityMarkers.filter((marker) => marker.life > 0);
  }

  function updateParticles(dt) {
    for (const particle of state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function updateHubs(dt) {
    state.playerHub.flash = Math.max(0, state.playerHub.flash - dt * 3);
    state.rivalHub.flash = Math.max(0, state.rivalHub.flash - dt * 3);
  }

  function updateMission() {
    if (state.playerHub.health <= 0) return failMission("Departure Hub was overwhelmed.", "Try using the safer route or repairing the hub earlier.");
    if (state.level.mission === "hubAssault") {
      if ((!state.commander || !state.commander.active) && state.rivalHub.health <= 0) completeMission();
      state.missionProgress = 100 - (state.rivalHub.health / state.rivalHub.maxHealth) * 100;
    }
    if (state.level.mission === "coreCapture") {
      const core = state.level.stations.find((station) => station.type === "core");
      if (core?.owner === PLAYER) state.missionProgress = Math.min(100, state.missionProgress + 0.35);
      if (core?.owner === RIVAL) state.rivalObjectiveProgress = Math.min(100, state.rivalObjectiveProgress + 0.35);
      if (state.missionProgress >= 100) completeMission();
      if (state.rivalObjectiveProgress >= 100) failMission("The Rival Hub captured the Sky Core.", "Save Cloud Shield for the central bridge.");
    }
    if (state.level.mission === "stationControl") {
      const stations = state.level.stations.filter((station) => station.type === "station");
      const playerOwned = stations.filter((station) => station.owner === PLAYER).length;
      const rivalOwned = stations.filter((station) => station.owner === RIVAL).length;
      state.missionProgress = stations.length ? (playerOwned / stations.length) * 100 : 0;
      if (stations.length && playerOwned === stations.length) completeMission();
      if (stations.length && rivalOwned === stations.length) failMission("The Rival Hub controlled every station.", "Use Guard Crew to hold control stations.");
    }
    if (state.level.mission === "cargoEscort") {
      if (state.cargo?.progress >= 0.98) completeMission();
      if (state.cargo?.progress <= 0.02 && state.elapsed > 20) failMission("The cargo drifted back to the start.", "Use Rally Beacon near the cargo to pull friendly crew close.");
    }
    if (state.level.mission === "energyRace") {
      state.missionProgress = (state.playerEnergy / state.level.target) * 100;
      state.rivalObjectiveProgress = (state.rivalEnergy / state.level.target) * 100;
      if (state.playerEnergy >= state.level.target) completeMission();
      if (state.rivalEnabled && state.rivalEnergy >= state.level.target) failMission("The rival collected the target Sky Energy first.", "Capture the energy station before attacking.");
    }
  }

  async function completeMission() {
    if (state.over || resultSaved) return;
    state.over = true;
    const stars = calculateStars();
    const badges = stars;
    const level = state.level.id;
    await saveResult({
      gameId: "cloud-crew-clash",
      mode: "solo",
      difficulty: state.difficulty,
      winner: "solo",
      level,
      stars,
      flightBadges: badges,
      crewType: state.crewType,
      score: Math.round(stars * 1000 + state.playerHub.health * 4 + state.playerEnergy),
      crewLaunched: state.crewLaunched,
      crewRemaining: state.units.filter((unit) => unit.team === PLAYER).length,
      stationsCaptured: state.stationsCaptured,
      energyCollected: Math.round(state.energyCollected),
      time: Math.floor(state.elapsed),
      tutorialComplete: level === 1,
      summary: `Level ${level} complete with ${stars} stars`,
    });
    audio.play("cloudVictory");
    renderVictory(stars, badges);
  }

  async function failMission(reason, suggestion) {
    if (state.over || resultSaved) return;
    state.over = true;
    await saveResult({
      gameId: "cloud-crew-clash",
      mode: "solo",
      difficulty: state.difficulty,
      winner: "computer",
      level: state.level.id,
      crewType: state.crewType,
      score: 0,
      stationsCaptured: state.stationsCaptured,
      energyCollected: Math.round(state.energyCollected),
      time: Math.floor(state.elapsed),
      summary: `Level ${state.level.id} failed`,
    });
    audio.play("cloudDefeat");
    renderDefeat(reason, suggestion);
  }

  function calculateStars() {
    let stars = 1;
    const healthRatio = state.playerHub.health / state.playerHub.maxHealth;
    if (healthRatio >= 0.4) stars = 2;
    const bonus = state.level.stations.some((station) => station.type === "bonus" && station.owner === PLAYER);
    if (healthRatio >= 0.7 && bonus) stars = 3;
    return stars;
  }

  async function saveResult(result) {
    if (resultSaved) return;
    resultSaved = true;
    currentData = await recordGameResult(result);
    records = currentData.progress.cloudCrewRecords;
    await onResult?.(result);
  }

  function renderVictory(stars, badges) {
    state.screen = "victory";
    teardownCanvas();
    shell("Victory screen", "Mission completed.");
    const panel = resultPanel("Mission completed", "cloud-victory");
    panel.append(starRow(stars), resultGrid([
      ["Crew launched", state.crewLaunched],
      ["Crew remaining", state.units.filter((unit) => unit.team === PLAYER).length],
      ["Stations captured", state.stationsCaptured],
      ["Energy collected", Math.round(state.energyCollected)],
      ["Departure Hub health", `${Math.round((state.playerHub.health / state.playerHub.maxHealth) * 100)}%`],
      ["Time taken", formatTime(state.elapsed)],
      ["Flight Badges earned", badges],
    ]));
    const actions = el("div", "cloud-menu-actions");
    const next = Math.min(10, state.level.id + 1);
    actions.append(
      actionButton(state.level.id >= 10 ? "Campaign Completion" : "Next Level", "primary-action", () => {
        if (state.level.id >= 10) renderCampaignComplete();
        else renderLevelInfo(next);
      }),
      actionButton("Replay Level", "", () => renderLevelInfo(state.level.id)),
      actionButton("Return to Level Map", "", renderLevelMap),
      actionButton("Return to Arcade", "", () => renderExitConfirm("arcade")),
    );
    panel.append(actions);
    root.append(panel);
  }

  function renderDefeat(reason, suggestion) {
    state.screen = "defeat";
    teardownCanvas();
    shell("Defeat screen", "Mission failed.");
    const panel = resultPanel("Mission failed", "cloud-defeat");
    panel.append(resultGrid([
      ["Reason", reason],
      ["Objective progress", `${Math.round(state.missionProgress)}%`],
      ["Helpful suggestion", suggestion],
      ["Crew launched", state.crewLaunched],
      ["Time taken", formatTime(state.elapsed)],
    ]));
    const actions = el("div", "cloud-menu-actions");
    actions.append(
      actionButton("Retry", "primary-action", () => loadLevel(state.level.id)),
      actionButton("Change Crew Type", "", renderCrewScreen),
      actionButton("Change Difficulty", "", renderDifficultyScreen),
      actionButton("Return to Level Map", "", renderLevelMap),
      actionButton("Return to Arcade", "", () => renderExitConfirm("arcade")),
    );
    panel.append(actions);
    root.append(panel);
  }

  function resultPanel(title, className) {
    const panel = el("section", `cloud-result-panel ${className}`);
    panel.append(el("span", "card-meta", state.level ? `Level ${state.level.id}` : "Result"), el("h2", "", title));
    return panel;
  }

  function resultGrid(rows) {
    const grid = el("dl", "cloud-result-grid");
    rows.forEach(([label, value]) => {
      grid.append(el("dt", "", label), el("dd", "", String(value)));
    });
    return grid;
  }

  function renderCampaignComplete() {
    state.screen = "complete";
    teardownCanvas();
    shell("Campaign completion screen", "The floating terminal is secure.");
    const panel = el("section", "cloud-result-panel cloud-victory");
    panel.append(
      el("span", "card-meta", "Campaign completion screen"),
      el("h2", "", "Campaign Complete"),
      el("p", "", `You earned ${totalStars(records.stars)} stars and ${records.totalVictories} total victories.`),
    );
    const actions = el("div", "cloud-menu-actions");
    actions.append(actionButton("Replay Final Level", "", () => renderLevelInfo(10)), actionButton("Permanent Upgrades", "", renderPermanentUpgrades), actionButton("Return to Level Map", "primary-action", renderLevelMap));
    panel.append(actions);
    root.append(panel);
  }

  function renderRestartConfirm() {
    const overlay = root.querySelector("#cloudCrewOverlay");
    if (!overlay) return;
    state.paused = true;
    overlay.classList.add("is-visible");
    overlay.replaceChildren();
    const panel = el("div", "game-overlay-panel");
    const actions = el("div", "overlay-actions");
    actions.append(actionButton("Keep Playing", "primary-action", resumeGame), actionButton("Restart Level", "", () => loadLevel(state.level.id)));
    panel.append(el("h2", "", "Restart confirmation"), el("p", "", "Restart this Cloud Crew Clash level?"), actions);
    overlay.append(panel);
  }

  function renderExitConfirm(target) {
    state.screen = state.screen === "playing" ? "playing" : "confirm";
    if (target === "map" && state.screen === "playing") {
      const overlay = root.querySelector("#cloudCrewOverlay");
      state.paused = true;
      overlay.classList.add("is-visible");
      overlay.replaceChildren(exitConfirmPanel(target));
      return;
    }
    teardownCanvas();
    shell("Return-to-arcade confirmation", "Confirm before leaving the current Cloud Crew Clash screen.");
    const panel = el("section", "cloud-menu-panel");
    panel.append(exitConfirmPanel(target));
    root.append(panel);
  }

  function exitConfirmPanel(target) {
    const panel = el("div", "game-overlay-panel cloud-confirm-panel");
    const actions = el("div", "overlay-actions");
    actions.append(
      actionButton("Stay", "primary-action", () => {
        if (state.screen === "playing") resumeGame();
        else renderLevelMap();
      }),
      actionButton(target === "arcade" ? "Return to Arcade" : "Return to Level Map", "", () => {
        if (target === "arcade") {
          destroyGame();
          onExit();
        } else {
          renderLevelMap();
        }
      }),
    );
    panel.append(el("h2", "", "Exit confirmation"), el("p", "", "Leave the current mission screen? Progress from unfinished levels is not saved."), actions);
    return panel;
  }

  function pauseGame() {
    if (state.screen !== "playing" || state.paused || state.over) return;
    state.paused = true;
    state.launching = false;
    const overlay = root.querySelector("#cloudCrewOverlay");
    overlay.classList.add("is-visible");
    overlay.replaceChildren();
    const panel = el("div", "game-overlay-panel");
    const actions = el("div", "overlay-actions");
    actions.append(
      actionButton("Resume", "primary-action", resumeGame),
      actionButton("Restart Level", "", renderRestartConfirm),
      actionButton("Return to Level Map", "", () => renderExitConfirm("map")),
      actionButton("Return to Arcade", "", () => renderExitConfirm("arcade")),
    );
    panel.append(el("h2", "", "Paused"), el("p", "", "Crew movement, AI decisions, cooldowns, and spawning are paused."), actions);
    overlay.append(panel);
  }

  function resumeGame() {
    if (state.screen !== "playing") return;
    state.paused = false;
    lastTime = performance.now();
    const overlay = root.querySelector("#cloudCrewOverlay");
    if (overlay) {
      overlay.classList.remove("is-visible");
      overlay.replaceChildren();
    }
  }

  function restartGame() {
    if (state.level) loadLevel(state.level.id);
    else renderIntro();
  }

  function activateAbility(type) {
    if (state.screen !== "playing" || state.paused || state.over) return;
    const ability = state.abilities[type];
    if (!ability?.unlocked || ability.ready > 0) return;
    if (type === "turbo") {
      placeAbility(type, { x: state.launcher.x, y: state.launcher.y }, PLAYER);
      return;
    }
    state.pendingAbility = type;
    state.status = `${ability.name} ready: click the battlefield to place it`;
    updateHud();
  }

  function placeAbility(type, point, team) {
    const group = team === PLAYER ? state.abilities : state.rivalAbilities;
    const ability = group[type];
    if (!ability?.unlocked || ability.ready > 0) return false;
    const cooldownReduction = team === PLAYER ? state.playerTemp.cooldowns * 0.08 + (records.permanentUpgrades.rallyDuration || 0) * 0.0 : state.rivalTemp.cooldowns * 0.08;
    ability.ready = ability.cooldown * Math.max(0.55, 1 - cooldownReduction);
    ability.active = ability.duration;
    if (type === "rally") {
      const duration = ability.duration + (team === PLAYER ? (records.permanentUpgrades.rallyDuration || 0) * 0.8 : 0);
      state.abilityMarkers.push({ id: uid("rally"), type, team, x: point.x, y: point.y, radius: ability.radius, life: duration, maxLife: duration });
    } else if (type === "shield") {
      const duration = ability.duration + (team === PLAYER ? (records.permanentUpgrades.shieldDuration || 0) * 0.8 : 0);
      state.abilityMarkers.push({ id: uid("shield"), type, team, x: point.x, y: point.y, radius: ability.radius, life: duration, maxLife: duration });
    } else if (type === "turbo") {
      ability.active = ability.duration;
      addParticle(point.x, point.y, team === PLAYER ? "#2aa7c9" : "#ff944d", "star", 0.8);
    }
    if (team === PLAYER) {
      state.status = `${ability.name} activated`;
      audio.play("cloudAbility");
    }
    return true;
  }

  function buyTempUpgrade(upgradeId, team) {
    const upgrade = TEMP_UPGRADES[upgradeId];
    if (!upgrade || state.screen !== "playing") return;
    const temp = team === PLAYER ? state.playerTemp : state.rivalTemp;
    const energyKey = team === PLAYER ? "playerEnergy" : "rivalEnergy";
    if (state[energyKey] < upgrade.cost) return;
    state[energyKey] -= upgrade.cost;
    if (upgradeId === "repairHub") {
      const hub = team === PLAYER ? state.playerHub : state.rivalHub;
      hub.health = Math.min(hub.maxHealth, hub.health + 28);
      hub.flash = 1;
    } else {
      temp[upgradeId] = Math.min(3, (temp[upgradeId] || 0) + 1);
    }
    if (team === PLAYER) {
      state.status = `${upgrade.name} upgraded`;
      audio.play("cloudAbility");
    }
    updateHud();
  }

  function routeTargetForTeam(team, routeId, index) {
    const route = getRoute(routeId) || state.level.routes[0];
    const points = team === PLAYER ? route.points : [...route.points].reverse();
    return points[Math.min(index, points.length - 1)];
  }

  function getRoute(routeId) {
    return state.level.routes.find((route) => route.id === routeId);
  }

  function addParticle(x, y, color, shape = "puff", life = 0.45) {
    if (state.reduceMotion && state.particles.length > 30) return;
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 36,
      vy: (Math.random() - 0.5) * 36,
      color,
      shape,
      size: 4 + Math.random() * 6,
      life,
      maxLife: life,
    });
  }

  function updateHud() {
    if (state.screen !== "playing") return;
    setText("playerCrewCount", String(state.units.filter((unit) => unit.team === PLAYER).length));
    setText("rivalCrewCount", state.rivalEnabled ? `${state.units.filter((unit) => unit.team === RIVAL).length} visible` : "Training only");
    setText("launchSpeed", `${(1 / launchInterval(PLAYER)).toFixed(1)}/sec`);
    setText("crewType", CREW_TYPES[state.crewType]?.name || "Basic Crew");
    setText("skyEnergy", String(Math.floor(state.playerEnergy)));
    setText("rivalStatus", state.rivalEnabled ? state.ai.status : "Joins at Level 3");
    setText("objectiveProgress", `${Math.round(clamp(state.missionProgress, 0, 100))}%`);
    setText("rivalUpgrades", state.rivalEnabled ? activeUpgradeText(state.rivalTemp) : "Locked");
    updateHealth("playerHub", state.playerHub);
    updateHealth("rivalHub", state.rivalHub);
    Object.values(ABILITIES).forEach((ability) => updateAbilityButton(ability.id));
    Object.values(TEMP_UPGRADES).forEach((upgrade) => {
      const button = root.querySelector(`#temp-${upgrade.id}`);
      if (button) button.disabled = state.playerEnergy < upgrade.cost || state.over;
    });
  }

  function setText(id, text) {
    const node = root.querySelector(`#${id}`);
    if (node) node.textContent = text;
  }

  function updateHealth(id, hub) {
    const ratio = clamp(hub.health / hub.maxHealth, 0, 1);
    const meter = root.querySelector(`#${id}Meter`);
    const text = root.querySelector(`#${id}Text`);
    if (meter) meter.style.transform = `scaleX(${ratio})`;
    if (text) text.textContent = `${Math.round(ratio * 100)}%`;
  }

  function updateAbilityButton(id) {
    const ability = state.abilities[id];
    const button = root.querySelector(`#ability-${id}`);
    if (!button || !ability) return;
    const unlocked = ability.unlocked;
    const ready = unlocked && ability.ready <= 0;
    button.disabled = !ready || state.over;
    button.classList.toggle("is-ready", ready);
    button.classList.toggle("is-pending", state.pendingAbility === id);
    const progress = button.querySelector("i");
    if (progress) progress.style.transform = `scaleX(${unlocked ? 1 - ability.ready / ability.cooldown : 0})`;
    button.title = unlocked ? ABILITIES[id].description : "Unlocks later in the campaign";
  }

  function activeUpgradeText(temp) {
    const active = Object.entries(temp).filter(([, value]) => value > 0).map(([key, value]) => `${TEMP_UPGRADES[key]?.name || key} ${value}`);
    return active.length ? active.join(", ") : "None";
  }

  function destroyGame() {
    cancelAnimationFrame(raf);
    if (resizeObserver) resizeObserver.disconnect();
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    teardownCanvas();
    keys.clear();
    root.innerHTML = "";
  }

  return {
    initializeGame,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    destroyGame,
    saveResult,
    spawnCrew,
    updateCrew: updateUnits,
    updateComputerAI: () => updateComputerAI(state, state.level, 0),
    activateAbility,
    captureStation: updateStations,
    applyPortalEffect,
    calculatePath: closestRouteForAngle,
    completeMission,
    failMission,
    loadLevel,
  };
}
