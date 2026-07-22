import { labelsFor, matchesControl, shouldPreventScroll } from "../../shared/controls.js";
import { getData, recordGameResult, updateData } from "../../shared/storage.js";
import {
  CHEF_LEVELS,
  KITCHEN_THEMES,
  UPGRADE_DEFINITIONS,
  adjustedLevelGoals,
  difficultyConfig,
  getChefLevel,
  totalStars,
  unlockedThemes,
  upgradeCost,
} from "./chef-levels.js";
import {
  STATION_HELP,
  buildCompletedComponent,
  canServeTray,
  describeOrderSteps,
  getRecipe,
  hasWrongComponents,
  missingSteps,
  nextStepForOrder,
  orderLabel,
  qualityLabel,
  recipesByCategory,
  trayQuality,
} from "./chef-recipes.js";
import { activeOrders, createOrder, orderDisplay, resetOrderSequence, selectBestOrder, tickOrders } from "./chef-orders.js";
import {
  cleanStation,
  createKitchenState,
  createStationJob,
  firstBurnedJob,
  firstReadyJob,
  getStation,
  nearestStation,
  removeJob,
  stationAt,
  stationCanStart,
  updateKitchenJobs,
  WORLD,
} from "./chef-kitchen.js";
import { createPlayers, makeTray, playerNear, trayCapacity, updatePlayers } from "./chef-players.js";
import { stationName, suggestNextAction } from "./chef-ai.js";
import { createChefRenderer } from "./chef-renderer.js";
import { calculateChefResult, resultLines } from "./chef-results.js";

const DEFAULT_CONTROLS = {
  p1Up: ["KeyW"],
  p1Left: ["KeyA"],
  p1Down: ["KeyS"],
  p1Right: ["KeyD"],
  p1Interact: ["Space"],
  p1Secondary: ["KeyE"],
  p1Drop: ["KeyQ"],
  p2Up: ["ArrowUp"],
  p2Left: ["ArrowLeft"],
  p2Down: ["ArrowDown"],
  p2Right: ["ArrowRight"],
  p2Interact: ["Enter"],
  p2Secondary: ["ShiftRight"],
  p2Drop: ["Backspace"],
  pause: ["Escape"],
};

