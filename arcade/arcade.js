import { arcadeAudio } from "../shared/audio.js";
import {
  CHALLENGE_LABELS,
  COMING_SOON,
  DIFFICULTY_DETAILS,
  DIFFICULTY_LABELS,
  GAME_CATALOG,
  MODE_LABELS,
  getGame,
  getGameName,
} from "../shared/game-state.js";
import {
  getData,
  getGameProgress,
  getRecentResult,
  getTotalWins,
  resetData,
  updateData,
} from "../shared/storage.js";
import { bindKeyRecorder, describeGameControls, keyLabel } from "../shared/controls.js";
import { clearNode, createElement, formatDuration, setPressed } from "../shared/navigation.js";
import { createFootballGame } from "../games/football/football.js";
import { createBasketballGame } from "../games/basketball/basketball.js";
import { createMemoryGame } from "../games/memory/memory.js";
import { createSkyLudoGame } from "../games/sky-ludo/sky-ludo.js";
import { createAirportChefGame } from "../games/airport-chef/airport-chef.js";
import { createArcheryGame } from "../games/archery/archery.js";
import { createCakeMakerGame } from "../games/cake-maker/cake-maker.js";
import { createPyramidSmashGame } from "../games/pyramid-smash/pyramid-smash.js";
import { createRunwayCircuitGame } from "../games/runway-circuit/runway-circuit.js";
import { createCloudRidgeRallyGame } from "../games/cloud-ridge-rally/cloud-ridge-rally.js";
import { createRedEyeRunGame } from "../games/red-eye-run/red-eye-run.js";

const app = document.querySelector("#arcadeApp");
const view = document.querySelector("#arcadeView");
const ribbon = document.querySelector("#statusRibbon");
const navButtons = [...document.querySelectorAll("[data-nav]")];
const homeLogo = document.querySelector("#homeLogo");

const GAME_FACTORIES = {
  football: createFootballGame,
  basketball: createBasketballGame,
  memory: createMemoryGame,
  "sky-ludo": createSkyLudoGame,
  "airport-chef": createAirportChefGame,
  archery: createArcheryGame,
  "cake-maker": createCakeMakerGame,
  "pyramid-smash": createPyramidSmashGame,
  "runway-circuit": createRunwayCircuitGame,
  "cloud-ridge-rally": createCloudRidgeRallyGame,
  "red-eye-run": createRedEyeRunGame,
};

let data;
let activeGame = null;
let activeNav = "library";
let libraryFilter = "all";
let setup = {
  gameId: "football",
  mode: "solo",
  difficulty: "normal",
  challenge: "rush",
  player1: "Player 1",
  player2: "Player 2",
};

function destroyActiveGame() {
  if (activeGame) {
    activeGame.destroyGame();
    activeGame = null;
  }
}

function setNav(name) {
  activeNav = name;
  for (const button of navButtons) {
    button.classList.toggle("is-active", button.dataset.nav === name);
  }
}

function setRibbon(text) {
  ribbon.textContent = text;
}

function button(label, className, action) {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.className = className;
  element.addEventListener("click", () => {
    arcadeAudio.play("button");
    action();
  });
  return element;
}

function routeHash(hash) {
  history.replaceState(null, "", hash || location.pathname);
}

function focusView() {
  view.focus({ preventScroll: true });
}

