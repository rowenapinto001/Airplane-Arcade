import { roundSummary } from "./hangman-rules.js";

export function createSoloResult(round, context = {}) {
  const summary = roundSummary(round);
  return {
    gameId: "sky-hangman",
    mode: "solo",
    difficulty: summary.difficulty,
    variation: summary.variation,
    category: summary.category,
    word: summary.word,
    wordLength: (summary.word.match(/[A-Z]/g) || []).length,
    completed: summary.won,
    won: summary.won,
    score: summary.score,
    mistakes: summary.mistakes,
    remainingLives: summary.remainingLives,
    hintsUsed: summary.hintsUsed,
    incorrectLetters: summary.incorrectLetters,
    streak: context.streak || 0,
    survivalCompleted: context.survivalCompleted || 0,
    categoryChallengeScore: context.categoryChallengeScore || 0,
    summary: summary.won ? `Word Cleared: ${summary.word}` : `Flight Delayed: ${summary.word}`,
    winner: summary.won ? "solo" : null,
  };
}

export function compareTwoPlayerRounds(rounds) {
  const player1 = rounds.filter((round) => round.guesser === 1);
  const player2 = rounds.filter((round) => round.guesser === 2);
  const p1 = aggregate(player1);
  const p2 = aggregate(player2);
  let winner = "draw";
  if (p1.solved !== p2.solved) winner = p1.solved > p2.solved ? "player1" : "player2";
  else if (p1.mistakes !== p2.mistakes) winner = p1.mistakes < p2.mistakes ? "player1" : "player2";
  else if (p1.remainingLives !== p2.remainingLives) winner = p1.remainingLives > p2.remainingLives ? "player1" : "player2";
  return { player1: p1, player2: p2, winner };
}

function aggregate(rounds) {
  return rounds.reduce(
    (total, round) => {
      total.solved += round.won ? 1 : 0;
      total.mistakes += round.mistakes;
      total.remainingLives += Math.max(0, round.maxMistakes - round.mistakes);
      total.score += round.score;
      total.hintsUsed += Number(round.hints.category) + Number(round.hints.meaning) + round.hints.reveal;
      return total;
    },
    { solved: 0, mistakes: 0, remainingLives: 0, score: 0, hintsUsed: 0 },
  );
}

export function createTwoPlayerResult(match, playerNames) {
  const comparison = compareTwoPlayerRounds(match.rounds);
  const winnerLabel =
    comparison.winner === "player1"
      ? playerNames.player1
      : comparison.winner === "player2"
        ? playerNames.player2
        : "Both Players";
  return {
    gameId: "sky-hangman",
    mode: "two",
    difficulty: match.difficulty,
    variation: match.matchLength,
    completed: true,
    score: Math.max(comparison.player1.score, comparison.player2.score),
    player1Score: comparison.player1.score,
    player2Score: comparison.player2.score,
    player1Solved: comparison.player1.solved,
    player2Solved: comparison.player2.solved,
    player1Mistakes: comparison.player1.mistakes,
    player2Mistakes: comparison.player2.mistakes,
    player1RemainingLives: comparison.player1.remainingLives,
    player2RemainingLives: comparison.player2.remainingLives,
    hintsUsed: comparison.player1.hintsUsed + comparison.player2.hintsUsed,
    winner: comparison.winner,
    summary: comparison.winner === "draw" ? "Both Players Win!" : `${winnerLabel} wins Sky Hangman`,
  };
}
