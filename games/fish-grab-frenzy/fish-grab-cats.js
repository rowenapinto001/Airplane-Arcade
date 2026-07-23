export const CAT_DEFINITIONS = [
  {
    id: "captain-miso",
    name: "Captain Miso",
    color: "#f8b86a",
    accent: "#1e82c5",
    ear: "#f19b56",
    accessory: "cap",
    personality: 0,
  },
  {
    id: "cloud-nori",
    name: "Cloud Nori",
    color: "#f4f0df",
    accent: "#42bfd0",
    ear: "#ded7c2",
    accessory: "goggles",
    personality: 35,
  },
  {
    id: "star-pickle",
    name: "Star Pickle",
    color: "#9bdc8c",
    accent: "#ffd35a",
    ear: "#78c46f",
    accessory: "star",
    personality: -20,
  },
  {
    id: "midnight-bean",
    name: "Midnight Bean",
    color: "#44566b",
    accent: "#ef5b63",
    ear: "#334252",
    accessory: "scarf",
    personality: 15,
  },
];

const SEAT_ORDER = ["bottom", "top", "left", "right"];

function byId(id) {
  return CAT_DEFINITIONS.find((cat) => cat.id === id) || CAT_DEFINITIONS[0];
}

function remainingCats(excludedIds) {
  return CAT_DEFINITIONS.filter((cat) => !excludedIds.includes(cat.id));
}

export function getCatDefinition(id) {
  return byId(id);
}

export function nextAvailableCat(id) {
  return CAT_DEFINITIONS.find((cat) => cat.id !== id)?.id || CAT_DEFINITIONS[0].id;
}

export function createCats({ mode, p1CatId, p2CatId, player1, player2 }) {
  const p1 = byId(p1CatId);
  const p2 = mode === "two" ? byId(p2CatId === p1.id ? nextAvailableCat(p1.id) : p2CatId) : null;
  const excluded = p2 ? [p1.id, p2.id] : [p1.id];
  const computers = remainingCats(excluded);
  const catPlan =
    mode === "two"
      ? [
          { def: p1, seat: "bottom", controller: "human", player: 1, label: player1 || "Player 1" },
          { def: p2, seat: "top", controller: "human", player: 2, label: player2 || "Player 2" },
          { def: computers[0] || byId("cloud-nori"), seat: "left", controller: "computer", player: null, label: "Computer Cat A" },
          { def: computers[1] || byId("midnight-bean"), seat: "right", controller: "computer", player: null, label: "Computer Cat B" },
        ]
      : [
          { def: p1, seat: "bottom", controller: "human", player: 1, label: player1 || "Player" },
          { def: computers[0] || byId("cloud-nori"), seat: "top", controller: "computer", player: null, label: "Computer Cat A" },
          { def: computers[1] || byId("star-pickle"), seat: "left", controller: "computer", player: null, label: "Computer Cat B" },
          { def: computers[2] || byId("midnight-bean"), seat: "right", controller: "computer", player: null, label: "Computer Cat C" },
        ];

  return catPlan.slice(0, 4).map((entry, index) => ({
    id: entry.def.id,
    name: entry.def.name,
    displayName: entry.label,
    color: entry.def.color,
    accent: entry.def.accent,
    ear: entry.def.ear,
    accessory: entry.def.accessory,
    personality: entry.def.personality || 0,
    seat: entry.seat || SEAT_ORDER[index],
    controller: entry.controller,
    player: entry.player,
    score: 0,
    normalGrabbed: 0,
    bombGrabbed: 0,
    earlyGrabs: 0,
    locked: false,
    status: "Ready",
    lastReaction: null,
    paw: {
      start: 0,
      duration: 360,
      intensity: 0,
      result: "idle",
    },
  }));
}