function renderLibrary(filter = libraryFilter) {
  destroyActiveGame();
  libraryFilter = filter;
  setNav("library");
  setRibbon("Choose a game, mode, and difficulty. Everything runs locally inside the extension.");
  routeHash("");
  clearNode(view);

  const hero = createElement("section", "hero-band");
  const heroCopy = createElement("div", "hero-copy");
  const title = createElement("h1", "", "Airplane Arcade");
  const copy = createElement(
    "p",
    "",
    "A small offline arcade for laptops: eleven original games, solo and local two-player modes, saved progress, and no internet needed after install.",
  );
  heroCopy.append(title, copy);

  const stats = createElement("div", "hero-stats");
  stats.append(
    statTile("Games", String(GAME_CATALOG.length)),
    statTile("Played", String(data.progress.totalGamesPlayed)),
    statTile("Wins", String(getTotalWins(data))),
  );
  hero.append(heroCopy, stats);

  const filters = createElement("div", "filter-row");
  const filterButtons = [
    ["all", "All Games"],
    ["solo", "Solo"],
    ["two", "Two Players"],
    ["recent", "Recently Played"],
  ].map(([value, label]) => {
    const filterButton = button(label, "", () => renderLibrary(value));
    filterButton.dataset.value = value;
    return filterButton;
  });
  filters.append(...filterButtons);
  setPressed(filterButtons, filter);

  const grid = createElement("section", "game-grid");
  const games = GAME_CATALOG.filter((game) => {
    if (filter === "all") return true;
    if (filter === "recent") return data.progress.recentlyPlayed === game.id;
    return game.modes.includes(filter);
  });

  if (games.length === 0) {
    grid.append(createElement("div", "empty-state", "No recently played game yet. Launch any game to fill this shelf."));
  } else {
    for (const game of games) {
      grid.append(gameCard(game));
    }
  }

  if (filter === "all") {
    for (const game of COMING_SOON) {
      grid.append(comingSoonCard(game));
    }
  }

  view.append(hero, filters, grid);
  focusView();
}

function statTile(label, value) {
  const tile = createElement("div", "stat-tile");
  tile.append(createElement("span", "", label), createElement("strong", "", value));
  return tile;
}

function gameCard(game) {
  const card = createElement("article", "library-card");
  const art = createElement("div", "library-art");
  const img = document.createElement("img");
  img.src = game.image;
  img.alt = "";
  art.append(img);

  const body = createElement("div", "library-body");
  body.append(createElement("span", "card-meta", getGameProgress(data, game.id)));
  body.append(createElement("h2", "", game.name));
  body.append(createElement("p", "", game.description));

  const badges = createElement("div", "badge-row");
  if (game.modes.includes("solo")) badges.append(createElement("span", "mode-badge", "Solo"));
  if (game.modes.includes("two")) badges.append(createElement("span", "mode-badge two", "Two Players"));
  badges.append(createElement("span", "mode-badge offline", "Offline"));
  for (const badge of game.badges || []) {
    badges.append(createElement("span", "mode-badge", badge));
  }

  const playRow = createElement("div", "play-row");
  const recent = getRecentResult(data, game.id);
  playRow.append(createElement("span", "card-meta", recent ? "Recent result saved" : "Ready offline"));
  if (game.id === "pyramid-smash" && data.progress.pyramidSmashRecords.highestUnlockedLevel > 1) {
    playRow.append(button("Continue", "secondary-button", () => launchGame(game.id, { continueCampaign: true })));
  }
  if (game.id === "runway-circuit" && data.progress.runwayCircuitRecords.highestUnlockedLevel > 1) {
    playRow.append(button("Continue", "secondary-button", () => launchGame(game.id, { continueCampaign: true })));
  }
  if (game.id === "sky-ludo" && data.progress.skyLudoRecords.savedGameState) {
    playRow.append(button("Continue", "secondary-button", () => launchGame(game.id, { continueGame: true })));
  }
  if (game.id === "airport-chef" && data.progress.airportChefRecords.highestUnlockedLevel > 1) {
    playRow.append(button("Continue", "secondary-button", () => launchGame(game.id, { continueCampaign: true })));
  }
  playRow.append(button("Play", "primary-button", () => renderGameSetup(game.id)));

  body.append(badges, playRow);
  card.append(art, body);
  return card;
}

function comingSoonCard(game) {
  const card = createElement("article", "library-card is-coming");
  const art = createElement("div", "library-art");
  const img = document.createElement("img");
  img.src = game.image;
  img.alt = "";
  art.append(img);
  const body = createElement("div", "library-body");
  body.append(createElement("span", "card-meta", "Coming Soon"));
  body.append(createElement("h2", "", game.name));
  body.append(createElement("p", "", game.description));
  const row = createElement("div", "play-row");
  row.append(createElement("span", "ghost-label", "Planned"));
  body.append(row);
  card.append(art, body);
  return card;
}

