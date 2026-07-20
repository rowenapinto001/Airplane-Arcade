import { GAME_CATALOG } from "./game-state.js";

export const STORAGE_KEY = "airplaneArcadeData";

export const DEFAULT_CONTROLS = {
  football: {
    p1Action: ["KeyA", "Space"],
    p2Action: ["KeyL", "Enter"],
    pause: ["KeyP", "Escape"],
  },
  basketball: {
    p1Action: ["KeyA", "Space"],
    p2Action: ["KeyL", "Enter"],
    pause: ["KeyP", "Escape"],
  },
  memory: {
    select: ["Enter", "Space"],
    up: ["ArrowUp"],
    down: ["ArrowDown"],
    left: ["ArrowLeft"],
    right: ["ArrowRight"],
    pause: ["KeyP", "Escape"],
  },
  sumo: {
    p1Up: ["KeyW"],
    p1Left: ["KeyA"],
    p1Down: ["KeyS"],
    p1Right: ["KeyD"],
    p1Push: ["Space"],
    p2Up: ["ArrowUp"],
    p2Left: ["ArrowLeft"],
    p2Down: ["ArrowDown"],
    p2Right: ["ArrowRight"],
    p2Push: ["Enter"],
    pause: ["KeyP", "Escape"],
  },
  archery: {
    up: ["ArrowUp"],
    down: ["ArrowDown"],
    left: ["ArrowLeft"],
    right: ["ArrowRight"],
    shoot: ["Space", "Enter"],
    pause: ["KeyP", "Escape"],
  },
  "cake-maker": {
    undo: ["KeyZ"],
    save: ["KeyS"],
    party: ["KeyB"],
    pause: ["Escape"],
  },
};

