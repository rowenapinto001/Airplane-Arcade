import { FINISH_STEP, MAIN_PATH_LENGTH, isMainStep, isSafeMainIndex, mainIndexFor } from "./ludo-board.js";
import { currentPlayer, playerById, tokenById } from "./ludo-rules.js";

export function aiDelay(difficulty = "normal", fasterAi = false) {
  if (fasterAi) return 180 + Math.random() * 140;
  const ranges = {
    easy: [700, 1200],
    normal: [500, 900],
    hard: [350, 700],
  };
  const [min, max] = ranges[difficulty] || ranges.normal;
  return min + Math.random() * (max - min);
}

export function chooseAiMove(state, moves, difficulty = "normal") {
  if (!moves.length) return null;
  if (difficulty === "easy") return chooseEasyMove(state, moves);
  const scored = moves.map((move) => ({
    move,
    score: scoreMove(state, move, difficulty),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
}

export function updateComputerAI(state, moves, difficulty = currentPlayer(state).aiDifficulty || "normal") {
  return chooseAiMove(state, moves, difficulty);
}

function chooseEasyMove(state, moves) {
  const releases = moves.filter((move) => move.release);
  if (releases.length && Math.random() < 0.65) return releases[Math.floor(Math.random() * releases.length)];
  const home = moves.filter((move) => move.complete);
  if (home.length && Math.random() < 0.5) return home[0];
  const sorted = [...moves].sort((a, b) => a.fromSteps - b.fromSteps);
  return sorted[Math.floor(Math.random() * Math.min(2, sorted.length))];
}

function scoreMove(state, move, difficulty) {
  const player = currentPlayer(state);
  const found = tokenById(state, move.tokenId);
  const token = found?.token;
  let score = move.targetSteps * 0.22;
  if (move.release) score += difficulty === "hard" ? 32 : 42;
  if (move.complete) score += 180;
  if (move.entersHomePath) score += 58;
  if (move.captureIds?.length) score += difficulty === "hard" ? 92 : 72;
  if (move.createsBlock) score += difficulty === "hard" ? 42 : 25;
  if (landingIsSafe(player.id, move.targetSteps)) score += 28;
  if (token && token.steps >= MAIN_PATH_LENGTH - 8) score += 30;
  if (token && landingIsSafe(player.id, token.steps) && !landingIsSafe(player.id, move.targetSteps)) score -= difficulty === "hard" ? 22 : 12;
  if (move.captureIds?.length && difficulty === "normal" && Math.random() < 0.15) score -= 55;
  score -= dangerScore(state, move, difficulty);
  if (difficulty === "hard") score += escapeScore(state, move);
  return score + Math.random() * 0.8;
}

function landingIsSafe(playerId, steps) {
  return isMainStep(steps) && isSafeMainIndex(mainIndexFor(playerId, steps));
}

function dangerScore(state, move, difficulty) {
  if (!isMainStep(move.targetSteps) || landingIsSafe(move.playerId, move.targetSteps)) return 0;
  const targetMain = mainIndexFor(move.playerId, move.targetSteps);
  let danger = 0;
  for (const opponent of state.players) {
    if (opponent.id === move.playerId) continue;
    for (const token of opponent.tokens) {
      if (!isMainStep(token.steps)) continue;
      const opponentMain = mainIndexFor(opponent.id, token.steps);
      const gap = forwardGap(opponentMain, targetMain);
      if (gap >= 1 && gap <= 6) danger += difficulty === "hard" ? 16 + (7 - gap) * 4 : 12;
    }
  }
  return danger;
}

function escapeScore(state, move) {
  const found = tokenById(state, move.tokenId);
  if (!found?.token || !isMainStep(found.token.steps)) return 0;
  const before = dangerAround(state, move.playerId, mainIndexFor(move.playerId, found.token.steps));
  const after = isMainStep(move.targetSteps) ? dangerAround(state, move.playerId, mainIndexFor(move.playerId, move.targetSteps)) : 0;
  return Math.max(0, before - after) * 10;
}

function dangerAround(state, playerId, mainIndex) {
  let count = 0;
  for (const opponent of state.players) {
    if (opponent.id === playerId) continue;
    for (const token of opponent.tokens) {
      if (!isMainStep(token.steps)) continue;
      const gap = forwardGap(mainIndexFor(opponent.id, token.steps), mainIndex);
      if (gap >= 1 && gap <= 6) count += 1;
    }
  }
  return count;
}

function forwardGap(fromMainIndex, toMainIndex) {
  let gap = toMainIndex - fromMainIndex;
  if (gap < 0) gap += 52;
  return gap;
}

export function rankPlayersForAI(state) {
  return [...state.players]
    .sort((a, b) => progressForPlayer(state, b.id) - progressForPlayer(state, a.id))
    .map((player, index) => ({ player, rank: index + 1 }));
}

function progressForPlayer(state, playerId) {
  const player = playerById(state, playerId);
  if (!player) return 0;
  return player.tokens.reduce((sum, token) => sum + Math.max(0, Math.min(FINISH_STEP, token.steps)), 0);
}
