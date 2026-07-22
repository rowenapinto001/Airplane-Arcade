import { labelsFor, matchesControl, shouldPreventScroll } from "../../shared/controls.js";
import { getData, recordGameResult, updateData } from "../../shared/storage.js";
import { chooseAiMove, aiDelay } from "./ludo-ai.js";
import { rollFairDice } from "./ludo-dice.js";
import { isMainStep, isSafeMainIndex, mainIndexFor } from "./ludo-board.js";
import {
  DEFAULT_RULES,
  MODE_LABELS,
  applyDiceRoll,
  calculateValidMoves,
  changeTurn,
  cloneState,
  createGameState,
  currentPlayer,
  durationSeconds,
  finalizeMove,
  homeCountFor,
  isCurrentPlayerComputer,
  selectNextMove,
  tokenById,
} from "./ludo-rules.js";
import { clearSavedGame, saveGameState, validateSavedGame } from "./ludo-storage.js";
import { buildSkyLudoResult } from "./ludo-results.js";
import { drawSkyLudo, hitTestSkyLudoToken } from "./ludo-renderer.js";

const DEFAULT_CONTROLS = {
  roll: ["Space", "Enter"],
  select: ["Enter"],
  up: ["ArrowUp"],
  down: ["ArrowDown"],
  left: ["ArrowLeft"],
  right: ["ArrowRight"],
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

export function createSkyLudoGame(context) {
  const { root, audio, data, options, onExit, onSetup, onResult } = context;
  const controls = options.controls || DEFAULT_CONTROLS;
  let currentData = clone(data);
  let records = currentData.progress.skyLudoRecords;
  let gameState = null;
  let canvas = null;
  let ctx = null;
  let resizeObserver = null;
  let previousPhase = null;
  let resultSaving = false;
  const timers = new Set();
  const setupState = {
    mode: records?.selectedMode || (options.mode === "two" ? "two" : "solo-duel"),
    difficulty: options.difficulty || records?.selectedDifficulty || "normal",
    player1: options.player1 || "Player 1",
    player2: options.player2 || "Player 2",
    swappedTwoPlayerColors: false,
    rules: { ...DEFAULT_RULES, ...(records?.preferredRules || {}) },
  };

  async function initializeGame() {
    currentData = await getData();
    records = currentData.progress.skyLudoRecords;
    setupState.mode = records?.selectedMode || setupState.mode;
    setupState.difficulty = options.difficulty || records?.selectedDifficulty || setupState.difficulty;
    setupState.rules = { ...DEFAULT_RULES, ...(records?.preferredRules || {}) };
    bindEvents();
    await markRecentlyPlayed();
    if (options.continueGame && validateSavedGame(records.savedGameState)) {
      restoreSavedGame();
    } else {
      renderIntro();
    }
  }

  function startGame() {
    if (gameState && gameState.phase !== "paused") scheduleComputerTurn();
  }

  async function markRecentlyPlayed() {
    currentData = await updateData((draft) => {
      draft.progress.recentlyPlayed = "sky-ludo";
      draft.progress.skyLudoRecords.selectedMode = setupState.mode;
      draft.progress.skyLudoRecords.selectedDifficulty = setupState.difficulty;
      return draft;
    });
    records = currentData.progress.skyLudoRecords;
    await onResult?.({ gameId: "sky-ludo", summary: "Sky Ludo opened" });
  }

  function shell(title, subtitle = "") {
    teardownCanvas();
    clearTimers();
    root.className = "arcade-view sky-ludo-game";
    root.replaceChildren();
    const bar = el("section", "game-bar sky-ludo-bar");
    const heading = el("div", "game-title");
    heading.append(el("h1", "", "Sky Ludo"), el("p", "", subtitle || "Offline airport-board race home"));
    const actions = el("div", "game-actions");
    actions.append(button("Rules", "", renderRules), button("Stats", "", renderStats), button("Arcade", "", renderReturnConfirm));
    bar.append(heading, quickStats(), actions);
    root.append(bar);
    if (title) {
      const sr = el("span", "sky-ludo-screen-title", title);
      sr.setAttribute("aria-live", "polite");
      root.append(sr);
    }
  }

  function quickStats() {
    const strip = el("div", "score-strip sky-ludo-mini-stats");
    const wins = (records?.soloDuelWins || 0) + (records?.soloClassicWins || 0) + (records?.player1Wins || 0) + (records?.player2Wins || 0);
    strip.append(miniStat("Wins", wins), miniStat("Coins", records?.flightCoins || 0), miniStat("Saved", records?.savedGameState ? "Yes" : "No"));
    return strip;
  }

  function miniStat(label, value) {
    const item = el("span");
    item.append(el("small", "", label), el("strong", "", String(value)));
    return item;
  }

  function renderIntro() {
    gameState = null;
    shell("Game introduction", "Roll fair dice, capture gently, build blocks, and bring travel tokens home.");
    const panel = el("section", "sky-ludo-menu-panel");
    panel.append(
      el("span", "card-meta", "Board game"),
      el("h2", "", "Airport Ludo, Fully Offline"),
      el("p", "", "Play a duel against one computer, a four-colour classic match, or local two-player Ludo on the same laptop."),
    );
    const grid = el("div", "sky-ludo-info-grid");
    [
      ["Fair dice", "Every roll uses a local six-sided dice helper shared by humans and computer players."],
      ["Classic rules", "Roll 6 to leave the terminal, use exact home rolls, safe spaces, captures, blocks, and the three-sixes rule."],
      ["Computer opponents", "Easy, Normal, and Hard AI pick from the same legal moves without hidden dice help."],
      ["Local saves", "Matches autosave after completed moves, captures, homes, and turn changes."],
    ].forEach(([title, copy]) => grid.append(infoCard(title, copy)));
    const actions = el("div", "sky-ludo-actions");
    if (validateSavedGame(records?.savedGameState)) actions.append(button("Continue Game", "primary-action", restoreSavedGame));
    actions.append(button("Choose Mode", "primary-action", renderModeSelection), button("Rules", "", renderRules), button("Statistics", "", renderStats));
    panel.append(grid, actions);
    root.append(panel);
  }

  function infoCard(title, copy) {
    const card = el("article", "sky-ludo-info-card");
    card.append(el("h3", "", title), el("p", "", copy));
    return card;
  }

  function renderModeSelection() {
    shell("Mode selection", "Choose a match shape.");
    const panel = el("section", "sky-ludo-menu-panel");
    panel.append(el("span", "card-meta", "Modes"), el("h2", "", "Pick a Sky Ludo Mode"));
    const grid = el("div", "sky-ludo-choice-grid");
    [
      ["solo-duel", "Solo - Duel", "Blue Wing against one opposite computer opponent. Quick to read, still tactical."],
      ["solo-classic", "Solo - Classic", "One human and three computer pilots race all four colours."],
      ["two", "Two Players", "Two local players share the laptop, using opposite sides of the board."],
    ].forEach(([mode, title, copy]) => {
      const card = button("", `sky-ludo-choice-card ${setupState.mode === mode ? "is-selected" : ""}`, () => {
        setupState.mode = mode;
        renderSetup(mode);
      });
      card.append(el("strong", "", title), el("span", "", copy));
      grid.append(card);
    });
    panel.append(grid, el("div", "sky-ludo-actions"));
    panel.querySelector(".sky-ludo-actions").append(button("Back", "", renderIntro));
    root.append(panel);
  }

  function renderSetup(mode = setupState.mode) {
    setupState.mode = mode;
    const title = mode === "solo-duel" ? "Solo Duel setup" : mode === "solo-classic" ? "Solo Classic setup" : "Two Player setup";
    shell(title, "Names, difficulty, colours, and rules.");
    const panel = el("section", "sky-ludo-menu-panel");
    panel.append(el("span", "card-meta", MODE_LABELS[mode]), el("h2", "", title));
    const grid = el("div", "sky-ludo-setup-grid");
    grid.append(playerSetupBox(mode), difficultyBox(mode), rulesBox(), quickModeBox());
    const actions = el("div", "sky-ludo-actions");
    actions.append(button("Start Match", "primary-action", startNewGame), button("Mode Selection", "", renderModeSelection), button("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function playerSetupBox(mode) {
    const box = el("article", "sky-ludo-info-card");
    box.append(el("h3", "", mode === "two" ? "Players and colours" : "Player"));
    const p1 = nameInput("Player 1", setupState.player1, (value) => {
      setupState.player1 = value || "Player 1";
    });
    box.append(p1);
    if (mode === "two") {
      const p2 = nameInput("Player 2", setupState.player2, (value) => {
        setupState.player2 = value || "Player 2";
      });
      const colour = el("p", "sky-ludo-note", setupState.swappedTwoPlayerColors ? "Player 1 uses Green Cloud. Player 2 uses Blue Wing." : "Player 1 uses Blue Wing. Player 2 uses Green Cloud.");
      box.append(p2, colour, button("Swap Colours", "", () => {
        setupState.swappedTwoPlayerColors = !setupState.swappedTwoPlayerColors;
        renderSetup(mode);
      }));
    } else {
      box.append(el("p", "sky-ludo-note", mode === "solo-duel" ? "You use Blue Wing. The computer uses Green Cloud." : "You use Blue Wing. Three airport computer crews fill the other colours."));
    }
    return box;
  }

  function nameInput(label, value, onInput) {
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

  function difficultyBox(mode) {
    const box = el("article", "sky-ludo-info-card");
    box.append(el("h3", "", "AI Difficulty"));
    if (mode === "two") {
      box.append(el("p", "sky-ludo-note", "Two Player mode has no computer turns."));
      return box;
    }
    const row = el("div", "sky-ludo-segmented");
    [
      ["easy", "Easy"],
      ["normal", "Normal"],
      ["hard", "Hard"],
    ].forEach(([id, label]) => {
      row.append(button(label, setupState.difficulty === id ? "is-selected" : "", () => {
        setupState.difficulty = id;
        renderSetup(mode);
      }));
    });
    box.append(row, el("p", "sky-ludo-note", difficultyNote(setupState.difficulty)));
    return box;
  }

  function difficultyNote(id) {
    if (id === "easy") return "Releases tokens often and may miss stronger captures.";
    if (id === "hard") return "Scores captures, safety, blocks, home efficiency, and risk.";
    return "Balances release, capture, safety, blocks, and bringing tokens home.";
  }

  function rulesBox() {
    const box = el("article", "sky-ludo-info-card");
    box.append(el("h3", "", "Rules"));
    [
      ["fastStart", "Fast Start", "One token begins active."],
      ["blocksEnabled", "Blocks", "Two same-colour tokens stop opponents."],
      ["threeSixesPenalty", "Three-Sixes Penalty", "Third consecutive 6 ends the turn."],
      ["homeBonus", "Home Bonus Roll", "Completing a token gives another roll."],
    ].forEach(([key, label, detail]) => box.append(ruleToggle(key, label, detail)));
    return box;
  }

  function quickModeBox() {
    const box = el("article", "sky-ludo-info-card");
    box.append(el("h3", "", "Quick Options"));
    box.append(ruleToggle("quickMode", "Quick Mode", "Use two tokens per player."), ruleToggle("fasterAi", "Faster AI", "Shorter computer thinking delay."), ruleToggle("fasterAnimations", "Faster Animations", "Shorter token movement pauses."));
    return box;
  }

  function ruleToggle(key, label, detail) {
    const row = el("div", "sky-ludo-toggle-row");
    const copy = el("span");
    copy.append(el("strong", "", label), el("small", "", detail));
    const toggle = button(setupState.rules[key] ? "On" : "Off", setupState.rules[key] ? "is-selected" : "", () => {
      setupState.rules[key] = !setupState.rules[key];
      renderSetup(setupState.mode);
    });
    row.append(copy, toggle);
    return row;
  }

  async function startNewGame() {
    const names = setupState.mode === "two" && setupState.swappedTwoPlayerColors
      ? { blue: setupState.player2, green: setupState.player1 }
      : { blue: setupState.player1, green: setupState.player2 };
    gameState = createGameState({
      mode: setupState.mode,
      difficulty: setupState.difficulty,
      player1: setupState.player1,
      player2: setupState.player2,
      names,
      rules: setupState.rules,
    });
    resultSaving = false;
    await saveCurrentGame();
    renderGameplay();
    scheduleComputerTurn();
  }

  function returnToGame() {
    if (gameState?.phase === "paused") {
      gameState.phase = previousPhase || "readyToRoll";
      previousPhase = null;
    }
    renderGameplay();
    scheduleComputerTurn();
  }

  function restoreSavedGame() {
    const saved = validateSavedGame(records?.savedGameState);
    if (!saved) {
      renderIntro();
      return;
    }
    gameState = saved;
    setupState.mode = saved.mode;
    setupState.difficulty = saved.difficulty;
    setupState.rules = { ...DEFAULT_RULES, ...saved.rules };
    resultSaving = false;
    renderGameplay();
    scheduleComputerTurn();
  }

  function renderGameplay() {
    clearTimers();
    root.className = "arcade-view sky-ludo-game is-playing";
    root.replaceChildren();
    const bar = el("section", "game-bar sky-ludo-bar");
    const heading = el("div", "game-title");
    heading.append(el("h1", "", "Sky Ludo"), el("p", "", `${MODE_LABELS[gameState.mode]} - ${gameState.rules.quickMode ? "Quick" : "Classic"} rules`));
    const actions = el("div", "game-actions");
    actions.append(button("Pause", "primary-action", pauseGame), button("Restart", "", renderRestartConfirm), button("Rules", "", renderRules), button("Arcade", "", renderReturnConfirm));
    bar.append(heading, liveStats(), actions);

    const shell = el("section", "sky-ludo-shell");
    const board = el("div", "sky-ludo-board-wrap");
    canvas = document.createElement("canvas");
    canvas.className = "sky-ludo-canvas";
    canvas.setAttribute("aria-label", "Sky Ludo board with terminals, safe runway spaces, home paths, dice state, and travel tokens.");
    board.append(canvas, overlay("skyLudoOverlay"));
    ctx = canvas.getContext("2d");
    canvas.addEventListener("click", onCanvasClick);

    const side = el("aside", "sky-ludo-side");
    side.id = "skyLudoSide";
    shell.append(board, side);
    root.append(bar, shell);
    resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
    updateSidePanel();
    draw();
  }

  function liveStats() {
    const strip = el("div", "score-strip sky-ludo-live-stats");
    strip.id = "skyLudoHud";
    strip.append(miniStat("Turn", currentPlayer(gameState).name), miniStat("Dice", gameState.dice || "-"), miniStat("Home", `${homeCountFor(currentPlayer(gameState))}/${gameState.tokenCount}`), miniStat("Rolls", gameState.stats.diceRolls));
    return strip;
  }

  function overlay(id) {
    const node = el("div", "game-overlay");
    node.id = id;
    return node;
  }

  function updateSidePanel() {
    const side = root.querySelector("#skyLudoSide");
    if (!side || !gameState) return;
    side.replaceChildren();
    const current = currentPlayer(gameState);
    const diceCard = el("section", "sky-ludo-dice-card");
    diceCard.append(el("span", "card-meta", current.isHuman ? "Human turn" : `Computer - ${current.aiDifficulty}`), el("h2", "", current.name));
    const dice = el("div", `sky-ludo-dice ${gameState.phase === "diceRolling" ? "is-rolling" : ""}`, gameState.dice ? String(gameState.dice) : "?");
    const roll = button(rollLabel(), "primary-action", () => rollDiceForTurn(false));
    roll.disabled = !canHumanRoll();
    diceCard.append(dice, el("p", "sky-ludo-message", gameState.message || "Roll the dice"), roll);
    if (gameState.phase === "selectToken" && current.isHuman) {
      diceCard.append(el("p", "sky-ludo-note", "Highlighted tokens can move. Use Arrow keys to change selection and Enter to move."));
      const selected = gameState.validMoves[gameState.selectedMoveIndex];
      const select = button(selected ? `Move Token ${selected.tokenIndex + 1}` : "Move Token", "primary-action", () => selected && performMove(selected));
      select.disabled = !selected;
      diceCard.append(select);
    }
    side.append(diceCard, playersPanel(), historyPanel(), ruleSummary());
    updateHud();
  }

  function rollLabel() {
    if (gameState.phase === "diceRolling") return "Rolling";
    if (isCurrentPlayerComputer(gameState)) return "Computer Turn";
    return "Roll Dice";
  }

  function playersPanel() {
    const panel = el("section", "sky-ludo-player-list");
    for (const player of gameState.players) {
      const card = el("article", `sky-ludo-player-card ${currentPlayer(gameState).id === player.id ? "is-active" : ""}`);
      card.dataset.player = player.id;
      card.append(el("strong", "", player.name), el("span", "", player.isHuman ? "Human" : `Computer ${player.aiDifficulty}`));
      const counts = el("p", "", `Yard ${player.tokens.filter((token) => token.steps < 0).length} | Active ${player.tokens.filter((token) => token.steps >= 0 && token.steps < 58).length} | Home ${homeCountFor(player)} / ${gameState.tokenCount}`);
      card.append(counts);
      panel.append(card);
    }
    return panel;
  }

  function historyPanel() {
    const details = document.createElement("details");
    details.className = "sky-ludo-history";
    const summary = el("summary", "", "Dice History");
    const list = el("ul");
    if (!gameState.rollHistory.length) list.append(el("li", "", "No rolls yet."));
    for (const roll of gameState.rollHistory.slice(0, 8)) list.append(el("li", "", `${roll.player}: ${roll.value}`));
    details.append(summary, list);
    return details;
  }

  function ruleSummary() {
    const card = el("section", "sky-ludo-rule-summary");
    card.append(el("h3", "", "Rules"));
    const lines = [
      gameState.rules.quickMode ? "Quick Mode: 2 tokens" : "Classic: 4 tokens",
      gameState.rules.fastStart ? "Fast Start on" : "Roll 6 to enter",
      gameState.rules.blocksEnabled ? "Blocks enabled" : "No Blocks",
      gameState.rules.threeSixesPenalty ? "Three-sixes penalty" : "No three-sixes penalty",
      gameState.rules.homeBonus ? "Home bonus roll" : "No home bonus roll",
    ];
    for (const line of lines) card.append(el("span", "", line));
    return card;
  }

  function updateHud() {
    const hud = root.querySelector("#skyLudoHud");
    if (!hud || !gameState) return;
    const values = hud.querySelectorAll("strong");
    if (values[0]) values[0].textContent = currentPlayer(gameState).name;
    if (values[1]) values[1].textContent = gameState.dice || "-";
    if (values[2]) values[2].textContent = `${homeCountFor(currentPlayer(gameState))}/${gameState.tokenCount}`;
    if (values[3]) values[3].textContent = String(gameState.stats.diceRolls);
  }

  function canHumanRoll() {
    return gameState?.phase === "readyToRoll" && currentPlayer(gameState).isHuman;
  }

  async function rollDiceForTurn(isComputer = false) {
    if (!gameState || gameState.phase !== "readyToRoll") return;
    if (!isComputer && !currentPlayer(gameState).isHuman) return;
    gameState.phase = "diceRolling";
    gameState.diceRolling = true;
    gameState.message = "Dice rolling...";
    audio.play("ludoDice");
    updateSidePanel();
    draw();
    const delay = gameState.rules.fasterAnimations || currentData.settings.reduceMotion ? 260 : 620;
    setTimer(() => {
      const value = rollFairDice();
      applyDiceRoll(gameState, value);
      audio.play(value === 6 ? "ludoTurn" : "ludoMove");
      updateSidePanel();
      draw();
      if (gameState.phase === "noMove") {
        audio.play("ludoNoMove");
        saveCurrentGame();
        setTimer(() => finishNoMoveTurn(), gameState.rules.fasterAnimations ? 350 : 850);
      } else {
        saveCurrentGame();
        scheduleComputerTurn();
      }
    }, delay);
  }

  async function finishNoMoveTurn() {
    if (!gameState || gameState.phase !== "noMove") return;
    changeTurn(gameState);
    audio.play("ludoTurn");
    await saveCurrentGame();
    updateSidePanel();
    draw();
    scheduleComputerTurn();
  }

  function scheduleComputerTurn() {
    if (!gameState || gameState.phase === "paused" || gameState.phase === "gameOver") return;
    if (!isCurrentPlayerComputer(gameState)) return;
    if (gameState.phase === "readyToRoll") {
      setTimer(() => rollDiceForTurn(true), aiDelay(currentPlayer(gameState).aiDifficulty, gameState.rules.fasterAi));
    } else if (gameState.phase === "selectToken") {
      gameState.message = `${currentPlayer(gameState).name} is thinking`;
      updateSidePanel();
      setTimer(() => {
        const move = chooseAiMove(gameState, gameState.validMoves, currentPlayer(gameState).aiDifficulty);
        if (move) performMove(move);
      }, aiDelay(currentPlayer(gameState).aiDifficulty, gameState.rules.fasterAi));
    } else if (gameState.phase === "noMove") {
      setTimer(() => finishNoMoveTurn(), gameState.rules.fasterAi ? 240 : 700);
    }
  }

  async function performMove(move) {
    if (!gameState || gameState.phase !== "selectToken") return;
    gameState.phase = "moving";
    gameState.validMoves = [];
    const found = tokenById(gameState, move.tokenId);
    if (!found) return;
    const { token } = found;
    if (move.release) audio.play("ludoLeave");
    const delay = currentData.settings.reduceMotion || gameState.rules.fasterAnimations ? 80 : 170;
    for (const step of move.path) {
      token.steps = step;
      audio.play("ludoMove");
      updateSidePanel();
      draw();
      await sleep(delay);
      if (!gameState || gameState.phase !== "moving") return;
    }
    const outcome = finalizeMove(gameState, move);
    if (move.entersHomePath) audio.play("ludoHomeEntry");
    if (move.createsBlock) audio.play("ludoBlock");
    if (outcome.captureIds.length) audio.play("ludoCapture");
    if (outcome.completed) audio.play("ludoHome");
    if (!outcome.captureIds.length && !outcome.completed && isMainStep(move.targetSteps) && isSafeMainIndex(mainIndexFor(move.playerId, move.targetSteps))) {
      audio.play("ludoSafe");
    }
    if (outcome.winner) {
      await finishGame();
      return;
    }
    await saveCurrentGame();
    updateSidePanel();
    draw();
    scheduleComputerTurn();
  }

  async function finishGame() {
    if (!gameState || resultSaving) return;
    resultSaving = true;
    updateSidePanel();
    draw();
    const result = buildSkyLudoResult(gameState);
    audio.play(result.winner === "solo" || result.winner === "player1" || result.winner === "player2" ? "ludoVictory" : "ludoDefeat");
    currentData = await recordGameResult(result);
    records = currentData.progress.skyLudoRecords;
    await clearSavedGame();
    await onResult?.(result);
    renderResults(result);
  }

  async function saveCurrentGame() {
    if (!gameState || gameState.phase === "gameOver" || gameState.phase === "destroyed") return;
    currentData = await saveGameState(gameState);
    records = currentData.progress.skyLudoRecords;
  }

  function onCanvasClick(event) {
    if (!gameState || gameState.phase !== "selectToken" || !currentPlayer(gameState).isHuman) return;
    const hit = hitTestSkyLudoToken(canvas, gameState, event.clientX, event.clientY);
    if (!hit) return;
    const index = gameState.validMoves.findIndex((move) => move.tokenId === hit.tokenId);
    if (index === -1) return;
    gameState.selectedMoveIndex = index;
    performMove(gameState.validMoves[index]);
  }

  function onKeyDown(event) {
    if (!gameState) return;
    if (shouldPreventScroll(event, controls)) event.preventDefault();
    if (matchesControl(event, controls.pause)) {
      if (gameState.phase === "paused") resumeGame();
      else pauseGame();
      return;
    }
    if (gameState.phase === "readyToRoll" && matchesControl(event, controls.roll)) {
      rollDiceForTurn(false);
      return;
    }
    if (gameState.phase === "selectToken") {
      if (matchesControl(event, controls.left) || matchesControl(event, controls.up)) {
        selectNextMove(gameState, -1);
        updateSidePanel();
        draw();
      } else if (matchesControl(event, controls.right) || matchesControl(event, controls.down)) {
        selectNextMove(gameState, 1);
        updateSidePanel();
        draw();
      } else if (matchesControl(event, controls.select)) {
        const selected = gameState.validMoves[gameState.selectedMoveIndex];
        if (selected) performMove(selected);
      }
    }
  }

  function pauseGame() {
    if (!gameState || ["moving", "diceRolling", "gameOver", "destroyed"].includes(gameState.phase)) return;
    previousPhase = gameState.phase;
    gameState.phase = "paused";
    clearTimers();
    const overlayNode = root.querySelector("#skyLudoOverlay");
    overlayNode?.classList.add("is-visible");
    const card = el("div", "sky-ludo-pause-card");
    card.append(el("h2", "", "Paused"), el("p", "", "Dice, AI decisions, and turn changes are stopped."));
    const actions = el("div", "sky-ludo-actions");
    actions.append(button("Resume", "primary-action", resumeGame), button("Restart Game", "", renderRestartConfirm), button("Rules", "", renderRules), button("Sound Settings", "", renderSoundSettings), button("Save and Exit", "", saveAndExit), button("Return to Arcade", "", renderReturnConfirm));
    card.append(actions);
    overlayNode?.replaceChildren(card);
  }

  function resumeGame() {
    if (!gameState || gameState.phase !== "paused") return;
    gameState.phase = previousPhase || "readyToRoll";
    previousPhase = null;
    const overlayNode = root.querySelector("#skyLudoOverlay");
    overlayNode?.classList.remove("is-visible");
    overlayNode?.replaceChildren();
    updateSidePanel();
    draw();
    scheduleComputerTurn();
  }

  function restartGame() {
    clearTimers();
    startNewGame();
  }

  function renderRestartConfirm() {
    shell("Restart confirmation", "Start the current Sky Ludo setup again?");
    const panel = el("section", "sky-ludo-result-panel");
    panel.append(el("h2", "", "Restart this match?"), el("p", "", "The current saved Sky Ludo match will be replaced."));
    const actions = el("div", "sky-ludo-actions");
    actions.append(button("Restart Game", "primary-action", restartGame), button("Cancel", "", gameState ? returnToGame : renderIntro));
    panel.append(actions);
    root.append(panel);
  }

  function renderReturnConfirm() {
    shell("Return-to-arcade confirmation", "Save this match before leaving?");
    const panel = el("section", "sky-ludo-result-panel");
    panel.append(el("h2", "", "Return to Airplane Arcade?"), el("p", "", gameState && gameState.phase !== "gameOver" ? "Your valid Sky Ludo match will be saved locally." : "Sky Ludo records stay local."));
    const actions = el("div", "sky-ludo-actions");
    actions.append(button("Save and Return", "primary-action", saveAndExit), button("Cancel", "", gameState ? returnToGame : renderIntro));
    panel.append(actions);
    root.append(panel);
  }

  async function saveAndExit() {
    if (gameState && gameState.phase !== "gameOver") await saveCurrentGame();
    destroyGame();
    await onExit?.();
  }

  function renderSoundSettings() {
    shell("Sound settings", "Sky Ludo uses the arcade master sound and volume settings.");
    const panel = el("section", "sky-ludo-menu-panel");
    panel.append(el("h2", "", "Sound Settings"), el("p", "", "Use the main Airplane Arcade Settings tab for master sound, music, effects volume, theme, controls, and Reduce Motion."));
    const actions = el("div", "sky-ludo-actions");
    actions.append(button("Back to Game", "primary-action", gameState ? returnToGame : renderIntro));
    panel.append(actions);
    root.append(panel);
  }

  function renderRules() {
    shell("Rules screen", "How Sky Ludo works.");
    const panel = el("section", "sky-ludo-menu-panel");
    panel.append(el("span", "card-meta", "Rules"), el("h2", "", "Sky Ludo Rules"));
    const list = el("ul", "instructions-list");
    [
      "Roll a 6 to move a token from the airport terminal onto its start square.",
      "A roll of 6 gives another roll after the selected legal move is complete.",
      "Capture on non-safe squares to send an opponent token back to its terminal and earn another roll.",
      "Safe spaces are the starting squares and illuminated star runway stops.",
      "Two same-colour tokens can form a block when Blocks are enabled.",
      "Tokens must use an exact roll to reach the central Sky Home.",
      "Three consecutive sixes cancel the third roll and end the turn when that rule is enabled.",
    ].forEach((line) => list.append(el("li", "", line)));
    const actions = el("div", "sky-ludo-actions");
    actions.append(button(gameState ? "Back to Game" : "Back", "primary-action", gameState ? returnToGame : renderIntro));
    panel.append(list, actions);
    root.append(panel);
  }

  function renderStats() {
    shell("Statistics", "Local Sky Ludo records.");
    const panel = el("section", "sky-ludo-menu-panel");
    panel.append(el("span", "card-meta", "Local statistics"), el("h2", "", "Sky Ludo Statistics"));
    const grid = el("div", "sky-ludo-info-grid");
    [
      ["Games", records?.totalGamesPlayed || 0],
      ["Solo Duel Wins", records?.soloDuelWins || 0],
      ["Solo Classic Wins", records?.soloClassicWins || 0],
      ["Player 1 Wins", records?.player1Wins || 0],
      ["Player 2 Wins", records?.player2Wins || 0],
      ["Dice Rolls", records?.totalDiceRolls || 0],
      ["Sixes", records?.totalSixes || 0],
      ["Captures", records?.totalCaptures || 0],
      ["Tokens Home", records?.totalTokensHome || 0],
      ["Best Streak", records?.bestWinStreak || 0],
      ["Flight Coins", records?.flightCoins || 0],
      ["Saved Game", records?.savedGameState ? "Available" : "None"],
    ].forEach(([title, value]) => grid.append(infoCard(title, String(value))));
    const actions = el("div", "sky-ludo-actions");
    actions.append(button("Play", "primary-action", renderModeSelection), button("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderResults(result) {
    shell(result.winner === "computer" ? "Computer victory" : "Victory", result.summary);
    const panel = el("section", `sky-ludo-result-panel ${result.winner !== "computer" ? "is-win" : ""}`);
    panel.append(el("span", "card-meta", "Result saved"), el("h2", "", `${result.winnerName} Wins`));
    const grid = el("div", "sky-ludo-info-grid");
    [
      ["Mode", MODE_LABELS[result.mode]],
      ["Duration", `${result.duration}s`],
      ["Dice Rolls", result.diceRolls],
      ["Sixes", result.sixes],
      ["Captures", result.captures],
      ["Tokens Home", result.tokensHome],
      ["Blocks", result.blocksCreated],
      ["Flight Coins", `+${result.flightCoins}`],
    ].forEach(([title, value]) => grid.append(infoCard(title, String(value))));
    const ranking = el("ol", "sky-ludo-ranking");
    for (const row of result.rankings || []) ranking.append(el("li", "", `${row.name}: ${row.home}/${gameState?.tokenCount || 4} home`));
    const actions = el("div", "sky-ludo-actions");
    actions.append(button("Play Again", "primary-action", startNewGame), button("Change Mode", "", renderModeSelection), button("Change Difficulty", "", () => renderSetup(setupState.mode)), button("View Statistics", "", renderStats), button("Return to Arcade", "", async () => {
      destroyGame();
      await onExit?.();
    }));
    panel.append(grid, el("h3", "", "Rankings"), ranking, actions);
    root.append(panel);
  }

  function setTimer(fn, delay) {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, delay);
    timers.add(id);
    return id;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimer(resolve, ms));
  }

  function clearTimers() {
    for (const id of timers) window.clearTimeout(id);
    timers.clear();
  }

  function bindEvents() {
    window.addEventListener("keydown", onKeyDown, true);
  }

  function teardownCanvas() {
    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = null;
    if (canvas) canvas.removeEventListener("click", onCanvasClick);
    canvas = null;
    ctx = null;
  }

  function draw() {
    if (!canvas || !ctx || !gameState) return;
    drawSkyLudo(ctx, canvas, gameState, { reduceMotion: currentData.settings.reduceMotion });
  }

  function destroyGame() {
    if (gameState && !["gameOver", "destroyed"].includes(gameState.phase)) {
      saveCurrentGame();
    }
    clearTimers();
    teardownCanvas();
    window.removeEventListener("keydown", onKeyDown, true);
    if (gameState) gameState.phase = "destroyed";
  }

  async function saveResult(result = null) {
    if (!gameState) return;
    const nextResult = result || buildSkyLudoResult(gameState);
    currentData = await recordGameResult(nextResult);
    records = currentData.progress.skyLudoRecords;
    await onResult?.(nextResult);
  }

  function button(label, className, handler) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = className;
    node.textContent = label;
    node.addEventListener("click", () => {
      audio.play("button");
      handler();
    });
    return node;
  }

  return {
    initializeGame,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    destroyGame,
    saveResult,
    createBoard: startNewGame,
    startTurn: scheduleComputerTurn,
    rollDice: rollDiceForTurn,
    calculateValidMoves: () => (gameState ? calculateValidMoves(gameState, currentPlayer(gameState), gameState.dice) : []),
    moveToken: performMove,
    resolveCapture: performMove,
    createBlock: performMove,
    enterHomePath: performMove,
    completeToken: performMove,
    updateComputerAI: scheduleComputerTurn,
    changeTurn: () => gameState && changeTurn(gameState),
    checkWinner: () => gameState?.winnerId || null,
    saveGameState: saveCurrentGame,
    restoreGameState: restoreSavedGame,
  };
}
