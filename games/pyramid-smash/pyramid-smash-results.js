export function calculateStars(level, shots, completed) {
  if (!completed) return 0;
  if (shots <= level.starShots.three) return 3;
  if (shots <= level.starShots.two) return 2;
  return 1;
}

export function flightCoinsFor(level, stars, bonusCollected, newBest, firstCompletion) {
  if (!stars) return 0;
  return 12 + level.id * 2 + stars * 10 + bonusCollected * 8 + (newBest ? 10 : 0) + (firstCompletion ? 14 : 0);
}

export function levelResultSummary(level, result) {
  if (!result.completed) return `Level ${level.id} failed with ${result.remainingTargets} targets left`;
  return `Level ${level.id} complete - ${result.shots} shots - ${result.stars} stars`;
}

export function betterShotRecord(previous, shots) {
  return previous === null || previous === undefined || shots < previous;
}

export function totalStars(stars = {}) {
  return Object.values(stars).reduce((sum, value) => sum + Number(value || 0), 0);
}

export function ordinal(value) {
  const number = Number(value);
  const suffix = number % 10 === 1 && number % 100 !== 11 ? "st" : number % 10 === 2 && number % 100 !== 12 ? "nd" : number % 10 === 3 && number % 100 !== 13 ? "rd" : "th";
  return `${number}${suffix}`;
}
