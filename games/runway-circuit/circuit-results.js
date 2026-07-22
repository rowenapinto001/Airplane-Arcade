import { TOTAL_LAPS } from "./circuit-levels.js";
import { formatRaceTime, ordinal } from "./circuit-physics.js";

export function calculateRaceResult(race) {
  const player = race.player;
  const finalPosition = player.finalPosition || player.position;
  const completed = player.lapTimes.length >= TOTAL_LAPS;
  const unlocked = completed && finalPosition <= race.level.unlockPosition;
  const fastestLap = fastestRacerLap(race);
  const playerBestLap = Math.min(...player.lapTimes);
  const bonusComplete = bonusObjectiveComplete(race, fastestLap);
  const stars = completed ? 1 + (finalPosition <= 3 ? 1 : 0) + (finalPosition === 1 && bonusComplete ? 1 : 0) : 0;
  const coins = completed
    ? 18 + race.level.id * 8 + Math.max(0, 7 - finalPosition) * 5 + stars * 12 + (unlocked ? 14 : 0)
    : 8;
  return {
    gameId: "runway-circuit",
    circuitMode: race.mode,
    level: race.level.id,
    levelName: race.level.name,
    difficulty: race.difficultyId || "normal",
    car: player.carId,
    completed,
    unlocked,
    finalPosition,
    positionLabel: ordinal(finalPosition),
    totalTime: player.finishTime ?? race.time,
    lapTimes: [...player.lapTimes],
    bestLap: player.lapTimes.length ? playerBestLap : null,
    fastestRacer: fastestLap.name,
    fastestRacerLap: fastestLap.time,
    overtakes: player.overtakes,
    collisions: player.collisions,
    majorCollisions: player.majorCollisions,
    resets: player.resetCount,
    stars,
    flightCoins: coins,
    bonusComplete,
    champion: completed && race.level.id === 5 && finalPosition === 1,
    timeTrialUnlocked: completed && race.level.id === 5 && finalPosition === 1,
    score: Math.max(0, 700 - finalPosition * 75 + stars * 90 - Math.floor((player.finishTime || race.time) / 3)),
    ghost: race.mode === "time-trial" ? player.routeHistory : null,
    summary: `${race.level.name}: ${ordinal(finalPosition)} in ${formatRaceTime(player.finishTime ?? race.time)}`,
  };
}

export function bonusObjectiveComplete(race, fastestLap) {
  const player = race.player;
  if (race.level.id === 1) return player.resetCount === 0;
  if (race.level.id === 2) return fastestLap.name === player.name;
  if (race.level.id === 3) return player.overtakes >= 3;
  if (race.level.id === 4) return player.resetCount === 0;
  return player.majorCollisions === 0 && player.finalPosition === 1;
}

export function fastestRacerLap(race) {
  let best = { name: race.player.name, time: Infinity };
  for (const racer of race.racers) {
    for (const time of racer.lapTimes) {
      if (time < best.time) best = { name: racer.name, time };
    }
  }
  return best.time === Infinity ? { name: "No lap", time: 0 } : best;
}

export function levelUnlockText(level, result) {
  if (result.champion) return "Circuit Champion badge and Time Trial unlocked.";
  if (result.unlocked && level.id < 5) return `Level ${level.id + 1} unlocked.`;
  if (result.unlocked) return "Championship complete.";
  return `Finish ${level.unlockRequirement.toLowerCase()} to unlock the next circuit.`;
}
