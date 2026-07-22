import { adjustedLevelGoals } from "./chef-levels.js";

export function calculateChefResult(state) {
  if (state.chefMode === "endless") return calculateEndlessResult(state);
  const goals = adjustedLevelGoals(state.level, state.difficulty);
  const completed = state.stats.ordersServed >= goals.targetOrders && state.score >= goals.targetScore;
  const stars = completed ? starCount(state, goals) : 0;
  const coins = Math.max(0, Math.round((state.score / 135) + state.stats.perfectOrders * 4 + stars * 16 - state.stats.missedPassengers * 5));
  const summary = completed
    ? `${state.level.name} passed with ${stars} star${stars === 1 ? "" : "s"}`
    : `${state.level.name} needs ${Math.max(0, goals.targetOrders - state.stats.ordersServed)} more order${goals.targetOrders - state.stats.ordersServed === 1 ? "" : "s"}`;
  return {
    gameId: "airport-chef",
    mode: state.mode,
    difficulty: state.difficultyId,
    chefMode: state.chefMode,
    level: state.level.number,
    completed,
    stars,
    score: state.score,
    targetScore: goals.targetScore,
    ordersServed: state.stats.ordersServed,
    targetOrders: goals.targetOrders,
    missedPassengers: state.stats.missedPassengers,
    burnedFood: state.stats.burnedFood,
    perfectOrders: state.stats.perfectOrders,
    highestCombo: state.stats.highestCombo,
    flightCoins: coins,
    duration: Math.round(state.elapsed),
    endlessScore: state.chefMode === "endless" ? state.score : 0,
    endlessShift: state.chefMode === "endless" ? Math.round(state.elapsed) : 0,
    summary,
    winner: completed ? "solo" : null,
    airportMasterChef: completed && state.level.number >= 20,
  };
}

function calculateEndlessResult(state) {
  const coins = Math.max(0, Math.round(state.score / 150 + state.stats.perfectOrders * 4 + state.stats.highestCombo * 2));
  return {
    gameId: "airport-chef",
    mode: state.mode,
    difficulty: state.difficultyId,
    chefMode: state.chefMode,
    level: state.level.number,
    completed: true,
    stars: 0,
    score: state.score,
    targetScore: state.score,
    ordersServed: state.stats.ordersServed,
    targetOrders: state.stats.ordersServed,
    missedPassengers: state.stats.missedPassengers,
    burnedFood: state.stats.burnedFood,
    perfectOrders: state.stats.perfectOrders,
    highestCombo: state.stats.highestCombo,
    flightCoins: coins,
    duration: Math.round(state.elapsed),
    endlessScore: state.score,
    endlessShift: Math.round(state.elapsed),
    summary: `Endless Rush ${state.score} points and ${state.stats.ordersServed} orders`,
    winner: "solo",
    airportMasterChef: false,
  };
}

function starCount(state, goals) {
  let stars = 1;
  if (state.score >= goals.targetScore * 1.28 && state.stats.missedPassengers <= 1) stars = 2;
  if (state.score >= goals.targetScore * 1.55 && state.stats.missedPassengers === 0 && state.stats.burnedFood <= 1) stars = 3;
  return stars;
}

export function resultLines(result) {
  return [
    `Score ${result.score}/${result.targetScore}`,
    `Orders ${result.ordersServed}/${result.targetOrders}`,
    `${result.perfectOrders} perfect order${result.perfectOrders === 1 ? "" : "s"}`,
    `${result.highestCombo}x best combo`,
    `${result.flightCoins} Flight Coins earned`,
  ];
}
