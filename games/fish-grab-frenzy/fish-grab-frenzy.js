import { labelsFor, matchesControl, shouldPreventScroll } from "../../shared/controls.js";
import { getData, recordGameResult, updateData } from "../../shared/storage.js";
import { createComputerPlan, createEarlyGrabPlan, difficultySummary } from "./fish-grab-ai.js";
import { CAT_DEFINITIONS, createCats, getCatDefinition, nextAvailableCat } from "./fish-grab-cats.js";
import { createFishGrabResult, formatReaction } from "./fish-grab-results.js";
import { createRound, hasWinner, roundScore, selectFishType, TARGET_SCORE } from "./fish-grab-rounds.js";
import { createFishGrabRenderer } from "./fish-grab-renderer.js";
import { summarizeFishGrabRecords } from "./fish-grab-storage.js";

const DEFAULT_CONTROLS = {
  soloGrab: ["Space", "Enter"],
  p1Grab: ["KeyA", "Space"],
  p2Grab: ["KeyL", "Enter"],
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

function cleanName(value, fallback) {
  return String(value || fallback).trim().slice(0, 16) || fallback;
}

function isPlayablePhase(phase) {
  return ["countdown", "waiting", "active", "resolving"].includes(phase);
}

export function createFishGrabFrenzyGame(context) {
  const { root, audio, data, options, onExit, onResult } = context;
  const controls = {
    ...DEFAULT_CONTROLS,
    ...(options.controls || {}),
  };
  const renderer = createFishGrabRenderer();
  let currentData = clone(data);
  let records = currentData.progress.fishGrabFrenzyRecords || {};
  let state = initialState();
  let canvas = null;
  let resizeObserver = null;
  let raf = 0;
  let resultSaving = false;
  const timers = new Set();
  const refs = {};

  function initialState() {
    const selectedMode = options.mode === "two" ? "two" : options.mode || records.selectedMode || "solo";
    const p1CatId = records.preferredCat || "captain-miso";
    const p2CatId = records.preferredPlayer2Cat && records.preferredPlayer2Cat !== p1CatId
      ? records.preferredPlayer2Cat
      : nextAvailableCat(p1CatId);
    return {
      screen: "intro",
      phase: "menu",
      phaseBeforePause: null,
      phaseDeadline: 0,
      remainingTime: 0,
      mode: selectedMode === "two" ? "two" : "solo",
      difficulty: options.difficulty || records.preferredDifficulty || "normal",
      player1: cleanName(options.player1, "Player 1"),
      player2: cleanName(options.player2 === "Computer" ? records.player2Name : options.player2, "Player 2"),
      p1CatId,
      p2CatId,
      cats: [],
      round: null,
      fishHistory: [],
      countdown: 3,
      message: "Choose cats and grab only the safe fish.",
      reduceMotion: Boolean(currentData.settings.reduceMotion),
      keyReady: { p1: true, p2: true },
      stats: {
        normalGrabbed: 0,
        bombGrabbed: 0,
        earlyGrabs: 0,
        reactions: [],
        roundsPlayed: 0,
      },
      animation: null,
      lastResult: null,
    };
  }

  function initializeGame() {
    bindEvents();
    getData()
      .then(async (fresh) => {
        currentData = fresh;
        records = currentData.progress.fishGrabFrenzyRecords || {};
        state = initialState();
        await markRecentlyPlayed();
        renderWelcome();
      })
      .catch(() => renderWelcome());
  }

  function startGame() {
    if (state.screen === "gameplay") startLoop();
  }

  function pauseGame() {
    if (!isPlayablePhase(state.phase)) return;
    state.phaseBeforePause = state.phase;
    state.remainingTime = Math.max(0, state.phaseDeadline - performance.now());
    state.phase = "paused";
    clearTimers();
    cancelAnimationFrame(raf);
    showPauseOverlay();
    updateHud();
  }

  function resumeGame() {
    if (state.phase !== "paused") return;
    removeOverlay();
    const phase = state.phaseBeforePause || "waiting";
    state.phase = phase;
    startLoop();
    if (phase === "countdown") continueCountdown(typeof state.countdown === "number" ? state.countdown : 3);
    if (phase === "waiting") scheduleReveal(state.remainingTime || 900);
    if (phase === "active") {
      scheduleComputerGrabs();
      scheduleNoGrab(state.remainingTime || 1200);
    }
    if (phase === "resolving") scheduleNextRound(state.remainingTime || 700);
    updateHud();
  }

  function restartGame() {
    if (state.screen === "gameplay" || state.screen === "results") {
      renderRestartConfirm();
      return;
    }
    renderWelcome();
  }

  function destroyGame() {
    clearTimers();
    cancelAnimationFrame(raf);
    teardownCanvas();
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    root.className = "arcade-view";
  }

  async function saveResult(result = state.lastResult) {
    if (!result || resultSaving) return result || null;
    resultSaving = true;
    const saved = await recordGameResult(result);
    currentData = saved;
    records = currentData.progress.fishGrabFrenzyRecords || {};
    await onResult?.(result);
    resultSaving = false;
    return result;
  }

  function bindEvents() {
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
  }

  async function markRecentlyPlayed() {
    currentData = await updateData((draft) => {
      draft.progress.recentlyPlayed = "fish-grab-frenzy";
      draft.progress.fishGrabFrenzyRecords.selectedMode = state.mode;
      draft.progress.fishGrabFrenzyRecords.preferredDifficulty = state.difficulty;
      draft.progress.fishGrabFrenzyRecords.preferredCat = state.p1CatId;
      draft.progress.fishGrabFrenzyRecords.preferredPlayer2Cat = state.p2CatId;
      return draft;
    });
    records = currentData.progress.fishGrabFrenzyRecords || {};
    await onResult?.({ gameId: "fish-grab-frenzy", summary: "Fish Grab Frenzy opened" });
  }

  async function persistPreferences() {
    currentData = await updateData((draft) => {
      const record = draft.progress.fishGrabFrenzyRecords;
      record.selectedMode = state.mode;
      record.preferredDifficulty = state.difficulty;
      record.preferredCat = state.p1CatId;
      record.preferredPlayer2Cat = state.p2CatId;
      record.player1Name = state.player1;
      record.player2Name = state.player2;
      return draft;
    });
    records = currentData.progress.fishGrabFrenzyRecords || {};
    state.reduceMotion = Boolean(currentData.settings.reduceMotion);
  }

  function actionButton(label, className, action) {
    const node = document.createElement("button");
    node.type = "button";
    node.textContent = label;
    if (className) node.className = className;
    node.addEventListener("click", () => {
      audio?.play("button");
      action();
    });
    return node;
  }

  function shell(title, subtitle = "Offline reaction game") {
    clearTimers();
    cancelAnimationFrame(raf);
    teardownCanvas();
    state.phase = "menu";
    root.className = "arcade-view fish-grab-game";
    root.replaceChildren();
    const bar = el("section", "game-bar fish-game-bar");
    const heading = el("div", "game-title");
    heading.append(el("h1", "", "Fish Grab Frenzy"), el("p", "", subtitle));
    const actions = el("div", "game-actions");
    actions.append(
      actionButton("Stats", "", renderStatsScreen),
      actionButton("Rules", "", renderRules),
      actionButton("Sound", "", renderSoundSettings),
      actionButton("Arcade", "", renderReturnConfirm),
    );
    bar.append(heading, quickStats(), actions);
    root.append(bar);
    const screenTitle = el("span", "fish-screen-title", title);
    screenTitle.setAttribute("aria-live", "polite");
    root.append(screenTitle);
  }

  function quickStats() {
    const summary = summarizeFishGrabRecords(records || {});
    const strip = el("div", "score-strip fish-mini-stats");
    strip.append(
      miniStat("Matches", summary.totalMatches),
      miniStat("Best", formatReaction(summary.bestReaction)),
      miniStat("Streak", summary.bestStreak),
    );
    return strip;
  }

  function miniStat(label, value) {
    const node = el("span");
    node.append(el("small", "", label), el("strong", "", String(value)));
    return node;
  }

  function infoCard(title, copy) {
    const card = el("article", "fish-info-card");
    card.append(el("h3", "", title), el("p", "", copy));
    return card;
  }

  function renderWelcome() {
    state.screen = "intro";
    shell("Welcome", "Grab the safe fish first, dodge the Bomb Fish, and race to 5 points.");
    const panel = el("section", "fish-menu-panel fish-hero-panel");
    panel.append(
      el("span", "card-meta", "Original offline reaction game"),
      el("h2", "", "Four cats, one table, one very suspicious fish"),
      el("p", "", "Wait through the random pause, grab when a normal fish appears, and keep your paws away from Bomb Fish. Scores can drop below zero, so sharp reactions matter."),
    );
    const grid = el("div", "fish-info-grid");
    [
      ["Solo or Two Players", "Solo adds three local computer cats. Two-player mode adds two humans and two computer cats."],
      ["First To 5", "Normal Fish are worth +1. Bomb Fish are worth -1. The first cat to 5 points wins."],
      ["Fair Rounds", "Fish appear after a random 1 to 4 second delay. Bomb Fish are rare and never appear more than twice in a row."],
      ["Local Saves", "Matches, reactions, early grabs, wins, and preferred cats stay in chrome.storage.local."],
    ].forEach(([cardTitle, copy]) => grid.append(infoCard(cardTitle, copy)));
    const actions = el("div", "fish-menu-actions");
    actions.append(
      actionButton("Play Solo", "primary-action", () => {
        state.mode = "solo";
        renderCatSetup();
      }),
      actionButton("Two Players", "", () => {
        state.mode = "two";
        if (state.p1CatId === state.p2CatId) state.p2CatId = nextAvailableCat(state.p1CatId);
        renderCatSetup();
      }),
      actionButton("How To Play", "", renderRules),
      actionButton("Return to Arcade", "", () => onExit?.()),
    );
    panel.append(grid, choiceStrip(), actions);
    root.append(panel);
  }

  function choiceStrip() {
    const strip = el("section", "fish-choice-strip");
    strip.append(
      pill("Mode", state.mode === "two" ? "Two Players" : "Solo"),
      pill("Difficulty", state.difficulty),
      pill("Your Cat", getCatDefinition(state.p1CatId).name),
      pill("Goal", `${TARGET_SCORE} points`),
    );
    return strip;
  }

  function pill(label, value) {
    const node = el("span", "fish-pill");
    node.append(el("small", "", label), el("strong", "", String(value)));
    return node;
  }

  function renderModeSetup() {
    state.screen = "mode";
    shell("Choose Mode", "Choose who controls the human cats.");
    const panel = el("section", "fish-menu-panel");
    panel.append(el("span", "card-meta", "Step 1"), el("h2", "", "Choose a mode"));
    const row = el("div", "fish-card-row");
    row.append(
      selectionCard("Solo", "You control one cat. Three computer cats react locally.", state.mode === "solo", () => {
        state.mode = "solo";
        renderModeSetup();
      }),
      selectionCard("Two Players", "Two humans share one laptop against two computer cats.", state.mode === "two", () => {
        state.mode = "two";
        if (state.p1CatId === state.p2CatId) state.p2CatId = nextAvailableCat(state.p1CatId);
        renderModeSetup();
      }),
    );
    const actions = el("div", "fish-menu-actions");
    actions.append(actionButton("Back", "", renderWelcome), actionButton("Choose Cats", "primary-action", renderCatSetup));
    panel.append(row, actions);
    root.append(panel);
  }

  function selectionCard(title, copy, selected, action) {
    const node = actionButton("", `fish-selection-card${selected ? " is-selected" : ""}`, action);
    node.append(el("strong", "", title), el("span", "", copy));
    node.setAttribute("aria-pressed", String(selected));
    return node;
  }

  function renderCatSetup() {
    state.screen = "cats";
    shell("Choose Cats", "Pick a cat before the match starts.");
    const panel = el("section", "fish-menu-panel");
    panel.append(el("span", "card-meta", "Step 2"), el("h2", "", state.mode === "two" ? "Choose two different human cats" : "Choose your cat"));

    const names = el("div", "fish-name-grid");
    names.append(nameField("Player 1 name", state.player1, (value) => {
      state.player1 = cleanName(value, "Player 1");
    }));
    if (state.mode === "two") {
      names.append(nameField("Player 2 name", state.player2, (value) => {
        state.player2 = cleanName(value, "Player 2");
      }));
    }

    panel.append(names, catPicker("Player 1 Cat", state.p1CatId, (id) => {
      state.p1CatId = id;
      if (state.p2CatId === id) state.p2CatId = nextAvailableCat(id);
      renderCatSetup();
    }));

    if (state.mode === "two") {
      panel.append(catPicker("Player 2 Cat", state.p2CatId, (id) => {
        if (id === state.p1CatId) return;
        state.p2CatId = id;
        renderCatSetup();
      }, state.p1CatId));
    }

    const actions = el("div", "fish-menu-actions");
    actions.append(
      actionButton("Change Mode", "", renderModeSetup),
      actionButton("Difficulty", "primary-action", renderDifficultySetup),
    );
    panel.append(actions);
    root.append(panel);
  }

  function nameField(label, value, onInput) {
    const field = el("label", "field fish-name-field");
    field.append(el("span", "field-label", label));
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 16;
    input.value = value;
    input.addEventListener("input", () => onInput(input.value));
    field.append(input);
    return field;
  }

  function catPicker(label, selectedId, onPick, disabledId = null) {
    const wrap = el("section", "fish-picker");
    wrap.append(el("span", "field-label", label));
    const grid = el("div", "fish-cat-grid");
    for (const cat of CAT_DEFINITIONS) {
      const disabled = cat.id === disabledId;
      const card = actionButton("", `fish-cat-card${cat.id === selectedId ? " is-selected" : ""}`, () => onPick(cat.id));
      card.disabled = disabled;
      card.setAttribute("aria-pressed", String(cat.id === selectedId));
      card.append(catBadge(cat), el("strong", "", cat.name), el("span", "", disabled ? "Already chosen" : cat.accessoryLabel || "Ready to grab"));
      grid.append(card);
    }
    wrap.append(grid);
    return wrap;
  }

  function catBadge(cat) {
    const badge = el("span", "fish-cat-badge");
    badge.style.setProperty("--cat-color", cat.color);
    badge.style.setProperty("--cat-accent", cat.accent);
    badge.append(el("span", "fish-cat-ear left"), el("span", "fish-cat-ear right"), el("span", "fish-cat-face"));
    return badge;
  }

  function renderDifficultySetup() {
    state.screen = "difficulty";
    shell("Choose Difficulty", "Difficulty changes computer reaction speed and Bomb Fish discipline.");
    const panel = el("section", "fish-menu-panel");
    panel.append(el("span", "card-meta", "Step 3"), el("h2", "", "Choose difficulty"));
    const row = el("div", "fish-card-row");
    for (const difficulty of ["easy", "normal", "hard"]) {
      row.append(selectionCard(difficulty[0].toUpperCase() + difficulty.slice(1), difficultySummary(difficulty), state.difficulty === difficulty, () => {
        state.difficulty = difficulty;
        renderDifficultySetup();
      }));
    }
    const actions = el("div", "fish-menu-actions");
    actions.append(
      actionButton("Back to Cats", "", renderCatSetup),
      actionButton("Controls", "", renderControlsIntro),
      actionButton("Start Match", "primary-action", startMatch),
    );
    panel.append(row, choiceStrip(), actions);
    root.append(panel);
  }

  function renderControlsIntro() {
    state.screen = "controls";
    shell("Controls", "Release keys between grabs. Holding a key does not count as a new grab.");
    const panel = el("section", "fish-menu-panel");
    panel.append(el("span", "card-meta", "Step 4"), el("h2", "", "Ready your paws"));
    const list = el("ul", "instructions-list");
    controlsText().forEach((line) => list.append(el("li", "", line)));
    const actions = el("div", "fish-menu-actions");
    actions.append(actionButton("Back", "", renderDifficultySetup), actionButton("Start Match", "primary-action", startMatch));
    panel.append(list, actions);
    root.append(panel);
  }

  function controlsText() {
    if (state.mode === "two") {
      return [
        `Player 1 grab: ${labelsFor(controls.p1Grab)}`,
        `Player 2 grab: ${labelsFor(controls.p2Grab)}`,
        `Pause: ${labelsFor(controls.pause)}`,
        "Grab before the fish appears and that cat is locked out for the round.",
      ];
    }
    return [
      `Grab: ${labelsFor(controls.soloGrab || ["Space", "Enter"])}`,
      `Pause: ${labelsFor(controls.pause)}`,
      "Normal Fish give +1. Bomb Fish give -1.",
      "Grab before the fish appears and your cat is locked out for the round.",
    ];
  }

  function renderRules() {
    state.screen = "rules";
    shell("Rules", "Everything runs offline with local timers and local AI.");
    const panel = el("section", "fish-menu-panel");
    panel.append(el("span", "card-meta", "How to play"), el("h2", "", "Wait, grab, and dodge"));
    const list = el("ul", "instructions-list");
    [
      "Every match has exactly four cats around the table.",
      "Normal Fish are safe and score +1 for the first cat that grabs them.",
      "Bomb Fish score -1 for the cat that grabs them, so sometimes the best move is waiting.",
      "Scores can go below zero, and the first cat to 5 points wins.",
      "Fish appear after a random 1 to 4 second delay. Bomb Fish are limited so every three-fish run includes a safe fish.",
      "Computer cats use the chosen difficulty for reaction speed, early mistakes, and Bomb Fish recognition.",
    ].forEach((line) => list.append(el("li", "", line)));
    const actions = el("div", "fish-menu-actions");
    actions.append(actionButton("Back", "", renderWelcome), actionButton("Play", "primary-action", renderCatSetup));
    panel.append(list, actions);
    root.append(panel);
  }

  function renderStatsScreen() {
    state.screen = "stats";
    shell("Stats", "Saved locally with chrome.storage.local.");
    const summary = summarizeFishGrabRecords(records || {});
    const panel = el("section", "fish-menu-panel");
    panel.append(el("span", "card-meta", "Local records"), el("h2", "", "Fish Grab Frenzy Stats"));
    const grid = el("div", "fish-stat-grid");
    [
      ["Matches", summary.totalMatches],
      ["Human Wins", summary.wins],
      ["Computer Wins", summary.computerWins],
      ["Normal Fish", summary.normalGrabbed],
      ["Bomb Fish", summary.bombGrabbed],
      ["Early Grabs", summary.earlyGrabs],
      ["Best Reaction", formatReaction(summary.bestReaction)],
      ["Average Reaction", formatReaction(summary.averageReaction)],
      ["Best Streak", summary.bestStreak],
    ].forEach(([label, value]) => grid.append(statCard(label, value)));
    const actions = el("div", "fish-menu-actions");
    actions.append(actionButton("Back", "", renderWelcome), actionButton("Play", "primary-action", renderCatSetup));
    panel.append(grid, el("p", "fish-muted", summary.recentSummary), actions);
    root.append(panel);
  }

  function statCard(label, value) {
    const card = el("article", "fish-stat-card");
    card.append(el("span", "", label), el("strong", "", String(value)));
    return card;
  }

  function renderSoundSettings() {
    state.screen = "sound";
    shell("Sound Settings", "These controls respect the arcade master sound and volume settings.");
    const panel = el("section", "fish-menu-panel");
    panel.append(el("span", "card-meta", "Local settings"), el("h2", "", "Sound and motion"));
    const soundRow = el("div", "fish-settings-row");
    soundRow.append(
      el("span", "", "Master sound"),
      actionButton(currentData.settings.sound ? "On" : "Off", "fish-toggle", async () => {
        await audio?.setSound(!currentData.settings.sound);
        currentData = await getData();
        renderSoundSettings();
      }),
    );
    const motionRow = el("div", "fish-settings-row");
    motionRow.append(
      el("span", "", "Reduce motion"),
      actionButton(currentData.settings.reduceMotion ? "On" : "Off", "fish-toggle", async () => {
        currentData = await updateData((draft) => {
          draft.settings.reduceMotion = !draft.settings.reduceMotion;
          return draft;
        });
        state.reduceMotion = Boolean(currentData.settings.reduceMotion);
        renderSoundSettings();
      }),
    );
    const volume = el("label", "field");
    volume.append(el("span", "field-label", "Effects volume"));
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "1";
    slider.step = "0.05";
    slider.value = String(currentData.settings.volume);
    slider.addEventListener("input", async () => {
      await audio?.setVolume(Number(slider.value));
      currentData = await getData();
    });
    volume.append(slider);
    const actions = el("div", "fish-menu-actions");
    actions.append(actionButton("Back", "", renderWelcome), actionButton("Play", "primary-action", renderCatSetup));
    panel.append(soundRow, motionRow, volume, actions);
    root.append(panel);
  }

  async function startMatch() {
    await persistPreferences();
    clearTimers();
    state.screen = "gameplay";
    state.phase = "countdown";
    state.cats = createCats({
      mode: state.mode,
      p1CatId: state.p1CatId,
      p2CatId: state.p2CatId,
      player1: state.player1,
      player2: state.player2,
    });
    state.round = null;
    state.fishHistory = [];
    state.countdown = 3;
    state.message = "Match starting.";
    state.keyReady = { p1: true, p2: true };
    state.stats = {
      normalGrabbed: 0,
      bombGrabbed: 0,
      earlyGrabs: 0,
      reactions: [],
      roundsPlayed: 0,
    };
    state.animation = null;
    state.lastResult = null;
    resultSaving = false;
    renderGameplay();
    continueCountdown(3);
  }

  function renderGameplay() {
    clearTimers();
    root.className = "arcade-view fish-grab-game fish-grab-playing";
    root.replaceChildren();
    const bar = el("section", "game-bar fish-game-bar");
    const heading = el("div", "game-title");
    heading.append(el("h1", "", "Fish Grab Frenzy"), el("p", "", `${state.mode === "two" ? "Two Players" : "Solo"} - ${state.difficulty} - first to ${TARGET_SCORE}`));
    refs.scoreStrip = el("div", "score-strip fish-live-score");
    const actions = el("div", "game-actions");
    actions.append(
      actionButton("Pause", "primary-action", pauseGame),
      actionButton("Restart", "", renderRestartConfirm),
      actionButton("Arcade", "", renderReturnConfirm),
    );
    bar.append(heading, refs.scoreStrip, actions);

    const shellNode = el("section", "fish-stage-shell");
    const stage = el("div", "fish-stage");
    canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Four cartoon cats around a table playing Fish Grab Frenzy.");
    canvas.addEventListener("pointerdown", onCanvasPointer);
    stage.append(canvas);
    refs.live = el("div", "fish-live-text");
    refs.live.setAttribute("aria-live", "polite");
    const controlsRow = el("div", "fish-grab-controls");
    refs.grab1 = actionButton(state.mode === "two" ? `P1 Grab (${labelsFor(controls.p1Grab)})` : `Grab (${labelsFor(controls.soloGrab)})`, "primary-action fish-grab-button", () => handleHumanGrab(1));
    controlsRow.append(refs.grab1);
    if (state.mode === "two") {
      refs.grab2 = actionButton(`P2 Grab (${labelsFor(controls.p2Grab)})`, "primary-action fish-grab-button is-player-two", () => handleHumanGrab(2));
      controlsRow.append(refs.grab2);
    }
    controlsRow.append(actionButton("Controls", "", renderControlsOverlay), actionButton("Sound", "", renderSoundOverlay));
    shellNode.append(stage, refs.live, controlsRow);
    root.append(bar, shellNode);
    resizeObserver = new ResizeObserver(() => renderer.draw(canvas, state));
    resizeObserver.observe(stage);
    updateHud();
    startLoop();
  }

  function continueCountdown(value) {
    if (state.phase !== "countdown") return;
    state.countdown = value;
    updateHud();
    audio?.play("fishCountdown");
    if (value > 1) {
      state.phaseDeadline = performance.now() + 760;
      schedule(() => continueCountdown(value - 1), 760);
      return;
    }
    state.phaseDeadline = performance.now() + 760;
    schedule(() => {
      if (state.phase !== "countdown") return;
      state.countdown = "Go";
      state.message = "Get ready. Do not grab early.";
      updateHud();
      state.phaseDeadline = performance.now() + 520;
      schedule(beginRound, 520);
    }, 760);
  }

  function beginRound() {
    if (hasWinner(state.cats)) {
      completeMatch();
      return;
    }
    state.phase = "waiting";
    state.round = createRound((state.round?.index || 0) + 1, state.fishHistory);
    state.animation = null;
    for (const cat of state.cats) {
      cat.locked = false;
      cat.status = "Ready";
      cat.lastReaction = null;
      cat.paw = { start: 0, duration: 360, result: "idle" };
    }
    state.message = `Round ${state.round.index}: wait for the fish.`;
    updateHud();
    scheduleComputerEarlyGrabs();
    scheduleReveal(state.round.delay);
  }

  function scheduleReveal(delay) {
    state.phaseDeadline = performance.now() + Math.max(0, delay);
    schedule(revealFish, delay);
  }

  function revealFish() {
    if (state.phase !== "waiting" || !state.round) return;
    state.phase = "active";
    state.round.revealedAt = performance.now();
    state.fishHistory.push(state.round.fishType);
    state.message = state.round.fishType === "bomb" ? "Bomb Fish! Do not grab." : "Fish! Grab now.";
    audio?.play("fishAppear");
    audio?.play(state.round.fishType === "bomb" ? "fishBombWarning" : "fishSparkle");
    updateHud();
    scheduleComputerGrabs();
    scheduleNoGrab(state.round.activeWindow);
  }

  function scheduleNoGrab(delay) {
    state.phaseDeadline = performance.now() + Math.max(0, delay);
    schedule(resolveNoGrab, delay);
  }

  function scheduleComputerEarlyGrabs() {
    for (const cat of state.cats.filter((item) => item.controller === "computer")) {
      const plan = createEarlyGrabPlan(cat, state.difficulty);
      if (!plan || plan.delay >= state.round.delay - 120) continue;
      schedule(() => registerEarlyGrab(cat.id, "computer"), plan.delay);
    }
  }

  function scheduleComputerGrabs() {
    if (!state.round) return;
    for (const cat of state.cats.filter((item) => item.controller === "computer" && !item.locked)) {
      const plan = createComputerPlan(cat, state.round.fishType, state.difficulty);
      if (!plan.willGrab || plan.delay >= state.round.activeWindow - 120) continue;
      schedule(() => registerGrab(cat.id, "computer"), plan.delay);
    }
  }

  function resolveNoGrab() {
    if (state.phase !== "active" || !state.round || state.round.resolved) return;
    clearTimers();
    state.round.resolved = true;
    state.stats.roundsPlayed += 1;
    state.phase = "resolving";
    state.message = state.round.fishType === "bomb" ? "Good dodge. Nobody grabbed the Bomb Fish." : "The normal fish slipped away.";
    audio?.play(state.round.fishType === "bomb" ? "fishHappy" : "miss");
    updateHud();
    scheduleNextRound(950);
  }

  function handleHumanGrab(player) {
    const cat = state.cats.find((item) => item.controller === "human" && item.player === player);
    if (!cat) return;
    registerGrab(cat.id, "human");
  }

  function registerGrab(catId, source) {
    if (state.phase === "waiting") {
      registerEarlyGrab(catId, source);
      return;
    }
    if (state.phase !== "active" || !state.round || state.round.resolved) return;
    const cat = state.cats.find((item) => item.id === catId);
    if (!cat || cat.locked) return;
    clearTimers();
    state.round.resolved = true;
    state.phase = "resolving";
    const reaction = Math.max(0, performance.now() - state.round.revealedAt);
    const delta = roundScore(state.round.fishType);
    cat.score += delta;
    cat.lastReaction = reaction;
    cat.status = delta > 0 ? `+1 in ${Math.round(reaction)} ms` : `-1 in ${Math.round(reaction)} ms`;
    cat.paw = { start: performance.now(), duration: 680, result: "grab" };
    state.animation = {
      catId,
      fishType: state.round.fishType,
      start: performance.now(),
      duration: 680,
    };
    state.stats.roundsPlayed += 1;
    state.stats.reactions.push(reaction);
    if (state.round.fishType === "bomb") {
      state.stats.bombGrabbed += 1;
      cat.bombGrabbed += 1;
      audio?.play("fishBomb");
      audio?.play("fishPointDown");
      state.message = `${cat.displayName} grabbed a Bomb Fish. Minus one.`;
    } else {
      state.stats.normalGrabbed += 1;
      cat.normalGrabbed += 1;
      audio?.play(source === "human" ? "fishGrab" : "fishPaw");
      audio?.play("fishPointUp");
      state.message = `${cat.displayName} grabbed the fish first.`;
    }
    updateHud();
    if (hasWinner(state.cats)) schedule(completeMatch, 900);
    else scheduleNextRound(1120);
  }

  function registerEarlyGrab(catId, source) {
    if (state.phase !== "waiting" || !state.round) return;
    const cat = state.cats.find((item) => item.id === catId);
    if (!cat || cat.locked) return;
    cat.locked = true;
    cat.earlyGrabs += 1;
    cat.status = "Too early";
    cat.paw = { start: performance.now(), duration: 420, result: "early" };
    state.stats.earlyGrabs += 1;
    state.message = `${cat.displayName} grabbed too early and sits out this fish.`;
    if (source === "human") audio?.play("fishTooEarly");
    updateHud();
  }

  function scheduleNextRound(delay) {
    state.phaseDeadline = performance.now() + delay;
    schedule(() => {
      if (hasWinner(state.cats)) completeMatch();
      else beginRound();
    }, delay);
  }

  function completeMatch() {
    clearTimers();
    state.phase = "finished";
    state.screen = "results";
    const result = createFishGrabResult(state);
    state.lastResult = result;
    audio?.play(result.winnerController === "human" ? "fishVictory" : "draw");
    saveResult(result);
    renderResults(result);
  }

  function renderResults(result = state.lastResult) {
    state.screen = "results";
    shell("Results", "Match complete. Result saved locally.");
    state.phase = "finished";
    const panel = el("section", "fish-menu-panel fish-results-panel");
    panel.append(
      el("span", "card-meta", "Winner"),
      el("h2", "", `${result.winnerName} wins`),
      el("p", "", result.summary || "First cat to 5 points wins."),
    );
    const grid = el("div", "fish-result-grid");
    for (const score of result.scores || []) {
      const cat = getCatDefinition(score.catId);
      const card = el("article", "fish-result-card");
      card.append(
        catBadge(cat),
        el("h3", "", score.name),
        resultLine("Score", score.score),
        resultLine("Safe Fish", score.normalGrabbed),
        resultLine("Bomb Fish", score.bombGrabbed),
        resultLine("Early Grabs", score.earlyGrabs),
      );
      grid.append(card);
    }
    const stats = el("div", "fish-stat-grid");
    [
      ["Rounds", result.roundsPlayed],
      ["Normal Grabbed", result.normalGrabbed],
      ["Bomb Grabbed", result.bombGrabbed],
      ["Early Grabs", result.earlyGrabs],
      ["Fastest Reaction", formatReaction(result.bestReaction)],
      ["Average Reaction", formatReaction(result.averageReaction)],
      ["Difficulty", result.difficulty],
    ].forEach(([label, value]) => stats.append(statCard(label, value)));
    const actions = el("div", "fish-menu-actions");
    actions.append(
      actionButton("Play Again", "primary-action", startMatch),
      actionButton("Change Mode", "", renderModeSetup),
      actionButton("Change Cats", "", renderCatSetup),
      actionButton("Change Difficulty", "", renderDifficultySetup),
      actionButton("Return to Arcade", "", () => onExit?.()),
    );
    panel.append(grid, stats, actions);
    root.append(panel);
  }

  function resultLine(label, value) {
    const row = el("div", "fish-result-line");
    row.append(el("span", "", label), el("strong", "", String(value)));
    return row;
  }

  function updateHud() {
    if (refs.scoreStrip) {
      refs.scoreStrip.replaceChildren(
        ...state.cats.map((cat) => miniStat(cat.displayName, cat.score)),
        miniStat("Round", state.round?.index || 0),
      );
    }
    if (refs.live) {
      refs.live.textContent = state.message;
    }
    const canPress = state.phase === "waiting" || state.phase === "active";
    if (refs.grab1) refs.grab1.disabled = !canPress;
    if (refs.grab2) refs.grab2.disabled = !canPress;
  }

  function startLoop() {
    cancelAnimationFrame(raf);
    const tick = (time) => {
      if (!canvas) return;
      renderer.draw(canvas, state, time);
      if (state.screen === "gameplay" && state.phase !== "paused") {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
  }

  function teardownCanvas() {
    if (canvas) {
      canvas.removeEventListener("pointerdown", onCanvasPointer);
    }
    canvas = null;
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  }

  function schedule(fn, delay) {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, Math.max(0, delay));
    timers.add(id);
    return id;
  }

  function clearTimers() {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
  }

  function showPauseOverlay() {
    removeOverlay();
    root.append(overlay("Paused", "The fish timers and computer cats are paused.", [
      ["Resume", "primary-action", resumeGame],
      ["Restart Match", "", renderRestartConfirm],
      ["Controls", "", renderControlsOverlay],
      ["Sound", "", renderSoundOverlay],
      ["Return to Arcade", "", renderReturnConfirm],
    ]));
  }

  function renderControlsOverlay() {
    pauseGame();
    root.append(overlay("Controls", "Release keys between attempts. Early grabs lock the cat out for the round.", [
      [controlsText().join(" | "), "fish-wide-label", () => {}],
      ["Resume", "primary-action", resumeGame],
    ]));
  }

  function renderSoundOverlay() {
    pauseGame();
    const node = overlay("Sound", "Use the arcade settings for master sound and effects volume.", [
      [currentData.settings.sound ? "Sound On" : "Sound Off", "primary-action", async () => {
        await audio?.setSound(!currentData.settings.sound);
        currentData = await getData();
        removeOverlay();
        renderSoundOverlay();
      }],
      ["Resume", "", resumeGame],
    ]);
    root.append(node);
  }

  function renderRestartConfirm() {
    if (isPlayablePhase(state.phase)) pauseGame();
    root.append(overlay("Restart Match?", "Scores from this unfinished match will be cleared.", [
      ["Keep Playing", "", resumeOrWelcome],
      ["Restart", "primary-action", startMatch],
    ]));
  }

  function renderReturnConfirm() {
    if (isPlayablePhase(state.phase)) pauseGame();
    root.append(overlay("Return to Arcade?", "The current match will stop. Saved results are kept.", [
      ["Stay", "", resumeOrWelcome],
      ["Return to Arcade", "primary-action", () => onExit?.()],
    ]));
  }

  function resumeOrWelcome() {
    if (state.phase === "paused") resumeGame();
    else renderWelcome();
  }

  function overlay(title, copy, actions) {
    removeOverlay();
    const wrap = el("div", "fish-overlay");
    const card = el("section", "fish-overlay-card");
    card.append(el("h2", "", title), el("p", "", copy));
    const row = el("div", "fish-menu-actions");
    for (const [label, className, action] of actions) {
      if (className === "fish-wide-label") {
        row.append(el("span", "fish-wide-label", label));
      } else {
        row.append(actionButton(label, className, action));
      }
    }
    card.append(row);
    wrap.append(card);
    return wrap;
  }

  function removeOverlay() {
    root.querySelector(".fish-overlay")?.remove();
  }

  function onCanvasPointer(event) {
    if (state.screen !== "gameplay" || !(state.phase === "waiting" || state.phase === "active")) return;
    event.preventDefault();
    if (state.mode === "solo") {
      handleHumanGrab(1);
      return;
    }
    const layout = renderer.getLayout();
    if (!layout) {
      handleHumanGrab(1);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const humans = state.cats.filter((cat) => cat.controller === "human");
    const nearest = humans
      .map((cat) => {
        const point = layout.seats[cat.seat];
        return { cat, distance: Math.hypot(point.x - x, point.y - y) };
      })
      .sort((a, b) => a.distance - b.distance)[0];
    handleHumanGrab(nearest?.cat.player || 1);
  }

  function onKeyDown(event) {
    if (state.screen !== "gameplay") return;
    if (shouldPreventScroll(event, controls)) event.preventDefault();
    if (matchesControl(event, controls.pause)) {
      event.preventDefault();
      if (state.phase === "paused") resumeGame();
      else pauseGame();
      return;
    }
    if (!(state.phase === "waiting" || state.phase === "active")) return;
    if (event.repeat) return;
    if (state.mode === "solo" && matchesControl(event, controls.soloGrab || ["Space", "Enter"])) {
      if (!state.keyReady.p1) return;
      state.keyReady.p1 = false;
      event.preventDefault();
      handleHumanGrab(1);
      return;
    }
    if (state.mode === "two" && matchesControl(event, controls.p1Grab)) {
      if (!state.keyReady.p1) return;
      state.keyReady.p1 = false;
      event.preventDefault();
      handleHumanGrab(1);
      return;
    }
    if (state.mode === "two" && matchesControl(event, controls.p2Grab)) {
      if (!state.keyReady.p2) return;
      state.keyReady.p2 = false;
      event.preventDefault();
      handleHumanGrab(2);
    }
  }

  function onKeyUp(event) {
    if (matchesControl(event, controls.soloGrab || []) || matchesControl(event, controls.p1Grab || [])) {
      state.keyReady.p1 = true;
    }
    if (matchesControl(event, controls.p2Grab || [])) {
      state.keyReady.p2 = true;
    }
  }

  return {
    initializeGame,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    destroyGame,
    saveResult,
    createCats,
    beginRound,
    scheduleFishAppearance: scheduleReveal,
    selectFishType,
    revealFish,
    registerGrab,
    registerEarlyGrab,
    resolveRound: resolveNoGrab,
    animateCatPaw: (catId) => {
      const cat = state.cats.find((item) => item.id === catId);
      if (cat) cat.paw = { start: performance.now(), duration: 420, result: "early" };
    },
    updateScore: updateHud,
    checkWinner: () => hasWinner(state.cats),
    completeMatch,
    updateComputerAI: scheduleComputerGrabs,
  };
}
