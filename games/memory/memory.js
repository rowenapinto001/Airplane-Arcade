import { matchesControl, shouldPreventScroll } from "../../shared/controls.js";
import { formatDuration } from "../../shared/navigation.js";
import { recordGameResult } from "../../shared/storage.js";

const MEMORY_DIFFICULTY = {
  easy: {
    cols: 4,
    rows: 3,
    mismatchDelay: 1150,
    starTimePerPair: 9,
    starMoveBonus: 4,
    starMistakeLimit: 4,
  },
  normal: {
    cols: 4,
    rows: 4,
    mismatchDelay: 850,
    starTimePerPair: 7,
    starMoveBonus: 2,
    starMistakeLimit: 3,
  },
  hard: {
    cols: 6,
    rows: 4,
    mismatchDelay: 620,
    starTimePerPair: 5,
    starMoveBonus: 1,
    starMistakeLimit: 3,
  },
};

const SYMBOLS = [
  "SUN",
  "MOON",
  "STAR",
  "BOT",
  "SHIP",
  "ORB",
  "GEM",
  "BOLT",
  "FLAG",
  "CROWN",
  "CUP",
  "KEY",
];

const SYMBOL_LABELS = {
  SUN: "Sun",
  MOON: "Moon",
  STAR: "Star",
  BOT: "Bot",
  SHIP: "Ship",
  ORB: "Orb",
  GEM: "Gem",
  BOLT: "Bolt",
  FLAG: "Flag",
  CROWN: "Crown",
  CUP: "Cup",
  KEY: "Key",
};

