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
  "sky-ludo": {
    roll: ["Space", "Enter"],
    select: ["Enter"],
    up: ["ArrowUp"],
    down: ["ArrowDown"],
    left: ["ArrowLeft"],
    right: ["ArrowRight"],
    pause: ["Escape"],
  },
  "sky-hangman": {
    hint: ["KeyH"],
    restart: ["KeyR"],
    continue: ["Enter"],
    pause: ["Escape"],
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
  "pyramid-smash": {
    aimLeft: ["ArrowLeft"],
    aimRight: ["ArrowRight"],
    aimUp: ["ArrowUp"],
    aimDown: ["ArrowDown"],
    power: ["Space"],
    nextBall: ["KeyN"],
    resetCamera: ["KeyR"],
    pause: ["Escape"],
  },
  "runway-circuit": {
    up: ["KeyW", "ArrowUp"],
    down: ["KeyS", "ArrowDown"],
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    handbrake: ["Space"],
    boost: ["ShiftLeft", "ShiftRight"],
    reset: ["KeyR"],
    pause: ["Escape"],
  },
  "cloud-ridge-rally": {
    accelerate: ["KeyD", "ArrowRight"],
    brake: ["KeyA", "ArrowLeft"],
    jump: ["KeyW", "ArrowUp"],
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
      "sky-ludo": 0,
      "sky-hangman": 0,
      archery: 0,
      "cake-maker": 0,
      "pyramid-smash": 0,
      "runway-circuit": 0,
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
    skyLudoRecords: {
      totalGamesPlayed: 0,
      soloDuelWins: 0,
      soloClassicWins: 0,
      player1Wins: 0,
      player2Wins: 0,
      easyWins: 0,
      normalWins: 0,
      hardWins: 0,
      totalDiceRolls: 0,
      totalSixes: 0,
      totalCaptures: 0,
      totalTokensHome: 0,
      fastestWin: null,
      longestGame: 0,
      currentWinStreak: 0,
      bestWinStreak: 0,
      flightCoins: 0,
      savedGameState: null,
      selectedMode: "solo-duel",
      selectedDifficulty: "normal",
      recentSummary: null,
      preferredRules: {
        quickMode: false,
        fastStart: false,
        blocksEnabled: true,
        threeSixesPenalty: true,
        homeBonus: true,
        continueRanking: false,
        fasterAi: false,
        fasterAnimations: false,
      },
    },
    skyHangmanRecords: {
      totalRounds: 0,
      totalWordsCompleted: 0,
      totalWordsMissed: 0,
      easyWins: 0,
      normalWins: 0,
      hardWins: 0,
      player1Wins: 0,
      player2Wins: 0,
      sharedTieWins: 0,
      longestStreak: 0,
      currentStreak: 0,
      highestScore: 0,
      bestCategory: null,
      categoryWins: {},
      lettersGuessed: 0,
      incorrectLetters: {},
      hintsUsed: 0,
      survivalRecord: 0,
      preferredCategory: "Airport",
      preferredDifficulty: "normal",
      preferredVariation: "classic",
      selectedMode: "solo",
      player1Name: "Player 1",
      player2Name: "Player 2",
      recentWords: [],
      recentSummary: null,
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
    pyramidSmashRecords: {
      highestUnlockedLevel: 1,
      stars: {},
      bestShots: {},
      completedLevels: [],
      bonusTargets: {},
      flightCoins: 0,
      championBadge: false,
      endlessUnlocked: false,
      endlessBest: 0,
      totalBallsThrown: 0,
      totalBoxesRemoved: 0,
      totalThreeStarLevels: 0,
      selectedMode: "solo",
      selectedLevel: 1,
      player1Name: "Player 1",
      player2Name: "Player 2",
      tutorialComplete: false,
      recentSummary: null,
      soloCompletions: 0,
      twoPlayerMatches: 0,
      player1Wins: 0,
      player2Wins: 0,
      draws: 0,
    },
    runwayCircuitRecords: {
      tutorialComplete: false,
      selectedDifficulty: "normal",
      selectedLevel: 1,
      selectedCar: "runway-rookie",
      unlockedCars: ["runway-rookie", "cargo-cruiser", "sky-sprint", "curve-comet"],
      carUpgrades: {
        "runway-rookie": { engine: 0, acceleration: 0, grip: 0, brakes: 0, steering: 0, boost: 0, stability: 0 },
        "cargo-cruiser": { engine: 0, acceleration: 0, grip: 0, brakes: 0, steering: 0, boost: 0, stability: 0 },
        "sky-sprint": { engine: 0, acceleration: 0, grip: 0, brakes: 0, steering: 0, boost: 0, stability: 0 },
        "curve-comet": { engine: 0, acceleration: 0, grip: 0, brakes: 0, steering: 0, boost: 0, stability: 0 },
        "jetline-gt": { engine: 0, acceleration: 0, grip: 0, brakes: 0, steering: 0, boost: 0, stability: 0 },
      },
      flightCoins: 0,
      stars: {},
      bestPositions: {},
      bestLapTimes: {},
      bestTotalTimes: {},
      highestUnlockedLevel: 1,
      totalRaces: 0,
      totalWins: 0,
      totalOvertakes: 0,
      totalCollisions: 0,
      totalResets: 0,
      championBadge: false,
      timeTrialUnlocked: false,
      timeTrialBest: {},
      ghostData: {},
      recentSummary: null,
      cameraDistance: 1,
      cameraShake: true,
      showGhost: true,
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

function sanitizeData(data) {
  const installedGames = new Set(GAME_CATALOG.map((game) => game.id));
  if (!installedGames.has(data.progress.recentlyPlayed)) data.progress.recentlyPlayed = null;
  data.progress.recentResults = (data.progress.recentResults || []).filter((result) => installedGames.has(result.gameId));
  for (const gameId of Object.keys(data.progress.highScores || {})) {
    if (!installedGames.has(gameId)) delete data.progress.highScores[gameId];
  }
  for (const gameId of Object.keys(data.settings.controls || {})) {
    if (!installedGames.has(gameId)) delete data.settings.controls[gameId];
  }
  return data;
}

export async function getData() {
  if (hasChromeStorage()) {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    return sanitizeData(deepMerge(clone(DEFAULT_DATA), stored[STORAGE_KEY]));
  }
  return sanitizeData(deepMerge(clone(DEFAULT_DATA), getLocalFallback()));
}

export async function saveData(data) {
  const merged = sanitizeData(deepMerge(clone(DEFAULT_DATA), data));
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
  if (gameId === "sky-ludo") {
    const record = progress.skyLudoRecords;
    const wins = (record.soloDuelWins || 0) + (record.soloClassicWins || 0) + (record.player1Wins || 0) + (record.player2Wins || 0);
    const saved = record.savedGameState ? "Continue saved" : "No saved match";
    return `${saved} | ${wins} wins | ${modeLabel(record.selectedMode)}`;
  }
  if (gameId === "sky-hangman") {
    const record = progress.skyHangmanRecords;
    const summary = record.recentSummary || "No words guessed yet";
    return `${summary} | High ${record.highestScore || 0} | Streak ${record.longestStreak || 0}`;
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
  if (gameId === "pyramid-smash") {
    const record = progress.pyramidSmashRecords;
    const stars = Object.values(record.stars || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    return `Level ${record.highestUnlockedLevel} | ${stars} stars | ${record.flightCoins} coins`;
  }
  if (gameId === "runway-circuit") {
    const record = progress.runwayCircuitRecords;
    const selected = String(record.selectedLevel || 1);
    const best = record.bestPositions?.[selected] ? `Best ${ordinal(record.bestPositions[selected])}` : "No finish yet";
    return `${best} | Level ${record.highestUnlockedLevel || 1}/5 | ${record.flightCoins || 0} coins`;
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

function modeLabel(mode) {
  if (mode === "solo-duel") return "Solo Duel";
  if (mode === "solo-classic") return "Solo Classic";
  if (mode === "two") return "Two Players";
  return "Ready";
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

    if (stamped.gameId === "sky-ludo") {
      const record = progress.skyLudoRecords;
      record.totalGamesPlayed += 1;
      record.selectedMode = stamped.mode || record.selectedMode;
      record.selectedDifficulty = stamped.difficulty || record.selectedDifficulty;
      record.recentSummary = stamped.summary || record.recentSummary;
      record.totalDiceRolls += stamped.diceRolls || 0;
      record.totalSixes += stamped.sixes || 0;
      record.totalCaptures += stamped.captures || 0;
      record.totalTokensHome += stamped.tokensHome || 0;
      record.flightCoins += Math.max(0, Math.floor(stamped.flightCoins || 0));
      record.longestGame = Math.max(record.longestGame || 0, stamped.duration || 0);
      if (stamped.winner === "solo") {
        if (stamped.mode === "solo-classic") record.soloClassicWins += 1;
        else record.soloDuelWins += 1;
        record.currentWinStreak += 1;
        record.bestWinStreak = Math.max(record.bestWinStreak || 0, record.currentWinStreak);
        record.fastestWin =
          record.fastestWin === null || (stamped.duration || 0) < record.fastestWin
            ? stamped.duration || 0
            : record.fastestWin;
        if (stamped.difficulty === "easy") record.easyWins += 1;
        if (stamped.difficulty === "normal") record.normalWins += 1;
        if (stamped.difficulty === "hard") record.hardWins += 1;
      } else {
        record.currentWinStreak = 0;
      }
      if (stamped.winner === "player1") record.player1Wins += 1;
      if (stamped.winner === "player2") record.player2Wins += 1;
      if (stamped.completed) record.savedGameState = null;
    }

    if (stamped.gameId === "sky-hangman") {
      const record = progress.skyHangmanRecords;
      record.totalRounds += 1;
      record.selectedMode = stamped.mode || record.selectedMode;
      record.preferredDifficulty = stamped.difficulty || record.preferredDifficulty;
      record.preferredCategory = stamped.category && stamped.category !== "Two Player" ? stamped.category : record.preferredCategory;
      record.preferredVariation = stamped.variation || record.preferredVariation;
      record.recentSummary = stamped.summary || record.recentSummary;
      record.highestScore = Math.max(record.highestScore || 0, stamped.score || stamped.player1Score || stamped.player2Score || 0);
      record.hintsUsed += stamped.hintsUsed || 0;
      record.lettersGuessed += (stamped.wordLength || 0) + (stamped.incorrectLetters?.length || 0);
      if (Array.isArray(stamped.incorrectLetters)) {
        for (const letter of stamped.incorrectLetters) {
          record.incorrectLetters[letter] = (record.incorrectLetters[letter] || 0) + 1;
        }
      }
      if (stamped.word && !record.recentWords.includes(stamped.word)) {
        record.recentWords = [stamped.word, ...record.recentWords].slice(0, 18);
      }
      if (stamped.mode === "two") {
        if (stamped.winner === "player1") record.player1Wins += 1;
        if (stamped.winner === "player2") record.player2Wins += 1;
        if (stamped.winner === "draw") record.sharedTieWins += 1;
        record.currentStreak = 0;
      } else if (stamped.won || stamped.completed) {
        record.totalWordsCompleted += 1;
        record.currentStreak += 1;
        record.longestStreak = Math.max(record.longestStreak || 0, record.currentStreak);
        if (stamped.difficulty === "easy") record.easyWins += 1;
        if (stamped.difficulty === "normal") record.normalWins += 1;
        if (stamped.difficulty === "hard") record.hardWins += 1;
        if (stamped.category) {
          record.categoryWins[stamped.category] = (record.categoryWins[stamped.category] || 0) + 1;
          record.bestCategory = Object.entries(record.categoryWins).sort((a, b) => b[1] - a[1])[0]?.[0] || record.bestCategory;
        }
        record.survivalRecord = Math.max(record.survivalRecord || 0, stamped.survivalCompleted || 0);
      } else {
        record.totalWordsMissed += 1;
        record.currentStreak = 0;
      }
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

    if (stamped.gameId === "pyramid-smash") {
      const record = progress.pyramidSmashRecords;
      record.selectedMode = stamped.pyramidMode || record.selectedMode;
      record.selectedLevel = stamped.level || record.selectedLevel || 1;
      record.recentSummary = stamped.summary || record.recentSummary;
      record.totalBallsThrown += stamped.totalShots || stamped.shots || 0;
      record.totalBoxesRemoved += stamped.boxesRemoved || 0;
      record.flightCoins += Math.max(0, Math.floor(stamped.flightCoins || 0));
      if (stamped.tutorialComplete) record.tutorialComplete = true;
      if (stamped.pyramidMode === "two") {
        record.twoPlayerMatches += 1;
        if (stamped.winner === "player1") record.player1Wins += 1;
        if (stamped.winner === "player2") record.player2Wins += 1;
        if (stamped.winner === "draw") record.draws += 1;
      }
      if (stamped.pyramidMode === "endless") {
        record.endlessBest = Math.max(record.endlessBest || 0, stamped.endlessScore || 0);
      }
      if (stamped.completed && stamped.level && stamped.level <= 25) {
        const levelKey = String(stamped.level);
        record.stars[levelKey] = Math.max(record.stars[levelKey] || 0, stamped.stars || 1);
        if (stamped.shots) {
          record.bestShots[levelKey] =
            record.bestShots[levelKey] === undefined
              ? stamped.shots
              : Math.min(record.bestShots[levelKey], stamped.shots);
        }
        record.bonusTargets[levelKey] = Math.max(record.bonusTargets[levelKey] || 0, stamped.bonusCollected || 0);
        record.highestUnlockedLevel = Math.max(record.highestUnlockedLevel || 1, Math.min(25, stamped.level + 1));
        if (!record.completedLevels.includes(stamped.level)) record.completedLevels.push(stamped.level);
        if (stamped.pyramidMode !== "two") record.soloCompletions += 1;
        if (stamped.level >= 25) {
          record.championBadge = true;
          record.endlessUnlocked = true;
        }
      }
      record.totalThreeStarLevels = Object.values(record.stars || {}).filter((value) => Number(value || 0) >= 3).length;
    }

    if (stamped.gameId === "runway-circuit") {
      const record = progress.runwayCircuitRecords;
      const levelKey = String(stamped.level || record.selectedLevel || 1);
      record.selectedDifficulty = stamped.difficulty || record.selectedDifficulty;
      record.selectedCar = stamped.car || record.selectedCar;
      record.selectedLevel = stamped.level || record.selectedLevel || 1;
      record.cameraDistance = stamped.cameraDistance ?? record.cameraDistance;
      record.cameraShake = stamped.cameraShake ?? record.cameraShake;
      record.showGhost = stamped.showGhost ?? record.showGhost;
      record.recentSummary = stamped.summary || record.recentSummary;
      record.totalRaces += 1;
      record.totalOvertakes += stamped.overtakes || 0;
      record.totalCollisions += stamped.collisions || 0;
      record.totalResets += stamped.resets || 0;
      record.flightCoins += Math.max(0, Math.floor(stamped.flightCoins || 0));
      if (stamped.tutorialComplete) record.tutorialComplete = true;
      if (stamped.completed) {
        record.bestPositions[levelKey] =
          record.bestPositions[levelKey] === undefined
            ? stamped.finalPosition
            : Math.min(record.bestPositions[levelKey], stamped.finalPosition);
        if (Number.isFinite(stamped.bestLap)) {
          record.bestLapTimes[levelKey] =
            record.bestLapTimes[levelKey] === undefined
              ? stamped.bestLap
              : Math.min(record.bestLapTimes[levelKey], stamped.bestLap);
        }
        if (Number.isFinite(stamped.totalTime)) {
          record.bestTotalTimes[levelKey] =
            record.bestTotalTimes[levelKey] === undefined
              ? stamped.totalTime
              : Math.min(record.bestTotalTimes[levelKey], stamped.totalTime);
        }
        record.stars[levelKey] = Math.max(record.stars[levelKey] || 0, stamped.stars || 1);
        if (stamped.unlocked) record.highestUnlockedLevel = Math.max(record.highestUnlockedLevel || 1, Math.min(5, (stamped.level || 1) + 1));
        if (stamped.finalPosition === 1) record.totalWins += 1;
        if (stamped.champion) {
          record.championBadge = true;
          record.timeTrialUnlocked = true;
          if (!record.unlockedCars.includes("jetline-gt")) record.unlockedCars.push("jetline-gt");
        }
      }
      if (stamped.circuitMode === "time-trial" && stamped.completed && Number.isFinite(stamped.totalTime)) {
        const previous = record.timeTrialBest[levelKey];
        if (!previous || stamped.totalTime < previous.totalTime) {
          record.timeTrialBest[levelKey] = {
            totalTime: stamped.totalTime,
            bestLap: stamped.bestLap,
            car: stamped.car,
            playedAt: stamped.playedAt,
          };
          if (Array.isArray(stamped.ghost)) {
            record.ghostData[levelKey] = stamped.ghost.slice(0, 600);
          }
        }
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