const POWERUPS = {
  quickCook: { label: "Quick Cook", seconds: 9, description: "Stations finish much faster for a short burst." },
  happyPassengers: { label: "Happy Passengers", seconds: 10, description: "Passenger patience drains slowly." },
  cleanKitchen: { label: "Clean Kitchen", seconds: 0, description: "Clear mess and burned food from every station." },
  doubleTray: { label: "Tray Boost", seconds: 14, description: "Trays carry two extra components." },
  preview: { label: "Order Preview", seconds: 12, description: "Highlights the next station for focused orders." },
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

function button(label, className, action) {
  const node = document.createElement("button");
  node.type = "button";
  node.textContent = label;
  if (className) node.className = className;
  node.addEventListener("click", action);
  return node;
}

function safeName(value, fallback) {
  return String(value || fallback).trim().slice(0, 16) || fallback;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "Endless";
  const total = Math.max(0, Math.ceil(seconds));
  const min = Math.floor(total / 60);
  const sec = String(total % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

export function createAirportChefGame(context) {
  const { root, audio, data, options, onExit, onResult } = context;
  const controls = options.controls || DEFAULT_CONTROLS;
  let currentData = clone(data);
  let records = currentData.progress.airportChefRecords;
  let canvas = null;
  let renderer = null;
  let resizeObserver = null;
  let raf = 0;
  let lastTime = 0;
  let saving = false;
  const keys = new Set();
  const refs = {};
  let state = initialState();

  function initialState() {
    const difficultyId = options.difficulty || records?.selectedDifficulty || "normal";
    return {
      screen: "intro",
      phase: "menu",
      mode: options.mode || records?.selectedMode || "solo",
      difficultyId,
      difficulty: difficultyConfig(difficultyId),
      selectedLevel: options.continueCampaign ? records?.highestUnlockedLevel || 1 : records?.selectedLevel || 1,
      selectedTheme: records?.selectedTheme || "runway-cafe",
      chefMode: "campaign",
      level: getChefLevel(records?.selectedLevel || 1),
      goals: null,
      kitchen: createKitchenState(records?.selectedTheme || "runway-cafe", records?.upgrades || {}),
      players: [],
      orders: [],
      selectedOrderId: null,
      score: 0,
      timeLeft: 0,
      elapsed: 0,
      spawnTimer: 0,
      combo: 0,
      comboTimer: 0,
      effects: [],
      nearStationId: null,
      status: "Ready to cook.",
      reduceMotion: currentData.settings.reduceMotion,
      hiddenControls: false,
      result: null,
      powerups: Object.fromEntries(Object.keys(POWERUPS).map((key) => [key, { charges: key === "preview" ? 1 : 0, time: 0 }])),
      stats: {
        ordersServed: 0,
        missedPassengers: 0,
        wrongOrders: 0,
        perfectOrders: 0,
        burnedFood: 0,
        highestCombo: 0,
        dishesCooked: 0,
      },
    };
  }

  async function initializeGame() {
    currentData = await getData();
    records = currentData.progress.airportChefRecords;
    state = initialState();
    bindEvents();
    await markRecentlyPlayed();
    if (options.continueCampaign) renderLevelInfo(records.highestUnlockedLevel || 1);
    else renderIntro();
  }

  function startGame() {
    if (state.phase === "playing") startLoop();
  }

  function pauseGame() {
    if (state.phase !== "playing") return;
    state.phase = "paused";
    cancelAnimationFrame(raf);
    renderPause();
  }

  function resumeGame() {
    if (state.phase !== "paused") return;
    state.phase = "playing";
    removeOverlay();
    lastTime = performance.now();
    startLoop();
  }

  function restartGame() {
    if (state.phase === "playing" || state.phase === "paused" || state.result) {
      startLevel(state.level.number, state.chefMode);
    } else {
      renderIntro();
    }
  }

  function destroyGame() {
    cancelAnimationFrame(raf);
    teardownCanvas();
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
  }

  async function saveResult() {
    if (state.result) return state.result;
    return finishShift();
  }

  async function markRecentlyPlayed() {
    currentData = await updateData((draft) => {
      draft.progress.recentlyPlayed = "airport-chef";
      draft.progress.airportChefRecords.selectedDifficulty = state.difficultyId;
      draft.progress.airportChefRecords.selectedMode = state.mode;
      draft.progress.airportChefRecords.selectedLevel = state.selectedLevel;
      return draft;
    });
    records = currentData.progress.airportChefRecords;
    await onResult?.({ gameId: "airport-chef", summary: "Airport Chef opened" });
  }

  function shell(title, subtitle = "Offline cooking and time-management") {
    cancelAnimationFrame(raf);
    teardownCanvas();
    if (state.phase !== "results") state.phase = "menu";
    root.className = "arcade-view airport-chef-game";
    root.replaceChildren();
    const bar = el("section", "game-bar chef-game-bar");
    const heading = el("div", "game-title");
    heading.append(el("h1", "", "Airport Chef"), el("p", "", subtitle));
    const actions = el("div", "game-actions");
    actions.append(
      actionButton("Recipe Book", "", renderRecipeBook),
      actionButton("Upgrades", "", renderUpgrades),
      actionButton("Themes", "", renderThemes),
      actionButton("Stats", "", renderStatsScreen),
      actionButton("Arcade", "", renderReturnConfirm),
    );
    bar.append(heading, quickStats(), actions);
    root.append(bar);
    if (title) {
      const sr = el("span", "chef-screen-title", title);
      sr.setAttribute("aria-live", "polite");
      root.append(sr);
    }
  }

  function actionButton(label, className, action) {
    return button(label, className, () => {
      audio?.play("button");
      action();
    });
  }

  function quickStats() {
    const strip = el("div", "score-strip chef-mini-stats");
    strip.append(
      miniStat("Level", `${records?.highestUnlockedLevel || 1}/20`),
      miniStat("Stars", totalStars(records)),
      miniStat("Coins", records?.flightCoins || 0),
    );
    return strip;
  }

  function miniStat(label, value) {
    const node = el("span");
    node.append(el("small", "", label), el("strong", "", String(value)));
    return node;
  }

  function renderIntro() {
    state.phase = "menu";
    state.screen = "intro";
    shell("Welcome screen", "Cook fast, serve kindly, and keep the airport moving.");
    const panel = el("section", "chef-menu-panel chef-hero-panel");
    panel.append(
      el("span", "card-meta", "New offline kitchen"),
      el("h2", "", "Cook For The Departures Lounge"),
      el("p", "", "Build trays, cook food before it burns, serve patient passengers, earn Flight Coins, unlock themes, and beat a 20-level airport food-court campaign."),
    );
    const grid = el("div", "chef-info-grid");
    [
      ["Solo or local two-player", "Use one laptop with separate controls for two chefs in the same kitchen."],
      ["Live cooking stations", "Grill, toaster, boiler, blender, coffee machine, dessert counter, washing, trays, and serving all respond during play."],
      ["Five food categories", "Burgers, sandwiches, noodles, drinks, and desserts unlock across the campaign."],
      ["Offline progress", "Level stars, Flight Coins, upgrades, themes, records, and Endless Rush stay in chrome.storage.local."],
    ].forEach(([title, copy]) => grid.append(infoCard(title, copy)));
    const actions = el("div", "chef-menu-actions");
    actions.append(
      actionButton(records?.tutorialComplete ? "Start Cooking" : "Tutorial", "primary-action", records?.tutorialComplete ? renderModeSelect : renderTutorial),
      actionButton("Level Map", "", renderLevelMap),
      actionButton("Recipe Book", "", renderRecipeBook),
      actionButton(records?.endlessUnlocked ? "Endless Rush" : "Endless Locked", "", renderEndlessInfo),
    );
    panel.append(grid, setupStrip(), actions);
    root.append(panel);
  }

  function infoCard(title, copy) {
    const card = el("article", "chef-info-card");
    card.append(el("h3", "", title), el("p", "", copy));
    return card;
  }

  function setupStrip() {
    const strip = el("section", "chef-choice-row");
    strip.append(
      pill("Mode", state.mode === "two" ? "Two Chefs" : "Solo Chef"),
      pill("Difficulty", state.difficulty.label),
      pill("Theme", KITCHEN_THEMES[state.selectedTheme]?.name || "Runway Cafe"),
      pill("Saved", `${records?.ordersCompleted || 0} orders`),
    );
    return strip;
  }

  function pill(label, value) {
    const node = el("span", "chef-pill");
    node.append(el("small", "", label), el("strong", "", String(value)));
    return node;
  }

  function renderTutorial() {
    state.screen = "tutorial";
    shell("Tutorial screen", "Learn the kitchen loop before the rush begins.");
    const panel = el("section", "chef-menu-panel");
    panel.append(el("span", "card-meta", "Tutorial"), el("h2", "", "Tray, Cook, Serve, Clean"));
    const list = el("ol", "chef-step-list");
    [
      "Pick up a clean tray at the Tray Station.",
      "Focus an order from the order panel, then follow the suggested station.",
      "Start cooking or prep jobs at the correct station and collect them when ready.",
      "Serve a completed tray at the Serving Counter before the passenger patience bar empties.",
      "Throw away wrong trays at Waste and clean burned stations at Wash.",
      "Use power-ups carefully, upgrade stations with Flight Coins, and unlock Endless Rush after Level 20.",
    ].forEach((line) => list.append(el("li", "", line)));
    const actions = el("div", "chef-menu-actions");
    actions.append(
      actionButton("Mark Tutorial Complete", "primary-action", async () => {
        currentData = await updateData((draft) => {
          draft.progress.airportChefRecords.tutorialComplete = true;
          return draft;
        });
        records = currentData.progress.airportChefRecords;
        renderModeSelect();
      }),
      actionButton("Controls", "", renderControlsScreen),
      actionButton("Back", "", renderIntro),
    );
    panel.append(list, actions);
    root.append(panel);
  }

  function renderModeSelect() {
    state.screen = "mode";
    shell("Mode selection", "Choose one chef or two local chefs.");
    const panel = el("section", "chef-menu-panel");
    panel.append(el("span", "card-meta", "Mode"), el("h2", "", "Who Is Cooking?"));
    const grid = el("div", "chef-choice-grid");
    [
      ["solo", "Solo Chef", "One player manages the whole kitchen with mouse and keyboard support."],
      ["two", "Two Chefs", "Two local players share the same laptop and cook cooperatively."],
    ].forEach(([id, title, copy]) => {
      const card = actionButton("", `chef-choice-card ${state.mode === id ? "is-selected" : ""}`, async () => {
        state.mode = id;
        currentData = await updateData((draft) => {
          draft.progress.airportChefRecords.selectedMode = id;
          return draft;
        });
        records = currentData.progress.airportChefRecords;
        renderModeSelect();
      });
      card.append(el("strong", "", title), el("span", "", copy));
      grid.append(card);
    });
    const actions = el("div", "chef-menu-actions");
    actions.append(actionButton("Next", "primary-action", renderDifficulty), actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderDifficulty() {
    state.screen = "difficulty";
    shell("Difficulty selection", "Choose how hectic the food court should feel.");
    const panel = el("section", "chef-menu-panel");
    panel.append(el("span", "card-meta", "Difficulty"), el("h2", "", "Kitchen Pressure"));
    const grid = el("div", "chef-choice-grid");
    [
      ["easy", "Easy", "Longer patience, slower queues, lower goals, and forgiving mistakes."],
      ["normal", "Normal", "Balanced passenger timing, goals, cooking speed, and rewards."],
      ["hard", "Hard", "Shorter patience, faster queues, higher goals, and sharper penalties."],
    ].forEach(([id, title, copy]) => {
      const card = actionButton("", `chef-choice-card ${state.difficultyId === id ? "is-selected" : ""}`, async () => {
        state.difficultyId = id;
        state.difficulty = difficultyConfig(id);
        currentData = await updateData((draft) => {
          draft.progress.airportChefRecords.selectedDifficulty = id;
          return draft;
        });
        records = currentData.progress.airportChefRecords;
        renderDifficulty();
      });
      card.append(el("strong", "", title), el("span", "", copy));
      grid.append(card);
    });
    const actions = el("div", "chef-menu-actions");
    actions.append(actionButton("Next", "primary-action", renderNameSetup), actionButton("Back", "", renderModeSelect));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderNameSetup() {
    state.screen = "names";
    shell("Player names", "Name your local chef crew.");
    const panel = el("section", "chef-menu-panel");
    panel.append(el("span", "card-meta", "Names"), el("h2", "", "Chef Names"));
    const grid = el("div", "chef-name-grid");
    const p1 = nameField("Player 1 Chef", records?.player1Name || options.player1 || "Player 1", (value) => {
      records.player1Name = safeName(value, "Player 1");
    });
    grid.append(p1);
    if (state.mode === "two") {
      grid.append(nameField("Player 2 Chef", records?.player2Name || options.player2 || "Player 2", (value) => {
        records.player2Name = safeName(value, "Player 2");
      }));
    }
    const actions = el("div", "chef-menu-actions");
    actions.append(
      actionButton("Save Names", "primary-action", async () => {
        currentData = await updateData((draft) => {
          draft.progress.airportChefRecords.player1Name = records.player1Name || options.player1 || "Player 1";
          draft.progress.airportChefRecords.player2Name = records.player2Name || options.player2 || "Player 2";
          return draft;
        });
        records = currentData.progress.airportChefRecords;
        renderControlsScreen();
      }),
      actionButton("Back", "", renderDifficulty),
    );
    panel.append(grid, actions);
    root.append(panel);
  }

  function nameField(label, value, onInput) {
    const field = el("label", "chef-field");
    field.append(el("span", "field-label", label));
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 16;
    input.value = value;
    input.addEventListener("input", () => onInput(input.value));
    field.append(input);
    return field;
  }

  function renderControlsScreen() {
    state.screen = "controls";
    shell("Controls screen", "Keyboard and mouse controls for the kitchen.");
    const panel = el("section", "chef-menu-panel");
    panel.append(el("span", "card-meta", "Controls"), el("h2", "", "Chef Controls"));
    const grid = el("div", "chef-info-grid");
    grid.append(controlCard("Player 1", [
      `Move: ${labelsFor([controls.p1Up[0], controls.p1Left[0], controls.p1Down[0], controls.p1Right[0]])}`,
      `Use station: ${labelsFor(controls.p1Interact)}`,
      `Focus next order: ${labelsFor(controls.p1Secondary)}`,
      `Drop tray: ${labelsFor(controls.p1Drop)}`,
    ]));
    grid.append(controlCard("Player 2", [
      `Move: ${labelsFor([controls.p2Up[0], controls.p2Left[0], controls.p2Down[0], controls.p2Right[0]])}`,
      `Use station: ${labelsFor(controls.p2Interact)}`,
      `Focus next order: ${labelsFor(controls.p2Secondary)}`,
      `Drop tray: ${labelsFor(controls.p2Drop)}`,
    ]));
    grid.append(controlCard("Shared", [`Pause: ${labelsFor(controls.pause)}`, "Mouse: click a station in Solo to move toward it, click order cards to focus them."]));
    const actions = el("div", "chef-menu-actions");
    actions.append(actionButton("Level Map", "primary-action", renderLevelMap), actionButton("Back", "", renderNameSetup));
    panel.append(grid, actions);
    root.append(panel);
  }

  function controlCard(title, lines) {
    const card = el("article", "chef-info-card");
    card.append(el("h3", "", title));
    const list = el("ul", "control-list");
    lines.forEach((line) => list.append(el("li", "", line)));
    card.append(list);
    return card;
  }

  function renderLevelMap() {
    state.screen = "level-map";
    shell("20-level map", "Choose a campaign stop.");
    const panel = el("section", "chef-menu-panel");
    panel.append(el("span", "card-meta", "Campaign"), el("h2", "", "Airport Food-Court Map"));
    const map = el("div", "chef-level-grid");
    const highest = records?.highestUnlockedLevel || 1;
    CHEF_LEVELS.forEach((levelData) => {
      const locked = levelData.number > highest;
      const stars = records?.stars?.[String(levelData.number)] || 0;
      const tile = button("", `chef-level-tile ${locked ? "is-locked" : ""} ${state.selectedLevel === levelData.number ? "is-selected" : ""}`, () => {
        if (locked) return;
        audio?.play("button");
        renderLevelInfo(levelData.number);
      });
      tile.disabled = locked;
      tile.append(
        el("small", "", levelData.chapter),
        el("strong", "", String(levelData.number)),
        el("span", "", locked ? "Locked" : `${"★".repeat(stars)}${"☆".repeat(3 - stars)}`),
      );
      map.append(tile);
    });
    const actions = el("div", "chef-menu-actions");
    actions.append(
      actionButton("Difficulty", "", renderDifficulty),
      actionButton(records?.endlessUnlocked ? "Endless Rush" : "Endless Locked", "", renderEndlessInfo),
      actionButton("Back", "", renderIntro),
    );
    panel.append(map, actions);
    root.append(panel);
  }

  function renderLevelInfo(number) {
    state.selectedLevel = number;
    state.level = getChefLevel(number);
    state.goals = adjustedLevelGoals(state.level, state.difficultyId);
    state.screen = "level-info";
    shell("Level information", state.level.unlockText);
    const panel = el("section", "chef-menu-panel");
    panel.append(el("span", "card-meta", "Level Info"), el("h2", "", state.level.name), el("p", "", state.level.unlockText));
    const grid = el("div", "chef-info-grid");
    grid.append(
      infoCard("Goals", `${state.goals.targetOrders} orders and ${state.goals.targetScore} points in ${formatTime(state.goals.duration)}.`),
      infoCard("Queue", `Up to ${state.goals.maxActive} passengers with new orders about every ${state.goals.spawnEvery.toFixed(1)} seconds.`),
      infoCard("Theme", KITCHEN_THEMES[state.level.theme]?.name || "Runway Cafe"),
      infoCard("Menu", state.level.recipePool.slice(0, 6).map((id) => getRecipe(id).name).join(", ")),
    );
    const actions = el("div", "chef-menu-actions");
    actions.append(
      actionButton("Start Level", "primary-action", () => startLevel(number, "campaign")),
      actionButton("Recipe Book", "", renderRecipeBook),
      actionButton("Upgrades", "", renderUpgrades),
      actionButton("Back", "", renderLevelMap),
    );
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderRecipeBook() {
    state.screen = "recipe-book";
    const level = Math.max(state.selectedLevel || 1, records?.highestUnlockedLevel || 1);
    shell("Recipe book", "Unlocked recipes and station steps.");
    const panel = el("section", "chef-menu-panel");
    panel.append(el("span", "card-meta", "Recipe Book"), el("h2", "", `Recipes Through Level ${level}`));
    const grid = el("div", "chef-recipe-grid");
    recipesByCategory(level).forEach((category) => {
      const card = el("article", "chef-recipe-category");
      card.style.setProperty("--category-color", category.color);
      card.append(el("h3", "", category.label));
      if (!category.recipes.length) card.append(el("p", "", "Unlock later in the campaign."));
      category.recipes.forEach((recipe) => {
        const row = el("div", "chef-recipe-row");
        row.append(el("strong", "", recipe.name));
        row.append(el("span", "", recipe.steps.map((step) => `${step.label} at ${stationName(step.station)}`).join(" | ")));
        card.append(row);
      });
      grid.append(card);
    });
    const actions = el("div", "chef-menu-actions");
    actions.append(actionButton("Level Map", "primary-action", renderLevelMap), actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderUpgrades() {
    state.screen = "upgrades";
    shell("Upgrades screen", "Spend locally earned Flight Coins.");
    const panel = el("section", "chef-menu-panel");
    panel.append(el("span", "card-meta", "Upgrades"), el("h2", "", `${records?.flightCoins || 0} Flight Coins`));
    const grid = el("div", "chef-upgrade-grid");
    UPGRADE_DEFINITIONS.forEach((upgrade) => {
      const current = Number(records?.upgrades?.[upgrade.id] || 0);
      const cost = upgradeCost(upgrade, current);
      const card = el("article", "chef-upgrade-card");
      card.append(el("h3", "", upgrade.name), el("p", "", upgrade.description), levelBar(current, upgrade.max));
      const buy = actionButton(current >= upgrade.max ? "Maxed" : `Upgrade ${cost}`, current >= upgrade.max ? "" : "primary-action", async () => {
        if (current >= upgrade.max) return;
        if ((records.flightCoins || 0) < cost) {
          messageToast("Not enough Flight Coins yet.");
          return;
        }
        currentData = await updateData((draft) => {
          const record = draft.progress.airportChefRecords;
          record.flightCoins -= cost;
          record.upgrades[upgrade.id] = Math.min(upgrade.max, Number(record.upgrades[upgrade.id] || 0) + 1);
          return draft;
        });
        audio?.play("chefUpgrade");
        records = currentData.progress.airportChefRecords;
        renderUpgrades();
      });
      buy.disabled = current >= upgrade.max;
      card.append(buy);
      grid.append(card);
    });
    const actions = el("div", "chef-menu-actions");
    actions.append(actionButton("Level Map", "primary-action", renderLevelMap), actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function levelBar(value, max) {
    const node = el("div", "chef-level-bar");
    for (let index = 0; index < max; index += 1) {
      node.append(el("span", index < value ? "is-filled" : ""));
    }
    return node;
  }

  function renderThemes() {
    state.screen = "themes";
    shell("Themes screen", "Select the kitchen look for unlocked stages.");
    const panel = el("section", "chef-menu-panel");
    panel.append(el("span", "card-meta", "Themes"), el("h2", "", "Airport Kitchens"));
    const available = unlockedThemes(records);
    const grid = el("div", "chef-choice-grid");
    Object.values(KITCHEN_THEMES).forEach((theme) => {
      const locked = !available.includes(theme.id);
      const card = actionButton("", `chef-choice-card chef-theme-card ${state.selectedTheme === theme.id ? "is-selected" : ""} ${locked ? "is-locked" : ""}`, async () => {
        if (locked) return;
        state.selectedTheme = theme.id;
        currentData = await updateData((draft) => {
          draft.progress.airportChefRecords.selectedTheme = theme.id;
          return draft;
        });
        records = currentData.progress.airportChefRecords;
        renderThemes();
      });
      card.style.setProperty("--theme-wall", theme.wall);
      card.style.setProperty("--theme-floor", theme.floor);
      card.append(el("strong", "", theme.name), el("span", "", locked ? `Unlock at Level ${theme.unlockLevel}` : "Unlocked"));
      grid.append(card);
    });
    const actions = el("div", "chef-menu-actions");
    actions.append(actionButton("Level Map", "primary-action", renderLevelMap), actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderEndlessInfo() {
    state.screen = "endless";
    shell("Endless Rush", "Unlocked after Level 20.");
    const panel = el("section", "chef-menu-panel");
    panel.append(el("span", "card-meta", records?.endlessUnlocked ? "Endless Unlocked" : "Locked"), el("h2", "", "Endless Rush"));
    panel.append(el("p", "", records?.endlessUnlocked ? "Cook until five passengers are missed. The menu keeps growing and the queue gets faster." : "Complete Level 20 to unlock Endless Rush and the Airport Master Chef badge."));
    const grid = el("div", "chef-info-grid");
    grid.append(
      infoCard("Best Score", records?.endlessBestScore || 0),
      infoCard("Longest Shift", formatTime(records?.endlessLongestShift || 0)),
      infoCard("Highest Combo", `${records?.endlessHighestCombo || 0}x`),
    );
    const actions = el("div", "chef-menu-actions");
    const start = actionButton("Start Endless", "primary-action", () => startLevel(20, "endless"));
    start.disabled = !records?.endlessUnlocked;
    actions.append(start, actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderStatsScreen() {
    state.screen = "stats";
    shell("Airport Chef stats", "Local cooking records.");
    const panel = el("section", "chef-menu-panel");
    panel.append(el("span", "card-meta", "Stats"), el("h2", "", "Chef Records"));
    const grid = el("div", "chef-info-grid");
    [
      ["Orders Served", records?.ordersCompleted || 0],
      ["Perfect Orders", records?.perfectOrders || 0],
      ["Burned Food", records?.burnedFood || 0],
      ["Missed Passengers", records?.missedPassengers || 0],
      ["Best Combo", `${records?.highestCombo || 0}x`],
      ["Airport Master Chef", records?.airportMasterChef ? "Earned" : "Not yet"],
    ].forEach(([title, value]) => grid.append(infoCard(title, String(value))));
    const actions = el("div", "chef-menu-actions");
    actions.append(actionButton("Back", "primary-action", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function startLevel(number, chefMode = "campaign") {
    cancelAnimationFrame(raf);
    state = {
      ...initialState(),
      phase: "playing",
      screen: "gameplay",
      chefMode,
      mode: state.mode,
      difficultyId: state.difficultyId,
      difficulty: difficultyConfig(state.difficultyId),
      selectedTheme: chefMode === "campaign" ? getChefLevel(number).theme : state.selectedTheme,
      selectedLevel: number,
      level: getChefLevel(number),
      timeLeft: chefMode === "endless" ? Infinity : adjustedLevelGoals(getChefLevel(number), state.difficultyId).duration,
      elapsed: 0,
      spawnTimer: 0,
      status: "Pick up a tray, focus an order, and start cooking.",
      reduceMotion: currentData.settings.reduceMotion,
    };
    state.goals = chefMode === "endless"
      ? { ...adjustedLevelGoals(state.level, state.difficultyId), targetOrders: 999, targetScore: 999999, maxActive: 8, spawnEvery: 5.8 }
      : adjustedLevelGoals(state.level, state.difficultyId);
    state.kitchen = createKitchenState(state.selectedTheme, records?.upgrades || {});
    state.players = createPlayers(state.mode, {
      player1: records?.player1Name || options.player1,
      player2: records?.player2Name || options.player2,
    }, records?.upgrades || {});
    resetOrderSequence();
    for (let index = 0; index < Math.min(3, state.goals.maxActive); index += 1) spawnOrder(index === 0);
    state.selectedOrderId = state.orders[0]?.id || null;
    renderGameplay();
    lastTime = performance.now();
    startLoop();
  }

  function renderGameplay() {
    teardownCanvas();
    root.className = "arcade-view airport-chef-game is-playing";
    root.replaceChildren();
    const bar = el("section", "game-bar chef-game-bar");
    const heading = el("div", "game-title");
    heading.append(el("h1", "", state.chefMode === "endless" ? "Airport Chef: Endless Rush" : state.level.name), el("p", "", state.level.unlockText));
    refs.liveStats = el("div", "score-strip chef-live-stats");
    const actions = el("div", "game-actions");
    actions.append(
      actionButton("Pause", "primary-action", pauseGame),
      actionButton("Restart", "", () => renderRestartConfirm()),
      actionButton("Recipe", "", renderRecipeBook),
      actionButton("Arcade", "", renderReturnConfirm),
    );
    bar.append(heading, refs.liveStats, actions);

    const shellNode = el("section", "chef-play-shell");
    const stage = el("div", "chef-stage-wrap");
    canvas = document.createElement("canvas");
    canvas.className = "chef-canvas";
    canvas.setAttribute("aria-label", "Airport Chef kitchen with cooking stations, passengers, and local chefs.");
    canvas.addEventListener("click", onCanvasClick);
    stage.append(canvas);
    refs.overlay = el("div", "chef-toast");
    refs.overlay.setAttribute("aria-live", "polite");
    stage.append(refs.overlay);

    const side = el("aside", "chef-side");
    refs.orders = el("section", "chef-side-card chef-orders-panel");
    refs.orders.append(el("h2", "", "Orders"));
    refs.orderList = el("div", "chef-order-list");
    refs.orders.append(refs.orderList);
    refs.players = el("section", "chef-side-card chef-player-panel");
    refs.powerups = el("section", "chef-side-card chef-power-panel");
    refs.station = el("section", "chef-side-card chef-station-panel");
    refs.station.append(el("h2", "", "Station"));
    refs.stationDetail = el("p", "", "Move near a station.");
    refs.station.append(refs.stationDetail);
    const controlsPanel = el("section", "chef-side-card chef-control-panel");
    controlsPanel.append(el("h2", "", "Controls"));
    refs.statusLine = el("p", "chef-status-line", state.status);
    const use = actionButton("Use Nearby Station", "primary-action", () => useStation(state.players[0]));
    const next = actionButton("Focus Next Order", "", () => focusNextOrder());
    const hide = actionButton("Hide Controls", "", () => {
      state.hiddenControls = !state.hiddenControls;
      shellNode.classList.toggle("is-clean-preview", state.hiddenControls);
      hide.textContent = state.hiddenControls ? "Show Controls" : "Hide Controls";
    });
    const finish = actionButton("End Shift", "", () => renderEndShiftConfirm());
    controlsPanel.append(refs.statusLine, use, next, hide, finish);
    side.append(refs.orders, refs.players, refs.powerups, refs.station, controlsPanel);
    shellNode.append(stage, side);
    root.append(bar, shellNode);

    renderer = createChefRenderer(canvas);
    resizeObserver = new ResizeObserver(() => {
      renderer.resize();
      renderer.draw(state);
    });
    resizeObserver.observe(stage);
    renderer.resize();
    updatePanels();
  }

  function startLoop() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function loop(time) {
    if (state.phase !== "playing") return;
    const dt = Math.min(0.05, Math.max(0, (time - lastTime) / 1000 || 0));
    lastTime = time;
    update(dt);
    renderer?.draw(state);
    updatePanels();
    raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    state.elapsed += dt;
    if (state.chefMode !== "endless") state.timeLeft -= dt;
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer <= 0) state.combo = 0;
    for (const power of Object.values(state.powerups)) power.time = Math.max(0, power.time - dt);
    updatePlayers(state.players, inputForPlayer, dt);
    updateNearestStation();
    const events = [];
    updateKitchenJobs(state.kitchen, dt, state.difficulty, records?.upgrades || {}, events);
    handleKitchenEvents(events);
    const missed = tickOrders(state.orders, dt, state);
    for (const order of missed) handleMissedOrder(order);
    state.orders = state.orders.slice(-24);
    state.spawnTimer -= dt * (state.chefMode === "endless" ? 1 + state.elapsed / 380 : 1);
    if (state.spawnTimer <= 0 && activeOrders(state.orders).length < state.goals.maxActive) {
      spawnOrder();
    }
    state.effects = state.effects
      .map((effect) => ({ ...effect, life: effect.life - dt }))
      .filter((effect) => effect.life > 0 && !state.reduceMotion);
    if (state.chefMode === "campaign" && state.timeLeft <= 0) {
      finishShift();
    }
    if (state.chefMode === "endless" && state.stats.missedPassengers >= 5) {
      finishShift();
    }
  }

  function inputForPlayer(playerId) {
    const prefix = playerId === "player2" ? "p2" : "p1";
    return {
      up: hasAny(controls[`${prefix}Up`]),
      down: hasAny(controls[`${prefix}Down`]),
      left: hasAny(controls[`${prefix}Left`]),
      right: hasAny(controls[`${prefix}Right`]),
    };
  }

  function hasAny(codes) {
    return (codes || []).some((code) => keys.has(code));
  }

  function updateNearestStation() {
    const player = state.players[0];
    const station = player ? nearestStation(state.kitchen, player.x, player.y) : null;
    state.nearStationId = station?.id || null;
  }

  function handleKitchenEvents(events) {
    for (const event of events) {
      if (event.type === "ready") {
        audio?.play("chefReady");
        floatingText(event.label, event.stationId, "#40a86f");
      }
      if (event.type === "burned") {
        state.stats.burnedFood += 1;
        audio?.play("chefBurn");
        floatingText("Burned!", event.stationId, "#ef5b63");
        setStatus(`${event.label} burned. Clean or use the waste bin.`);
      }
      if (event.type === "overcooked") {
        floatingText("Overcooked", event.stationId, "#f47b43");
      }
    }
  }

  function handleMissedOrder(order) {
    state.stats.missedPassengers += 1;
    state.combo = 0;
    audio?.play("chefMiss");
    floatingText("Missed passenger", null, "#ef5b63", 600, 184);
    setStatus(`${order.passenger.name} left the queue. Keep an eye on patience bars.`);
    if (state.selectedOrderId === order.id) state.selectedOrderId = activeOrders(state.orders)[0]?.id || null;
  }

  function spawnOrder(selected = false) {
    const order = createOrder(state.level, state.difficulty, { forceSingle: state.level.number <= 2 && state.orders.length < 2 });
    order.selected = selected;
    state.orders.push(order);
    if (selected || !state.selectedOrderId) state.selectedOrderId = order.id;
    const base = state.goals.spawnEvery * (state.chefMode === "endless" ? Math.max(0.56, 1 - state.elapsed / 650) : 1);
    state.spawnTimer = Math.max(2.8, base + Math.random() * 2.5);
  }

  function useStation(player, station = null) {
    if (!player || state.phase !== "playing") return;
    const target = station || nearestStation(state.kitchen, player.x, player.y, 118);
    if (!target || !playerNear(player, target, 126)) {
      setStatus("Move closer to a station first.");
      return;
    }
    if (player.actionCooldown > 0) return;
    player.actionCooldown = 0.22;
    if (target.id === "tray-station") return pickupTray(player);
    if (target.id === "waste-bin") return clearHeldTray(player);
    if (target.id === "washing-station") return washKitchen(player);
    if (target.id === "serving-counter") return serveTray(player);
    return useProductionStation(player, target);
  }

  function pickupTray(player) {
    if (player.tray) {
      setStatus(`${player.label} already has a tray.`);
      return;
    }
    const order = selectBestOrder(state.orders, state.selectedOrderId);
    player.tray = makeTray(order?.id || null);
    audio?.play("chefPickup");
    setStatus(`${player.label} picked up a clean tray.`);
  }

  function clearHeldTray(player) {
    const burnedStations = state.kitchen.stations.filter((stationData) => firstBurnedJob(stationData));
    const blockedStations = state.kitchen.stations.filter((stationData) => stationData.jobs.length);
    if (player.tray) {
      player.tray = null;
      audio?.play("chefWrong");
      state.combo = 0;
      setStatus(`${player.label} cleared the tray at Waste.`);
      return;
    }
    if (burnedStations.length) {
      const stationData = burnedStations[0];
      stationData.jobs = stationData.jobs.filter((job) => job.state !== "burned");
      stationData.mess = Math.max(stationData.mess, 0.65);
      audio?.play("chefWrong");
      setStatus(`Burned food removed from ${stationData.label}. Clean the mess at Wash.`);
      return;
    }
    if (blockedStations.length) {
      const stationData = blockedStations[0];
      const removed = stationData.jobs.shift();
      stationData.mess = Math.max(stationData.mess, removed?.state === "burned" ? 0.65 : 0.25);
      audio?.play("chefWrong");
      setStatus(`Cleared ${removed?.step?.label || "old food"} from ${stationData.label}.`);
      return;
    }
    setStatus("Nothing to throw away right now.");
  }

  function washKitchen(player) {
    const upgrade = Number(records?.upgrades?.cleaningSpeed || 0);
    const messy = state.kitchen.stations
      .filter((stationData) => stationData.mess > 0 || firstBurnedJob(stationData))
      .sort((a, b) => b.mess - a.mess)[0];
    if (!messy) {
      setStatus("The kitchen is already clean.");
      return;
    }
    cleanStation(messy, 0.42 + upgrade * 0.12);
    audio?.play("chefChop");
    floatingText("Clean", messy.id, "#43acd8");
    setStatus(`${player.label} cleaned ${messy.label}.`);
  }

  function useProductionStation(player, stationData) {
    if (!player.tray) {
      setStatus("Pick up a tray first.");
      return;
    }
    const order = findPlayerOrder(player) || selectBestOrder(state.orders, state.selectedOrderId);
    if (!order) {
      setStatus("No active orders yet.");
      return;
    }
    if (!player.tray.orderId) player.tray.orderId = order.id;
    const ownedOrder = state.orders.find((item) => item.id === player.tray.orderId);
    if (!ownedOrder || ownedOrder.served || ownedOrder.missed) {
      setStatus("This tray belongs to an order that has already left. Use Waste and start fresh.");
      return;
    }
    const next = nextStepForOrder(ownedOrder, player.tray);
    if (!next) {
      setStatus("This tray is complete. Take it to Serve.");
      return;
    }
    if (next.station !== stationData.id) {
      setStatus(`Next: ${next.label} at ${stationName(next.station)}.`);
      return;
    }
    const capacity = trayCapacity(records?.upgrades || {}) + (state.powerups.doubleTray.time > 0 ? 2 : 0);
    if (player.tray.items.length >= capacity) {
      setStatus("Tray is full. Serve it or use Waste.");
      return;
    }
    const ready = firstReadyJob(stationData);
    if (ready && ready.step.key === next.key) {
      const job = removeJob(stationData, ready.id);
      player.tray.items.push(buildCompletedComponent(job.step, job));
      state.stats.dishesCooked += 1;
      audio?.play("chefPickup");
      setStatus(`${player.label} added ${job.step.label} to the tray.`);
      floatingText("+ food", stationData.id, "#40a86f");
      return;
    }
    if (firstBurnedJob(stationData)) {
      setStatus(`${stationData.label} has burned food. Use Waste or Wash before continuing.`);
      return;
    }
    const cooking = stationData.jobs.find((job) => job.step.key === next.key);
    if (cooking) {
      setStatus(`${next.label} is ${cooking.state}. Wait until it is ready.`);
      return;
    }
    if (!stationCanStart(stationData)) {
      setStatus(`${stationData.label} is full or messy.`);
      return;
    }
    if (next.seconds <= 0) {
      player.tray.items.push(buildCompletedComponent(next, null));
      state.stats.dishesCooked += 1;
      audio?.play("chefPickup");
      setStatus(`${player.label} collected ${next.label}.`);
      floatingText("+ ingredient", stationData.id, "#ffd35a");
      return;
    }
    const job = createStationJob(next, state.difficulty, records?.upgrades || {});
    if (state.powerups.quickCook.time > 0) job.seconds *= 0.42;
    stationData.jobs.push(job);
    stationData.pulse = 0.5;
    audio?.play(next.action === "prep" ? "chefChop" : "chefCook");
    setStatus(`${player.label} started ${next.label} at ${stationData.label}.`);
  }

  function findPlayerOrder(player) {
    if (!player.tray?.orderId) return null;
    return state.orders.find((order) => order.id === player.tray.orderId && !order.served && !order.missed) || null;
  }

  function serveTray(player) {
    if (!player.tray) {
      setStatus("Pick up and complete a tray before serving.");
      return;
    }
    const order = findPlayerOrder(player) || selectBestOrder(state.orders, state.selectedOrderId);
    if (!order) {
      setStatus("There is no matching passenger for this tray.");
      return;
    }
    if (!canServeTray(order, player.tray)) {
      if (hasWrongComponents(order, player.tray)) {
        state.stats.wrongOrders += 1;
        state.combo = 0;
        state.score = Math.max(0, state.score - Math.round(45 * state.difficulty.mistakePenalty));
        audio?.play("chefWrong");
        setStatus("Incorrect order. Use Waste if the tray cannot be fixed.");
      } else {
        const missing = missingSteps(order, player.tray)[0];
        setStatus(`Incomplete tray. Add ${missing?.label || "the remaining item"} at ${stationName(missing?.station)}.`);
      }
      return;
    }
    const quality = trayQuality(player.tray);
    const patienceRatio = order.passenger.patience / order.passenger.patienceMax;
    state.combo += 1;
    state.comboTimer = 8;
    state.stats.highestCombo = Math.max(state.stats.highestCombo, state.combo);
    const comboBonus = 1 + Math.min(0.5, state.combo * 0.045);
    const qualityBonus = quality / 100;
    const patienceBonus = 0.72 + patienceRatio * 0.46;
    const points = Math.round(order.reward * comboBonus * qualityBonus * patienceBonus * state.difficulty.tipMultiplier);
    state.score += points;
    state.stats.ordersServed += 1;
    if (quality >= 92) state.stats.perfectOrders += 1;
    player.scoreContribution += points;
    order.served = true;
    player.tray = null;
    audio?.play(quality >= 92 ? "chefCombo" : "chefServe");
    floatingText(`+${points} ${qualityLabel(quality)}`, null, "#40a86f", player.x, player.y - 60);
    setStatus(`${order.passenger.name} served: ${orderLabel(order)}.`);
    maybeEarnPowerup();
    state.selectedOrderId = activeOrders(state.orders)[0]?.id || null;
  }

  function maybeEarnPowerup() {
    if (state.combo > 0 && state.combo % 4 === 0) {
      const keys = Object.keys(POWERUPS);
      const powerId = keys[(state.combo / 4 - 1) % keys.length];
      state.powerups[powerId].charges += 1;
      audio?.play("chefPower");
      setStatus(`${POWERUPS[powerId].label} earned from the combo.`);
    }
  }

  function activatePowerup(id) {
    const power = state.powerups[id];
    if (!power || power.charges <= 0 || state.phase !== "playing") return;
    power.charges -= 1;
    if (id === "cleanKitchen") {
      for (const stationData of state.kitchen.stations) {
        stationData.mess = 0;
        stationData.jobs = stationData.jobs.filter((job) => job.state !== "burned");
      }
    } else {
      power.time = POWERUPS[id].seconds;
    }
    audio?.play("chefPower");
    setStatus(`${POWERUPS[id].label} activated.`);
  }

  function focusNextOrder() {
    const active = activeOrders(state.orders);
    if (!active.length) {
      setStatus("No active order to focus.");
      return;
    }
    const currentIndex = active.findIndex((order) => order.id === state.selectedOrderId);
    const next = active[(currentIndex + 1 + active.length) % active.length];
    state.selectedOrderId = next.id;
    for (const order of state.orders) order.selected = order.id === next.id;
    audio?.play("button");
    setStatus(`Focused ${orderLabel(next)}.`);
  }

  function setStatus(text) {
    state.status = text;
    if (refs.statusLine) refs.statusLine.textContent = text;
    messageToast(text);
  }

  function messageToast(text) {
    if (!refs.overlay) return;
    refs.overlay.textContent = text;
    refs.overlay.classList.add("is-visible");
    window.clearTimeout(refs.toastTimeout);
    refs.toastTimeout = window.setTimeout(() => refs.overlay?.classList.remove("is-visible"), 1800);
  }

  function floatingText(text, stationId = null, color = "#ffd35a", x = null, y = null) {
    if (state.reduceMotion) return;
    const stationData = stationId ? getStation(state.kitchen, stationId) : null;
    state.effects.push({
      text,
      color,
      x: x ?? stationData?.cx ?? WORLD.width / 2,
      y: y ?? stationData?.cy ?? 260,
      life: 1.1,
      maxLife: 1.1,
      size: 24,
    });
  }

  function updatePanels() {
    if (!refs.liveStats) return;
    refs.liveStats.replaceChildren(
      miniStat("Time", formatTime(state.timeLeft)),
      miniStat("Score", state.score),
      miniStat("Orders", `${state.stats.ordersServed}/${state.chefMode === "endless" ? "∞" : state.goals.targetOrders}`),
      miniStat("Combo", `${state.combo}x`),
      miniStat("Missed", state.stats.missedPassengers),
    );
    updateOrderPanel();
    updatePlayerPanel();
    updatePowerPanel();
    updateStationPanel();
  }

  function updateOrderPanel() {
    if (!refs.orderList) return;
    refs.orderList.replaceChildren();
    const active = activeOrders(state.orders);
    if (!active.length) {
      refs.orderList.append(el("p", "chef-empty", "Passengers are arriving."));
      return;
    }
    active.forEach((order) => {
      const display = orderDisplay(order);
      const card = button("", `chef-order-card ${order.id === state.selectedOrderId ? "is-selected" : ""} mood-${display.mood}`, () => {
        audio?.play("button");
        state.selectedOrderId = order.id;
        for (const item of state.orders) item.selected = item.id === order.id;
        updatePanels();
      });
      const title = el("strong", "", display.title);
      const details = el("span", "", `${display.passenger} | ${display.reward} pts`);
      const patience = el("div", "chef-patience");
      const fill = el("span");
      fill.style.width = `${display.patiencePercent}%`;
      patience.append(fill);
      const steps = el("small", "", describeOrderSteps(order).map((step) => stationName(step.station)).slice(0, 4).join(" > "));
      card.append(title, details, patience, steps);
      refs.orderList.append(card);
    });
  }

  function updatePlayerPanel() {
    if (!refs.players) return;
    refs.players.replaceChildren(el("h2", "", "Chefs"));
    for (const player of state.players) {
      const card = el("div", "chef-player-card");
      const tray = player.tray;
      const order = tray?.orderId ? state.orders.find((item) => item.id === tray.orderId) : null;
      card.append(el("strong", "", player.label));
      card.append(el("span", "", tray ? `Tray: ${tray.items.length} item${tray.items.length === 1 ? "" : "s"}` : "No tray"));
      card.append(el("small", "", order ? `For #${order.number}: ${orderLabel(order)}` : suggestNextAction(state, player)));
      refs.players.append(card);
    }
  }

  function updatePowerPanel() {
    if (!refs.powerups) return;
    refs.powerups.replaceChildren(el("h2", "", "Power-ups"));
    for (const [id, definition] of Object.entries(POWERUPS)) {
      const power = state.powerups[id];
      const row = el("div", "chef-power-row");
      const text = el("span");
      text.append(el("strong", "", definition.label), el("small", "", power.time > 0 ? `${power.time.toFixed(1)}s active` : definition.description));
      const use = button(power.charges > 0 ? `Use ${power.charges}` : "0", "", () => {
        audio?.play("button");
        activatePowerup(id);
      });
      use.disabled = power.charges <= 0;
      row.append(text, use);
      refs.powerups.append(row);
    }
  }

  function updateStationPanel() {
    if (!refs.stationDetail) return;
    const player = state.players[0];
    const stationData = player ? nearestStation(state.kitchen, player.x, player.y, 140) : null;
    if (!stationData) {
      refs.stationDetail.textContent = "Move near a station.";
      return;
    }
    const jobs = stationData.jobs.map((job) => `${job.step.label}: ${job.state}`).join(", ");
    refs.stationDetail.textContent = `${stationData.label}. ${STATION_HELP[stationData.id] || ""} ${jobs || ""}`;
  }

  async function finishShift() {
    if (saving || state.phase === "results") return state.result;
    saving = true;
    state.phase = "results";
    cancelAnimationFrame(raf);
    state.result = calculateChefResult(state);
    currentData = await recordGameResult(state.result);
    records = currentData.progress.airportChefRecords;
    await onResult?.(state.result);
    saving = false;
    renderResults(state.result);
    return state.result;
  }

  function renderResults(result) {
    state.screen = result.completed ? "pass-results" : "fail-results";
    shell(result.completed ? "Level passed" : "Level failed", result.summary);
    const panel = el("section", `chef-result-panel ${result.completed ? "is-win" : ""}`);
    panel.append(
      el("span", "card-meta", result.completed ? "Shift Complete" : "Shift Needs Practice"),
      el("h2", "", result.completed ? `${"★".repeat(result.stars)}${"☆".repeat(3 - result.stars)} ${state.level.name}` : state.level.name),
      el("p", "", result.summary),
    );
    const grid = el("div", "chef-info-grid");
    resultLines(result).forEach((line) => {
      const [title, value] = line.includes(" ") ? [line.split(" ")[0], line.split(" ").slice(1).join(" ")] : ["Result", line];
      grid.append(infoCard(title, value));
    });
    const actions = el("div", "chef-menu-actions");
    const nextLevel = Math.min(20, state.level.number + 1);
    const next = actionButton(state.level.number >= 20 ? "Endless Rush" : "Next Level", "primary-action", () => {
      if (state.level.number >= 20) renderEndlessInfo();
      else renderLevelInfo(nextLevel);
    });
    next.disabled = !result.completed && state.level.number < 20;
    actions.append(
      result.completed ? next : actionButton("Try Again", "primary-action", () => startLevel(state.level.number, state.chefMode)),
      actionButton("Replay Level", "", () => startLevel(state.level.number, state.chefMode)),
      actionButton("Level Map", "", renderLevelMap),
      actionButton("Return to Arcade", "", renderReturnConfirm),
    );
    if (result.airportMasterChef) {
      const finale = el("div", "chef-finale-banner");
      finale.append(el("strong", "", "Airport Master Chef Badge Unlocked"), el("span", "", "Endless Rush is now available."));
      panel.append(finale);
    }
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderPause() {
    const overlay = el("div", "game-overlay is-visible chef-pause-overlay");
    const card = el("section", "chef-pause-card");
    card.append(el("h2", "", "Paused"), el("p", "", "The kitchen timers are frozen."));
    const actions = el("div", "chef-menu-actions");
    actions.append(
      actionButton("Resume", "primary-action", resumeGame),
      actionButton("Restart", "", () => renderRestartConfirm()),
      actionButton("Recipe Book", "", renderRecipeBook),
      actionButton("Return to Arcade", "", renderReturnConfirm),
    );
    card.append(actions);
    overlay.append(card);
    root.append(overlay);
  }

  function removeOverlay() {
    root.querySelector(".game-overlay")?.remove();
  }

  function renderRestartConfirm() {
    confirmPanel("Restart Shift?", "Current cooking progress will be cleared, but saved records remain.", "Restart", () => startLevel(state.level.number, state.chefMode));
  }

  function renderEndShiftConfirm() {
    confirmPanel("End Shift?", "Save the current shift result now and leave the kitchen timer.", "End Shift", finishShift);
  }

  function renderReturnConfirm() {
    confirmPanel("Return to Arcade?", "The current shift will stop. Saved Airport Chef progress remains local.", "Return", async () => {
      cancelAnimationFrame(raf);
      await onExit?.();
    });
  }

  function confirmPanel(title, copy, label, onConfirm) {
    const wasPaused = state.phase === "paused";
    removeOverlay();
    const overlay = el("div", "game-overlay is-visible chef-pause-overlay");
    const card = el("section", "chef-pause-card");
    card.append(el("h2", "", title), el("p", "", copy));
    const actions = el("div", "chef-menu-actions");
    actions.append(
      actionButton(label, "primary-action", async () => {
        overlay.remove();
        await onConfirm();
      }),
      actionButton("Cancel", "", () => {
        overlay.remove();
        if (wasPaused && state.screen === "gameplay") renderPause();
      }),
    );
    card.append(actions);
    overlay.append(card);
    root.append(overlay);
  }

  function onCanvasClick(event) {
    if (state.phase !== "playing" || state.mode !== "solo") return;
    const point = canvasPointToWorld(event);
    const clicked = stationAt(state.kitchen, point.x, point.y);
    if (!clicked) return;
    const player = state.players[0];
    if (playerNear(player, clicked, 132)) {
      useStation(player, clicked);
    } else {
      player.targetStation = clicked;
      setStatus(`${player.label} heading to ${clicked.label}.`);
    }
  }

  function canvasPointToWorld(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const scale = Math.min(rect.width / WORLD.width, rect.height / WORLD.height);
    const offsetX = (rect.width - WORLD.width * scale) / 2;
    const offsetY = (rect.height - WORLD.height * scale) / 2;
    return {
      x: (x - offsetX) / scale,
      y: (y - offsetY) / scale,
    };
  }

  function bindEvents() {
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
  }

  function onKeyDown(event) {
    if (shouldPreventScroll(event, controls)) event.preventDefault();
    keys.add(event.code);
    if (event.repeat) return;
    if (matchesControl(event, controls.pause)) {
      if (state.phase === "playing") pauseGame();
      else if (state.phase === "paused") resumeGame();
      return;
    }
    if (state.phase !== "playing") return;
    if (matchesControl(event, controls.p1Interact)) useStation(state.players[0]);
    if (matchesControl(event, controls.p1Secondary)) focusNextOrder();
    if (matchesControl(event, controls.p1Drop)) clearHeldTray(state.players[0]);
    if (state.players[1]) {
      if (matchesControl(event, controls.p2Interact)) useStation(state.players[1]);
      if (matchesControl(event, controls.p2Secondary)) focusNextOrder();
      if (matchesControl(event, controls.p2Drop)) clearHeldTray(state.players[1]);
    }
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function teardownCanvas() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (canvas) {
      canvas.removeEventListener("click", onCanvasClick);
      canvas = null;
      renderer = null;
    }
    refs.toastTimeout && window.clearTimeout(refs.toastTimeout);
  }

  return {
    initializeGame,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    destroyGame,
    saveResult,
    createOrder: spawnOrder,
    updateKitchen: update,
    cookFood: () => useStation(state.players[0]),
    addPowerUp: (id) => {
      if (state.powerups[id]) state.powerups[id].charges += 1;
    },
    removeOrder: (id) => {
      state.orders = state.orders.filter((order) => order.id !== id);
    },
    serveOrder: () => serveTray(state.players[0]),
    startEndlessRush: renderEndlessInfo,
    stopShift: saveResult,
  };
}