const SYMBOL_ICONS = {
  SUN: `
    <g fill="none" stroke="#ffb423" stroke-width="7" stroke-linecap="round">
      <path d="M50 8v14M50 78v14M8 50h14M78 50h14M20 20l10 10M70 70l10 10M80 20 70 30M30 70 20 80"/>
    </g>
    <circle cx="50" cy="50" r="20" fill="#ffd35a" stroke="#ff8a3d" stroke-width="5"/>
  `,
  MOON: `
    <path d="M64 16a36 36 0 1 0 18 62A31 31 0 1 1 64 16z" fill="#ffe98a" stroke="#f4aa2a" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="38" cy="56" r="3" fill="#f4aa2a"/>
    <circle cx="52" cy="34" r="4" fill="#f4aa2a"/>
  `,
  STAR: `
    <path d="m50 10 11 26 28 3-21 18 6 28-24-15-24 15 6-28-21-18 28-3z" fill="#ffd35a" stroke="#ff8a3d" stroke-width="5" stroke-linejoin="round"/>
  `,
  BOT: `
    <rect x="22" y="28" width="56" height="44" rx="12" fill="#46c7d9" stroke="#132035" stroke-width="5"/>
    <path d="M50 28V16" stroke="#132035" stroke-width="5" stroke-linecap="round"/>
    <circle cx="50" cy="13" r="6" fill="#ff8a3d"/>
    <circle cx="39" cy="50" r="5" fill="#132035"/>
    <circle cx="61" cy="50" r="5" fill="#132035"/>
    <path d="M38 63h24" stroke="#132035" stroke-width="5" stroke-linecap="round"/>
    <rect x="14" y="43" width="10" height="16" rx="5" fill="#7f59e8"/>
    <rect x="76" y="43" width="10" height="16" rx="5" fill="#7f59e8"/>
  `,
  SHIP: `
    <path d="M18 60 82 28 68 58 86 72 56 70 34 84 38 66z" fill="#fffdf8" stroke="#132035" stroke-width="5" stroke-linejoin="round"/>
    <path d="m38 66 30-8-16 20z" fill="#46c7d9"/>
    <path d="M42 52 28 28l34 26z" fill="#ef5b63"/>
    <circle cx="62" cy="54" r="7" fill="#46c7d9"/>
  `,
  ORB: `
    <circle cx="50" cy="50" r="32" fill="#fffdf8" stroke="#7f59e8" stroke-width="7"/>
    <circle cx="50" cy="50" r="15" fill="#46c7d9"/>
    <path d="M21 50c18-13 40-13 58 0M50 21c13 18 13 40 0 58" fill="none" stroke="#132035" stroke-width="4" opacity=".35"/>
  `,
  GEM: `
    <path d="M24 30h52l14 22-40 38-40-38z" fill="#46c7d9" stroke="#132035" stroke-width="5" stroke-linejoin="round"/>
    <path d="M24 30 50 90 76 30M10 52h80M38 30 30 52M62 30l8 22" fill="none" stroke="#fffdf8" stroke-width="4" stroke-linejoin="round" opacity=".82"/>
  `,
  BOLT: `
    <path d="M58 8 24 54h24L40 92l38-52H54z" fill="#ffd35a" stroke="#132035" stroke-width="5" stroke-linejoin="round"/>
  `,
  FLAG: `
    <path d="M26 18v68" stroke="#132035" stroke-width="6" stroke-linecap="round"/>
    <path d="M30 20h46l-8 18 8 18H30z" fill="#ef5b63" stroke="#132035" stroke-width="5" stroke-linejoin="round"/>
    <path d="M30 38h38" stroke="#fffdf8" stroke-width="5" stroke-linecap="round"/>
  `,
  CROWN: `
    <path d="M18 72h64l-6-42-17 20-9-30-9 30-17-20z" fill="#ffd35a" stroke="#132035" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="24" cy="30" r="5" fill="#ef5b63"/>
    <circle cx="50" cy="20" r="5" fill="#46c7d9"/>
    <circle cx="76" cy="30" r="5" fill="#7f59e8"/>
  `,
  CUP: `
    <path d="M32 24h36v26c0 16-9 28-18 28S32 66 32 50z" fill="#ffb423" stroke="#132035" stroke-width="5" stroke-linejoin="round"/>
    <path d="M32 34H18c0 18 10 24 18 24M68 34h14c0 18-10 24-18 24M50 78v10M34 90h32" fill="none" stroke="#132035" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  `,
  KEY: `
    <circle cx="34" cy="42" r="17" fill="#fffdf8" stroke="#132035" stroke-width="5"/>
    <circle cx="34" cy="42" r="6" fill="#46c7d9"/>
    <path d="M50 42h34M70 42v14M82 42v10" stroke="#132035" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  `,
};

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createMemoryGame(context) {
  const { root, audio, options, onExit, onSetup, onResult } = context;
  const controls = options.controls;
  let state;
  let timer = null;
  let mismatchTimer = null;
  let resultSaved = false;

  function initialState() {
    const config = MEMORY_DIFFICULTY[options.difficulty] || MEMORY_DIFFICULTY.normal;
    const size = { cols: config.cols, rows: config.rows };
    const pairCount = (size.cols * size.rows) / 2;
    const cards = shuffle(SYMBOLS.slice(0, pairCount).flatMap((symbol) => [symbol, symbol])).map(
      (symbol, index) => ({
        id: index,
        symbol,
        open: false,
        matched: false,
      }),
    );

    return {
      size,
      config,
      cards,
      selected: [],
      locked: false,
      paused: false,
      over: false,
      elapsed: 0,
      moves: 0,
      mistakes: 0,
      matchedPairs: 0,
      currentPlayer: 1,
      scores: { 1: 0, 2: 0 },
      focusIndex: 0,
      history: [],
      lastTick: performance.now(),
    };
  }

  function initializeGame() {
    state = initialState();
    render();
    bindEvents();
  }

  function startGame() {
    clearInterval(timer);
    state.lastTick = performance.now();
    timer = setInterval(tick, 250);
  }

  function tick() {
    const now = performance.now();
    if (!state.paused && !state.over) {
      state.elapsed += (now - state.lastTick) / 1000;
      updateHud();
    }
    state.lastTick = now;
  }

  function render() {
    root.className = "arcade-view memory-game";
    root.innerHTML = "";

    const bar = document.createElement("section");
    bar.className = "game-bar";
    bar.innerHTML = `
      <div class="game-title">
        <h1>Memory Match</h1>
        <p>${options.mode === "solo" ? "Solo board" : "Two-player turns"} - ${options.difficulty}</p>
      </div>
    `;
    const scoreStrip = document.createElement("div");
    scoreStrip.className = "score-strip";
    scoreStrip.id = "memoryHud";
    const actions = document.createElement("div");
    actions.className = "game-actions";
    actions.append(
      actionButton("Pause", "primary-action", pauseGame),
      actionButton("Restart", "", restartGame),
      actionButton("Library", "", () => {
        destroyGame();
        onExit();
      }),
    );
    bar.append(scoreStrip, actions);

    const shell = document.createElement("section");
    shell.className = "memory-shell";
    const playfield = document.createElement("div");
    playfield.className = "memory-playfield";
    playfield.innerHTML = `<div class="memory-toast" id="memoryToast" aria-live="polite"></div>`;
    const board = document.createElement("div");
    board.className = "memory-board";
    board.id = "memoryBoard";
    board.dataset.cols = String(state.size.cols);
    playfield.append(board, overlay("memoryOverlay"));

    const side = document.createElement("aside");
    side.className = "memory-side";
    side.append(
      sideTitle("Round"),
      textLine(`Find every pair on a ${state.size.cols} x ${state.size.rows} ${options.difficulty} board.`),
      textLine("Easy gives fewer cards and longer previews. Hard gives more cards and shorter previews."),
      sideTitle("History"),
      historyList(),
      actionButton("Back to setup", "", () => {
        destroyGame();
        onSetup();
      }),
    );

    shell.append(playfield, side);
    root.append(bar, shell);
    renderBoard();
    updateHud();
    announceTurn();
  }

  function bindEvents() {
    window.addEventListener("keydown", handleKeydown);
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

  function sideTitle(text) {
    const heading = document.createElement("h2");
    heading.textContent = text;
    return heading;
  }

  function textLine(text) {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    return paragraph;
  }

  function historyList() {
    const list = document.createElement("ul");
    list.className = "history-list";
    list.id = "memoryHistory";
    return list;
  }

  function overlay(id) {
    const overlayNode = document.createElement("div");
    overlayNode.className = "game-overlay";
    overlayNode.id = id;
    return overlayNode;
  }

  function renderBoard() {
    const board = root.querySelector("#memoryBoard");
    if (!board) return;
    board.replaceChildren();

    for (const card of state.cards) {
      const cardButton = document.createElement("button");
      cardButton.type = "button";
      cardButton.className = "memory-card";
      if (card.open) cardButton.classList.add("is-open");
      if (card.matched) cardButton.classList.add("is-matched");
      if (card.id === state.focusIndex) cardButton.classList.add("is-focus");
      cardButton.setAttribute(
        "aria-label",
        card.open || card.matched ? SYMBOL_LABELS[card.symbol] || card.symbol : "Hidden card",
      );
      if (card.open || card.matched) {
        cardButton.append(createSymbolIcon(card.symbol));
      } else {
        cardButton.append(createHiddenMark());
      }
      cardButton.disabled = state.locked || state.paused || state.over || card.matched;
      cardButton.dataset.index = String(card.id);
      cardButton.tabIndex = card.id === state.focusIndex ? 0 : -1;
      cardButton.addEventListener("click", () => selectCard(card.id));
      board.append(cardButton);
    }
  }

  function createHiddenMark() {
    const mark = document.createElement("span");
    mark.className = "memory-hidden-mark";
    mark.textContent = "?";
    return mark;
  }

  function createSymbolIcon(symbol) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "memory-symbol");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = SYMBOL_ICONS[symbol] || SYMBOL_ICONS.ORB;
    return svg;
  }

  function updateHud() {
    const hud = root.querySelector("#memoryHud");
    if (!hud) return;
    const remaining = state.cards.length / 2 - state.matchedPairs;
    hud.replaceChildren(
      pill("Time", formatDuration(state.elapsed)),
      pill("Moves", String(state.moves)),
      pill("Pairs", String(remaining)),
      options.mode === "two"
        ? pill(`${options.player1}`, String(state.scores[1]))
        : pill("Mistakes", String(state.mistakes)),
      options.mode === "two" ? pill(`${options.player2}`, String(state.scores[2])) : pill("Stars", String(calculateStars())),
    );
  }

  function pill(label, value) {
    const element = document.createElement("div");
    element.className = "score-pill";
    element.textContent = `${label}: ${value}`;
    return element;
  }

  function updateHistory() {
    const list = root.querySelector("#memoryHistory");
    if (!list) return;
    list.replaceChildren();
    if (!state.history.length) {
      const item = document.createElement("li");
      item.textContent = "No flips yet.";
      list.append(item);
      return;
    }
    for (const entry of state.history.slice(0, 8)) {
      const item = document.createElement("li");
      item.textContent = entry;
      list.append(item);
    }
  }

  function selectCard(index) {
    if (state.locked || state.paused || state.over) return;
    const card = state.cards[index];
    if (!card || card.open || card.matched || state.selected.length >= 2) return;

    card.open = true;
    state.selected.push(card);
    state.focusIndex = index;
    audio.play("flip");
    renderBoard();

    if (state.selected.length === 2) {
      state.moves += 1;
      resolvePair();
    }
    updateHud();
  }

  function resolvePair() {
    const [first, second] = state.selected;
    if (first.symbol === second.symbol) {
      first.matched = true;
      second.matched = true;
      state.selected = [];
      state.matchedPairs += 1;
      if (options.mode === "two") state.scores[state.currentPlayer] += 1;
      state.history.unshift(`${currentName()} matched ${first.symbol}.`);
      audio.play("correct");
      updateHistory();
      if (state.matchedPairs === state.cards.length / 2) finishGame();
      return;
    }

    state.locked = true;
    state.mistakes += 1;
    state.history.unshift(`${currentName()} missed ${first.symbol} / ${second.symbol}.`);
    audio.play("incorrect");
    updateHistory();

    mismatchTimer = setTimeout(() => {
      first.open = false;
      second.open = false;
      state.selected = [];
      state.locked = false;
      if (options.mode === "two") {
        state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
        announceTurn();
      }
      renderBoard();
      updateHud();
    }, state.config.mismatchDelay);
  }

  function currentName() {
    return state.currentPlayer === 1 ? options.player1 : options.player2;
  }

  function announceTurn() {
    const toast = root.querySelector("#memoryToast");
    if (!toast) return;
    toast.textContent =
      options.mode === "two" ? `${currentName()}'s turn` : "Find every pair as quickly as you can";
    toast.classList.remove("is-changing");
    requestAnimationFrame(() => toast.classList.add("is-changing"));
  }

  function handleKeydown(event) {
    if (shouldPreventScroll(event, controls)) event.preventDefault();
    if (matchesControl(event, controls.pause)) {
      event.preventDefault();
      state.paused ? resumeGame() : pauseGame();
      return;
    }
    if (state.paused || state.over) return;

    const cols = state.size.cols;
    let next = state.focusIndex;
    if (matchesControl(event, controls.left)) next -= 1;
    if (matchesControl(event, controls.right)) next += 1;
    if (matchesControl(event, controls.up)) next -= cols;
    if (matchesControl(event, controls.down)) next += cols;
    next = Math.max(0, Math.min(state.cards.length - 1, next));
    if (next !== state.focusIndex) {
      state.focusIndex = next;
      renderBoard();
      focusCurrent();
    }
    if (matchesControl(event, controls.select)) {
      event.preventDefault();
      selectCard(state.focusIndex);
    }
  }

  function focusCurrent() {
    root.querySelector(`.memory-card[data-index="${state.focusIndex}"]`)?.focus();
  }

  function calculateStars() {
    const pairs = state.cards.length / 2;
    const moveScore = state.moves <= pairs + state.config.starMoveBonus ? 1 : 0;
    const mistakeScore = state.mistakes <= Math.max(2, state.config.starMistakeLimit) ? 1 : 0;
    const timeScore = state.elapsed <= pairs * state.config.starTimePerPair ? 1 : 0;
    return Math.max(1, moveScore + mistakeScore + timeScore);
  }

  async function finishGame() {
    state.over = true;
    clearInterval(timer);
    let winner = "solo";
    let title = "Board cleared";
    if (options.mode === "two") {
      if (state.scores[1] > state.scores[2]) {
        winner = "player1";
        title = `${options.player1} wins`;
      } else if (state.scores[2] > state.scores[1]) {
        winner = "player2";
        title = `${options.player2} wins`;
      } else {
        winner = "draw";
        title = "Draw";
      }
    }

    const stars = calculateStars();
    const result = {
      gameId: "memory",
      mode: options.mode,
      difficulty: options.difficulty,
      winner,
      score: options.mode === "solo" ? stars * 1000 - state.moves * 12 - Math.floor(state.elapsed) : Math.max(state.scores[1], state.scores[2]),
      player1Score: state.scores[1],
      player2Score: state.scores[2],
      time: Math.floor(state.elapsed),
      moves: state.moves,
      mistakes: state.mistakes,
      stars,
      summary:
        options.mode === "solo"
          ? `${stars} stars, ${state.moves} moves, ${formatDuration(state.elapsed)}`
          : `${state.scores[1]}-${state.scores[2]} after ${state.moves} moves`,
    };
    await saveResult(result);
    audio.play(winner === "draw" ? "draw" : "win");
    showResults(title, result);
  }

  async function saveResult(result) {
    if (resultSaved) return;
    resultSaved = true;
    await recordGameResult(result);
    await onResult(result);
  }

  function showResults(title, result) {
    const overlayNode = root.querySelector("#memoryOverlay");
    overlayNode.classList.add("is-visible");
    overlayNode.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "game-overlay-panel";
    panel.append(
      createText("h2", title),
      createText(
        "p",
        result.mode === "solo"
          ? `${result.stars} stars, ${result.moves} moves, ${formatDuration(result.time)}.`
          : `${options.player1}: ${result.player1Score} | ${options.player2}: ${result.player2Score}.`,
      ),
    );
    const actions = document.createElement("div");
    actions.className = "overlay-actions";
    actions.append(
      actionButton("Play again", "primary-action", restartGame),
      actionButton("Return to library", "", () => {
        destroyGame();
        onExit();
      }),
    );
    panel.append(actions);
    overlayNode.append(panel);
  }

  function createText(tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  }

  function pauseGame() {
    if (state.over || state.paused) return;
    state.paused = true;
    const overlayNode = root.querySelector("#memoryOverlay");
    overlayNode.classList.add("is-visible");
    overlayNode.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "game-overlay-panel";
    panel.append(createText("h2", "Paused"), createText("p", "The cards are holding their pose."));
    const actions = document.createElement("div");
    actions.className = "overlay-actions";
    actions.append(
      actionButton("Resume", "primary-action", resumeGame),
      actionButton("Restart", "", restartGame),
      actionButton("Library", "", () => {
        destroyGame();
        onExit();
      }),
    );
    panel.append(actions);
    overlayNode.append(panel);
    renderBoard();
  }

  function resumeGame() {
    if (!state.paused) return;
    state.paused = false;
    state.lastTick = performance.now();
    const overlayNode = root.querySelector("#memoryOverlay");
    overlayNode.classList.remove("is-visible");
    overlayNode.innerHTML = "";
    renderBoard();
  }

  function restartGame() {
    clearInterval(timer);
    clearTimeout(mismatchTimer);
    resultSaved = false;
    state = initialState();
    render();
    startGame();
  }

  function destroyGame() {
    clearInterval(timer);
    clearTimeout(mismatchTimer);
    window.removeEventListener("keydown", handleKeydown);
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
  };
}