function renderGameSetup(gameId) {
  destroyActiveGame();
  const game = getGame(gameId);
  if (!game) {
    renderError("Game not found", "That game is not installed in this version of Airplane Arcade.");
    return;
  }

  setNav("library");
  setRibbon("Set up the match, review controls, then start the game.");
  routeHash(`#game=${gameId}`);

  setup = {
    ...setup,
    gameId,
    difficulty: game.difficulties.includes(setup.difficulty)
      ? setup.difficulty
      : game.defaultDifficulty || "normal",
    mode: game.modes.includes(setup.mode) ? setup.mode : game.modes[0],
    challenge: game.challenges?.includes(setup.challenge)
      ? setup.challenge
      : game.challenges?.[0] || "rush",
  };

  clearNode(view);
  const panel = createElement("section", "setup-panel");
  const title = createElement("div", "setup-title");
  title.append(createElement("span", "card-meta", "Game setup"), createElement("h1", "", game.name), createElement("p", "", game.longDescription));

  const grid = createElement("div", "setup-grid");
  const art = createElement("div", "setup-art");
  const img = document.createElement("img");
  img.src = game.image;
  img.alt = "";
  art.append(img);

  const controls = createElement("div", "setup-controls");
  controls.append(modeBox(game), difficultyBox(game), challengeBox(game), playerBox(game), instructionsBox(game), startBox(game));
  grid.append(art, controls);
  panel.append(title, grid);
  view.append(panel);
  focusView();
}

function modeBox(game) {
  const box = createElement("div", "option-box");
  box.append(createElement("span", "field-label", "Mode"));
  const segmented = createElement("div", "segmented");
  const buttons = game.modes.map((mode) => {
    const modeButton = button(MODE_LABELS[mode], "", () => {
      setup.mode = mode;
      renderGameSetup(game.id);
    });
    modeButton.dataset.value = mode;
    return modeButton;
  });
  segmented.append(...buttons);
  setPressed(buttons, setup.mode);
  box.append(segmented);
  return box;
}

function difficultyBox(game) {
  if (!game.difficulties || game.difficulties.length <= 1) return document.createDocumentFragment();
  const box = createElement("div", "option-box");
  box.append(createElement("span", "field-label", "Difficulty"));
  const segmented = createElement("div", "segmented");
  const buttons = game.difficulties.map((difficulty) => {
    const difficultyButton = button(DIFFICULTY_LABELS[difficulty], "", () => {
      setup.difficulty = difficulty;
      renderGameSetup(game.id);
    });
    difficultyButton.dataset.value = difficulty;
    return difficultyButton;
  });
  segmented.append(...buttons);
  setPressed(buttons, setup.difficulty);
  box.append(
    segmented,
    createElement(
      "p",
      "difficulty-note",
      DIFFICULTY_DETAILS[game.id]?.[setup.difficulty] || "Choose how challenging this game should feel.",
    ),
  );
  return box;
}

function challengeBox(game) {
  if (game.id !== "basketball" || setup.mode !== "solo") return document.createDocumentFragment();
  const box = createElement("div", "option-box");
  box.append(createElement("span", "field-label", "Solo challenge"));
  const segmented = createElement("div", "segmented");
  const buttons = game.challenges.map((challenge) => {
    const challengeButton = button(CHALLENGE_LABELS[challenge], "", () => {
      setup.challenge = challenge;
      renderGameSetup(game.id);
    });
    challengeButton.dataset.value = challenge;
    return challengeButton;
  });
  segmented.append(...buttons);
  setPressed(buttons, setup.challenge);
  box.append(segmented);
  return box;
}

function playerBox(game) {
  if (!game.hasPlayerSetup) return document.createDocumentFragment();
  const box = createElement("div", "option-box");
  box.append(createElement("span", "field-label", "Players"));
  const grid = createElement("div", "name-grid");
  const singlePlayerSolo = setup.mode === "solo" && !["football"].includes(game.id);
  grid.classList.toggle("is-single", singlePlayerSolo);
  const p1 = nameField(singlePlayerSolo ? "Player" : "Player 1", setup.player1, (value) => {
    setup.player1 = value || "Player 1";
  });
  grid.append(p1);
  if (singlePlayerSolo) {
    box.append(grid);
    return box;
  }
  const p2 = nameField(setup.mode === "solo" ? "Computer" : "Player 2", setup.player2, (value) => {
    setup.player2 = value || "Player 2";
  });
  p2.querySelector("input").disabled = setup.mode === "solo";
  grid.append(p2);
  box.append(grid);
  return box;
}

function nameField(label, value, onInput) {
  const field = createElement("label", "field");
  field.append(createElement("span", "field-label", label));
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 16;
  input.value = value;
  input.addEventListener("input", () => onInput(input.value.trim()));
  field.append(input);
  return field;
}

