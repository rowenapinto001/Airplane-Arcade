export function createDefaultFishGrabRecords() {
  return {
    totalMatches: 0,
    soloWins: 0,
    soloLosses: 0,
    twoPlayerWins: 0,
    player1Wins: 0,
    player2Wins: 0,
    computerWins: 0,
    normalGrabbed: 0,
    bombGrabbed: 0,
    earlyGrabs: 0,
    bestReaction: null,
    reactionTotal: 0,
    reactionCount: 0,
    preferredCat: "captain-miso",
    preferredPlayer2Cat: "cloud-nori",
    preferredDifficulty: "normal",
    selectedMode: "solo",
    currentStreak: 0,
    bestStreak: 0,
    recentSummary: null,
  };
}

export function averageReaction(record) {
  if (!record?.reactionCount) return null;
  return record.reactionTotal / record.reactionCount;
}

export function summarizeFishGrabRecords(record) {
  const average = averageReaction(record);
  return {
    totalMatches: record?.totalMatches || 0,
    wins: (record?.soloWins || 0) + (record?.player1Wins || 0) + (record?.player2Wins || 0),
    computerWins: record?.computerWins || 0,
    normalGrabbed: record?.normalGrabbed || 0,
    bombGrabbed: record?.bombGrabbed || 0,
    earlyGrabs: record?.earlyGrabs || 0,
    bestReaction: record?.bestReaction ?? null,
    averageReaction: average,
    bestStreak: record?.bestStreak || 0,
    recentSummary: record?.recentSummary || "No fish grabbed yet",
  };
}
