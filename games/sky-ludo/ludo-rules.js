import {
  FINISH_STEP,
  MAIN_PATH_LENGTH,
  TOKENS_CLASSIC,
  TOKENS_QUICK,
  activePlayerIds,
  isFinishedStep,
  isHomePathStep,
  isMainStep,
  isSafeMainIndex,
  logicalPosition,
  mainIndexFor,
  pathForMove,
} from "./ludo-board.js";

export const MODE_LABELS = {
  "solo-duel": "Solo Duel",
  "solo-classic": "Solo Classic",
  two: "Two Players",
};

export const DEFAULT_RULES = {
  quickMode: false,
  fastStart: false,
  blocksEnabled: true,
  threeSixesPenalty: true,
  homeBonus: true,
  continueRanking: false,
  fasterAi: false,
  fasterAnimations: false,
};

export function createGameState(options = {}) {
  const mode = options.mode || "solo-duel";
  const rules = { ...DEFAULT_RULES, ...(options.rules || {}) };
  const tokenCount = rules.quickMode ? TOKENS_QUICK : TOKENS_CLASSIC;
  const ids = activePlayerIds(mode);
  const players = ids.map((id, index) => {
    const isHuman = mode === "two" || index === 0;
    const name = options.names?.[id] || (isHuman ? (index === 0 ? options.player1 || "Player 1" : options.player2 || "Player 2") : computerName(id, options.difficulty));
    return {
      id,
      name,
      isHuman,
      aiDifficulty: isHuman ? null : options.difficulty || "normal",
      tokens: Array.from({ length: tokenCount }, (_, tokenIndex) => ({
        id: `${id}-${tokenIndex}`,
        playerId: id,
        index: tokenIndex,
        steps: rules.fastStart && tokenIndex === 0 ? 0 : -1,
        yardSlot: tokenIndex,
      })),
      homeCount: 0,
      placement: null,
    };
  });
  return {
    gameId: "sky-ludo",
    mode,
    difficulty: options.difficulty || "normal",
    rules,
    tokenCount,
    players,
    currentPlayerIndex: 0,
    phase: "readyToRoll",
    dice: null,
    diceRolling: false,
    consecutiveSixes: 0,
    validMoves: [],
    selectedMoveIndex: 0,
    rollHistory: [],
    message: `${players[0].name}'s turn`,
    noValidReason: "",
    winnerId: null,
    rankings: [],
    startedAt: Date.now(),
    endedAt: null,
    lastSavedAt: null,
    stats: {
      diceRolls: 0,
      sixes: 0,
      captures: 0,
      tokensHome: 0,
      blocksCreated: 0,
      noMoves: 0,
      turns: 0,
    },
  };
}

