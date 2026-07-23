import { TARGET_SCORE, leadingCat } from "./fish-grab-rounds.js";

export function formatReaction(ms) {
  if (!Number.isFinite(ms)) return "No grab";
  return `${Math.round(ms)} ms`;
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function createFishGrabResult(state) {
  const winnerCat = state.cats.find((cat) => cat.score >= TARGET_SCORE) || leadingCat(state.cats);
  const humanWinner = winnerCat?.controller === "human";
  let winner = "computer";
  if (humanWinner && state.mode === "solo") winner = "solo";
  if (humanWinner && state.mode === "two" && winnerCat.player === 1) winner = "player1";
  if (humanWinner && state.mode === "two" && winnerCat.player === 2) winner = "player2";

  const reactions = state.stats.reactions.filter(Number.isFinite);
  const bestReaction = reactions.length ? Math.min(...reactions) : null;
  const averageReaction = average(reactions);
  const summary = `${winnerCat?.displayName || "Computer Cat"} won ${winnerCat?.score || 0}-${Math.max(
    0,
    ...state.cats.filter((cat) => cat.id !== winnerCat?.id).map((cat) => cat.score),
  )}`;

  return {
    gameId: "fish-grab-frenzy",
    winner,
    mode: state.mode,
    fishMode: state.mode,
    difficulty: state.difficulty,
    score: winnerCat?.score || 0,
    winnerCatId: winnerCat?.id || null,
    winnerName: winnerCat?.displayName || "Computer Cat",
    winnerController: winnerCat?.controller || "computer",
    player1Score: state.cats.find((cat) => cat.player === 1)?.score || 0,
    player2Score: state.cats.find((cat) => cat.player === 2)?.score || 0,
    scores: state.cats.map((cat) => ({
      catId: cat.id,
      name: cat.displayName,
      controller: cat.controller,
      player: cat.player,
      score: cat.score,
      normalGrabbed: cat.normalGrabbed,
      bombGrabbed: cat.bombGrabbed,
      earlyGrabs: cat.earlyGrabs,
    })),
    normalGrabbed: state.stats.normalGrabbed,
    bombGrabbed: state.stats.bombGrabbed,
    earlyGrabs: state.stats.earlyGrabs,
    totalRounds: state.stats.roundsPlayed,
    roundsPlayed: state.stats.roundsPlayed,
    fastestReaction: bestReaction,
    bestReaction,
    averageReaction,
    reactionCount: reactions.length,
    reactionTotal: reactions.reduce((sum, value) => sum + value, 0),
    preferredCat: state.p1CatId,
    preferredPlayer2Cat: state.p2CatId,
    summary,
  };
}
