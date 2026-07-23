export const AI_DIFFICULTY = {
  easy: {
    normalGrabChance: 0.86,
    bombGrabChance: 0.48,
    earlyChance: 0.08,
    minDelay: 690,
    maxDelay: 1160,
    missChance: 0.12,
  },
  normal: {
    normalGrabChance: 0.94,
    bombGrabChance: 0.2,
    earlyChance: 0.045,
    minDelay: 430,
    maxDelay: 780,
    missChance: 0.06,
  },
  hard: {
    normalGrabChance: 0.99,
    bombGrabChance: 0.07,
    earlyChance: 0.025,
    minDelay: 255,
    maxDelay: 520,
    missChance: 0.025,
  },
};

function rulesFor(difficulty) {
  return AI_DIFFICULTY[difficulty] || AI_DIFFICULTY.normal;
}

function between(min, max) {
  return min + Math.random() * (max - min);
}

export function createComputerPlan(cat, fishType, difficulty) {
  const rules = rulesFor(difficulty);
  const personality = Number(cat?.personality || 0);
  const delay = Math.max(170, between(rules.minDelay, rules.maxDelay) + personality);
  const grabChance = fishType === "bomb" ? rules.bombGrabChance : rules.normalGrabChance;
  const missedNormal = fishType === "normal" && Math.random() < rules.missChance;
  return {
    willGrab: !missedNormal && Math.random() < grabChance,
    delay,
  };
}

export function createEarlyGrabPlan(cat, difficulty) {
  const rules = rulesFor(difficulty);
  if (Math.random() > rules.earlyChance) return null;
  return {
    delay: between(420, 1800) + Number(cat?.personality || 0) * 0.25,
  };
}

export function difficultySummary(difficulty) {
  const summaries = {
    easy: "Easy cats hesitate longer and sometimes mistake Bomb Fish for snacks.",
    normal: "Normal cats react at a fair pace and usually dodge Bomb Fish.",
    hard: "Hard cats react quickly, avoid most Bomb Fish, and punish slow grabs.",
  };
  return summaries[difficulty] || summaries.normal;
}
