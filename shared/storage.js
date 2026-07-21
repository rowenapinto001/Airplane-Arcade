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
  "cloud-crew-clash": {
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    launch: ["Space"],
    ability1: ["Digit1"],
    ability2: ["Digit2"],
    ability3: ["Digit3"],
    pause: ["Escape"],
  },
  "runway-rumble": {
    up: ["KeyW", "ArrowUp"],
    down: ["KeyS", "ArrowDown"],
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    jump: ["Space"],
    dive: ["ShiftLeft", "ShiftRight"],
    cameraLeft: ["KeyQ"],
    cameraRight: ["KeyE"],
    cameraReset: ["KeyR"],
    pause: ["Escape"],
  },
  "cloud-ridge-rally": {
    accelerate: ["KeyD", "ArrowRight"],
    brake: ["KeyA", "ArrowLeft"],
    tiltBack: ["KeyW", "ArrowUp"],
    tiltForward: ["KeyS", "ArrowDown"],
    ability: ["Space"],
    restart: ["KeyR"],
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
      "cloud-crew-clash": 0,
      "runway-rumble": 0,
      "cloud-ridge-rally": 0,
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
    cloudCrewRecords: {
      highestUnlockedLevel: 1,
      stars: {},
      selectedDifficulty: "normal",
      selectedCrewType: "basic",
      flightBadges: 0,
      permanentUpgrades: {
        launchRate: 0,
        hubStrength: 0,
        rallyDuration: 0,
        shieldDuration: 0,
        energyCollection: 0,
      },
      totalVictories: 0,
      totalDefeats: 0,
      missionsCompleted: 0,
      stationsCaptured: 0,
      energyCollected: 0,
      tutorialComplete: false,
      completedLevels: [],
      recentLevel: 1,
    },
    runwayRumbleRecords: {
      tutorialComplete: false,
      tutorialReminders: true,
      selectedDifficulty: "normal",
      selectedCharacter: {
        bodyColor: "sky",
        face: "smile",
        scarf: "red",
        hat: "none",
        accessory: "wing",
        trail: "spark",
        victory: "wave",
      },
      unlockedCosmetics: ["body-sky", "face-smile", "scarf-red", "hat-none", "accessory-wing", "trail-spark", "victory-wave"],
      boardingStars: 0,
      bestPlacement: null,
      totalCompetitions: 0,
      totalRaces: 0,
      totalQualifications: 0,
      round1Qualifications: 0,
      round2Qualifications: 0,
      finalAppearances: 0,
      finalVictories: 0,
      falls: 0,
      checkpointsUsed: 0,
      completedChallenges: [],
      courseChallengeProgress: {},
      pausedCompetition: null,
      selectedCourseOrder: [],
      recentSummary: null,
      cameraSensitivity: 0.65,
    },
    cloudRidgeRallyRecords: {
      highestUnlockedLevel: 1,
      stars: {},
      bestEndless: {},
      bestCampaignDistance: 0,
      unlockedVehicles: ["baggage-buggy"],
      selectedVehicle: "baggage-buggy",
      selectedEnvironment: "runway",
      selectedDifficulty: "normal",
      recentMode: "campaign",
      recentLevel: 1,
      vehicleSkins: {},
      flightCoins: 0,
      boardingStars: 0,
      lostLuggageTokens: 0,
      goldenPropellers: 0,
      bestStuntCombo: 0,
      longestJump: 0,
      longestWheelie: 0,
      totalDistance: 0,
      totalFuelCollected: 0,
      tutorialComplete: false,
      cameraShake: true,
      simpleControls: false,
      completedLevels: [],
      selectedControlStyle: "standard",
      upgrades: {
        "baggage-buggy": { engine: 0, grip: 0, suspension: 0, fuelTank: 0, stability: 0, airControl: 0, brake: 0 },
        "cloud-rover": { engine: 0, grip: 0, suspension: 0, fuelTank: 0, stability: 0, airControl: 0, brake: 0 },
        "runway-jeep": { engine: 0, grip: 0, suspension: 0, fuelTank: 0, stability: 0, airControl: 0, brake: 0 },
        "cargo-truck": { engine: 0, grip: 0, suspension: 0, fuelTank: 0, stability: 0, airControl: 0, brake: 0 },
        "jet-kart": { engine: 0, grip: 0, suspension: 0, fuelTank: 0, stability: 0, airControl: 0, brake: 0 },
        "moon-hopper": { engine: 0, grip: 0, suspension: 0, fuelTank: 0, stability: 0, airControl: 0, brake: 0 },
        "rescue-tractor": { engine: 0, grip: 0, suspension: 0, fuelTank: 0, stability: 0, airControl: 0, brake: 0 },
        "propeller-buggy": { engine: 0, grip: 0, suspension: 0, fuelTank: 0, stability: 0, airControl: 0, brake: 0 },
      },
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
  if (gameId === "cloud-crew-clash") {
    const record = progress.cloudCrewRecords;
    const stars = Object.values(record.stars || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    return `Level ${record.highestUnlockedLevel} | ${stars} stars | ${record.selectedDifficulty}`;
  }
  if (gameId === "runway-rumble") {
    const record = progress.runwayRumbleRecords;
    if (record.pausedCompetition) return `Continue Round ${record.pausedCompetition.round} | ${record.selectedDifficulty}`;
    const best = record.bestPlacement ? `Best ${ordinal(record.bestPlacement)}` : "No final yet";
    return `${best} | ${record.totalCompetitions} played`;
  }
  if (gameId === "cloud-ridge-rally") {
    const record = progress.cloudRidgeRallyRecords;
    const stars = Object.values(record.stars || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    const best = Math.max(record.bestCampaignDistance || 0, ...Object.values(record.bestEndless || {}).map(Number));
    return `Best ${Math.floor(best)}m | Level ${record.highestUnlockedLevel} | ${stars} stars`;
  }
  return "Ready offline";
}

function ordinal(value) {
  const number = Number(value);
  const suffix = number % 10 === 1 && number % 100 !== 11 ? "st" : number % 10 === 2 && number % 100 !== 12 ? "nd" : number % 10 === 3 && number % 100 !== 13 ? "rd" : "th";
  return `${number}${suffix}`;
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

    if (stamped.gameId === "cloud-crew-clash") {
      const record = progress.cloudCrewRecords;
      record.selectedDifficulty = stamped.difficulty || record.selectedDifficulty;
      record.selectedCrewType = stamped.crewType || record.selectedCrewType;
      record.recentLevel = stamped.level || record.recentLevel || 1;
      record.stationsCaptured += stamped.stationsCaptured || 0;
      record.energyCollected += stamped.energyCollected || 0;
      if (stamped.tutorialComplete) record.tutorialComplete = true;
      if (stamped.winner === "solo") {
        record.totalVictories += 1;
        record.missionsCompleted += 1;
        const levelKey = String(stamped.level || 1);
        record.stars[levelKey] = Math.max(record.stars[levelKey] || 0, stamped.stars || 1);
        record.highestUnlockedLevel = Math.max(record.highestUnlockedLevel, Math.min(10, (stamped.level || 1) + 1));
        if (!record.completedLevels.includes(stamped.level)) record.completedLevels.push(stamped.level);
        record.flightBadges += stamped.flightBadges || 0;
      }
      if (stamped.winner === "computer") record.totalDefeats += 1;
    }

    if (stamped.gameId === "runway-rumble") {
      const record = progress.runwayRumbleRecords;
      record.selectedDifficulty = stamped.difficulty || record.selectedDifficulty;
      record.selectedCharacter = stamped.character || record.selectedCharacter;
      record.cameraSensitivity = stamped.cameraSensitivity ?? record.cameraSensitivity;
      record.recentSummary = stamped.summary || record.recentSummary;
      record.falls += stamped.falls || 0;
      record.checkpointsUsed += stamped.checkpointsUsed || 0;
      if (stamped.tutorialComplete) {
        record.tutorialComplete = true;
        record.tutorialReminders = false;
      }
      if (Array.isArray(stamped.selectedCourseOrder)) record.selectedCourseOrder = [...stamped.selectedCourseOrder];
      if (stamped.round1Qualified) {
        record.round1Qualifications += 1;
        record.totalQualifications += 1;
      }
      if (stamped.round2Qualified) {
        record.round2Qualifications += 1;
        record.totalQualifications += 1;
      }
      if (stamped.finalAppearance) record.finalAppearances += 1;
      if (stamped.competitionEnded) {
        record.totalCompetitions += 1;
        record.pausedCompetition = null;
      }
      record.totalRaces += stamped.roundsPlayed || stamped.roundNumber || 0;
      if (stamped.finalPlacement) {
        record.bestPlacement =
          record.bestPlacement === null
            ? stamped.finalPlacement
            : Math.min(record.bestPlacement, stamped.finalPlacement);
      }
      if (stamped.winner === "solo") record.finalVictories += 1;
      record.boardingStars += stamped.boardingStars || 0;
      for (const challenge of stamped.completedChallenges || []) {
        if (!record.completedChallenges.includes(challenge)) record.completedChallenges.push(challenge);
      }
      for (const cosmetic of stamped.unlockedCosmetics || []) {
        if (!record.unlockedCosmetics.includes(cosmetic)) record.unlockedCosmetics.push(cosmetic);
      }
    }

    if (stamped.gameId === "cloud-ridge-rally") {
      const record = progress.cloudRidgeRallyRecords;
      record.selectedDifficulty = stamped.difficulty || record.selectedDifficulty;
      record.selectedVehicle = stamped.vehicle || record.selectedVehicle;
      record.selectedEnvironment = stamped.environment || record.selectedEnvironment;
      record.recentMode = stamped.rallyMode || record.recentMode;
      record.recentLevel = stamped.level || record.recentLevel || 1;
      record.flightCoins += Math.max(0, Math.floor(stamped.coins || 0));
      record.boardingStars += stamped.rare?.boardingStars || 0;
      record.lostLuggageTokens += stamped.rare?.luggageTokens || 0;
      record.goldenPropellers += stamped.rare?.goldenPropellers || 0;
      record.bestStuntCombo = Math.max(record.bestStuntCombo || 0, stamped.combo || 0);
      record.longestJump = Math.max(record.longestJump || 0, stamped.longestJump || 0);
      record.longestWheelie = Math.max(record.longestWheelie || 0, stamped.longestWheelie || 0);
      record.totalDistance += stamped.distance || 0;
      record.totalFuelCollected += stamped.rare?.fuelCollected || 0;
      record.bestCampaignDistance = Math.max(record.bestCampaignDistance || 0, stamped.distance || 0);
      if (stamped.rallyMode === "endless") {
        record.bestEndless[stamped.environment || "runway"] = Math.max(
          record.bestEndless[stamped.environment || "runway"] || 0,
          stamped.distance || 0,
        );
      }
      if (stamped.completed && stamped.level) {
        const key = String(stamped.level);
        record.stars[key] = Math.max(record.stars[key] || 0, stamped.stars || 1);
        record.highestUnlockedLevel = Math.max(record.highestUnlockedLevel || 1, Math.min(12, stamped.level + 1));
        if (!record.completedLevels.includes(stamped.level)) record.completedLevels.push(stamped.level);
      }
      for (const vehicleId of [
        "cloud-rover",
        "runway-jeep",
        "cargo-truck",
        "jet-kart",
        "moon-hopper",
        "rescue-tractor",
        "propeller-buggy",
      ]) {
        const unlockByLevel = { "cloud-rover": 3, "cargo-truck": 5, "moon-hopper": 9 }[vehicleId];
        const unlockByStars = vehicleId === "rescue-tractor" && Object.values(record.stars || {}).reduce((sum, value) => sum + Number(value || 0), 0) >= 18;
        const unlockByPropellers = vehicleId === "propeller-buggy" && record.goldenPropellers >= 3;
        if ((unlockByLevel && record.highestUnlockedLevel >= unlockByLevel) || unlockByStars || unlockByPropellers) {
          if (!record.unlockedVehicles.includes(vehicleId)) record.unlockedVehicles.push(vehicleId);
        }
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