function instructionsBox(game) {
  const box = createElement("div", "option-box");
  box.append(createElement("span", "field-label", "Instructions"));
  const list = createElement("ul", "instructions-list");
  for (const item of game.instructions) list.append(createElement("li", "", item));
  const controlList = createElement("ul", "control-list");
  for (const item of describeGameControls(data.settings, game.id)) {
    controlList.append(createElement("li", "", item));
  }
  box.append(list, createElement("span", "field-label", "Controls"), controlList);
  return box;
}

function startBox(game) {
  const box = createElement("div", "option-box");
  const start = button("Start Game", "primary-button", () => launchGame(game.id));
  const back = button("Return to library", "secondary-button", () => renderLibrary());
  box.append(start, back);
  return box;
}

async function launchGame(gameId, launchOptions = {}) {
  destroyActiveGame();
  const factory = GAME_FACTORIES[gameId];
  const game = getGame(gameId);
  if (!factory || !game) {
    renderError("Game module missing", "This game is listed but its module did not load.");
    return;
  }

  setNav("library");
  setRibbon(`${game.name} is running. Pause, restart, or return to the library from inside the game.`);
  clearNode(view);

  if (gameId === "sky-ludo" || gameId === "airport-chef" || gameId === "archery" || gameId === "runway-circuit" || gameId === "cloud-ridge-rally" || gameId === "red-eye-run") {
    data = await updateData((draft) => {
      if (gameId === "sky-ludo") draft.progress.skyLudoRecords.selectedDifficulty = setup.difficulty;
      if (gameId === "airport-chef") {
        draft.progress.airportChefRecords.selectedDifficulty = setup.difficulty;
        draft.progress.airportChefRecords.selectedMode = setup.mode;
      }
      if (gameId === "archery") draft.progress.archeryRecords.selectedDifficulty = setup.difficulty;
      if (gameId === "runway-circuit") draft.progress.runwayCircuitRecords.selectedDifficulty = setup.difficulty;
      if (gameId === "cloud-ridge-rally") draft.progress.cloudRidgeRallyRecords.selectedDifficulty = setup.difficulty;
      if (gameId === "red-eye-run") draft.progress.redEyeRunRecords.selectedDifficulty = setup.difficulty;
      return draft;
    });
  }

  activeGame = factory({
    root: view,
    audio: arcadeAudio,
    data,
    options: {
      ...setup,
      player1: setup.player1 || "Player 1",
      player2: setup.mode === "solo" ? "Computer" : setup.player2 || "Player 2",
      controls: data.settings.controls[gameId],
      continueCompetition: Boolean(launchOptions.continueCompetition),
      continueCampaign: Boolean(launchOptions.continueCampaign),
      continueGame: Boolean(launchOptions.continueGame),
    },
    onExit: async () => {
      data = await getData();
      renderLibrary();
    },
    onSetup: () => renderGameSetup(gameId),
    onResult: async () => {
      data = await getData();
    },
  });
  activeGame.initializeGame();
  activeGame.startGame();
}

