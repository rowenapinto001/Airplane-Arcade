import { durationSeconds, homeCountFor } from "./ludo-rules.js";

export function buildSkyLudoResult(state) {
  const winner = state.players.find((player) => player.id === state.winnerId) || state.players[0];
  const humanWinner = winner?.isHuman;
  const soloMode = state.mode !== "two";
  const duration = durationSeconds(state);
  const wonWithoutCapture = soloMode && humanWinner && state.players[0].tokens.every((token) => token.steps >= 0);
  const coins =
    16 +
    (humanWinner ? 28 : 8) +
    (state.mode === "solo-classic" && humanWinner ? 16 : 0) +
    (state.difficulty === "normal" && humanWinner ? 8 : 0) +
    (state.difficulty === "hard" && humanWinner ? 18 : 0) +
    state.stats.captures * 4 +
    (homeCountFor(winner) >= state.tokenCount ? 12 : 0) +
    (wonWithoutCapture ? 12 : 0);
  const summary = `${modeLabel(state.mode)}: ${winner.name} won with ${homeCountFor(winner)}/${state.tokenCount} home`;
  return {
    gameId: "sky-ludo",
    mode: state.mode,
    difficulty: state.difficulty,
    winner: winnerCode(state, winner),
    winnerId: winner.id,
    winnerName: winner.name,
    completed: true,
    rankings: state.rankings,
    duration,
    diceRolls: state.stats.diceRolls,
    sixes: state.stats.sixes,
    captures: state.stats.captures,
    tokensHome: state.stats.tokensHome,
    blocksCreated: state.stats.blocksCreated,
    flightCoins: Math.max(0, Math.floor(coins)),
    score: Math.max(0, 500 + coins * 4 - Math.floor(duration / 3)),
    noTokenCapturedWin: wonWithoutCapture,
    quickMode: Boolean(state.rules.quickMode),
    summary,
  };
}

function winnerCode(state, winner) {
  if (state.mode === "two") return winner.id === state.players[0].id ? "player1" : "player2";
  if (winner.isHuman) return "solo";
  return "computer";
}

function modeLabel(mode) {
  if (mode === "solo-duel") return "Solo Duel";
  if (mode === "solo-classic") return "Solo Classic";
  return "Two Players";
}
