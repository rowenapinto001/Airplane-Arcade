import { labelsFor, matchesControl, shouldPreventScroll } from "../../shared/controls.js";
import { getData, recordGameResult, updateData } from "../../shared/storage.js";
import { categoryOptions, selectWord, wordTitle } from "./hangman-words.js";
import {
  DIFFICULTY_RULES,
  VARIATIONS,
  createRoundState,
  processGuess,
  roundSummary,
  rulesFor,
  useHint,
  validateSecretWord,
  visibleWord,
} from "./hangman-rules.js";
import { createLetterKeyboard, updateLetterKeyboard } from "./hangman-keyboard.js";
import { createHangmanRenderer } from "./hangman-renderer.js";
import { createSoloResult, createTwoPlayerResult } from "./hangman-results.js";

const DEFAULT_CONTROLS = {
  hint: ["KeyH"],
  restart: ["KeyR"],
  continue: ["Enter"],
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

function button(label, className, action) {
  const node = document.createElement("button");
  node.type = "button";
  node.textContent = label;
  if (className) node.className = className;
  node.addEventListener("click", action);
  return node;
}

function cleanPlayerName(value, fallback) {
  return String(value || fallback).trim().slice(0, 16) || fallback;
}

export function createSkyHangmanGame(context) {
  const { root, audio, data, options, onExit, onResult } = context;
  const controls = options.controls || DEFAULT_CONTROLS;
  let currentData = clone(data);
  let records = currentData.progress.skyHangmanRecords;
  let canvas = null;
  let renderer = null;
  let resizeObserver = null;
  let raf = 0;
  let resultSaving = false;
  const refs = {};
  let state = initialState();

  function initialState() {
    return {
      screen: "intro",
      phase: "menu",
      mode: options.mode || records?.selectedMode || "solo",
      difficulty: options.difficulty || records?.preferredDifficulty || "normal",
      category: records?.preferredCategory || "Airport",
      variation: records?.preferredVariation || "classic",
      matchLength: "single",
      player1: cleanPlayerName(options.player1, records?.player1Name || "Player 1"),
      player2: cleanPlayerName(options.player2 === "Computer" ? "Player 2" : options.player2, records?.player2Name || "Player 2"),
      round: null,
      challenge: {
        target: 5,
        completed: 0,
        totalScore: 0,
        sharedMistakes: 0,
      },
      twoPlayer: {
        cycleTarget: 1,
        currentCycle: 1,
        guesser: 2,
        setter: 1,
        pendingWord: null,
        pendingHint: "",
        rounds: [],
      },
      animation: {
        takeoff: 0,
      },
      inputLocked: false,
      lastSavedResult: null,
    };
  }

  async function initializeGame() {
    currentData = await getData();
    records = currentData.progress.skyHangmanRecords;
    state = initialState();
    bindEvents();
    await markRecentlyPlayed();
    renderIntro();
  }

  function startGame() {
    if (state.phase === "playing" || state.phase === "result") startAnimation();
  }

  function pauseGame() {
    if (state.phase !== "playing") return;
    state.phase = "paused";
    cancelAnimationFrame(raf);
    showPauseOverlay();
  }

  function resumeGame() {
    if (state.phase !== "paused") return;
    state.phase = "playing";
    removeOverlay();
    startAnimation();
  }

  function restartGame() {
    if (state.screen === "gameplay" || state.screen === "result") {
      showConfirm("Restart Round?", "The current word will restart with a fresh selection.", "Restart", () => {
        if (state.mode === "two") renderSecretEntry();
        else startSoloRound(true);
      });
      return;
    }
    renderIntro();
  }

  function destroyGame() {
    cancelAnimationFrame(raf);
    teardownCanvas();
    clearSecrets();
    window.removeEventListener("keydown", onKeyDown, true);
  }

  async function saveResult() {
    if (state.lastSavedResult) return state.lastSavedResult;
    if (state.round) return saveCurrentRound();
    return null;
  }

  async function markRecentlyPlayed() {
    currentData = await updateData((draft) => {
      draft.progress.recentlyPlayed = "sky-hangman";
      draft.progress.skyHangmanRecords.preferredDifficulty = state.difficulty;
      draft.progress.skyHangmanRecords.preferredCategory = state.category;
      draft.progress.skyHangmanRecords.preferredVariation = state.variation;
      return draft;
    });
    records = currentData.progress.skyHangmanRecords;
    await onResult?.({ gameId: "sky-hangman", summary: "Sky Hangman opened" });
  }

  function shell(title, subtitle = "Friendly offline word guessing") {
    cancelAnimationFrame(raf);
    teardownCanvas();
    if (state.phase !== "result") state.phase = "menu";
    root.className = "arcade-view sky-hangman-game";
    root.replaceChildren();
    const bar = el("section", "game-bar hangman-game-bar");
    const heading = el("div", "game-title");
    heading.append(el("h1", "", "Sky Hangman"), el("p", "", subtitle));
    const actions = el("div", "game-actions");
    actions.append(
      actionButton("Stats", "", renderStats),
      actionButton("Rules", "", renderRules),
      actionButton("Arcade", "", renderReturnConfirm),
    );
    bar.append(heading, quickStats(), actions);
    root.append(bar);
    if (title) {
      const sr = el("span", "hangman-screen-title", title);
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
    const strip = el("div", "score-strip hangman-mini-stats");
    strip.append(
      stat("High", records?.highestScore || 0),
      stat("Streak", records?.currentStreak || 0),
      stat("Solved", records?.totalWordsCompleted || 0),
    );
    return strip;
  }

  function stat(label, value) {
    const node = el("span");
    node.append(el("small", "", label), el("strong", "", String(value)));
    return node;
  }

  function renderIntro() {
    state.screen = "intro";
    state.phase = "menu";
    shell("Game introduction", "Guess letters before airport problems delay the flight.");
    const panel = el("section", "hangman-menu-panel hangman-hero-panel");
    panel.append(
      el("span", "card-meta", "Original offline word game"),
      el("h2", "", "Clear The Word, Clear The Runway"),
      el("p", "", "Guess letters, use hints, avoid repeated misses, and keep the airplane departure friendly. There are no gallows, injuries, or scary drawings here."),
    );
    const grid = el("div", "hangman-info-grid");
    [
      ["Solo or Two Players", "Play local words or pass the laptop for secret-word challenges."],
      ["Friendly Airport Scene", "Wrong guesses add clouds, rain, luggage trouble, warning lights, and delay boards."],
      ["Many Categories", "Animals, Food, Travel, Airport, Nature, Sports, School, Technology, Countries, Space, Weather, and more."],
      ["Offline Stats", "Scores, streaks, category records, hint use, letters guessed, and survival records save locally."],
    ].forEach(([title, copy]) => grid.append(infoCard(title, copy)));
    const actions = el("div", "hangman-menu-actions");
    actions.append(
      actionButton("Play", "primary-action", renderModeSelect),
      actionButton("Category Challenge", "", () => {
        state.variation = "category";
        renderModeSelect();
      }),
      actionButton("Survival Mode", "", () => {
        state.variation = "survival";
        renderModeSelect();
      }),
      actionButton("Stats", "", renderStats),
    );
    panel.append(grid, setupStrip(), actions);
    root.append(panel);
  }

  function infoCard(title, copy) {
    const card = el("article", "hangman-info-card");
    card.append(el("h3", "", title), el("p", "", copy));
    return card;
  }

  function setupStrip() {
    const strip = el("section", "hangman-choice-row");
    strip.append(
      pill("Mode", state.mode === "two" ? "Two Players" : "Solo"),
      pill("Difficulty", DIFFICULTY_RULES[state.difficulty]?.label || "Normal"),
      pill("Category", state.category),
      pill("Variation", VARIATIONS[state.variation]?.label || "Classic"),
    );
    return strip;
  }

  function pill(label, value) {
    const node = el("span", "hangman-pill");
    node.append(el("small", "", label), el("strong", "", String(value)));
    return node;
  }

  function renderRules() {
    state.screen = "rules";
    shell("Rules", "Classic rules with airport-friendly visuals.");
    const panel = el("section", "hangman-menu-panel");
    panel.append(el("span", "card-meta", "Rules"), el("h2", "", "How Sky Hangman Works"));
    const list = el("ol", "hangman-step-list");
    [
      "Guess one letter at a time with the on-screen keyboard or physical keyboard.",
      "Correct letters reveal every matching position in the word.",
      "Incorrect letters add airport problems to the airplane scene.",
      "Use Category, Meaning, or Reveal Letter hints. Reveal Letter never reveals the final hidden letter.",
      "Two Player mode never saves secret words after the match result is recorded.",
    ].forEach((line) => list.append(el("li", "", line)));
    const actions = el("div", "hangman-menu-actions");
    actions.append(actionButton("Back", "primary-action", renderIntro));
    panel.append(list, actions);
    root.append(panel);
  }

  function renderModeSelect() {
    state.screen = "mode";
    shell("Mode selection", "Choose solo words or local secret-word play.");
    const panel = el("section", "hangman-menu-panel");
    panel.append(el("span", "card-meta", "Mode"), el("h2", "", "Who Is Guessing?"));
    const grid = el("div", "hangman-choice-grid");
    [
      ["solo", "Solo", "The extension chooses a local word from the selected category."],
      ["two", "Two Players", "Players enter secret words for each other on the same laptop."],
    ].forEach(([id, title, copy]) => {
      const card = actionButton("", `hangman-choice-card ${state.mode === id ? "is-selected" : ""}`, async () => {
        state.mode = id;
        currentData = await updateData((draft) => {
          draft.progress.skyHangmanRecords.selectedMode = id;
          return draft;
        });
        records = currentData.progress.skyHangmanRecords;
        renderModeSelect();
      });
      card.append(el("strong", "", title), el("span", "", copy));
      grid.append(card);
    });
    const actions = el("div", "hangman-menu-actions");
    actions.append(actionButton("Next", "primary-action", state.mode === "two" ? renderTwoPlayerNames : renderDifficulty), actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderDifficulty() {
    state.screen = "difficulty";
    shell("Difficulty selection", "Choose lives, hints, and scoring pressure.");
    const panel = el("section", "hangman-menu-panel");
    panel.append(el("span", "card-meta", "Difficulty"), el("h2", "", "Flight Risk Level"));
    const grid = el("div", "hangman-choice-grid");
    [
      ["easy", "Easy", "3 to 6 letter common words, 8 mistakes, one free meaning hint."],
      ["normal", "Normal", "5 to 9 letter words, 6 mistakes, hints cost points."],
      ["hard", "Hard", "Longer words, 5 mistakes, Reveal Letter can cost a mistake."],
    ].forEach(([id, title, copy]) => {
      const card = actionButton("", `hangman-choice-card ${state.difficulty === id ? "is-selected" : ""}`, async () => {
        state.difficulty = id;
        currentData = await updateData((draft) => {
          draft.progress.skyHangmanRecords.preferredDifficulty = id;
          return draft;
        });
        records = currentData.progress.skyHangmanRecords;
        renderDifficulty();
      });
      card.append(el("strong", "", title), el("span", "", copy));
      grid.append(card);
    });
    const actions = el("div", "hangman-menu-actions");
    actions.append(actionButton("Next", "primary-action", renderCategory), actionButton("Back", "", renderModeSelect));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderCategory() {
    state.screen = "category";
    shell("Category selection", "Pick a local word group.");
    const panel = el("section", "hangman-menu-panel");
    panel.append(el("span", "card-meta", "Category"), el("h2", "", "Word Category"));
    const grid = el("div", "hangman-category-grid");
    categoryOptions().forEach((category) => {
      const card = actionButton("", `hangman-category-card ${state.category === category.id ? "is-selected" : ""}`, async () => {
        state.category = category.id;
        currentData = await updateData((draft) => {
          draft.progress.skyHangmanRecords.preferredCategory = category.id;
          return draft;
        });
        records = currentData.progress.skyHangmanRecords;
        renderCategory();
      });
      card.append(el("strong", "", category.label), el("span", "", `${category.count} words`));
      grid.append(card);
    });
    const actions = el("div", "hangman-menu-actions");
    actions.append(actionButton("Next", "primary-action", renderVariation), actionButton("Back", "", renderDifficulty));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderVariation() {
    state.screen = "variation";
    shell("Variation selection", "Classic is selected by default.");
    const panel = el("section", "hangman-menu-panel");
    panel.append(el("span", "card-meta", "Variation"), el("h2", "", "Round Type"));
    const grid = el("div", "hangman-choice-grid");
    Object.values(VARIATIONS).forEach((variation) => {
      const card = actionButton("", `hangman-choice-card ${state.variation === variation.id ? "is-selected" : ""}`, async () => {
        state.variation = variation.id;
        currentData = await updateData((draft) => {
          draft.progress.skyHangmanRecords.preferredVariation = variation.id;
          return draft;
        });
        records = currentData.progress.skyHangmanRecords;
        renderVariation();
      });
      card.append(el("strong", "", variation.label), el("span", "", variation.description));
      grid.append(card);
    });
    const actions = el("div", "hangman-menu-actions");
    actions.append(actionButton("Start", "primary-action", () => startSoloRound(true)), actionButton("Back", "", renderCategory));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderTwoPlayerNames() {
    state.screen = "two-names";
    shell("Two Player setup", "Name players and choose match length.");
    const panel = el("section", "hangman-menu-panel");
    panel.append(el("span", "card-meta", "Two Players"), el("h2", "", "Secret Word Challenge"));
    const grid = el("div", "hangman-name-grid");
    grid.append(nameField("Player 1", state.player1, (value) => (state.player1 = cleanPlayerName(value, "Player 1"))));
    grid.append(nameField("Player 2", state.player2, (value) => (state.player2 = cleanPlayerName(value, "Player 2"))));
    const lengths = el("div", "hangman-choice-row");
    [
      ["single", "Single Round", 1],
      ["best3", "Best of Three", 3],
      ["best5", "Best of Five", 5],
    ].forEach(([id, label, cycles]) => {
      const opt = actionButton(label, state.matchLength === id ? "is-selected" : "", () => {
        state.matchLength = id;
        state.twoPlayer.cycleTarget = cycles;
        renderTwoPlayerNames();
      });
      lengths.append(opt);
    });
    const actions = el("div", "hangman-menu-actions");
    actions.append(
      actionButton("Start Match", "primary-action", async () => {
        currentData = await updateData((draft) => {
          draft.progress.skyHangmanRecords.player1Name = state.player1;
          draft.progress.skyHangmanRecords.player2Name = state.player2;
          draft.progress.skyHangmanRecords.selectedMode = "two";
          return draft;
        });
        records = currentData.progress.skyHangmanRecords;
        resetTwoPlayerMatch();
        renderSecretEntry();
      }),
      actionButton("Back", "", renderModeSelect),
    );
    panel.append(grid, el("span", "field-label", "Match Length"), lengths, actions);
    root.append(panel);
  }

  function nameField(label, value, onInput) {
    const field = el("label", "hangman-field");
    field.append(el("span", "field-label", label));
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 16;
    input.value = value;
    input.addEventListener("input", () => onInput(input.value));
    field.append(input);
    return field;
  }

  function resetTwoPlayerMatch() {
    const cycles = state.matchLength === "best5" ? 5 : state.matchLength === "best3" ? 3 : 1;
    state.twoPlayer = {
      cycleTarget: cycles,
      currentCycle: 1,
      guesser: 2,
      setter: 1,
      pendingWord: null,
      pendingHint: "",
      rounds: [],
    };
  }

  function renderSecretEntry() {
    state.screen = "secret";
    state.phase = "menu";
    const setterName = playerName(state.twoPlayer.setter);
    const guesserName = playerName(state.twoPlayer.guesser);
    shell("Secret-word entry", `${setterName} enters a word for ${guesserName}.`);
    const panel = el("section", "hangman-menu-panel");
    panel.append(el("span", "card-meta", `Cycle ${state.twoPlayer.currentCycle}/${state.twoPlayer.cycleTarget}`), el("h2", "", `${setterName}, enter a secret word`));
    const wordField = el("label", "hangman-field");
    wordField.append(el("span", "field-label", "Secret word or phrase"));
    const wordInput = document.createElement("input");
    wordInput.type = "password";
    wordInput.maxLength = 28;
    wordInput.autocomplete = "off";
    wordInput.placeholder = "Letters, spaces, hyphens, apostrophes";
    wordField.append(wordInput);
    const hintField = el("label", "hangman-field");
    hintField.append(el("span", "field-label", "Optional hint"));
    const hintInput = document.createElement("input");
    hintInput.type = "text";
    hintInput.maxLength = 80;
    hintInput.placeholder = "Short clue";
    hintField.append(hintInput);
    const message = el("p", "hangman-warning");
    const actions = el("div", "hangman-menu-actions");
    actions.append(
      actionButton("Continue", "primary-action", () => {
        const validation = validateSecretWord(wordInput.value, hintInput.value);
        if (!validation.ok) {
          message.textContent = validation.message;
          return;
        }
        state.twoPlayer.pendingWord = validation.word;
        state.twoPlayer.pendingHint = validation.hint;
        wordInput.value = "";
        hintInput.value = "";
        renderPassLaptop();
      }),
      actionButton("Cancel Match", "", renderIntro),
    );
    panel.append(wordField, hintField, message, actions);
    root.append(panel);
    wordInput.focus({ preventScroll: true });
  }

  function renderPassLaptop() {
    state.screen = "pass";
    const guesserName = playerName(state.twoPlayer.guesser);
    shell("Pass the laptop", `Pass the laptop to ${guesserName}.`);
    const panel = el("section", "hangman-menu-panel hangman-pass-panel");
    panel.append(el("span", "card-meta", "No peeking"), el("h2", "", `Pass the laptop to ${guesserName}`), el("p", "", "The secret word is hidden. Press Start Guessing when the guesser is ready."));
    const actions = el("div", "hangman-menu-actions");
    actions.append(actionButton("Start Guessing", "primary-action", startTwoPlayerRound), actionButton("Back", "", renderSecretEntry));
    panel.append(actions);
    root.append(panel);
  }

  function startTwoPlayerRound() {
    state.lastSavedResult = null;
    const entry = {
      word: state.twoPlayer.pendingWord,
      category: "Two Player",
      difficulty: state.difficulty,
      hint: state.twoPlayer.pendingHint || "Secret word from the other player.",
      definition: state.twoPlayer.pendingHint || "A custom two-player secret word.",
    };
    state.round = createRoundState(entry, {
      mode: "two",
      difficulty: state.difficulty,
      variation: "classic",
      category: "Two Player",
    });
    state.round.guesser = state.twoPlayer.guesser;
    state.round.setter = state.twoPlayer.setter;
    state.twoPlayer.pendingWord = null;
    state.twoPlayer.pendingHint = "";
    renderGameplay();
  }

  function startSoloRound(resetChallenge = false) {
    state.lastSavedResult = null;
    if (resetChallenge) {
      state.challenge = {
        target: 5,
        completed: 0,
        totalScore: 0,
        sharedMistakes: 0,
      };
    }
    const variation = state.variation || "classic";
    const entry = selectWord({
      category: state.category,
      difficulty: state.difficulty,
      variation,
      recentWords: records?.recentWords || [],
    });
    state.round = createRoundState(entry, {
      mode: "solo",
      difficulty: state.difficulty,
      variation,
      category: variation === "phrase" ? "Phrase Mode" : state.category,
    });
    if (variation === "survival" && state.challenge.sharedMistakes > 0) {
      state.round.mistakes = state.challenge.sharedMistakes;
    }
    renderGameplay();
  }

  function renderGameplay() {
    state.screen = "gameplay";
    state.phase = "playing";
    state.inputLocked = false;
    state.animation.takeoff = 0;
    root.className = "arcade-view sky-hangman-game is-playing";
    root.replaceChildren();

    const bar = el("section", "game-bar hangman-game-bar");
    const title = el("div", "game-title");
    title.append(el("h1", "", "Sky Hangman"), el("p", "", state.mode === "two" ? `${playerName(state.round.guesser)} is guessing` : `${VARIATIONS[state.variation]?.label || "Classic"} - ${state.difficulty}`));
    refs.hud = el("div", "score-strip hangman-live-stats");
    const actions = el("div", "game-actions");
    actions.append(
      actionButton("Pause", "primary-action", pauseGame),
      actionButton("Restart", "", restartGame),
      actionButton("Arcade", "", renderReturnConfirm),
    );
    bar.append(title, refs.hud, actions);

    const shellNode = el("section", "hangman-play-shell");
    const scene = el("section", "hangman-scene-card");
    canvas = document.createElement("canvas");
    canvas.className = "hangman-canvas";
    canvas.setAttribute("aria-label", "Friendly airport progress scene for Sky Hangman.");
    scene.append(canvas);
    const wordPanel = el("section", "hangman-word-panel");
    refs.categoryBadge = el("span", "hangman-category-badge");
    refs.word = el("div", "hangman-word-display");
    refs.hint = el("p", "hangman-hint");
    refs.status = el("p", "hangman-status");
    refs.status.setAttribute("aria-live", "polite");
    wordPanel.append(refs.categoryBadge, refs.word, refs.hint, refs.status);
    scene.append(wordPanel);

    const side = el("aside", "hangman-side");
    refs.letters = el("section", "hangman-side-card");
    refs.hints = el("section", "hangman-side-card");
    refs.hints.append(el("h2", "", "Hints"));
    const categoryHint = actionButton("Category Hint", "", () => handleHint("category"));
    const meaningHint = actionButton("Meaning Hint", "", () => handleHint("meaning"));
    const revealHint = actionButton("Reveal Letter", "", () => handleHint("reveal"));
    refs.hints.append(categoryHint, meaningHint, revealHint, el("p", "hangman-small-note", `Press ${labelsFor(controls.hint)} for a meaning hint.`));
    refs.roundInfo = el("section", "hangman-side-card");
    side.append(refs.letters, refs.hints, refs.roundInfo);

    refs.keyboardWrap = el("section", "hangman-keyboard-card");
    refs.keyboard = createLetterKeyboard({
      guessed: state.round.guessed,
      correct: [...state.round.correctLetters, ...state.round.revealedLetters],
      incorrect: state.round.incorrectLetters,
      onGuess: guessLetter,
    });
    refs.keyboardWrap.append(refs.keyboard);
    shellNode.append(scene, side, refs.keyboardWrap);
    root.append(bar, shellNode);

    renderer = createHangmanRenderer(canvas);
    resizeObserver = new ResizeObserver(() => {
      renderer.resize();
      renderer.draw(state.round, state.animation);
    });
    resizeObserver.observe(scene);
    renderer.resize();
    updateGameplay();
    startAnimation();
  }

  function updateGameplay() {
    if (!state.round) return;
    refs.hud?.replaceChildren(
      stat("Mistakes", `${state.round.mistakes}/${state.round.maxMistakes}`),
      stat("Score", state.round.score || 0),
      stat("Lives", Math.max(0, state.round.maxMistakes - state.round.mistakes)),
      stat("Streak", records?.currentStreak || 0),
    );
    const categoryText = state.difficulty === "hard" && !state.round.hints.category ? "Category hidden" : state.round.entry.category;
    refs.categoryBadge.textContent = `${categoryText} | ${DIFFICULTY_RULES[state.difficulty]?.label || "Normal"}`;
    refs.word.replaceChildren(...visibleWord(state.round).map((char) => {
      const span = el("span", char === "_" ? "is-hidden" : "is-revealed", char);
      if (char === " ") span.className = "is-space";
      return span;
    }));
    refs.hint.textContent = state.round.hints.meaning ? state.round.entry.hint : state.round.hints.category ? `Category: ${state.round.entry.category}` : "Use a hint if the runway feels tricky.";
    refs.status.textContent = state.round.status;
    refs.letters.replaceChildren(el("h2", "", "Letters"));
    refs.letters.append(letterGroup("Correct", [...state.round.correctLetters, ...state.round.revealedLetters]), letterGroup("Incorrect", state.round.incorrectLetters));
    refs.roundInfo.replaceChildren(el("h2", "", "Round"));
    const summary = roundSummary(state.round);
    refs.roundInfo.append(
      el("p", "", state.mode === "two" ? `${playerName(state.round.guesser)} guessing a word from ${playerName(state.round.setter)}.` : `${VARIATIONS[state.variation]?.label || "Classic"} in ${state.category}.`),
      el("p", "", `${summary.hintsUsed} hint${summary.hintsUsed === 1 ? "" : "s"} used. ${summary.remainingLives} lives left.`),
    );
    updateLetterKeyboard(refs.keyboard, state.round, state.inputLocked);
    renderer?.draw(state.round, state.animation);
  }

  function letterGroup(title, letters) {
    const wrap = el("div", "hangman-letter-group");
    wrap.append(el("strong", "", title));
    wrap.append(el("span", "", letters.length ? letters.join(" ") : "None yet"));
    return wrap;
  }

  function guessLetter(letter) {
    if (state.phase !== "playing" || state.inputLocked || !state.round || state.round.finished) return;
    const result = processGuess(state.round, letter);
    if (result.type === "correct") audio?.play("hangmanCorrect");
    if (result.type === "incorrect") audio?.play("hangmanWrong");
    if (result.type === "duplicate") audio?.play("hangmanDuplicate");
    if (state.round.finished) {
      state.inputLocked = true;
      state.phase = "result";
      state.round.score = state.round.won ? state.round.score + scoreStreakBonus() : 0;
      audio?.play(state.round.won ? "hangmanWin" : "hangmanLose");
      window.setTimeout(() => completeRound(), 700);
    }
    updateGameplay();
  }

  function scoreStreakBonus() {
    if (!state.round?.won) return 0;
    return Math.min(200, (records?.currentStreak || 0) * 20);
  }

  function handleHint(type) {
    if (!state.round || state.phase !== "playing") return;
    const result = useHint(state.round, type);
    audio?.play(result.ok ? "hangmanHint" : "hangmanDuplicate");
    if (state.round.finished) {
      state.inputLocked = true;
      state.phase = "result";
      audio?.play(state.round.won ? "hangmanWin" : "hangmanLose");
      window.setTimeout(() => completeRound(), 700);
    }
    updateGameplay();
  }

  async function completeRound() {
    state.inputLocked = true;
    state.phase = "result";
    if (state.mode === "two") {
      state.twoPlayer.rounds.push(state.round);
      renderTwoPlayerRoundResult();
      return;
    }
    if (state.variation === "survival") {
      if (state.round.won) {
        state.challenge.completed += 1;
        state.challenge.totalScore += state.round.score;
        state.challenge.sharedMistakes = state.round.mistakes;
      }
    }
    if (state.variation === "category" && state.round.won) {
      state.challenge.completed += 1;
      state.challenge.totalScore += state.round.score;
    }
    await saveCurrentRound();
    renderSoloResult();
  }

  async function saveCurrentRound() {
    if (!state.round || resultSaving) return null;
    resultSaving = true;
    const result = createSoloResult(state.round, {
      streak: state.round.won ? (records?.currentStreak || 0) + 1 : 0,
      survivalCompleted: state.variation === "survival" ? state.challenge.completed : 0,
      categoryChallengeScore: state.variation === "category" ? state.challenge.totalScore : 0,
    });
    currentData = await recordGameResult(result);
    records = currentData.progress.skyHangmanRecords;
    state.lastSavedResult = result;
    resultSaving = false;
    await onResult?.(result);
    return result;
  }

  function renderSoloResult() {
    state.screen = state.round.won ? "solo-victory" : "solo-failure";
    state.phase = "result";
    const won = state.round.won;
    shell(won ? "Solo victory" : "Solo failure", won ? "Word Cleared!" : "Flight Delayed");
    const panel = el("section", `hangman-result-panel ${won ? "is-win" : ""}`);
    const summary = roundSummary(state.round);
    panel.append(
      el("span", "card-meta", won ? "Word Cleared!" : "Flight Delayed"),
      el("h2", "", won ? "Word Cleared!" : "Flight Delayed - Word Not Found"),
      el("p", "", `Correct word: ${wordTitle(summary.word)}`),
    );
    const grid = el("div", "hangman-info-grid");
    [
      ["Meaning", state.round.entry.definition || state.round.entry.hint],
      ["Difficulty", DIFFICULTY_RULES[state.difficulty]?.label || "Normal"],
      ["Incorrect", summary.incorrectLetters.join(" ") || "None"],
      ["Hints Used", summary.hintsUsed],
      ["Lives Left", summary.remainingLives],
      ["Score", summary.score],
      ["Current Streak", records?.currentStreak || 0],
    ].forEach(([title, value]) => grid.append(infoCard(title, String(value))));
    const actions = el("div", "hangman-menu-actions");
    const continueChallenge = state.variation === "category" && won && state.challenge.completed < state.challenge.target;
    const continueSurvival = state.variation === "survival" && won;
    actions.append(
      continueChallenge || continueSurvival
        ? actionButton("Next Word", "primary-action", () => startSoloRound(false))
        : actionButton("New Word", "primary-action", () => startSoloRound(true)),
      actionButton("Play Again", "", () => startSoloRound(true)),
      actionButton("Setup", "", renderModeSelect),
      actionButton("Return to Arcade", "", renderReturnConfirm),
    );
    if (state.variation === "category") {
      panel.append(el("p", "hangman-challenge-note", `Category Challenge: ${state.challenge.completed}/${state.challenge.target} words, ${state.challenge.totalScore} total points.`));
    }
    if (state.variation === "survival") {
      panel.append(el("p", "hangman-challenge-note", `Survival record attempt: ${state.challenge.completed} completed words with ${state.round.mistakes}/${state.round.maxMistakes} shared mistakes.`));
    }
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderTwoPlayerRoundResult() {
    state.screen = "two-round-result";
    const round = state.round;
    const won = round.won;
    shell("Two Player round result", `${playerName(round.guesser)} ${won ? "cleared the word" : "was delayed"}.`);
    const panel = el("section", `hangman-result-panel ${won ? "is-win" : ""}`);
    panel.append(
      el("span", "card-meta", "Round Result"),
      el("h2", "", won ? "Word Cleared!" : "Flight Delayed"),
      el("p", "", `${playerName(round.guesser)} guessed: ${wordTitle(round.entry.word)}`),
    );
    const grid = el("div", "hangman-info-grid");
    [
      ["Guesser", playerName(round.guesser)],
      ["Setter", playerName(round.setter)],
      ["Incorrect Guesses", round.incorrectLetters.join(" ") || "None"],
      ["Remaining Lives", Math.max(0, round.maxMistakes - round.mistakes)],
      ["Score", round.score],
    ].forEach(([title, value]) => grid.append(infoCard(title, String(value))));
    const actions = el("div", "hangman-menu-actions");
    const next = nextTwoPlayerStep();
    actions.append(actionButton(next.done ? "Final Result" : "Next Secret Word", "primary-action", next.done ? finishTwoPlayerMatch : renderSecretEntry));
    panel.append(grid, actions);
    root.append(panel);
  }

  function nextTwoPlayerStep() {
    if (state.twoPlayer.guesser === 2) {
      state.twoPlayer.guesser = 1;
      state.twoPlayer.setter = 2;
      return { done: false };
    }
    if (state.twoPlayer.currentCycle >= state.twoPlayer.cycleTarget) return { done: true };
    state.twoPlayer.currentCycle += 1;
    state.twoPlayer.guesser = 2;
    state.twoPlayer.setter = 1;
    return { done: false };
  }

  async function finishTwoPlayerMatch() {
    state.screen = "two-final-result";
    state.phase = "result";
    const result = createTwoPlayerResult(
      { ...state.twoPlayer, difficulty: state.difficulty, matchLength: state.matchLength },
      { player1: state.player1, player2: state.player2 },
    );
    currentData = await recordGameResult(result);
    records = currentData.progress.skyHangmanRecords;
    state.lastSavedResult = result;
    await onResult?.(result);
    clearSecrets();
    shell("Two Player final result", result.summary);
    const panel = el("section", "hangman-result-panel is-win");
    panel.append(el("span", "card-meta", "Match Complete"), el("h2", "", result.winner === "draw" ? "Both Players Win!" : result.summary));
    const grid = el("div", "hangman-info-grid");
    [
      [state.player1, `${result.player1Solved} solved, ${result.player1Mistakes} mistakes, ${result.player1RemainingLives} lives left`],
      [state.player2, `${result.player2Solved} solved, ${result.player2Mistakes} mistakes, ${result.player2RemainingLives} lives left`],
      ["Winner", result.winner === "draw" ? "Both Players Win!" : result.winner === "player1" ? state.player1 : state.player2],
      ["Scores", `${result.player1Score} - ${result.player2Score}`],
    ].forEach(([title, value]) => grid.append(infoCard(title, String(value))));
    const actions = el("div", "hangman-menu-actions");
    actions.append(actionButton("Play Again", "primary-action", renderTwoPlayerNames), actionButton("Return to Arcade", "", renderReturnConfirm));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderStats() {
    state.screen = "stats";
    shell("Statistics", "Local Sky Hangman records.");
    const panel = el("section", "hangman-menu-panel");
    panel.append(el("span", "card-meta", "Local Stats"), el("h2", "", "Sky Hangman Statistics"));
    const incorrect = Object.entries(records?.incorrectLetters || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const grid = el("div", "hangman-info-grid");
    [
      ["Rounds Played", records?.totalRounds || 0],
      ["Words Completed", records?.totalWordsCompleted || 0],
      ["Words Missed", records?.totalWordsMissed || 0],
      ["Highest Score", records?.highestScore || 0],
      ["Longest Streak", records?.longestStreak || 0],
      ["Current Streak", records?.currentStreak || 0],
      ["Best Category", records?.bestCategory || "None yet"],
      ["Hints Used", records?.hintsUsed || 0],
      ["Survival Record", records?.survivalRecord || 0],
      ["Common Misses", incorrect.length ? incorrect.map(([letter, count]) => `${letter}:${count}`).join(" ") : "None yet"],
    ].forEach(([title, value]) => grid.append(infoCard(title, String(value))));
    const actions = el("div", "hangman-menu-actions");
    actions.append(actionButton("Play", "primary-action", renderModeSelect), actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function showPauseOverlay() {
    showOverlay("Paused", "Keyboard input is paused and the airplane scene is frozen.", [
      ["Resume", "primary-action", resumeGame],
      ["Restart", "", restartGame],
      ["Return to Arcade", "", renderReturnConfirm],
    ]);
  }

  function renderReturnConfirm() {
    showConfirm("Return to Arcade?", "The current Sky Hangman round will stop. Valid saved statistics remain local.", "Return", async () => {
      destroyGame();
      await onExit?.();
    });
  }

  function showConfirm(title, copy, confirmLabel, onConfirm) {
    showOverlay(title, copy, [
      [confirmLabel, "primary-action", onConfirm],
      ["Cancel", "", () => {
        removeOverlay();
        if (state.phase === "paused") showPauseOverlay();
      }],
    ]);
  }

  function showOverlay(title, copy, actions) {
    removeOverlay();
    const overlay = el("div", "game-overlay is-visible hangman-overlay");
    const card = el("section", "hangman-overlay-card");
    card.append(el("h2", "", title), el("p", "", copy));
    const row = el("div", "hangman-menu-actions");
    actions.forEach(([label, className, action]) => row.append(actionButton(label, className, () => {
      removeOverlay();
      action();
    })));
    card.append(row);
    overlay.append(card);
    root.append(overlay);
  }

  function removeOverlay() {
    root.querySelector(".game-overlay")?.remove();
  }

  function playerName(number) {
    return number === 1 ? state.player1 : state.player2;
  }

  function bindEvents() {
    window.removeEventListener("keydown", onKeyDown, true);
    window.addEventListener("keydown", onKeyDown, true);
  }

  function onKeyDown(event) {
    if (state.phase === "playing") {
      if (/^[A-Z]$/.test(event.key.toUpperCase()) || shouldPreventScroll(event, controls)) event.preventDefault();
      if (event.repeat) return;
      const key = event.key.toUpperCase();
      if (/^[A-Z]$/.test(key) && !matchesControl(event, controls.hint) && !matchesControl(event, controls.restart)) {
        guessLetter(key);
        return;
      }
      if (matchesControl(event, controls.hint)) handleHint("meaning");
      if (matchesControl(event, controls.pause)) pauseGame();
      if (matchesControl(event, controls.restart)) restartGame();
      return;
    }
    if (state.phase === "paused" && matchesControl(event, controls.pause)) resumeGame();
    if (state.phase === "result" && matchesControl(event, controls.continue)) {
      if (state.mode === "two") {
        const finalButton = [...root.querySelectorAll("button")].find((node) => node.textContent.includes("Next") || node.textContent.includes("Final"));
        finalButton?.click();
      } else {
        const next = [...root.querySelectorAll("button")].find((node) => node.textContent === "New Word" || node.textContent === "Next Word");
        next?.click();
      }
    }
  }

  function startAnimation() {
    cancelAnimationFrame(raf);
    const tick = () => {
      if (!state.round || (state.phase !== "playing" && state.phase !== "result")) return;
      if (state.round.finished && state.round.won) state.animation.takeoff = Math.min(1, state.animation.takeoff + 0.018);
      renderer?.draw(state.round, state.animation);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function teardownCanvas() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    canvas = null;
    renderer = null;
  }

  function clearSecrets() {
    state.twoPlayer.pendingWord = null;
    state.twoPlayer.pendingHint = "";
    if (state.twoPlayer.rounds?.length) {
      state.twoPlayer.rounds = state.twoPlayer.rounds.map((round) => ({
        ...round,
        entry: { ...round.entry, word: "", hint: "", definition: "" },
      }));
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
    selectWord,
    createWordDisplay: () => (state.round ? visibleWord(state.round) : []),
    processGuess: guessLetter,
    revealLetter: () => handleHint("reveal"),
    applyIncorrectGuess: (letter) => guessLetter(letter),
    useHint: handleHint,
    checkWin: () => Boolean(state.round?.won),
    checkFailure: () => Boolean(state.round?.finished && !state.round?.won),
    completeRound,
    startTwoPlayerRound,
    validateSecretWord,
  };
}
