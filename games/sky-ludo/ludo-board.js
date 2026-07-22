export const MAIN_PATH_LENGTH = 52;
export const HOME_PATH_LENGTH = 6;
export const FINISH_STEP = MAIN_PATH_LENGTH + HOME_PATH_LENGTH;
export const TOKENS_CLASSIC = 4;
export const TOKENS_QUICK = 2;

export const PLAYER_DEFINITIONS = {
  blue: {
    id: "blue",
    label: "Blue Wing",
    shortLabel: "Blue",
    symbol: "wing",
    icon: "W",
    color: "#38aee2",
    accent: "#dff8ff",
    startIndex: 0,
    yard: { x: 2, y: 12 },
    yardSlots: [
      [1.8, 11.7],
      [3.2, 11.7],
      [1.8, 13.1],
      [3.2, 13.1],
    ],
    homeSlots: [
      [6.6, 7.25],
      [6.9, 7.25],
      [7.2, 7.25],
      [7.5, 7.25],
    ],
  },
  yellow: {
    id: "yellow",
    label: "Yellow Star",
    shortLabel: "Yellow",
    symbol: "star",
    icon: "*",
    color: "#ffd35a",
    accent: "#fff4c8",
    startIndex: 13,
    yard: { x: 2, y: 2 },
    yardSlots: [
      [1.8, 1.8],
      [3.2, 1.8],
      [1.8, 3.2],
      [3.2, 3.2],
    ],
    homeSlots: [
      [6.75, 6.65],
      [6.75, 6.95],
      [6.75, 7.25],
      [6.75, 7.55],
    ],
  },
  green: {
    id: "green",
    label: "Green Cloud",
    shortLabel: "Green",
    symbol: "cloud",
    icon: "C",
    color: "#2fb36d",
    accent: "#e8fbf3",
    startIndex: 26,
    yard: { x: 12, y: 2 },
    yardSlots: [
      [11.8, 1.8],
      [13.2, 1.8],
      [11.8, 3.2],
      [13.2, 3.2],
    ],
    homeSlots: [
      [7.4, 6.75],
      [7.1, 6.75],
      [6.8, 6.75],
      [6.5, 6.75],
    ],
  },
  coral: {
    id: "coral",
    label: "Coral Compass",
    shortLabel: "Coral",
    symbol: "compass",
    icon: "N",
    color: "#ef5b63",
    accent: "#fce7ee",
    startIndex: 39,
    yard: { x: 12, y: 12 },
    yardSlots: [
      [11.8, 11.7],
      [13.2, 11.7],
      [11.8, 13.1],
      [13.2, 13.1],
    ],
    homeSlots: [
      [7.25, 7.4],
      [7.25, 7.1],
      [7.25, 6.8],
      [7.25, 6.5],
    ],
  },
};

export const PLAYER_ORDER = ["blue", "yellow", "green", "coral"];

export const MAIN_PATH = [
  [6, 13],
  [6, 12],
  [6, 11],
  [6, 10],
  [6, 9],
  [5, 8],
  [4, 8],
  [3, 8],
  [2, 8],
  [1, 8],
  [0, 8],
  [0, 7],
  [0, 6],
  [1, 6],
  [2, 6],
  [3, 6],
  [4, 6],
  [5, 6],
  [6, 5],
  [6, 4],
  [6, 3],
  [6, 2],
  [6, 1],
  [6, 0],
  [7, 0],
  [8, 0],
  [8, 1],
  [8, 2],
  [8, 3],
  [8, 4],
  [8, 5],
  [9, 6],
  [10, 6],
  [11, 6],
  [12, 6],
  [13, 6],
  [14, 6],
  [14, 7],
  [14, 8],
  [13, 8],
  [12, 8],
  [11, 8],
  [10, 8],
  [9, 8],
  [8, 9],
  [8, 10],
  [8, 11],
  [8, 12],
  [8, 13],
  [8, 14],
  [7, 14],
  [6, 14],
];

export const HOME_PATHS = {
  blue: [
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
    [7, 8],
  ],
  yellow: [
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
    [6, 7],
  ],
  green: [
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
    [7, 6],
  ],
  coral: [
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
    [8, 7],
  ],
};

export const CENTER = [7, 7];
export const SAFE_MAIN_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export function activePlayerIds(mode) {
  if (mode === "solo-duel") return ["blue", "green"];
  if (mode === "two") return ["blue", "green"];
  return PLAYER_ORDER;
}

export function getPlayerDefinition(playerId) {
  return PLAYER_DEFINITIONS[playerId] || PLAYER_DEFINITIONS.blue;
}

export function mainIndexFor(playerId, steps) {
  const player = getPlayerDefinition(playerId);
  return (player.startIndex + steps) % MAIN_PATH_LENGTH;
}

export function isMainStep(steps) {
  return steps >= 0 && steps < MAIN_PATH_LENGTH;
}

export function isHomePathStep(steps) {
  return steps >= MAIN_PATH_LENGTH && steps < FINISH_STEP;
}

export function isFinishedStep(steps) {
  return steps >= FINISH_STEP;
}

export function isSafeMainIndex(mainIndex) {
  return SAFE_MAIN_INDICES.has(mainIndex);
}

export function logicalPosition(playerId, steps) {
  if (steps < 0) return `yard:${playerId}`;
  if (isFinishedStep(steps)) return `finish:${playerId}`;
  if (isHomePathStep(steps)) return `home:${playerId}:${steps - MAIN_PATH_LENGTH}`;
  return `main:${mainIndexFor(playerId, steps)}`;
}

export function gridPositionForToken(playerId, token, tokenIndex = 0) {
  const player = getPlayerDefinition(playerId);
  if (token.steps < 0) return player.yardSlots[token.yardSlot ?? tokenIndex] || player.yardSlots[0];
  if (isFinishedStep(token.steps)) return player.homeSlots[tokenIndex] || CENTER;
  if (isHomePathStep(token.steps)) return HOME_PATHS[playerId][token.steps - MAIN_PATH_LENGTH];
  return MAIN_PATH[mainIndexFor(playerId, token.steps)];
}

export function pathForMove(playerId, fromSteps, diceValue) {
  if (fromSteps < 0) return [0];
  const output = [];
  for (let step = fromSteps + 1; step <= Math.min(FINISH_STEP, fromSteps + diceValue); step += 1) {
    output.push(step);
  }
  return output;
}
