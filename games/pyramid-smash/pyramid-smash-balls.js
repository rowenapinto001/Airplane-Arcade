export const BALL_TYPES = {
  standard: {
    id: "standard",
    name: "Standard Ball",
    radius: 17,
    mass: 1,
    bounce: 0.54,
    friction: 0.992,
    impact: 1,
    color: "#38aee2",
    accent: "#ffffff",
    description: "Balanced weight, bounce, and impact.",
  },
  heavy: {
    id: "heavy",
    name: "Heavy Ball",
    radius: 20,
    mass: 1.65,
    bounce: 0.36,
    friction: 0.988,
    impact: 1.55,
    color: "#5c6674",
    accent: "#dfe7ef",
    description: "High impact force for heavy crates.",
  },
  bouncy: {
    id: "bouncy",
    name: "Bouncy Ball",
    radius: 16,
    mass: 0.82,
    bounce: 0.82,
    friction: 0.996,
    impact: 0.78,
    color: "#7f59e8",
    accent: "#ffd35a",
    description: "Rebounds strongly to reach several areas.",
  },
  sticky: {
    id: "sticky",
    name: "Sticky Ball",
    radius: 17,
    mass: 1.08,
    bounce: 0.22,
    friction: 0.985,
    impact: 0.92,
    sticky: true,
    color: "#2fb36d",
    accent: "#132035",
    description: "Sticks briefly to the first object and pulls as it falls.",
  },
  split: {
    id: "split",
    name: "Split Ball",
    radius: 18,
    mass: 1,
    bounce: 0.5,
    friction: 0.992,
    impact: 0.9,
    split: true,
    color: "#ef5b63",
    accent: "#fff4c8",
    description: "Splits into three small balls after the first impact.",
  },
  air: {
    id: "air",
    name: "Air Ball",
    radius: 15,
    mass: 0.68,
    bounce: 0.62,
    friction: 0.996,
    impact: 0.7,
    windScale: 1.5,
    color: "#dff8ff",
    accent: "#46c7d9",
    description: "Travels high and is affected by wind.",
  },
  precision: {
    id: "precision",
    name: "Precision Ball",
    radius: 12,
    mass: 0.74,
    bounce: 0.48,
    friction: 0.994,
    impact: 0.66,
    color: "#ffd35a",
    accent: "#132035",
    description: "Small and accurate for narrow weak points.",
  },
};

export function getBallType(typeId = "standard") {
  return BALL_TYPES[typeId] || BALL_TYPES.standard;
}

export function createBall(typeId, x, y, velocity = { x: 0, y: 0 }) {
  const type = getBallType(typeId);
  return {
    id: `ball-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 7)}`,
    type: type.id,
    name: type.name,
    x,
    y,
    vx: velocity.x,
    vy: velocity.y,
    radius: type.radius,
    mass: type.mass,
    bounce: type.bounce,
    friction: type.friction,
    impact: type.impact,
    color: type.color,
    accent: type.accent,
    sticky: Boolean(type.sticky),
    split: Boolean(type.split),
    windScale: type.windScale || 1,
    spin: 0,
    stuckTo: null,
    splitDone: false,
    sleepTime: 0,
    active: true,
  };
}

export function inventorySummary(inventory) {
  const counts = {};
  for (const type of inventory) counts[type] = (counts[type] || 0) + 1;
  return Object.entries(counts)
    .map(([type, count]) => `${getBallType(type).name.replace(" Ball", "")} x${count}`)
    .join(", ");
}
