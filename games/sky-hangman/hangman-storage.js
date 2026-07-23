export function defaultSkyHangmanRecords() {
  return {
    totalRounds: 0,
    totalWordsCompleted: 0,
    totalWordsMissed: 0,
    easyWins: 0,
    normalWins: 0,
    hardWins: 0,
    player1Wins: 0,
    player2Wins: 0,
    sharedTieWins: 0,
    longestStreak: 0,
    currentStreak: 0,
    highestScore: 0,
    bestCategory: null,
    categoryWins: {},
    lettersGuessed: 0,
    incorrectLetters: {},
    hintsUsed: 0,
    survivalRecord: 0,
    preferredCategory: "Airport",
    preferredDifficulty: "normal",
    preferredVariation: "classic",
    recentWords: [],
    recentSummary: null,
  };
}

export function rememberWord(records, word) {
  const next = [word, ...(records.recentWords || []).filter((item) => item !== word)];
  records.recentWords = next.slice(0, 18);
}
