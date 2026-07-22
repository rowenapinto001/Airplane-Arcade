const NAMES = [
  "Nova",
  "Tavi",
  "Pip",
  "Miko",
  "Juno",
  "Rafi",
  "Luma",
  "Kip",
  "Zara",
  "Nori",
  "Bex",
  "Oli",
  "Veda",
  "Remy",
  "Sola",
];

const COLORS = ["#46c7d9", "#ff8a3d", "#7f59e8", "#2fb36d", "#ef5b63", "#ffd35a", "#2fb8a2", "#d86ab6"];
const ACCESSORIES = ["cap", "scarf", "goggles", "badge", "visor", "bow", "wing", "stripe"];
const PERSONALITIES = ["careful", "balanced", "risky", "clumsy", "strategic"];

export function createOpponentProfiles(difficultyConfig) {
  return NAMES.map((name, index) => {
    const personality = PERSONALITIES[index % PERSONALITIES.length];
    const riskBase = { careful: 0.18, balanced: 0.38, risky: 0.7, clumsy: 0.52, strategic: 0.44 }[personality];
    const speedBase = { careful: 0.88, balanced: 1, risky: 1.08, clumsy: 0.94, strategic: 1.04 }[personality];
    return {
      id: `dummy-${index + 1}`,
      name,
      color: COLORS[index % COLORS.length],
      accent: COLORS[(index + 3) % COLORS.length],
      accessory: ACCESSORIES[index % ACCESSORIES.length],
      personality,
      speed: speedBase + (Math.random() - 0.5) * 0.08,
      reaction: Math.max(0.08, 0.7 - difficultyConfig.aiSkill * 0.42 + Math.random() * 0.35),
      risk: Math.min(0.95, riskBase + (1 - difficultyConfig.aiSkill) * 0.1 + Math.random() * 0.12),
      ai: {
        laneBias: 110 + (index % 8) * 84 + (Math.random() - 0.5) * 28,
        reactionTimer: 0,
        mistakeTimer: 0,
        stumbleTimer: 0,
        committed: false,
      },
    };
  });
}

export function playerProfile(records) {
  const selected = records.selectedCharacter || {};
  return {
    id: "player",
    name: "You",
    color: selected.bodyColor || "#38aee2",
    accent: selected.accent || "#ffd35a",
    accessory: selected.accessory || "pilot cap",
    personality: "player",
    speed: 1,
    reaction: 0,
    risk: 0,
  };
}

export function updateComputerAI(contestant, race, dt) {
  const ai = contestant.ai;
  if (!ai || contestant.eliminated || contestant.qualified) return { x: 0, y: 0, sprint: false, dive: false };

  ai.reactionTimer = Math.max(0, ai.reactionTimer - dt);
  ai.mistakeTimer = Math.max(0, ai.mistakeTimer - dt);
  ai.stumbleTimer = Math.max(0, ai.stumbleTimer - dt);

  const phase = race.watchkeeper.phase;
  const closeToFinish = contestant.y < 620;
  const longGreen = phase === "green" && race.watchkeeper.phaseElapsed > 2.5;
  const lateGreen = phase === "green" && race.watchkeeper.timer < race.watchkeeper.config.warning * (1.1 + contestant.risk);
  const shouldMistake = Math.random() < race.watchkeeper.config.aiMistake * contestant.risk * dt;

  if (shouldMistake) ai.mistakeTimer = 0.18 + Math.random() * 0.28;
  if (contestant.personality === "clumsy" && Math.random() < 0.018 * dt) ai.stumbleTimer = 0.45;
  if (phase === "warning" && ai.reactionTimer <= 0) ai.reactionTimer = contestant.reaction * (0.65 + Math.random() * 0.8);
  if (phase === "red" && Math.random() < race.watchkeeper.config.aiMistake * contestant.risk * 0.45 * dt) ai.mistakeTimer = 0.25;

  let y = 0;
  let sprint = false;
  if (phase === "green") {
    y = -1;
    sprint = contestant.personality === "risky" || closeToFinish || (contestant.personality === "strategic" && longGreen);
    if (lateGreen && contestant.personality === "careful") y = -0.24;
    if (lateGreen && contestant.personality === "balanced") y = -0.5;
  } else if (phase === "warning") {
    y = ai.reactionTimer > 0 ? -contestant.risk : 0;
    sprint = ai.reactionTimer > 0 && contestant.personality === "risky";
  } else if (phase === "red") {
    y = ai.mistakeTimer > 0 ? -0.42 : 0;
  }

  if (ai.stumbleTimer > 0) {
    y = 0.1;
    sprint = false;
  }

  const laneDelta = ai.laneBias - contestant.x;
  const x = Math.abs(laneDelta) > 18 ? Math.sign(laneDelta) * 0.42 : 0;
  const dive = phase === "green" && closeToFinish && contestant.personality === "risky" && contestant.diveCooldown <= 0 && Math.random() < 0.04 * dt;
  return { x, y, sprint, dive };
}