function computerName(id, difficulty = "normal") {
  const names = {
    yellow: { easy: "Sunny", normal: "Star Pilot", hard: "Captain Sol" },
    green: { easy: "Cloudy", normal: "Cloud Pilot", hard: "Nimbus Ace" },
    coral: { easy: "Compass", normal: "Compass Crew", hard: "Vector Ace" },
    blue: { easy: "Blue Bot", normal: "Wing Bot", hard: "Wing Ace" },
  };
  return names[id]?.[difficulty] || "Sky Bot";
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function currentPlayer(state) {
  return state.players[state.currentPlayerIndex] || state.players[0];
}

export function playerById(state, playerId) {
  return state.players.find((player) => player.id === playerId) || null;
}

export function tokenById(state, tokenId) {
  for (const player of state.players) {
    const token = player.tokens.find((item) => item.id === tokenId);
    if (token) return { player, token };
  }
  return null;
}

export function homeCountFor(player) {
  return player.tokens.filter((token) => isFinishedStep(token.steps)).length;
}

export function yardCountFor(player) {
  return player.tokens.filter((token) => token.steps < 0).length;
}

export function activeCountFor(player) {
  return player.tokens.filter((token) => token.steps >= 0 && !isFinishedStep(token.steps)).length;
}

export function applyDiceRoll(state, value) {
  state.dice = value;
  state.diceRolling = false;
  state.stats.diceRolls += 1;
  if (value === 6) {
    state.consecutiveSixes += 1;
    state.stats.sixes += 1;
  } else {
    state.consecutiveSixes = 0;
  }
  state.rollHistory = [{ player: currentPlayer(state).name, value, at: Date.now() }, ...state.rollHistory].slice(0, 30);

  if (value === 6 && state.rules.threeSixesPenalty && state.consecutiveSixes >= 3) {
    state.phase = "noMove";
    state.validMoves = [];
    state.noValidReason = "Three sixes - turn ended";
    state.message = "Three sixes - turn ended";
    return state.validMoves;
  }

  state.validMoves = calculateValidMoves(state, currentPlayer(state), value);
  state.selectedMoveIndex = 0;
  if (!state.validMoves.length) {
    state.phase = "noMove";
    state.stats.noMoves += 1;
    state.noValidReason = explainNoMove(state, currentPlayer(state), value);
    state.message = state.noValidReason;
  } else {
    state.phase = "selectToken";
    state.noValidReason = "";
    state.message = `Choose a token for ${value}`;
  }
  return state.validMoves;
}

export function calculateValidMoves(state, player = currentPlayer(state), diceValue = state.dice) {
  if (!diceValue || state.winnerId) return [];
  const moves = [];
  for (const token of player.tokens) {
    const move = calculateTokenMove(state, player, token, diceValue);
    if (move.valid) moves.push(move);
  }
  return moves;
}

function calculateTokenMove(state, player, token, diceValue) {
  if (isFinishedStep(token.steps)) return invalid("Token already home");
  if (token.steps < 0) {
    if (diceValue !== 6) return invalid("A 6 is needed to leave the terminal");
    const targetSteps = 0;
    const landing = landingInfo(state, player.id, token.id, targetSteps);
    if (landing.samePlayerCount >= maxStackSize(state)) return invalid("Starting square is full");
    if (landing.opponentBlock) return invalid("An opponent block guards the start");
    return {
      valid: true,
      tokenId: token.id,
      playerId: player.id,
      tokenIndex: token.index,
      dice: diceValue,
      fromSteps: token.steps,
      targetSteps,
      path: [0],
      release: true,
      captureIds: [],
      complete: false,
      createsBlock: landing.samePlayerCount === 1,
      entersHomePath: false,
    };
  }

  const targetSteps = token.steps + diceValue;
  if (targetSteps > FINISH_STEP) return invalid("Exact roll needed for home");
  const path = pathForMove(player.id, token.steps, diceValue);
  const blocking = firstBlockingSquare(state, player.id, token.id, path);
  if (blocking) return invalid("A block prevents that route");
  const landing = landingInfo(state, player.id, token.id, targetSteps);
  if (landing.samePlayerCount >= maxStackSize(state) && !isFinishedStep(targetSteps)) return invalid("That square is full");
  if (landing.opponentBlock) return invalid("An opponent block guards that square");
  return {
    valid: true,
    tokenId: token.id,
    playerId: player.id,
    tokenIndex: token.index,
    dice: diceValue,
    fromSteps: token.steps,
    targetSteps,
    path,
    release: false,
    captureIds: landing.captureIds,
    complete: targetSteps === FINISH_STEP,
    createsBlock: landing.samePlayerCount === 1 && isMainStep(targetSteps),
    entersHomePath: token.steps < MAIN_PATH_LENGTH && targetSteps >= MAIN_PATH_LENGTH && targetSteps < FINISH_STEP,
  };
}

function invalid(reason) {
  return { valid: false, reason };
}

function maxStackSize(state) {
  return state.rules.blocksEnabled ? 2 : 4;
}

function firstBlockingSquare(state, playerId, movingTokenId, path) {
  if (!state.rules.blocksEnabled) return null;
  for (const step of path) {
    if (!isMainStep(step)) continue;
    const mainIndex = mainIndexFor(playerId, step);
    const blockers = tokensAtMainIndex(state, mainIndex).filter(({ player, token }) => player.id !== playerId && token.id !== movingTokenId);
    const byPlayer = groupByPlayer(blockers);
    if (Object.values(byPlayer).some((tokens) => tokens.length >= 2)) return mainIndex;
  }
  return null;
}

function landingInfo(state, playerId, movingTokenId, targetSteps) {
  if (!isMainStep(targetSteps)) {
    const samePlayerCount = tokensWithLogicalPosition(state, logicalPosition(playerId, targetSteps))
      .filter(({ token }) => token.id !== movingTokenId).length;
    return { samePlayerCount, opponentBlock: false, captureIds: [] };
  }
  const mainIndex = mainIndexFor(playerId, targetSteps);
  const safe = isSafeMainIndex(mainIndex);
  const occupants = tokensAtMainIndex(state, mainIndex).filter(({ token }) => token.id !== movingTokenId);
  const same = occupants.filter(({ player }) => player.id === playerId);
  const opponents = occupants.filter(({ player }) => player.id !== playerId);
  const byOpponent = groupByPlayer(opponents);
  const opponentBlock = state.rules.blocksEnabled && Object.values(byOpponent).some((tokens) => tokens.length >= 2);
  const captureIds = safe || opponentBlock ? [] : opponents.map(({ token }) => token.id);
  return {
    samePlayerCount: same.length,
    opponentBlock,
    captureIds,
  };
}

function tokensAtMainIndex(state, mainIndex) {
  const output = [];
  for (const player of state.players) {
    for (const token of player.tokens) {
      if (isMainStep(token.steps) && mainIndexFor(player.id, token.steps) === mainIndex) {
        output.push({ player, token });
      }
    }
  }
  return output;
}

export function tokensWithLogicalPosition(state, position) {
  const output = [];
  for (const player of state.players) {
    for (const token of player.tokens) {
      if (logicalPosition(player.id, token.steps) === position) output.push({ player, token });
    }
  }
  return output;
}

function groupByPlayer(items) {
  return items.reduce((groups, item) => {
    groups[item.player.id] = groups[item.player.id] || [];
    groups[item.player.id].push(item);
    return groups;
  }, {});
}

function explainNoMove(state, player, diceValue) {
  if (!player.tokens.some((token) => token.steps >= 0 && !isFinishedStep(token.steps)) && diceValue !== 6) {
    return "No token is active - roll a 6 to leave the terminal";
  }
  if (player.tokens.some((token) => token.steps >= MAIN_PATH_LENGTH && token.steps < FINISH_STEP && token.steps + diceValue > FINISH_STEP)) {
    return "Exact roll needed for home";
  }
  if (state.rules.blocksEnabled) return "No legal move - a block or full square is in the way";
  return "No legal token can move";
}

export function finalizeMove(state, move) {
  const found = tokenById(state, move.tokenId);
  if (!found) return { captureIds: [], completed: false, extraRoll: false, winner: null };
  const { player, token } = found;
  token.steps = move.targetSteps;
  let captureIds = [];
  if (move.captureIds?.length) {
    captureIds = [...new Set(move.captureIds)];
    for (const captureId of captureIds) {
      const captured = tokenById(state, captureId);
      if (captured) {
        captured.token.steps = -1;
        captured.token.yardSlot = captured.token.index;
      }
    }
    state.stats.captures += captureIds.length;
    state.message = "Captured!";
  }
  if (move.createsBlock) state.stats.blocksCreated += 1;
  if (move.complete) {
    state.stats.tokensHome += 1;
    player.homeCount = homeCountFor(player);
    state.message = `${player.name} boarded home`;
  }
  for (const candidate of state.players) candidate.homeCount = homeCountFor(candidate);
  const winner = checkWinner(state);
  const extraRoll = !winner && (move.dice === 6 || captureIds.length > 0 || (move.complete && state.rules.homeBonus));
  if (winner) {
    state.phase = "gameOver";
    state.winnerId = winner.id;
    state.endedAt = Date.now();
    state.rankings = buildRankings(state, winner.id);
    state.message = `${winner.name} wins!`;
  } else if (extraRoll) {
    state.phase = "readyToRoll";
    state.dice = null;
    state.validMoves = [];
    state.message = `${player.name} gets another roll`;
  } else {
    changeTurn(state);
  }
  return { captureIds, completed: move.complete, extraRoll, winner };
}

export function changeTurn(state) {
  state.stats.turns += 1;
  state.currentPlayerIndex = nextPlayerIndex(state);
  state.dice = null;
  state.validMoves = [];
  state.selectedMoveIndex = 0;
  state.consecutiveSixes = 0;
  state.phase = "readyToRoll";
  state.message = `${currentPlayer(state).name}'s turn`;
}

export function nextPlayerIndex(state) {
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const index = (state.currentPlayerIndex + offset) % state.players.length;
    if (!state.players[index].placement) return index;
  }
  return state.currentPlayerIndex;
}

export function checkWinner(state) {
  const player = state.players.find((candidate) => homeCountFor(candidate) >= state.tokenCount);
  return player || null;
}

function buildRankings(state, winnerId) {
  return [...state.players]
    .sort((a, b) => {
      if (a.id === winnerId) return -1;
      if (b.id === winnerId) return 1;
      return homeCountFor(b) - homeCountFor(a) || activeCountFor(b) - activeCountFor(a) || yardCountFor(a) - yardCountFor(b);
    })
    .map((player, index) => ({
      playerId: player.id,
      name: player.name,
      placement: index + 1,
      home: homeCountFor(player),
      active: activeCountFor(player),
      yard: yardCountFor(player),
      isHuman: player.isHuman,
    }));
}

export function selectNextMove(state, direction = 1) {
  if (!state.validMoves.length) return null;
  state.selectedMoveIndex = (state.selectedMoveIndex + direction + state.validMoves.length) % state.validMoves.length;
  return state.validMoves[state.selectedMoveIndex];
}

export function durationSeconds(state) {
  return Math.max(0, Math.floor(((state.endedAt || Date.now()) - state.startedAt) / 1000));
}

export function isCurrentPlayerComputer(state) {
  return !currentPlayer(state).isHuman;
}
