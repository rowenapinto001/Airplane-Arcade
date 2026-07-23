export const TARGET_SCORE = 5;

export const FISH_TYPES = {
  normal: {
    id: "normal",
    label: "Normal Fish",
    score: 1,
    activeWindow: 3000,
  },
  bomb: {
    id: "bomb",
    label: "Bomb Fish",
    score: -1,
    activeWindow: 2600,
  },
};

export function randomFishDelay() {
  return 1000 + Math.floor(Math.random() * 3001);
}

export function selectFishType(history = []) {
  const lastTwo = history.slice(-2);
  if (lastTwo.length === 2 && lastTwo.every((type) => type === "bomb")) return "normal";
  return Math.random() < 0.25 ? "bomb" : "normal";
}

export function createRound(index, history = []) {
  const fishType = selectFishType(history);
  return {
    index,
    fishType,
    delay: randomFishDelay(),
    activeWindow: FISH_TYPES[fishType].activeWindow,
    revealedAt: 0,
    resolved: false,
    result: null,
  };
}

export function roundScore(fishType) {
  return FISH_TYPES[fishType]?.score || 0;
}

export function hasWinner(cats) {
  return cats.some((cat) => cat.score >= TARGET_SCORE);
}

export function leadingCat(cats) {
  return [...cats].sort((a, b) => b.score - a.score)[0] || null;
}