function renderStats() {
  destroyActiveGame();
  setNav("stats");
  setRibbon("Progress is stored locally with chrome.storage.local.");
  routeHash("#stats");
  clearNode(view);

  const panel = createElement("section", "stats-panel");
  panel.append(createElement("span", "card-meta", "Overall statistics"), createElement("h1", "", "Statistics"));
  const grid = createElement("div", "stats-grid");
  grid.append(
    resultCard("Games played", String(data.progress.totalGamesPlayed), "Total completed runs across all games."),
    resultCard("Total wins", String(getTotalWins(data)), "Solo, Player 1, and Player 2 wins combined."),
    resultCard("Draws", String(data.progress.draws), "Matches that ended level."),
    resultCard("Football", `${data.progress.footballWins.player1 + data.progress.footballWins.player2 + data.progress.footballWins.solo} wins`, "First-to-three dummy football results."),
    resultCard("Basketball", `Best ${data.progress.basketballRecords.soloHighScore}`, "Highest solo score saved on this browser."),
    resultCard(
      "Memory",
      data.progress.memoryRecords.normal.bestMoves ? `${data.progress.memoryRecords.normal.bestMoves} moves` : "No record",
      "Normal-board solo record.",
    ),
    resultCard(
      "Sky Ludo",
      data.progress.skyLudoRecords.recentSummary || (data.progress.skyLudoRecords.savedGameState ? "Saved match available" : "No match"),
      `${data.progress.skyLudoRecords.totalGamesPlayed} games. ${data.progress.skyLudoRecords.totalDiceRolls} rolls. ${data.progress.skyLudoRecords.totalCaptures} captures.`,
    ),
    resultCard(
      "Airport Chef",
      data.progress.airportChefRecords.recentSummary || `Level ${data.progress.airportChefRecords.highestUnlockedLevel}/20`,
      `${data.progress.airportChefRecords.ordersCompleted} orders. ${data.progress.airportChefRecords.flightCoins} Flight Coins. ${data.progress.airportChefRecords.highestCombo}x best combo.`,
    ),
    resultCard(
      "Archery",
      data.progress.archeryRecords.recentFinalScores || "No shots",
      `Best solo ${data.progress.archeryRecords.bestSoloTotal}. ${data.progress.archeryRecords.totalBullseyes} bullseyes.`,
    ),
    resultCard(
      "Cake Maker",
      data.progress.cakeMakerRecords.recentCakeName || "No cake",
      `${data.progress.cakeMakerRecords.savedCakes.length} saved. ${data.progress.cakeMakerRecords.partyStarts} parties started.`,
    ),
    resultCard(
      "Pyramid Smash",
      `Level ${data.progress.pyramidSmashRecords.highestUnlockedLevel}`,
      `${Object.values(data.progress.pyramidSmashRecords.stars || {}).reduce((sum, value) => sum + Number(value || 0), 0)} stars. ${data.progress.pyramidSmashRecords.flightCoins} coins. ${data.progress.pyramidSmashRecords.endlessBest || 0} endless.`,
    ),
    resultCard(
      "Runway Circuit",
      data.progress.runwayCircuitRecords.bestPositions?.[String(data.progress.runwayCircuitRecords.selectedLevel || 1)]
        ? `Best ${ordinal(data.progress.runwayCircuitRecords.bestPositions[String(data.progress.runwayCircuitRecords.selectedLevel || 1)])}`
        : "No finish yet",
      `Level ${data.progress.runwayCircuitRecords.highestUnlockedLevel}/5. ${data.progress.runwayCircuitRecords.totalRaces} races. ${data.progress.runwayCircuitRecords.totalWins} wins.`,
    ),
    resultCard(
      "Cloud Ridge Rally",
      `Best ${Math.floor(Math.max(data.progress.cloudRidgeRallyRecords.bestCampaignDistance || 0, ...Object.values(data.progress.cloudRidgeRallyRecords.bestEndless || {}).map(Number)))}m`,
      `Level ${data.progress.cloudRidgeRallyRecords.highestUnlockedLevel}. ${data.progress.cloudRidgeRallyRecords.flightCoins} Flight Coins. ${Object.values(data.progress.cloudRidgeRallyRecords.stars || {}).reduce((sum, value) => sum + Number(value || 0), 0)} stars.`,
    ),
    resultCard(
      "Red-Eye Run",
      data.progress.redEyeRunRecords.bestPlacement ? `Best ${ordinal(data.progress.redEyeRunRecords.bestPlacement)}` : "No qualification yet",
      `${data.progress.redEyeRunRecords.totalMatches} matches. ${data.progress.redEyeRunRecords.totalQualifications} qualifications. ${data.progress.redEyeRunRecords.firstPlaceVictories} wins.`,
    ),
  );
  panel.append(grid, recentResultsList());
  view.append(panel);
  focusView();
}

function resultCard(title, value, detail) {
  const card = createElement("article", "result-card");
  card.append(createElement("span", "card-meta", title), createElement("h2", "", value), createElement("p", "", detail));
  return card;
}

function ordinal(value) {
  const number = Number(value);
  const suffix = number % 10 === 1 && number % 100 !== 11 ? "st" : number % 10 === 2 && number % 100 !== 12 ? "nd" : number % 10 === 3 && number % 100 !== 13 ? "rd" : "th";
  return `${number}${suffix}`;
}