export const DEFAULT_DATA = {
  version: 1,
  settings: {
    sound: true,
    music: false,
    volume: 0.65,
    theme: "light",
    reduceMotion: false,
    controls: DEFAULT_CONTROLS,
  },
  progress: {
    recentlyPlayed: null,
    totalGamesPlayed: 0,
    soloWins: 0,
    player1Wins: 0,
    player2Wins: 0,
    draws: 0,
    highScores: {
      football: 0,
      basketball: 0,
      memory: 0,
      sumo: 0,
      archery: 0,
      "cake-maker": 0,
    },
    footballWins: {
      solo: 0,
      player1: 0,
      player2: 0,
      computer: 0,
      draws: 0,
    },
    basketballRecords: {
      soloHighScore: 0,
      limitedBest: null,
      player1Wins: 0,
      player2Wins: 0,
      draws: 0,
    },
    memoryRecords: {
      easy: { bestTime: null, bestMoves: null, bestStars: 0 },
      normal: { bestTime: null, bestMoves: null, bestStars: 0 },
      hard: { bestTime: null, bestMoves: null, bestStars: 0 },
      player1Wins: 0,
      player2Wins: 0,
      draws: 0,
    },
    sumoRecords: {
      matchesPlayed: 0,
      soloWins: 0,
      soloLosses: 0,
      player1Wins: 0,
      player2Wins: 0,
      draws: 0,
      recentFinalScore: null,
      selectedDifficulty: "normal",
    },
    archeryRecords: {
      bestSoloTotal: 0,
      bestShot: 0,
      totalBullseyes: 0,
      soloGamesPlayed: 0,
      twoPlayerMatchesPlayed: 0,
      player1Wins: 0,
      player2Wins: 0,
      sharedTieWins: 0,
      recentFinalScores: null,
      selectedDifficulty: "normal",
    },
    cakeMakerRecords: {
      cakesMade: 0,
      partyStarts: 0,
      recentlyCreatedCake: null,
      recentCakeName: null,
      savedCakes: [],
    },
    recentResults: [],
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(base, saved) {
  if (!isObject(base)) return saved === undefined ? base : saved;
  const output = { ...base };
  for (const [key, value] of Object.entries(saved || {})) {
    if (Array.isArray(value)) {
      output[key] = [...value];
    } else if (isObject(value) && isObject(base[key])) {
      output[key] = deepMerge(base[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function hasChromeStorage() {
  return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
}

function getLocalFallback() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function setLocalFallback(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function getData() {
  if (hasChromeStorage()) {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    return deepMerge(clone(DEFAULT_DATA), stored[STORAGE_KEY]);
  }
  return deepMerge(clone(DEFAULT_DATA), getLocalFallback());
}

export async function saveData(data) {
  const merged = deepMerge(clone(DEFAULT_DATA), data);
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [STORAGE_KEY]: merged });
  } else {
    setLocalFallback(merged);
  }
  return merged;
}

export async function updateData(mutator) {
  const data = await getData();
  const next = (await mutator(data)) || data;
  return saveData(next);
}

export async function resetData() {
  const clean = clone(DEFAULT_DATA);
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [STORAGE_KEY]: clean });
  } else {
    setLocalFallback(clean);
  }
  return clean;
}

export function getGameProgress(data, gameId) {
  const progress = data.progress;
  if (gameId === "football") {
    return `${progress.footballWins.player1 + progress.footballWins.player2 + progress.footballWins.solo} wins`;
  }
  if (gameId === "basketball") {
    return `Best ${progress.basketballRecords.soloHighScore}`;
  }
  if (gameId === "memory") {
    const best = progress.memoryRecords.normal.bestMoves;
    return best ? `Best ${best} moves` : "No record yet";
  }
  if (gameId === "sumo") {
    const wins =
      progress.sumoRecords.soloWins +
      progress.sumoRecords.player1Wins +
      progress.sumoRecords.player2Wins;
    return `${wins} Sumo wins`;
  }
  if (gameId === "archery") {
    const record = progress.archeryRecords;
    const played = record.soloGamesPlayed + record.twoPlayerMatchesPlayed;
    return `Best ${record.bestSoloTotal} | ${played} played`;
  }
  if (gameId === "cake-maker") {
    const saved = progress.cakeMakerRecords.savedCakes.length;
    const recent = progress.cakeMakerRecords.recentCakeName;
    return recent
      ? `${saved} saved cake${saved === 1 ? "" : "s"} | Recent: ${recent}`
      : `${saved} saved cake${saved === 1 ? "" : "s"}`;
  }
  return "Ready offline";
}

export function getTotalWins(data) {
  return data.progress.soloWins + data.progress.player1Wins + data.progress.player2Wins;
}

export function getRecentResult(data, gameId) {
  return data.progress.recentResults.find((result) => result.gameId === gameId) || null;
}

export async function recordGameResult(result) {
  const stamped = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    playedAt: new Date().toISOString(),
    ...result,
  };

  return updateData((data) => {
    const progress = data.progress;
    progress.recentlyPlayed = stamped.gameId;
    progress.totalGamesPlayed += 1;
    progress.recentResults = [stamped, ...progress.recentResults].slice(0, 12);

    if (stamped.winner === "solo") progress.soloWins += 1;
    if (stamped.winner === "player1") progress.player1Wins += 1;
    if (stamped.winner === "player2") progress.player2Wins += 1;
    if (stamped.winner === "draw") progress.draws += 1;

    progress.highScores[stamped.gameId] = Math.max(
      progress.highScores[stamped.gameId] || 0,
      stamped.score || stamped.player1Score || 0,
      stamped.player2Score || 0,
    );

    if (stamped.gameId === "football") {
      if (stamped.winner === "solo") progress.footballWins.solo += 1;
      if (stamped.winner === "player1") progress.footballWins.player1 += 1;
      if (stamped.winner === "player2") progress.footballWins.player2 += 1;
      if (stamped.winner === "computer") progress.footballWins.computer += 1;
      if (stamped.winner === "draw") progress.footballWins.draws += 1;
    }

    if (stamped.gameId === "basketball") {
      progress.basketballRecords.soloHighScore = Math.max(
        progress.basketballRecords.soloHighScore,
        stamped.score || 0,
      );
      if (stamped.challenge === "target" && stamped.success) {
        progress.basketballRecords.limitedBest =
          progress.basketballRecords.limitedBest === null
            ? stamped.throwsUsed
            : Math.min(progress.basketballRecords.limitedBest, stamped.throwsUsed);
      }
      if (stamped.winner === "player1") progress.basketballRecords.player1Wins += 1;
      if (stamped.winner === "player2") progress.basketballRecords.player2Wins += 1;
      if (stamped.winner === "draw") progress.basketballRecords.draws += 1;
    }

    if (stamped.gameId === "memory") {
      const record = progress.memoryRecords[stamped.difficulty || "normal"];
      if (record) {
        if (stamped.mode === "solo") {
          record.bestTime =
            record.bestTime === null ? stamped.time : Math.min(record.bestTime, stamped.time);
          record.bestMoves =
            record.bestMoves === null ? stamped.moves : Math.min(record.bestMoves, stamped.moves);
          record.bestStars = Math.max(record.bestStars, stamped.stars || 0);
        }
      }
      if (stamped.winner === "player1") progress.memoryRecords.player1Wins += 1;
      if (stamped.winner === "player2") progress.memoryRecords.player2Wins += 1;
      if (stamped.winner === "draw") progress.memoryRecords.draws += 1;
    }

    if (stamped.gameId === "sumo") {
      progress.sumoRecords.matchesPlayed += 1;
      progress.sumoRecords.selectedDifficulty = stamped.difficulty || progress.sumoRecords.selectedDifficulty;
      progress.sumoRecords.recentFinalScore = `${stamped.player1Score}-${stamped.player2Score}`;
      if (stamped.winner === "solo") progress.sumoRecords.soloWins += 1;
      if (stamped.winner === "computer") progress.sumoRecords.soloLosses += 1;
      if (stamped.winner === "player1") progress.sumoRecords.player1Wins += 1;
      if (stamped.winner === "player2") progress.sumoRecords.player2Wins += 1;
      if (stamped.winner === "draw") progress.sumoRecords.draws += 1;
    }

    if (stamped.gameId === "archery") {
      const record = progress.archeryRecords;
      record.selectedDifficulty = stamped.difficulty || record.selectedDifficulty;
      record.recentFinalScores =
        stamped.mode === "solo" ? `${stamped.score}/300` : `${stamped.player1Score}-${stamped.player2Score}`;
      record.bestShot = Math.max(record.bestShot, stamped.bestShot || 0);
      record.totalBullseyes += stamped.bullseyes || 0;
      if (stamped.mode === "solo") {
        record.soloGamesPlayed += 1;
        record.bestSoloTotal = Math.max(record.bestSoloTotal, stamped.score || 0);
      } else {
        record.twoPlayerMatchesPlayed += 1;
        if (stamped.winner === "player1") record.player1Wins += 1;
        if (stamped.winner === "player2") record.player2Wins += 1;
        if (stamped.winner === "draw") record.sharedTieWins += 1;
      }
    }

    return data;
  });
}

export function createEmptyGameResults() {
  return GAME_CATALOG.map((game) => ({
    gameId: game.id,
    result: null,
  }));
}
