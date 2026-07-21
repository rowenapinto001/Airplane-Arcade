export const CUSTOMISE_GROUPS = [
  { id: "bodyColor", label: "Body colour" },
  { id: "face", label: "Face style" },
  { id: "scarf", label: "Scarf" },
  { id: "hat", label: "Hat" },
  { id: "accessory", label: "Accessory" },
  { id: "trail", label: "Trail effect" },
  { id: "victory", label: "Victory animation" },
];

export const COSMETICS = {
  bodyColor: [
    { id: "sky", name: "Sky Blue", color: "#39bde5", cost: 0 },
    { id: "sunset", name: "Sunset Coral", color: "#ff7a70", cost: 6 },
    { id: "lime", name: "Lime Signal", color: "#76d46b", cost: 8 },
    { id: "violet", name: "Violet Taxiway", color: "#8f6be8", cost: 10 },
    { id: "gold", name: "Boarding Gold", color: "#f2bf4a", cost: 12 },
  ],
  face: [
    { id: "smile", name: "Tiny Smile", cost: 0 },
    { id: "focus", name: "Focus Dots", cost: 5 },
    { id: "wink", name: "Runway Wink", cost: 7 },
  ],
  scarf: [
    { id: "red", name: "Red Scarf", color: "#ef5b63", cost: 0 },
    { id: "green", name: "Green Scarf", color: "#2fb36d", cost: 5 },
    { id: "purple", name: "Purple Scarf", color: "#7f59e8", cost: 7 },
  ],
  hat: [
    { id: "none", name: "No Hat", cost: 0 },
    { id: "pilot", name: "Pilot Cap", color: "#263142", cost: 8 },
    { id: "cloud", name: "Cloud Hat", color: "#ffffff", cost: 10 },
  ],
  accessory: [
    { id: "wing", name: "Wing Badge", cost: 0 },
    { id: "backpack", name: "Luggage Backpack", cost: 8 },
    { id: "radar", name: "Radar Pin", cost: 10 },
  ],
  trail: [
    { id: "spark", name: "Spark Trail", color: "#ffd35a", cost: 0 },
    { id: "cloud", name: "Cloud Puffs", color: "#ffffff", cost: 7 },
    { id: "stripe", name: "Taxiway Stripe", color: "#46c7d9", cost: 9 },
  ],
  victory: [
    { id: "wave", name: "Wing Wave", cost: 0 },
    { id: "spin", name: "Cloud Spin", cost: 8 },
    { id: "salute", name: "Pilot Salute", cost: 10 },
  ],
};

export const DEFAULT_CHARACTER = {
  bodyColor: "sky",
  face: "smile",
  scarf: "red",
  hat: "none",
  accessory: "wing",
  trail: "spark",
  victory: "wave",
};

export const DEFAULT_UNLOCKS = [
  "body-sky",
  "face-smile",
  "scarf-red",
  "hat-none",
  "accessory-wing",
  "trail-spark",
  "victory-wave",
];

export const OPPONENT_NAMES = [
  "Cloudy",
  "Jet Bean",
  "Captain Wobble",
  "Baggage Bob",
  "Runway Ruby",
  "Turbo Tim",
  "Puffy",
  "Winglet",
  "Dizzy Dot",
  "Cargo Carl",
  "Misty Mae",
  "Beacon Ben",
  "Tarmac Tia",
  "Radar Rae",
  "Noodle Nav",
];

const OPPONENT_COLORS = [
  "#ff8a3d",
  "#7f59e8",
  "#2fb36d",
  "#ffd35a",
  "#ef5b63",
  "#46c7d9",
  "#a46be8",
  "#f26db1",
  "#31b889",
  "#f2a34a",
  "#5f7bd9",
  "#ed6a5e",
  "#75c66c",
  "#58bcd8",
  "#d48b45",
];

export function cosmeticKey(groupId, itemId) {
  return `${groupId.replace("bodyColor", "body")}-${itemId}`;
}

export function getCosmetic(groupId, itemId) {
  return COSMETICS[groupId]?.find((item) => item.id === itemId) || COSMETICS[groupId]?.[0] || null;
}

export function listCosmetics(groupId) {
  return COSMETICS[groupId] || [];
}

export function isCosmeticUnlocked(records, groupId, itemId) {
  return (records.unlockedCosmetics || DEFAULT_UNLOCKS).includes(cosmeticKey(groupId, itemId));
}

export function resolveCharacter(records) {
  const selected = { ...DEFAULT_CHARACTER, ...(records.selectedCharacter || {}) };
  return {
    ...selected,
    body: getCosmetic("bodyColor", selected.bodyColor),
    faceItem: getCosmetic("face", selected.face),
    scarfItem: getCosmetic("scarf", selected.scarf),
    hatItem: getCosmetic("hat", selected.hat),
    accessoryItem: getCosmetic("accessory", selected.accessory),
    trailItem: getCosmetic("trail", selected.trail),
    victoryItem: getCosmetic("victory", selected.victory),
  };
}

export function characterSummary(character) {
  return [
    getCosmetic("bodyColor", character.bodyColor)?.name,
    getCosmetic("face", character.face)?.name,
    getCosmetic("scarf", character.scarf)?.name,
    getCosmetic("hat", character.hat)?.name,
    getCosmetic("accessory", character.accessory)?.name,
    getCosmetic("trail", character.trail)?.name,
    getCosmetic("victory", character.victory)?.name,
  ].filter(Boolean).join(", ");
}

export function createOpponentProfile(index, skill) {
  const name = OPPONENT_NAMES[index % OPPONENT_NAMES.length];
  const color = OPPONENT_COLORS[index % OPPONENT_COLORS.length];
  return {
    id: `bot-${index + 1}`,
    name,
    bodyColor: color,
    accent: OPPONENT_COLORS[(index + 5) % OPPONENT_COLORS.length],
    face: index % 3 === 0 ? "focus" : index % 3 === 1 ? "smile" : "wink",
    accessory: index % 4 === 0 ? "cap" : index % 4 === 1 ? "bag" : index % 4 === 2 ? "badge" : "scarf",
    skill,
  };
}