function recentResultsList() {
  const card = createElement("section", "settings-card");
  card.append(createElement("h2", "", "Recent Results"));
  if (!data.progress.recentResults.length) {
    card.append(createElement("div", "empty-state", "No completed games yet."));
    return card;
  }
  const list = createElement("ul", "recent-list");
  for (const result of data.progress.recentResults.slice(0, 8)) {
    const line = `${getGameName(result.gameId)} - ${result.summary || "Result saved"}`;
    list.append(createElement("li", "", line));
  }
  card.append(list);
  return card;
}

function renderSettings() {
  destroyActiveGame();
  setNav("settings");
  setRibbon("Change sound, theme, controls, or reset saved progress.");
  routeHash("#settings");
  clearNode(view);

  const panel = createElement("section", "settings-panel");
  panel.append(createElement("span", "card-meta", "Local settings"), createElement("h1", "", "Settings"));
  const grid = createElement("div", "settings-grid");
  grid.append(
    soundSettings(),
    themeSettings(),
    accessibilitySettings(),
    resetSettings(),
    controlsSettings("football"),
    controlsSettings("basketball"),
    controlsSettings("memory"),
    controlsSettings("sky-ludo"),
    controlsSettings("airport-chef"),
    controlsSettings("archery"),
    controlsSettings("cake-maker"),
    controlsSettings("pyramid-smash"),
    controlsSettings("runway-circuit"),
    controlsSettings("cloud-ridge-rally"),
    controlsSettings("red-eye-run"),
  );
  panel.append(grid);
  view.append(panel);
  focusView();
}

function soundSettings() {
  const card = createElement("article", "settings-card");
  card.append(createElement("h2", "", "Sound"));
  const sound = toggleRow("Master sound", data.settings.sound, async (enabled) => {
    data = await updateData((draft) => {
      draft.settings.sound = enabled;
      return draft;
    });
    await arcadeAudio.loadSettings();
    renderSettings();
  });
  const music = toggleRow("Music", data.settings.music, async (enabled) => {
    data = await updateData((draft) => {
      draft.settings.music = enabled;
      return draft;
    });
    await arcadeAudio.loadSettings();
    if (enabled) arcadeAudio.startMusic();
    else arcadeAudio.stopMusic();
    renderSettings();
  });
  const volume = createElement("label", "field");
  volume.append(createElement("span", "field-label", "Effects volume"));
  const input = document.createElement("input");
  input.className = "volume-input";
  input.type = "range";
  input.min = "0";
  input.max = "1";
  input.step = "0.05";
  input.value = String(data.settings.volume);
  input.addEventListener("input", async () => {
    data = await updateData((draft) => {
      draft.settings.volume = Number(input.value);
      return draft;
    });
    await arcadeAudio.loadSettings();
  });
  volume.append(input);
  card.append(sound, music, volume);
  return card;
}

function themeSettings() {
  const card = createElement("article", "settings-card");
  card.append(createElement("h2", "", "Theme"));
  const row = createElement("div", "segmented");
  const labels = { light: "Light", dark: "Dark", contrast: "High Contrast" };
  const buttons = ["light", "dark", "contrast"].map((theme) => {
    const themeButton = button(labels[theme], "", async () => {
      data = await updateData((draft) => {
        draft.settings.theme = theme;
        return draft;
      });
      applyTheme();
      renderSettings();
    });
    themeButton.dataset.value = theme;
    return themeButton;
  });
  row.append(...buttons);
  setPressed(buttons, data.settings.theme);
  card.append(row, createElement("p", "settings-note", "Theme is stored locally for the next arcade visit."));
  return card;
}

function accessibilitySettings() {
  const card = createElement("article", "settings-card");
  card.append(createElement("h2", "", "Accessibility"));
  const motion = toggleRow("Reduce Motion", data.settings.reduceMotion, async (enabled) => {
    data = await updateData((draft) => {
      draft.settings.reduceMotion = enabled;
      return draft;
    });
    renderSettings();
  });
  card.append(motion, createElement("p", "settings-note", "Cake Maker, Sky Ludo, Airport Chef, and Runway Circuit use this to calm celebration, token, particle, and background motion."));
  return card;
}

