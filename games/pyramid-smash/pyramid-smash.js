import { labelsFor, matchesControl, shouldPreventScroll } from "../../shared/controls.js";
import { getData, recordGameResult, updateData } from "../../shared/storage.js";
import { BALL_TYPES, getBallType } from "./pyramid-smash-balls.js";
import { getPyramidLevel, levelStarsLabel, PYRAMID_LEVELS } from "./pyramid-smash-levels.js";
import {
  bonusCollected,
  createWorld,
  isWorldSettled,
  launchBall,
  removedRequired,
  requiredRemaining,
  settleLowSpeed,
  updatePhysics,
} from "./pyramid-smash-physics.js";
import { createPyramidRenderer } from "./pyramid-smash-renderer.js";
import { betterShotRecord, calculateStars, flightCoinsFor, levelResultSummary, totalStars } from "./pyramid-smash-results.js";

const DEFAULT_CONTROLS = {
  aimLeft: ["ArrowLeft"],
  aimRight: ["ArrowRight"],
  aimUp: ["ArrowUp"],
  aimDown: ["ArrowDown"],
  power: ["Space"],
  nextBall: ["KeyN"],
  resetCamera: ["KeyR"],
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

function starText(count) {
  return count ? `${count} star${count === 1 ? "" : "s"}` : "No stars";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createPyramidSmashGame(context) {
  const { root, audio, data, options, onExit, onSetup, onResult } = context;
  const renderer = createPyramidRenderer();
  const controls = options.controls || DEFAULT_CONTROLS;
  let currentData = clone(data);
  let records = currentData.progress.pyramidSmashRecords;
  let canvas = null;
  let ctx = null;
  let resizeObserver = null;
  let raf = 0;
  let lastTime = 0;
  let resultSaving = false;
  let pointerAiming = false;
  let turnResults = [];
  const keys = new Set();
  const pressed = new Set();
  let state = initialState();

  function initialState() {
    return {
      screen: "intro",
      phase: "menu",
      mode: options.mode === "two" ? "two" : records?.selectedMode || "solo",
      player1: options.player1 || records?.player1Name || "Player 1",
      player2: options.player2 === "Computer" ? "Player 2" : options.player2 || records?.player2Name || "Player 2",
      selectedLevel: records?.selectedLevel || 1,
      reduceMotion: Boolean(currentData.settings.reduceMotion),
      run: null,
    };
  }

  function initializeGame() {
    bindEvents();
    getData().then(async (fresh) => {
      currentData = fresh;
      records = currentData.progress.pyramidSmashRecords;
      state = initialState();
      await markRecentlyPlayed();
      if (options.continueCampaign) {
        renderLevelInfo(records.highestUnlockedLevel || 1);
      } else {
        renderIntro();
      }
    });
  }

  function startGame() {
    if (state.phase === "playing") startLoop();
  }

  async function markRecentlyPlayed() {
    currentData = await updateData((draft) => {
      draft.progress.recentlyPlayed = "pyramid-smash";
      draft.progress.pyramidSmashRecords.selectedMode = state.mode;
      return draft;
    });
    records = currentData.progress.pyramidSmashRecords;
    await onResult?.({ gameId: "pyramid-smash", summary: "Pyramid Smash opened" });
  }

  function shell(title, subtitle = "") {
    teardownCanvas();
    root.className = "arcade-view pyramid-smash-game";
    root.replaceChildren();
    const bar = el("section", "game-bar pyramid-game-bar");
    const heading = el("div", "game-title");
    heading.append(el("h1", "", "Pyramid Smash"), el("p", "", subtitle || "Offline cargo-pyramid physics challenge"));
    const actions = el("div", "game-actions");
    actions.append(
      actionButton("Tutorial", "", renderTutorial),
      actionButton("Stats", "", renderStatsScreen),
      actionButton("Arcade", "", renderReturnConfirm),
    );
    bar.append(heading, quickStats(), actions);
    root.append(bar);
    if (title) {
      const sr = el("span", "pyramid-screen-title", title);
      sr.setAttribute("aria-live", "polite");
      root.append(sr);
    }
  }

  function quickStats() {
    const strip = el("div", "score-strip pyramid-mini-stats");
    strip.append(
      miniStat("Level", records?.highestUnlockedLevel || 1),
      miniStat("Stars", totalStars(records?.stars || {})),
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
    state.screen = "intro";
    state.phase = "menu";
    resultSaving = false;
    shell("Game introduction", "Smash cargo pyramids with limited balls and earn up to three stars per level.");
    const panel = el("section", "pyramid-menu-panel");
    panel.append(
      el("span", "card-meta", "Original offline physics game"),
      el("h2", "", "Aim, launch, and topple the cargo pyramid"),
      el("p", "", "Use playful ball types to knock every required cargo block off the platforms. Each handcrafted level has limited shots, special boxes, star targets, and local progress."),
    );
    const grid = el("div", "pyramid-info-grid");
    [
      ["25 levels", "A full campaign from basic stacks to the Grand Pyramid."],
      ["Solo or two player", "Take local turns on the same level and compare who clears it with fewer shots."],
      ["Special cargo", "Ice, spring, sticky, glass, moving, locked, bonus, and heavy boxes change the strategy."],
      ["Offline saves", "Stars, best shots, coins, champion badge, and endless records stay in local storage."],
    ].forEach(([title, copy]) => grid.append(infoCard(title, copy)));
    const actions = el("div", "pyramid-menu-actions");
    actions.append(
      actionButton("Play Campaign", "primary-action", renderModeSetup),
      actionButton("Level Map", "", renderLevelMap),
      actionButton(records?.endlessUnlocked ? "Endless Mode" : "Endless Locked", "", renderEndlessIntro),
      actionButton(records?.tutorialComplete ? "Replay Tutorial" : "Tutorial", "", renderTutorial),
    );
    panel.append(grid, settingsStrip(), actions);
    root.append(panel);
  }

  function infoCard(title, copy) {
    const card = el("article", "pyramid-info-card");
    card.append(el("h3", "", title), el("p", "", copy));
    return card;
  }

  function settingsStrip() {
    const strip = el("section", "pyramid-choice-row");
    strip.append(
      pill("Mode", state.mode === "two" ? "Two Players" : "Solo"),
      pill("Selected Level", state.selectedLevel),
      pill("Highest Unlock", records?.highestUnlockedLevel || 1),
      pill("Champion", records?.championBadge ? "Earned" : "Not yet"),
    );
    return strip;
  }

  function pill(label, value) {
    const node = el("span", "pyramid-pill");
    node.append(el("small", "", label), el("strong", "", String(value)));
    return node;
  }

  function renderTutorial() {
    state.screen = "tutorial";
    shell("Tutorial", "Learn aiming, balls, stars, and special cargo.");
    const panel = el("section", "pyramid-menu-panel");
    panel.append(el("span", "card-meta", "Tutorial"), el("h2", "", "Clear every required cargo box"));
    const list = el("ul", "instructions-list");
    [
      `Drag from the launcher or use ${labelsFor([controls.aimLeft[0], controls.aimRight[0], controls.aimUp[0], controls.aimDown[0]])} to aim.`,
      `Hold and release ${labelsFor(controls.power)} to launch the selected ball.`,
      `Use ${labelsFor(controls.nextBall)} to change the next ball before shooting.`,
      "Required cargo boxes count as cleared when they break or fall off the platform. Bonus star boxes are optional.",
      "Fewer shots earn more stars. Finishing Level 25 unlocks Endless Structure Mode.",
    ].forEach((line) => list.append(el("li", "", line)));
    const actions = el("div", "pyramid-menu-actions");
    actions.append(
      actionButton("Mark Tutorial Complete", "primary-action", async () => {
        currentData = await updateData((draft) => {
          draft.progress.pyramidSmashRecords.tutorialComplete = true;
          return draft;
        });
        records = currentData.progress.pyramidSmashRecords;
        renderModeSetup();
      }),
      actionButton("Back", "", renderIntro),
    );
    panel.append(list, ballGuide(), actions);
    root.append(panel);
  }

  function ballGuide() {
    const guide = el("div", "pyramid-ball-guide");
    Object.values(BALL_TYPES).forEach((ball) => {
      const card = el("article", "pyramid-ball-card");
      const icon = el("span", "pyramid-ball-icon");
      icon.style.setProperty("--ball", ball.color);
      icon.style.setProperty("--accent", ball.accent);
      card.append(icon, el("strong", "", ball.name), el("span", "", ball.description));
      guide.append(card);
    });
    return guide;
  }

  function renderModeSetup() {
    state.screen = "mode";
    shell("Mode setup", "Choose solo campaign or local two-player turns.");
    const panel = el("section", "pyramid-menu-panel");
    panel.append(el("span", "card-meta", "Setup"), el("h2", "", "Choose Mode And Names"));
    const choices = el("div", "pyramid-choice-grid");
    [
      ["solo", "Solo Campaign", "Clear levels, unlock stars, earn Flight Coins, and open Endless Mode."],
      ["two", "Two Player Turns", "Both players attempt the same level. Fewer shots wins; equal results are a draw."],
    ].forEach(([id, title, copy]) => {
      const card = actionButton("", `pyramid-choice-card ${state.mode === id ? "is-selected" : ""}`, async () => {
        state.mode = id;
        await saveSetup();
        renderModeSetup();
      });
      card.append(el("strong", "", title), el("span", "", copy));
      choices.append(card);
    });

    const names = el("div", "pyramid-name-grid");
    names.append(nameField("Player 1", state.player1, (value) => {
      state.player1 = value || "Player 1";
      saveSetup();
    }));
    if (state.mode === "two") {
      names.append(nameField("Player 2", state.player2, (value) => {
        state.player2 = value || "Player 2";
        saveSetup();
      }));
    }
    const actions = el("div", "pyramid-menu-actions");
    actions.append(actionButton("Choose Level", "primary-action", renderLevelMap), actionButton("Back", "", renderIntro));
    panel.append(choices, names, actions);
    root.append(panel);
  }

  function nameField(label, value, onInput) {
    const field = el("label", "field");
    field.append(el("span", "field-label", label));
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 16;
    input.value = value;
    input.addEventListener("input", () => onInput(input.value.trim()));
    field.append(input);
    return field;
  }

  async function saveSetup() {
    currentData = await updateData((draft) => {
      const record = draft.progress.pyramidSmashRecords;
      record.selectedMode = state.mode;
      record.player1Name = state.player1;
      record.player2Name = state.player2;
      return draft;
    });
    records = currentData.progress.pyramidSmashRecords;
  }

  function renderLevelMap() {
    state.screen = "level-map";
    shell("Level map", "Pick a handcrafted cargo puzzle.");
    const panel = el("section", "pyramid-map-panel");
    panel.append(el("span", "card-meta", "Campaign"), el("h2", "", "25-Level Cargo Map"));
    const map = el("div", "pyramid-level-map");
    const highest = records?.highestUnlockedLevel || 1;
    for (const level of PYRAMID_LEVELS) {
      const stars = records?.stars?.[String(level.id)] || 0;
      const locked = level.id > highest;
      const node = actionButton("", `pyramid-level-node ${locked ? "is-locked" : ""} ${state.selectedLevel === level.id ? "is-selected" : ""}`, () => {
        if (!locked) renderLevelInfo(level.id);
      });
      node.disabled = locked;
      node.setAttribute("aria-label", locked ? `Level ${level.id} locked` : `Open level ${level.id} ${level.name}`);
      node.append(el("strong", "", String(level.id)), el("span", "", level.name), el("small", "", locked ? "Locked" : starText(stars)));
      map.append(node);
    }
    const actions = el("div", "pyramid-menu-actions");
    actions.append(actionButton("Mode Setup", "", renderModeSetup), actionButton("Back", "", renderIntro));
    panel.append(map, actions);
    root.append(panel);
  }

  function renderLevelInfo(levelId = state.selectedLevel) {
    state.selectedLevel = clamp(Number(levelId) || 1, 1, 25);
    state.screen = "level-info";
    const level = getPyramidLevel(state.selectedLevel);
    shell("Level information", `Level ${level.id}: ${level.name}`);
    const panel = el("section", "pyramid-preview-panel");
    const bestShots = records?.bestShots?.[String(level.id)];
    const stars = records?.stars?.[String(level.id)] || 0;
    panel.append(el("span", "card-meta", level.environment), el("h2", "", `${level.id}. ${level.name}`), el("p", "", level.objective));
    const grid = el("div", "pyramid-info-grid");
    [
      ["Star targets", levelStarsLabel(level)],
      ["Ball inventory", level.inventoryLabel],
      ["Special rule", level.special],
      ["Local best", bestShots ? `${bestShots} shots | ${starText(stars)}` : "No clear yet"],
    ].forEach(([title, copy]) => grid.append(infoCard(title, copy)));
    const list = el("ul", "instructions-list");
    [level.hint, "All required boxes must be broken or pushed off the platform.", "Optional bonus star boxes add Flight Coins when collected."].forEach((item) => list.append(el("li", "", item)));
    const actions = el("div", "pyramid-menu-actions");
    actions.append(
      actionButton("Start Level", "primary-action", () => startLevel(level.id)),
      actionButton("Level Map", "", renderLevelMap),
      actionButton("Mode Setup", "", renderModeSetup),
    );
    panel.append(grid, list, actions);
    root.append(panel);
  }

  function renderEndlessIntro() {
    state.screen = "endless-intro";
    shell("Endless Structure Mode", "Unlocked after becoming Pyramid Champion.");
    const panel = el("section", "pyramid-menu-panel");
    panel.append(el("span", "card-meta", "Endless"), el("h2", "", records?.endlessUnlocked ? "Build A Long Smash Streak" : "Endless Mode Locked"));
    panel.append(
      el(
        "p",
        "",
        records?.endlessUnlocked
          ? "Clear wave after wave of remix structures. Your best cleared-wave streak is saved locally."
          : "Finish Level 25 to earn the Pyramid Champion badge and unlock Endless Structure Mode.",
      ),
    );
    const actions = el("div", "pyramid-menu-actions");
    actions.append(
      actionButton(records?.endlessUnlocked ? "Start Endless" : "Go To Level 25", "primary-action", () => {
        if (records?.endlessUnlocked) startEndless();
        else renderLevelInfo(Math.min(records?.highestUnlockedLevel || 1, 25));
      }),
      actionButton("Back", "", renderIntro),
    );
    panel.append(infoCard("Best Endless", `${records?.endlessBest || 0} waves cleared`), actions);
    root.append(panel);
  }

  function startLevel(levelId) {
    turnResults = [];
    startAttempt(getPyramidLevel(levelId), { turnIndex: 0, endless: false, wave: 1 });
  }

  function startEndless() {
    turnResults = [];
    const level = createEndlessLevel(1);
    startAttempt(level, { turnIndex: 0, endless: true, wave: 1, endlessCleared: 0 });
  }

  function startAttempt(level, extras = {}) {
    teardownCanvas();
    resultSaving = false;
    state.screen = "gameplay";
    state.phase = "playing";
    state.selectedLevel = level.id <= 25 ? level.id : state.selectedLevel;
    state.run = {
      level,
      world: createWorld(level),
      inventory: [...level.inventory],
      selectedBallIndex: 0,
      usedBalls: [],
      shots: 0,
      aimAngle: -0.62,
      power: 0.58,
      chargePower: 0.58,
      charging: false,
      chargeDirection: 1,
      phase: "aiming",
      settleTimer: 0,
      completeTimer: 0,
      result: null,
      turnIndex: extras.turnIndex || 0,
      endless: Boolean(extras.endless),
      wave: extras.wave || 1,
      endlessCleared: extras.endlessCleared || 0,
      previewStars: 0,
    };
    renderGameplay();
    startLoop();
  }

  function createEndlessLevel(wave) {
    const base = clone(getPyramidLevel(((wave - 1) % PYRAMID_LEVELS.length) + 1));
    base.id = wave;
    base.name = `Endless Wave ${wave}`;
    base.objective = "Clear this remix structure to continue the endless streak.";
    base.maxShots = Math.min(15, base.maxShots + Math.floor(wave / 4) + 1);
    base.starShots = {
      three: Math.max(1, base.starShots.three + Math.floor(wave / 8)),
      two: Math.max(2, base.starShots.two + Math.floor(wave / 6)),
      one: base.maxShots,
    };
    base.wind = base.wind + (wave % 3 === 0 ? 18 : 0);
    base.inventory = [...base.inventory, wave % 2 ? "standard" : "bouncy"].slice(0, base.maxShots);
    base.inventoryLabel = base.inventory.map((item) => getBallType(item).name.replace(" Ball", "")).join(", ");
    return base;
  }

  function renderGameplay() {
    root.className = "arcade-view pyramid-smash-game is-playing";
    root.replaceChildren();
    const run = state.run;
    const bar = el("section", "game-bar pyramid-game-bar");
    const title = el("div", "game-title");
    title.append(el("h1", "", run.endless ? "Pyramid Smash: Endless" : "Pyramid Smash"), el("p", "", gameplaySubtitle()));
    const actions = el("div", "game-actions");
    actions.append(
      actionButton("Pause", "primary-action", pauseGame),
      actionButton("Restart", "", renderRestartConfirm),
      actionButton("Level Map", "", renderLevelExitConfirm),
      actionButton("Arcade", "", renderReturnConfirm),
    );
    bar.append(title, gameplayStats(), actions);

    const shellNode = el("section", "pyramid-play-shell");
    const stage = el("div", "pyramid-stage");
    canvas = document.createElement("canvas");
    canvas.className = "pyramid-canvas";
    canvas.setAttribute("aria-label", "Pyramid Smash cargo-yard canvas with launcher, balls, platforms, and cargo pyramid.");
    stage.append(canvas, overlay("pyramidOverlay"));
    ctx = canvas.getContext("2d");
    bindCanvasEvents();

    const side = el("aside", "pyramid-side");
    side.append(
      sideTitle("Objective"),
      textLine(run.level.objective),
      sideTitle("Next Ball"),
      inventoryPanel(),
      liveStatus(),
      actionButton("Next Ball", "", selectNextBall),
      actionButton("Skip Settling", "", forceNextBall),
      actionButton("Back to setup", "", () => {
        destroyGame();
        onSetup();
      }),
    );
    shellNode.append(stage, side);
    root.append(bar, shellNode);
    resizeCanvas();
    draw();
  }

  function gameplaySubtitle() {
    const run = state.run;
    if (run.endless) return `Wave ${run.wave} - ${run.endlessCleared} cleared`;
    const player = state.mode === "two" ? `${activePlayerName()}'s turn` : "Solo campaign";
    return `Level ${run.level.id}: ${run.level.name} - ${player}`;
  }

  function gameplayStats() {
    const strip = el("div", "score-strip pyramid-live-stats");
    strip.append(
      miniStat("Shots", "0"),
      miniStat("Targets", "0"),
      miniStat("Balls", "0"),
      miniStat("Stars", "0"),
    );
    strip.id = "pyramidHud";
    return strip;
  }

  function inventoryPanel() {
    const panel = el("div", "pyramid-inventory");
    panel.id = "pyramidInventory";
    updateInventoryPanel(panel);
    return panel;
  }

  function updateInventoryPanel(panel = document.querySelector("#pyramidInventory")) {
    if (!panel || !state.run) return;
    panel.replaceChildren();
    if (!state.run.inventory.length) {
      panel.append(el("div", "empty-state", "No balls remaining."));
      return;
    }
    state.run.inventory.forEach((typeId, index) => {
      const type = getBallType(typeId);
      const button = actionButton("", `pyramid-inventory-button ${index === state.run.selectedBallIndex ? "is-selected" : ""}`, () => {
        if (canThrow()) {
          state.run.selectedBallIndex = index;
          updateInventoryPanel();
          draw();
        }
      });
      const icon = el("span", "pyramid-ball-icon");
      icon.style.setProperty("--ball", type.color);
      icon.style.setProperty("--accent", type.accent);
      button.append(icon, el("span", "", type.name));
      panel.append(button);
    });
  }

  function liveStatus() {
    const panel = el("div", "pyramid-live-line");
    panel.id = "pyramidLiveLine";
    return panel;
  }

  function updateLiveHud() {
    if (!state.run) return;
    const run = state.run;
    const stars = calculateStars(run.level, run.shots || 1, requiredRemaining(run.world) === 0);
    run.previewStars = stars;
    const hud = document.querySelector("#pyramidHud");
    if (hud) {
      const values = hud.querySelectorAll("strong");
      if (values[0]) values[0].textContent = `${run.shots}/${run.level.maxShots}`;
      if (values[1]) values[1].textContent = String(requiredRemaining(run.world));
      if (values[2]) values[2].textContent = String(run.inventory.length);
      if (values[3]) values[3].textContent = String(stars);
    }
    const line = document.querySelector("#pyramidLiveLine");
    if (line) {
      line.textContent = statusLine();
    }
  }

  function statusLine() {
    const run = state.run;
    if (!run) return "";
    if (run.phase === "aiming") return "Aim the launcher, then hold and release power.";
    if (run.phase === "charging") return "Release power to launch.";
    if (run.phase === "flying") return "Shot in motion.";
    if (run.phase === "settling") return "Waiting for cargo to settle.";
    if (run.phase === "saving") return "Saving local result.";
    return "";
  }

  function overlay(id) {
    const node = el("div", "game-overlay");
    node.id = id;
    return node;
  }

  function sideTitle(text) {
    const title = el("h2", "", text);
    return title;
  }

  function textLine(text) {
    return el("p", "", text);
  }

  function actionButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    if (label) button.textContent = label;
    button.addEventListener("click", () => {
      audio.play("button");
      handler();
    });
    return button;
  }

  function bindEvents() {
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
  }

  function bindCanvasEvents() {
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
  }

  function teardownCanvas() {
    cancelAnimationFrame(raf);
    raf = 0;
    lastTime = 0;
    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = null;
    if (canvas) {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    }
    canvas = null;
    ctx = null;
    pointerAiming = false;
  }

  function onKeyDown(event) {
    if (shouldPreventScroll(event, controls)) event.preventDefault();
    if (pressed.has(event.code)) return;
    pressed.add(event.code);
    keys.add(event.code);
    if (matchesControl(event, controls.pause)) {
      if (state.phase === "playing") pauseGame();
      else if (state.screen === "pause") resumeGame();
      return;
    }
    if (!state.run || state.phase !== "playing") return;
    if (matchesControl(event, controls.nextBall)) {
      selectNextBall();
      return;
    }
    if (matchesControl(event, controls.resetCamera)) {
      state.run.aimAngle = -0.62;
      state.run.power = 0.58;
      draw();
      return;
    }
    if (canThrow() && matchesControl(event, controls.power)) {
      state.run.phase = "charging";
      state.run.charging = true;
      audio.play("pyramidCharge");
    }
  }

  function onKeyUp(event) {
    pressed.delete(event.code);
    keys.delete(event.code);
    if (state.run && state.phase === "playing" && matchesControl(event, controls.power) && state.run.charging) {
      releaseSelectedBall();
    }
  }

  function onPointerDown(event) {
    if (!canThrow()) return;
    pointerAiming = true;
    canvas.setPointerCapture?.(event.pointerId);
    updateAimFromPointer(event);
    state.run.phase = "charging";
    state.run.charging = true;
    audio.play("pyramidAim");
  }

  function onPointerMove(event) {
    if (pointerAiming) updateAimFromPointer(event);
  }

  function onPointerUp(event) {
    if (!pointerAiming) return;
    pointerAiming = false;
    canvas.releasePointerCapture?.(event.pointerId);
    updateAimFromPointer(event);
    releaseSelectedBall();
  }

  function updateAimFromPointer(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * state.run.world.width;
    const y = ((event.clientY - rect.top) / rect.height) * state.run.world.height;
    const dx = x - state.run.world.launcher.x;
    const dy = y - state.run.world.launcher.y;
    state.run.aimAngle = clamp(Math.atan2(dy, dx), -1.32, -0.12);
    state.run.power = clamp(Math.hypot(dx, dy) / 260, 0.16, 1);
    state.run.chargePower = state.run.power;
    draw();
  }

  function canThrow() {
    return (
      state.run &&
      state.phase === "playing" &&
      ["aiming", "charging"].includes(state.run.phase) &&
      state.run.inventory.length > 0 &&
      state.run.shots < state.run.level.maxShots &&
      isWorldSettled(state.run.world)
    );
  }

  function selectNextBall() {
    if (!state.run || !canThrow()) return;
    state.run.selectedBallIndex = (state.run.selectedBallIndex + 1) % state.run.inventory.length;
    updateInventoryPanel();
    draw();
  }

  function releaseSelectedBall() {
    const run = state.run;
    if (!run || !canThrow()) return;
    const [ballType] = run.inventory.splice(run.selectedBallIndex, 1);
    run.selectedBallIndex = clamp(run.selectedBallIndex, 0, Math.max(0, run.inventory.length - 1));
    run.usedBalls.push(ballType);
    run.shots += 1;
    run.phase = "flying";
    run.charging = false;
    run.settleTimer = 0;
    run.completeTimer = 0;
    launchBall(run.world, ballType, run.aimAngle, run.chargePower || run.power);
    audio.play("pyramidThrow");
    updateInventoryPanel();
    updateLiveHud();
  }

  function forceNextBall() {
    if (!state.run || !["flying", "settling"].includes(state.run.phase)) return;
    settleLowSpeed(state.run.world);
    state.run.world.balls.forEach((ball) => {
      ball.active = false;
    });
    state.run.world.shotActive = false;
    continueAfterSettled();
  }

  function startLoop() {
    cancelAnimationFrame(raf);
    lastTime = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function loop(now) {
    if (!state.run || state.phase !== "playing") return;
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
    lastTime = now;
    updateRun(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function updateRun(dt) {
    const run = state.run;
    if (!run) return;
    if (run.phase === "aiming") updateKeyboardAim(dt);
    if (run.phase === "charging") {
      updateKeyboardAim(dt);
      run.chargePower += run.chargeDirection * dt * 0.92;
      if (run.chargePower >= 1 || run.chargePower <= 0.16) {
        run.chargePower = clamp(run.chargePower, 0.16, 1);
        run.chargeDirection *= -1;
      }
    }
    if (["flying", "settling"].includes(run.phase)) {
      updatePhysics(run.world, dt);
      if (requiredRemaining(run.world) === 0) {
        run.completeTimer += dt;
        if (run.completeTimer > 0.55) finishAttempt(true);
      } else if (isWorldSettled(run.world)) {
        run.settleTimer += dt;
        if (run.settleTimer > 0.4) continueAfterSettled();
      } else {
        run.settleTimer = 0;
      }
    }
    updateLiveHud();
  }

  function updateKeyboardAim(dt) {
    const run = state.run;
    if (!run) return;
    if (controls.aimLeft.some((code) => keys.has(code))) run.aimAngle -= dt * 1.2;
    if (controls.aimRight.some((code) => keys.has(code))) run.aimAngle += dt * 1.2;
    if (controls.aimUp.some((code) => keys.has(code))) run.power = clamp(run.power + dt * 0.82, 0.16, 1);
    if (controls.aimDown.some((code) => keys.has(code))) run.power = clamp(run.power - dt * 0.82, 0.16, 1);
    run.aimAngle = clamp(run.aimAngle, -1.32, -0.12);
    if (!run.charging) run.chargePower = run.power;
  }

  function continueAfterSettled() {
    const run = state.run;
    if (!run || resultSaving) return;
    run.world.shotActive = false;
    settleLowSpeed(run.world);
    if (requiredRemaining(run.world) === 0) {
      finishAttempt(true);
      return;
    }
    if (run.shots >= run.level.maxShots || run.inventory.length === 0) {
      finishAttempt(false);
      return;
    }
    run.phase = "aiming";
    run.charging = false;
  }

  async function finishAttempt(completed) {
    const run = state.run;
    if (!run || resultSaving) return;
    resultSaving = true;
    run.phase = "saving";
    cancelAnimationFrame(raf);
    settleLowSpeed(run.world);
    const result = buildResult(completed);
    run.result = result;
    if (state.mode === "two" && !run.endless) {
      turnResults.push(result);
      if (turnResults.length < 2) {
        renderTurnTransition();
        return;
      }
      await saveTwoPlayerResult();
      return;
    }
    if (run.endless && completed) {
      audio.play("pyramidComplete");
      renderEndlessWaveComplete(result);
      return;
    }
    await saveResult(result);
    renderResult(result);
  }

  function buildResult(completed) {
    const run = state.run;
    const level = run.level;
    const stars = calculateStars(level, run.shots, completed);
    const levelKey = String(level.id);
    const newBest = completed && betterShotRecord(records?.bestShots?.[levelKey], run.shots);
    const firstCompletion = completed && !(records?.completedLevels || []).includes(level.id);
    const bonus = bonusCollected(run.world);
    const coins = flightCoinsFor(level, stars, bonus, newBest, firstCompletion);
    return {
      gameId: "pyramid-smash",
      pyramidMode: run.endless ? "endless" : state.mode,
      level: level.id,
      levelName: level.name,
      completed,
      stars,
      shots: run.shots,
      maxShots: level.maxShots,
      remainingTargets: requiredRemaining(run.world),
      boxesRemoved: removedRequired(run.world),
      bonusCollected: bonus,
      flightCoins: coins,
      endlessScore: run.endless ? run.endlessCleared + (completed ? 1 : 0) : 0,
      newBest,
      firstCompletion,
      wave: run.wave,
      endlessCleared: run.endlessCleared,
      player: activePlayerName(),
      score: stars * 100 + coins,
      summary: levelResultSummary(level, { completed, shots: run.shots, stars, remainingTargets: requiredRemaining(run.world) }),
    };
  }

  async function saveResult(result = state.run?.result) {
    if (!result) return;
    const winner = result.completed ? "solo" : null;
    currentData = await recordGameResult({
      ...result,
      winner,
      tutorialComplete: records?.tutorialComplete,
    });
    records = currentData.progress.pyramidSmashRecords;
    await onResult?.(result);
  }

  async function saveTwoPlayerResult() {
    const [first, second] = turnResults;
    const winner = compareTwoPlayer(first, second);
    const bestStars = Math.max(first.stars, second.stars);
    const bestShots = bestStars ? Math.min(first.completed ? first.shots : Infinity, second.completed ? second.shots : Infinity) : Math.min(first.shots, second.shots);
    const combined = {
      gameId: "pyramid-smash",
      pyramidMode: "two",
      level: first.level,
      levelName: first.levelName,
      completed: first.completed || second.completed,
      stars: bestStars,
      shots: Number.isFinite(bestShots) ? bestShots : first.shots + second.shots,
      totalShots: first.shots + second.shots,
      maxShots: first.maxShots,
      player1Score: first.completed ? first.maxShots - first.shots + first.stars * 10 : 0,
      player2Score: second.completed ? second.maxShots - second.shots + second.stars * 10 : 0,
      player1Shots: first.shots,
      player2Shots: second.shots,
      boxesRemoved: first.boxesRemoved + second.boxesRemoved,
      bonusCollected: first.bonusCollected + second.bonusCollected,
      flightCoins: Math.max(first.flightCoins, second.flightCoins),
      winner,
      score: bestStars * 100,
      summary: twoPlayerSummary(first, second, winner),
    };
    currentData = await recordGameResult(combined);
    records = currentData.progress.pyramidSmashRecords;
    await onResult?.(combined);
    renderTwoPlayerResult(first, second, winner);
  }

  function compareTwoPlayer(first, second) {
    if (first.completed && !second.completed) return "player1";
    if (!first.completed && second.completed) return "player2";
    if (!first.completed && !second.completed) return "draw";
    if (first.shots < second.shots) return "player1";
    if (second.shots < first.shots) return "player2";
    if (first.stars > second.stars) return "player1";
    if (second.stars > first.stars) return "player2";
    return "draw";
  }

  function twoPlayerSummary(first, second, winner) {
    const winnerText = winner === "player1" ? state.player1 : winner === "player2" ? state.player2 : "Draw";
    return `Level ${first.level} two-player: ${winnerText} (${first.shots}-${second.shots} shots)`;
  }

  function renderTurnTransition() {
    state.phase = "menu";
    const previous = turnResults[0];
    shell("Two-player turn", `${state.player2} prepares for the same level.`);
    const panel = el("section", "pyramid-result-panel");
    panel.append(
      el("span", "card-meta", "Turn saved"),
      el("h2", "", `${state.player1}: ${previous.completed ? "Cleared" : "Not cleared"}`),
      el("p", "", `${previous.shots} shots, ${previous.boxesRemoved} boxes removed, ${previous.remainingTargets} targets left.`),
    );
    const actions = el("div", "pyramid-menu-actions");
    actions.append(
      actionButton(`Start ${state.player2}'s Turn`, "primary-action", () => startAttempt(getPyramidLevel(previous.level), { turnIndex: 1 })),
      actionButton("Level Map", "", renderLevelMap),
    );
    panel.append(actions);
    root.append(panel);
  }

  function renderResult(result) {
    state.phase = "menu";
    shell(result.completed ? "Level complete" : "Level failed", result.completed ? "Local result saved." : "Try a different ball order or angle.");
    const panel = el("section", `pyramid-result-panel ${result.completed ? "is-win" : "is-fail"}`);
    panel.append(
      el("span", "card-meta", result.completed ? "Result saved" : "Attempt saved"),
      el("h2", "", result.completed ? `${starText(result.stars)} earned` : `${result.remainingTargets} targets left`),
      el("p", "", result.summary),
    );
    const grid = el("div", "pyramid-info-grid");
    [
      ["Shots", `${result.shots}/${result.maxShots}`],
      ["Boxes removed", String(result.boxesRemoved)],
      ["Bonus targets", String(result.bonusCollected)],
      ["Flight Coins", `+${result.flightCoins}`],
    ].forEach(([title, copy]) => grid.append(infoCard(title, copy)));
    const actions = el("div", "pyramid-menu-actions");
    const nextLevel = Math.min(25, result.level + 1);
    actions.append(
      actionButton("Retry Level", "primary-action", () => startLevel(result.level)),
      result.completed && result.level < 25 ? actionButton("Next Level", "", () => renderLevelInfo(nextLevel)) : actionButton("Level Map", "", renderLevelMap),
      records?.endlessUnlocked ? actionButton("Endless Mode", "", renderEndlessIntro) : actionButton("Stats", "", renderStatsScreen),
      actionButton("Arcade", "", () => {
        destroyGame();
        onExit();
      }),
    );
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderTwoPlayerResult(first, second, winner) {
    state.phase = "menu";
    const winnerText = winner === "player1" ? state.player1 : winner === "player2" ? state.player2 : "Draw";
    shell("Two-player results", "Both local turns are complete.");
    const panel = el("section", "pyramid-result-panel");
    panel.append(el("span", "card-meta", "Local match saved"), el("h2", "", winnerText), el("p", "", twoPlayerSummary(first, second, winner)));
    const grid = el("div", "pyramid-info-grid");
    [
      [state.player1, `${first.completed ? "Cleared" : "Not cleared"} | ${first.shots} shots | ${starText(first.stars)}`],
      [state.player2, `${second.completed ? "Cleared" : "Not cleared"} | ${second.shots} shots | ${starText(second.stars)}`],
      ["Boxes removed", String(first.boxesRemoved + second.boxesRemoved)],
      ["Winner", winnerText],
    ].forEach(([title, copy]) => grid.append(infoCard(title, copy)));
    const actions = el("div", "pyramid-menu-actions");
    actions.append(
      actionButton("Play Again", "primary-action", () => startLevel(first.level)),
      actionButton("Choose Level", "", renderLevelMap),
      actionButton("Arcade", "", () => {
        destroyGame();
        onExit();
      }),
    );
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderEndlessWaveComplete(result) {
    state.phase = "menu";
    const nextWave = state.run.wave + 1;
    const cleared = state.run.endlessCleared + 1;
    shell("Endless wave complete", `${cleared} waves cleared this run.`);
    const panel = el("section", "pyramid-result-panel is-win");
    panel.append(
      el("span", "card-meta", "Endless"),
      el("h2", "", `Wave ${state.run.wave} Cleared`),
      el("p", "", `You used ${result.shots} shots and removed ${result.boxesRemoved} required boxes.`),
    );
    const actions = el("div", "pyramid-menu-actions");
    actions.append(
      actionButton("Next Wave", "primary-action", () => startAttempt(createEndlessLevel(nextWave), { endless: true, wave: nextWave, endlessCleared: cleared })),
      actionButton("End Run And Save", "", async () => {
        await saveEndlessResult(cleared);
        renderEndlessIntro();
      }),
    );
    panel.append(actions);
    root.append(panel);
  }

  async function saveEndlessResult(cleared) {
    currentData = await recordGameResult({
      gameId: "pyramid-smash",
      pyramidMode: "endless",
      completed: cleared > 0,
      endlessScore: cleared,
      score: cleared,
      shots: state.run?.shots || 0,
      boxesRemoved: removedRequired(state.run?.world || { objects: [] }),
      winner: cleared > 0 ? "solo" : null,
      summary: `Endless Structure Mode: ${cleared} waves cleared`,
    });
    records = currentData.progress.pyramidSmashRecords;
    await onResult?.({ gameId: "pyramid-smash", summary: `Endless ${cleared}` });
  }

  function renderStatsScreen() {
    state.screen = "stats";
    shell("Pyramid Smash stats", "Local campaign and challenge progress.");
    const panel = el("section", "pyramid-menu-panel");
    panel.append(el("span", "card-meta", "Local stats"), el("h2", "", "Pyramid Records"));
    const grid = el("div", "pyramid-info-grid");
    [
      ["Unlocked Level", `${records?.highestUnlockedLevel || 1}/25`],
      ["Stars", `${totalStars(records?.stars || {})}/75`],
      ["Three-star levels", records?.totalThreeStarLevels || 0],
      ["Best Endless", `${records?.endlessBest || 0} waves`],
      ["Flight Coins", records?.flightCoins || 0],
      ["Balls Thrown", records?.totalBallsThrown || 0],
      ["Boxes Removed", records?.totalBoxesRemoved || 0],
      ["Two-player", `${records?.twoPlayerMatches || 0} matches`],
    ].forEach(([title, copy]) => grid.append(infoCard(title, String(copy))));
    const actions = el("div", "pyramid-menu-actions");
    actions.append(actionButton("Level Map", "primary-action", renderLevelMap), actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function pauseGame() {
    if (!state.run || state.phase !== "playing") return;
    state.phase = "paused";
    state.screen = "pause";
    cancelAnimationFrame(raf);
    const overlayNode = document.querySelector("#pyramidOverlay");
    if (!overlayNode) return;
    overlayNode.classList.add("is-visible");
    const card = el("div", "pyramid-pause-card");
    card.append(el("h2", "", "Paused"), el("p", "", "The current Pyramid Smash shot is frozen locally."));
    const actions = el("div", "pyramid-menu-actions");
    actions.append(
      actionButton("Resume", "primary-action", resumeGame),
      actionButton("Restart", "", renderRestartConfirm),
      actionButton("Level Map", "", renderLevelExitConfirm),
      actionButton("Arcade", "", renderReturnConfirm),
    );
    card.append(actions);
    overlayNode.replaceChildren(card);
  }

  function resumeGame() {
    if (!state.run) return;
    state.phase = "playing";
    state.screen = "gameplay";
    const overlayNode = document.querySelector("#pyramidOverlay");
    overlayNode?.classList.remove("is-visible");
    overlayNode?.replaceChildren();
    startLoop();
  }

  function restartGame() {
    if (state.run?.endless) {
      startEndless();
    } else {
      startLevel(state.run?.level?.id || state.selectedLevel);
    }
  }

  function renderRestartConfirm() {
    cancelAnimationFrame(raf);
    shell("Restart confirmation", "Confirm before restarting this Pyramid Smash level.");
    const panel = el("section", "pyramid-result-panel");
    panel.append(el("h2", "", "Restart this level?"), el("p", "", "Current shot progress will be discarded."));
    const actions = el("div", "pyramid-menu-actions");
    actions.append(actionButton("Restart", "primary-action", restartGame), actionButton("Cancel", "", resumeOrLevelInfo));
    panel.append(actions);
    root.append(panel);
  }

  function renderLevelExitConfirm() {
    cancelAnimationFrame(raf);
    shell("Exit level confirmation", "Choose whether to leave the current attempt.");
    const panel = el("section", "pyramid-result-panel");
    panel.append(el("h2", "", "Return to the level map?"), el("p", "", "This attempt will not be saved unless it already finished."));
    const actions = el("div", "pyramid-menu-actions");
    actions.append(actionButton("Level Map", "primary-action", renderLevelMap), actionButton("Cancel", "", resumeOrLevelInfo));
    panel.append(actions);
    root.append(panel);
  }

  function renderReturnConfirm() {
    cancelAnimationFrame(raf);
    shell("Return-to-arcade confirmation", "Confirm before leaving Pyramid Smash.");
    const panel = el("section", "pyramid-result-panel");
    panel.append(el("h2", "", "Return to Airplane Arcade?"), el("p", "", "Progress already saved locally will remain available."));
    const actions = el("div", "pyramid-menu-actions");
    actions.append(
      actionButton("Return to Arcade", "primary-action", () => {
        destroyGame();
        onExit();
      }),
      actionButton("Cancel", "", resumeOrLevelInfo),
    );
    panel.append(actions);
    root.append(panel);
  }

  function resumeOrLevelInfo() {
    if (state.run && state.phase === "paused") {
      renderGameplay();
      resumeGame();
    } else if (state.run && ["playing", "paused"].includes(state.phase)) {
      renderGameplay();
      startLoop();
    } else {
      renderIntro();
    }
  }

  function resizeCanvas() {
    if (!canvas) return;
    draw();
  }

  function draw() {
    if (!canvas || !ctx) return;
    renderer.draw(ctx, canvas, state);
  }

  function activePlayerName() {
    if (state.mode !== "two") return state.player1 || "Player 1";
    return state.run?.turnIndex === 1 ? state.player2 || "Player 2" : state.player1 || "Player 1";
  }

  function destroyGame() {
    teardownCanvas();
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    keys.clear();
    pressed.clear();
    state.phase = "destroyed";
  }

  return {
    initializeGame,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    destroyGame,
    saveResult,
    createPyramidSmash: startLevel,
    createPyramidWorld: createWorld,
    updatePyramidPreview: draw,
    selectPyramidLevel: renderLevelInfo,
    startEndlessMode: startEndless,
    stopEndlessMode: renderIntro,
  };
}