function resetSettings() {
  const card = createElement("article", "settings-card");
  card.append(createElement("h2", "", "Progress"));
  card.append(createElement("p", "", "Clear high scores, recent results, wins, settings, and custom controls."));
  card.append(
    button("Reset All Progress", "danger-button", async () => {
      const confirmed = window.confirm("Reset all Airplane Arcade progress and settings?");
      if (!confirmed) return;
      data = await resetData();
      await arcadeAudio.loadSettings();
      applyTheme();
      renderSettings();
    }),
  );
  return card;
}

function controlsSettings(gameId) {
  const card = createElement("article", "settings-card");
  card.append(createElement("h2", "", `${getGameName(gameId)} Controls`));
  const controls = data.settings.controls[gameId];
  for (const [group, codes] of Object.entries(controls)) {
    const row = createElement("div", "control-row");
    row.append(createElement("span", "", readableControlGroup(group)));
    const keyButton = document.createElement("button");
    keyButton.type = "button";
    keyButton.className = "small-button";
    bindKeyRecorder(keyButton, codes[0], async (code) => {
      data = await updateData((draft) => {
        draft.settings.controls[gameId][group][0] = code;
        return draft;
      });
      await arcadeAudio.loadSettings();
      renderSettings();
    });
    row.append(keyButton);
    card.append(row);
  }
  card.append(createElement("p", "settings-note", `Current primary keys include ${Object.values(controls).flat().map(keyLabel).join(", ")}.`));
  return card;
}

function readableControlGroup(group) {
  return group
    .replace("p1", "Player 1 ")
    .replace("p2", "Player 2 ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function toggleRow(label, active, onToggle) {
  const row = createElement("div", "settings-row");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "toggle-button";
  toggle.textContent = active ? "On" : "Off";
  toggle.setAttribute("aria-pressed", String(active));
  toggle.addEventListener("click", () => {
    arcadeAudio.play("button");
    onToggle(!active);
  });
  row.append(createElement("span", "", label), toggle);
  return row;
}

function renderHelp() {
  destroyActiveGame();
  setNav("help");
  setRibbon("Every game works offline and keeps controls intentionally laptop-friendly.");
  routeHash("#help");
  clearNode(view);

  const panel = createElement("section", "help-panel");
  panel.append(createElement("span", "card-meta", "How to play"), createElement("h1", "", "Help"));
  const grid = createElement("div", "help-grid");
  for (const game of GAME_CATALOG) {
    const card = createElement("article", "settings-card");
    card.append(createElement("h2", "", game.name));
    const list = createElement("ul", "instructions-list");
    for (const line of game.instructions) list.append(createElement("li", "", line));
    const controls = createElement("ul", "control-list");
    for (const line of describeGameControls(data.settings, game.id)) controls.append(createElement("li", "", line));
    card.append(list, createElement("span", "field-label", "Controls"), controls, button("Play", "primary-button", () => renderGameSetup(game.id)));
    grid.append(card);
  }
  panel.append(grid);
  view.append(panel);
  focusView();
}

function renderError(title, message) {
  destroyActiveGame();
  setNav("");
  setRibbon("Something went wrong, but the extension is still running.");
  clearNode(view);
  const panel = createElement("section", "error-panel");
  panel.append(createElement("h1", "", title), createElement("p", "", message), button("Return to library", "primary-button", () => renderLibrary()));
  view.append(panel);
  focusView();
}

function applyTheme() {
  app.dataset.theme = data.settings.theme;
}

function navigate(name) {
  if (name === "library") renderLibrary();
  if (name === "stats") renderStats();
  if (name === "settings") renderSettings();
  if (name === "help") renderHelp();
}

for (const nav of navButtons) {
  nav.addEventListener("click", () => {
    arcadeAudio.play("button");
    navigate(nav.dataset.nav);
  });
}

homeLogo.addEventListener("click", () => {
  arcadeAudio.play("button");
  renderLibrary();
});

function renderRouteFromHash() {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  const route = location.hash.replace(/^#/, "");
  if (route === "stats") renderStats();
  else if (route === "settings") renderSettings();
  else if (route === "help") renderHelp();
  else if (hash.has("game")) renderGameSetup(hash.get("game"));
  else renderLibrary();
}

window.addEventListener("hashchange", () => {
  if (data) renderRouteFromHash();
});

async function boot() {
  data = await getData();
  await arcadeAudio.loadSettings();
  applyTheme();
  renderRouteFromHash();
}

boot().catch((error) => {
  renderError("Startup error", error.message || "Airplane Arcade could not start.");
});
