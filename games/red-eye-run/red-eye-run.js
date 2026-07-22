import { labelsFor, matchesControl, shouldPreventScroll } from "../../shared/controls.js";
import { getData, recordGameResult, updateData } from "../../shared/storage.js";
import { createOpponentProfiles, playerProfile, updateComputerAI } from "./red-eye-run-ai.js";
import {
  COURSE,
  createContestant,
  markScanOrigins,
  movementDetected,
  registerFinishers,
  resolveContestantCollisions,
  teleportToSpectator,
  updateContestantMovement,
} from "./red-eye-run-physics.js";
import {
  DIFFICULTY,
  createWatchkeeper,
  startGreenPhase,
  startRedPhase,
  startWarningPhase,
  updateWatchkeeper,
} from "./red-eye-run-watchkeeper.js";
import { createRedEyeRenderer } from "./red-eye-run-renderer.js";

const TOTAL_CONTESTANTS = 16;
const PLAYER = "player";
const CHARACTER_COLORS = ["#38aee2", "#2fb36d", "#ff8a3d", "#7f59e8", "#ef5b63", "#ffd35a"];
const ACCESSORIES = ["pilot cap", "scarf", "goggles", "wing badge"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function el(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function ordinal(value) {
  const number = Number(value);
  const suffix = number % 10 === 1 && number % 100 !== 11 ? "st" : number % 10 === 2 && number % 100 !== 12 ? "nd" : number % 10 === 3 && number % 100 !== 13 ? "rd" : "th";
  return `${number}${suffix}`;
}

export function createRedEyeRunGame(context) {
  const { root, audio, data, options, onExit, onSetup, onResult } = context;
  const controls = options.controls;
  const renderer = createRedEyeRenderer();
  let currentData = clone(data);
  let records = currentData.progress.redEyeRunRecords;
  let canvas = null;
  let ctx = null;
  let resizeObserver = null;
  let raf = 0;
  let lastTime = 0;
  let resultSaved = false;
  const keys = new Set();
  const pressed = new Set();
  let state = createState();

  function createState() {
    return {
      screen: "intro",
      phase: "menu",
      difficulty: options.difficulty || records.selectedDifficulty || "normal",
      mode: records.selectedMode || "qualification",
      countdownOn: records.countdownOn !== false,
      character: {
        bodyColor: records.selectedCharacter?.bodyColor || CHARACTER_COLORS[0],
        accent: records.selectedCharacter?.accent || "#ffd35a",
        accessory: records.selectedCharacter?.accessory || "pilot cap",
      },
      reduceMotion: Boolean(currentData.settings.reduceMotion),
      camera: { x: COURSE.width / 2, y: COURSE.startY - 220, scale: 0.72 },
      race: null,
    };
  }

  async function initializeGame() {
    currentData = await getData();
    records = currentData.progress.redEyeRunRecords;
    state = createState();
    bindEvents();
    await markRecentlyPlayed();
    renderIntro();
  }

  function startGame() {
    if (state.phase === "playing") startLoop();
  }

  async function markRecentlyPlayed() {
    currentData = await updateData((draft) => {
      draft.progress.recentlyPlayed = "red-eye-run";
      return draft;
    });
    records = currentData.progress.redEyeRunRecords;
    await onResult?.({ gameId: "red-eye-run", summary: "Red-Eye Run opened" });
  }

  function shell(title, subtitle = "") {
    teardownCanvas();
    root.className = "arcade-view red-eye-run-game";
    root.replaceChildren();
    const bar = el("section", "game-bar red-eye-game-bar");
    const heading = el("div", "game-title");
    heading.append(el("h1", "", "Red-Eye Run"), el("p", "", subtitle || "Solo stop-and-go airport race"));
    const actions = el("div", "game-actions");
    actions.append(
      actionButton("Tutorial", "", renderTutorial),
      actionButton("Stats", "", renderStatsScreen),
      actionButton("Arcade", "", renderReturnConfirm),
    );
    bar.append(heading, quickStats(), actions);
    root.append(bar);
    if (title) {
      const sr = el("span", "red-eye-screen-title", title);
      sr.setAttribute("aria-live", "polite");
      root.append(sr);
    }
  }

  function quickStats() {
    const strip = el("div", "score-strip red-eye-mini-stats");
    strip.append(
      miniStat("Stars", records.freezeStars || 0),
      miniStat("Qualified", records.totalQualifications || 0),
      miniStat("Wins", records.firstPlaceVictories || 0),
    );
    return strip;
  }

  function miniStat(label, value) {
    const item = el("span");
    item.append(el("small", "", label), el("strong", "", String(value)));
    return item;
  }

  function renderIntro() {
    state.screen = "intro";
    state.phase = "menu";
    resultSaved = false;
    shell("Game introduction", "Run when the airport watchkeeper looks away. Freeze when its eyes turn red.");
    const panel = el("section", "red-eye-menu-panel");
    panel.append(
      el("span", "card-meta", "Original stop-and-go race"),
      el("h2", "", "Reach the boarding arch safely"),
      el("p", "", "You race 15 local dummy contestants on a floating airport runway. The original watchkeeper robot turns away for green phases, warns before turning, then scans for movement during red phases."),
    );
    const grid = el("div", "red-eye-info-grid");
    [
      ["16 contestants", "One human player and fifteen computer-controlled dummies use the same movement and detection rules."],
      ["Original watchkeeper", "A teal airport inspection robot with a pilot cap, red scanner eyes, and non-graphic hologram eliminations."],
      ["Momentum matters", "Sprinting is fast but risky because sliding after a warning can still be detected."],
      ["Offline progress", "Results, controls, cosmetics, mode, countdown, and difficulty stay in local browser storage."],
    ].forEach(([title, copy]) => grid.append(infoCard(title, copy)));
    const actions = el("div", "red-eye-menu-actions");
    actions.append(
      actionButton("Play", "primary-action", renderRaceIntro),
      actionButton("Difficulty", "", renderDifficultyScreen),
      actionButton("Mode", "", renderModeScreen),
      actionButton("Character", "", renderCustomisation),
      actionButton(records.tutorialComplete ? "Replay Tutorial" : "Tutorial", "", renderTutorial),
    );
    panel.append(grid, settingsStrip(), actions);
    root.append(panel);
  }

  function infoCard(title, copy) {
    const card = el("article", "red-eye-info-card");
    card.append(el("h3", "", title), el("p", "", copy));
    return card;
  }

  function settingsStrip() {
    const strip = el("section", "red-eye-choice-row");
    strip.append(
      pill("Difficulty", DIFFICULTY[state.difficulty]?.label || "Normal"),
      pill("Mode", state.mode === "champion" ? "First Place Challenge" : "Qualification Race"),
      pill("Countdown", state.countdownOn ? "On" : "Off"),
    );
    return strip;
  }

  function pill(label, value) {
    const node = el("span", "red-eye-pill");
    node.append(el("small", "", label), el("strong", "", value));
    return node;
  }

  function renderTutorial() {
    state.screen = "tutorial";
    shell("Tutorial", "Practice the stop-and-go rules before racing.");
    const panel = el("section", "red-eye-menu-panel");
    panel.append(el("span", "card-meta", "Tutorial"), el("h2", "", "Stop Before the Scan"));
    const list = el("ul", "instructions-list");
    [
      `Move with ${labelsFor([controls.up[0], controls.left[0], controls.down[0], controls.right[0]])}.`,
      `Hold ${labelsFor(controls.sprint)} to sprint, but leave room to slow down.`,
      `${labelsFor(controls.dive)} dives forward and freezes after landing, with a cooldown.`,
      "Green means run. Yellow means prepare. Red means freeze until the watchkeeper turns away.",
      "Detection ignores tiny idle movement, but sliding, diving, or standing up during red can eliminate a contestant.",
    ].forEach((line) => list.append(el("li", "", line)));
    const actions = el("div", "red-eye-menu-actions");
    actions.append(
      actionButton("Start Practice Race", "primary-action", async () => {
        await updateData((draft) => {
          draft.progress.redEyeRunRecords.tutorialComplete = true;
          return draft;
        });
        startRace({ practice: true });
      }),
      actionButton("Back", "", renderIntro),
    );
    panel.append(list, actions);
    root.append(panel);
  }

  function renderDifficultyScreen() {
    state.screen = "difficulty";
    shell("Difficulty selection", "Choose how quickly the watchkeeper changes phases.");
    const panel = el("section", "red-eye-menu-panel");
    panel.append(el("span", "card-meta", "Difficulty"), el("h2", "", "Watchkeeper Timing"));
    const grid = el("div", "red-eye-choice-grid");
    [
      ["easy", "Easy", "Longer green phases, slow rotation, forgiving detection, and more dummy mistakes."],
      ["normal", "Normal", "Balanced green and red phases with fair momentum checks."],
      ["hard", "Hard", "Shorter unpredictable green phases, faster rotation, stricter fair detection, and sharper dummies."],
    ].forEach(([id, title, copy]) => {
      const card = actionButton("", `red-eye-choice-card ${state.difficulty === id ? "is-selected" : ""}`, async () => {
        state.difficulty = id;
        currentData = await updateData((draft) => {
          draft.progress.redEyeRunRecords.selectedDifficulty = id;
          return draft;
        });
        records = currentData.progress.redEyeRunRecords;
        renderDifficultyScreen();
      });
      card.append(el("strong", "", title), el("span", "", copy));
      grid.append(card);
    });
    const actions = el("div", "red-eye-menu-actions");
    actions.append(actionButton("Race Intro", "primary-action", renderRaceIntro), actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderModeScreen() {
    state.screen = "mode";
    shell("Game mode selection", "Qualification is forgiving. First Place Challenge is stricter.");
    const panel = el("section", "red-eye-menu-panel");
    panel.append(el("span", "card-meta", "Mode"), el("h2", "", "Choose the race objective"));
    const grid = el("div", "red-eye-choice-grid");
    [
      ["qualification", "Qualification Race", "The first eight contestants qualify. You do not need first place."],
      ["champion", "First Place Challenge", "Only the first finisher wins. If a dummy finishes before you, the match ends."],
    ].forEach(([id, title, copy]) => {
      const card = actionButton("", `red-eye-choice-card ${state.mode === id ? "is-selected" : ""}`, async () => {
        state.mode = id;
        currentData = await updateData((draft) => {
          draft.progress.redEyeRunRecords.selectedMode = id;
          return draft;
        });
        records = currentData.progress.redEyeRunRecords;
        renderModeScreen();
      });
      card.append(el("strong", "", title), el("span", "", copy));
      grid.append(card);
    });
    const countdown = toggleButton(`Countdown ${state.countdownOn ? "On" : "Off"}`, async () => {
      state.countdownOn = !state.countdownOn;
      currentData = await updateData((draft) => {
        draft.progress.redEyeRunRecords.countdownOn = state.countdownOn;
        return draft;
      });
      records = currentData.progress.redEyeRunRecords;
      renderModeScreen();
    });
    const actions = el("div", "red-eye-menu-actions");
    actions.append(countdown, actionButton("Race Intro", "primary-action", renderRaceIntro), actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderCustomisation() {
    state.screen = "custom";
    shell("Character customisation", "Pick a local cosmetic look for your airport dummy.");
    const panel = el("section", "red-eye-menu-panel");
    panel.append(el("span", "card-meta", "Character"), el("h2", "", "Your Contestant"));
    const preview = el("div", "red-eye-character-preview");
    preview.style.setProperty("--body", state.character.bodyColor);
    preview.style.setProperty("--accent", state.character.accent);
    preview.append(el("i"), el("strong", "", state.character.accessory));
    const colorRow = swatchRow("Body colour", CHARACTER_COLORS, state.character.bodyColor, async (color) => {
      state.character.bodyColor = color;
      state.character.accent = color === "#ffd35a" ? "#38aee2" : "#ffd35a";
      await saveCharacter();
      renderCustomisation();
    });
    const accessoryRow = el("div", "red-eye-menu-actions");
    ACCESSORIES.forEach((accessory) => {
      accessoryRow.append(actionButton(accessory, state.character.accessory === accessory ? "is-selected" : "", async () => {
        state.character.accessory = accessory;
        await saveCharacter();
        renderCustomisation();
      }));
    });
    const actions = el("div", "red-eye-menu-actions");
    actions.append(actionButton("Race Intro", "primary-action", renderRaceIntro), actionButton("Back", "", renderIntro));
    panel.append(preview, colorRow, accessoryRow, actions);
    root.append(panel);
  }

  async function saveCharacter() {
    currentData = await updateData((draft) => {
      draft.progress.redEyeRunRecords.selectedCharacter = { ...state.character };
      return draft;
    });
    records = currentData.progress.redEyeRunRecords;
  }

  function swatchRow(label, values, active, onPick) {
    const wrap = el("section", "red-eye-choice-row");
    wrap.append(el("span", "field-label", label));
    values.forEach((color) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `red-eye-swatch ${active === color ? "is-selected" : ""}`;
      button.style.setProperty("--swatch", color);
      button.setAttribute("aria-label", `Choose ${color}`);
      button.addEventListener("click", () => {
        audio.play("button");
        onPick(color);
      });
      wrap.append(button);
    });
    return wrap;
  }

  function renderRaceIntro() {
    state.screen = "race-intro";
    shell("Race introduction", "The watchkeeper will always warn before red.");
    const panel = el("section", "red-eye-menu-panel");
    panel.append(el("span", "card-meta", "Race introduction"), el("h2", "", "Boarding Arch Sprint"));
    panel.append(resultGrid([
      ["Contestants", String(TOTAL_CONTESTANTS)],
      ["Difficulty", DIFFICULTY[state.difficulty].label],
      ["Mode", state.mode === "champion" ? "First Place Challenge" : "Qualification Race"],
      ["Countdown", state.countdownOn ? "90 seconds" : "Off"],
    ]));
    const actions = el("div", "red-eye-menu-actions");
    actions.append(
      actionButton("Start Race", "primary-action", () => startRace()),
      actionButton("Difficulty", "", renderDifficultyScreen),
      actionButton("Mode", "", renderModeScreen),
      actionButton("Character", "", renderCustomisation),
    );
    panel.append(actions);
    root.append(panel);
  }

  function startRace({ practice = false } = {}) {
    resultSaved = false;
    pressed.clear();
    keys.clear();
    const watchkeeper = createWatchkeeper(state.difficulty);
    const contestants = [
      createContestant(playerProfile({ selectedCharacter: state.character }), 0, true),
      ...createOpponentProfiles(watchkeeper.config).map((profile, index) => createContestant(profile, index + 1)),
    ];
    markScanOrigins(contestants);
    state.phase = "playing";
    state.screen = "gameplay";
    state.race = {
      practice,
      mode: state.mode,
      countdownOn: state.countdownOn && !practice,
      timeLeft: 90,
      elapsed: 0,
      watchkeeper,
      contestants,
      finishers: [],
      qualifyLimit: state.mode === "champion" ? 1 : 8,
      eliminatedCount: 0,
      effects: [],
      messages: [],
      redPhasesSurvived: 0,
      lastPhase: "green",
      redFreezeCredited: false,
      maxSpeed: 0,
      position: 1,
      noDive: true,
      noPush: true,
      ended: false,
      result: null,
    };
    renderGameplay();
    audio.play("redGreen");
    startLoop();
  }

  function renderGameplay() {
    root.className = "arcade-view red-eye-run-game is-playing";
    root.replaceChildren();
    const wrap = el("section", "red-eye-canvas-wrap");
    canvas = document.createElement("canvas");
    canvas.id = "redEyeRunCanvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Red-Eye Run floating airport stop-and-go race with watchkeeper robot, contestants, runway, and signal HUD.");
    wrap.append(canvas);
    const controlsPanel = el("section", "red-eye-bottom-controls");
    controlsPanel.append(
      actionButton("Pause", "", pauseGame),
      actionButton("Restart", "", renderRestartConfirm),
      actionButton("Dive", "primary-action", () => {
        pressed.add("dive");
        setTimeout(() => pressed.delete("dive"), 90);
      }),
      actionButton(`Sound ${currentData.settings.sound ? "On" : "Off"}`, "", toggleSound),
      actionButton("Race Setup", "", () => renderConfirm("Return to setup?", "This ends the current race and keeps saved progress.", renderRaceIntro)),
      actionButton("Arcade", "", renderReturnConfirm),
    );
    root.append(wrap, controlsPanel);
    ctx = canvas.getContext("2d");
    resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(wrap);
    resizeCanvas();
  }

  function startLoop() {
    cancelAnimationFrame(raf);
    lastTime = performance.now();
    const tick = (time) => {
      const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
      lastTime = time;
      update(dt);
      draw(time);
      if (state.phase === "playing" || state.phase === "paused") raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function update(dt) {
    if (!state.race || state.phase !== "playing" || state.race.ended) return;
    const race = state.race;
    race.elapsed += dt;
    if (race.countdownOn) {
      race.timeLeft = Math.max(0, race.timeLeft - dt);
      if (race.timeLeft <= 10 && Math.ceil(race.timeLeft) !== Math.ceil(race.timeLeft + dt)) audio.play("redCountdown");
      if (race.timeLeft <= 0) {
        completeMatch("closed", "Flight Gate Closed");
        return;
      }
    }

    const changedPhase = updateWatchkeeper(race.watchkeeper, dt);
    if (changedPhase) handlePhaseChange(changedPhase);

    const player = getPlayer();
    const playerInput = readPlayerInput();
    if (playerInput.dive) race.noDive = false;
    updateContestantMovement(player, playerInput, race.watchkeeper.config, dt);
    race.maxSpeed = Math.max(race.maxSpeed, Math.hypot(player.vx, player.vy));

    for (const contestant of race.contestants) {
      if (contestant.isPlayer) continue;
      updateContestantMovement(contestant, updateComputerAI(contestant, race, dt), race.watchkeeper.config, dt);
    }

    resolveContestantCollisions(race.contestants);
    if (player.pushed) race.noPush = false;
    detectMovement();
    handleFinishers();
    updatePositions();
    race.effects.forEach((effect) => {
      effect.life -= dt * 1.5;
    });
    race.effects = race.effects.filter((effect) => effect.life > 0);
  }

  function handlePhaseChange(phase) {
    if (phase === "warning") audio.play("redWarning");
    if (phase === "red") {
      markScanOrigins(state.race.contestants);
      state.race.redFreezeCredited = false;
      audio.play("redSignal");
    }
    if (phase === "green") {
      const player = getPlayer();
      if (!player.eliminated && !player.qualified) {
        player.successfulFreezes += 1;
        state.race.redPhasesSurvived += 1;
      }
      audio.play("redGreen");
    }
  }

  function detectMovement() {
    const race = state.race;
    if (race.watchkeeper.phase !== "red" || race.watchkeeper.phaseElapsed < 0.12) return;
    for (const contestant of race.contestants) {
      if (contestant.eliminated || contestant.qualified) continue;
      if (!movementDetected(contestant, race.watchkeeper.config)) continue;
      eliminateContestant(contestant, "Movement Detected");
      if (contestant.isPlayer) {
        completeMatch("eliminated", "Movement Detected - Eliminated");
        break;
      }
    }
  }

  function eliminateContestant(contestant, reason) {
    if (contestant.eliminated || contestant.qualified) return;
    state.race.effects.push({ x: contestant.x, y: contestant.y, life: 1, color: "#ef3f55" });
    teleportToSpectator(contestant, state.race.eliminatedCount);
    state.race.eliminatedCount += 1;
    state.race.messages.push(reason);
    audio.play(contestant.isPlayer ? "redEliminate" : "redDetected");
  }

  function handleFinishers() {
    const race = state.race;
    const { newlyFinished, slotsFilled } = registerFinishers(race.contestants, race.finishers, race.mode);
    for (const contestant of newlyFinished) {
      race.effects.push({ x: COURSE.width / 2, y: COURSE.finishY, life: 1, color: contestant.isPlayer ? "#2fb36d" : "#46c7d9" });
      if (contestant.isPlayer) audio.play("redQualify");
    }
    const player = getPlayer();
    if (race.mode === "champion" && slotsFilled) {
      completeMatch(player.qualified ? "champion" : "lost", player.qualified ? "Runway Freeze Champion!" : "A dummy finished first");
      return;
    }
    if (player.qualified) {
      completeMatch("qualified", "Qualified!");
      return;
    }
    if (slotsFilled) completeMatch("lost", "Qualification slots filled");
  }

  function updatePositions() {
    const active = state.race.contestants
      .filter((contestant) => !contestant.eliminated)
      .sort((a, b) => a.y - b.y);
    const index = active.findIndex((contestant) => contestant.isPlayer);
    state.race.position = index >= 0 ? index + 1 : TOTAL_CONTESTANTS;
  }

  function completeMatch(type, title) {
    if (!state.race || state.race.ended) return;
    state.race.ended = true;
    state.phase = "ended";
    cancelAnimationFrame(raf);
    const player = getPlayer();
    const distance = player.finishDistance ?? Math.max(0, COURSE.startY - player.y);
    const result = {
      type,
      title,
      placement: player.placement || state.race.position,
      distance,
      redPhasesSurvived: state.race.redPhasesSurvived,
      successfulFreezes: player.successfulFreezes,
      maxSpeed: state.race.maxSpeed,
      qualified: player.qualified,
      eliminated: player.eliminated || type === "eliminated" || type === "closed",
      firstPlace: player.placement === 1,
      freezeStars: calculateFreezeStars(type),
    };
    state.race.result = result;
    saveResult(buildResultPayload(result));
    if (type === "champion") renderChampionResult();
    else if (result.qualified) renderQualifiedResult();
    else renderEliminatedResult();
  }

  function calculateFreezeStars(type) {
    if (state.race.practice) return 0;
    let stars = 0;
    const player = getPlayer();
    if (player.qualified) stars += 2;
    if (player.placement === 1) stars += 3;
    if (state.race.redPhasesSurvived >= 5) stars += 1;
    if (state.race.noDive) stars += 1;
    if (state.difficulty === "hard" && player.qualified) stars += 2;
    if (state.race.countdownOn && player.qualified) stars += 1;
    if (state.race.noPush && player.qualified) stars += 1;
    if (type === "champion") stars += 3;
    return stars;
  }

  function buildResultPayload(result) {
    return {
      gameId: "red-eye-run",
      mode: "solo",
      redEyeMode: state.mode,
      difficulty: state.difficulty,
      countdownOn: state.race.countdownOn,
      winner: result.firstPlace ? "solo" : result.qualified ? "solo" : "computer",
      score: Math.floor(result.distance),
      qualified: result.qualified,
      eliminated: result.eliminated,
      firstPlace: result.firstPlace,
      placement: result.placement,
      distance: result.distance,
      redPhasesSurvived: result.redPhasesSurvived,
      successfulFreezes: result.successfulFreezes,
      maxSpeed: result.maxSpeed,
      freezeStars: result.freezeStars,
      noDive: state.race.noDive,
      noPush: state.race.noPush,
      character: { ...state.character },
      tutorialComplete: state.race.practice,
      summary: `${result.title} - ${ordinal(result.placement)} - ${Math.floor(result.distance)}m`,
    };
  }

  async function saveResult(payload) {
    if (resultSaved) return;
    resultSaved = true;
    currentData = await recordGameResult(payload);
    records = currentData.progress.redEyeRunRecords;
    await onResult?.(payload);
  }

  function renderQualifiedResult() {
    const result = state.race.result;
    shell("Qualified result", "You reached the boarding arch safely.");
    const panel = resultPanel("Qualified!", "qualified");
    panel.append(resultGrid([
      ["Finishing position", ordinal(result.placement)],
      ["Distance travelled", `${Math.floor(result.distance)}m`],
      ["Red phases survived", result.redPhasesSurvived],
      ["Successful freezes", result.successfulFreezes],
      ["Maximum speed", `${Math.floor(result.maxSpeed)}`],
      ["Freeze Stars", result.freezeStars],
    ]));
    panel.append(resultActions());
    root.append(panel);
  }

  function renderChampionResult() {
    const result = state.race.result;
    shell("First-place victory", "The boarding arch belongs to you.");
    const panel = resultPanel("Runway Freeze Champion!", "champion");
    panel.append(resultGrid([
      ["Finishing position", ordinal(result.placement)],
      ["Distance travelled", `${Math.floor(result.distance)}m`],
      ["Red phases survived", result.redPhasesSurvived],
      ["Maximum speed", `${Math.floor(result.maxSpeed)}`],
      ["Reward", `${result.freezeStars} Freeze Stars`],
    ]));
    panel.append(resultActions());
    root.append(panel);
    audio.play("redVictory");
  }

  function renderEliminatedResult() {
    const result = state.race.result;
    shell("Eliminated result", result.title);
    const panel = resultPanel(result.title.includes("Closed") ? "Flight Gate Closed" : "Movement Detected", "eliminated");
    panel.append(resultGrid([
      ["Distance reached", `${Math.floor(result.distance)}m`],
      ["Contestants remaining", state.race.contestants.filter((item) => !item.eliminated && !item.qualified).length],
      ["Red phases survived", result.redPhasesSurvived],
      ["Helpful tip", state.difficulty === "hard" ? "Release sprint earlier before yellow." : "Slow down as soon as the warning appears."],
    ]));
    const actions = el("div", "red-eye-menu-actions");
    actions.append(
      actionButton("Retry", "primary-action", () => startRace()),
      actionButton("Change Difficulty", "", renderDifficultyScreen),
      actionButton("Return to Arcade", "", exitToArcade),
    );
    panel.append(actions);
    root.append(panel);
  }

  function resultPanel(title, status) {
    const panel = el("section", `red-eye-result-panel ${status}`);
    panel.append(el("span", "card-meta", "Results"), el("h2", "", title));
    return panel;
  }

  function resultGrid(rows) {
    const grid = el("dl", "red-eye-facts");
    rows.forEach(([term, value]) => {
      grid.append(el("dt", "", term), el("dd", "", String(value)));
    });
    return grid;
  }

  function resultActions() {
    const actions = el("div", "red-eye-menu-actions");
    actions.append(
      actionButton("Play Again", "primary-action", () => startRace()),
      actionButton("Cosmetic Unlocks", "", renderCosmeticUnlocks),
      actionButton("Return to Arcade", "", exitToArcade),
    );
    return actions;
  }

  function renderStatsScreen() {
    shell("Statistics", "Local Red-Eye Run progress");
    const panel = el("section", "red-eye-menu-panel");
    panel.append(el("span", "card-meta", "Statistics"), el("h2", "", "Run Records"));
    panel.append(resultGrid([
      ["Matches", records.totalMatches],
      ["Qualifications", records.totalQualifications],
      ["Eliminations", records.totalEliminations],
      ["First-place victories", records.firstPlaceVictories],
      ["Best position", records.bestPlacement ? ordinal(records.bestPlacement) : "None"],
      ["Red phases survived", records.redPhasesSurvived],
      ["Successful freezes", records.successfulFreezes],
      ["Freeze Stars", records.freezeStars],
    ]));
    panel.append(actionButton("Back", "primary-action", renderIntro));
    root.append(panel);
  }

  function renderCosmeticUnlocks() {
    shell("Cosmetic unlock screen", "Freeze Stars unlock cheerful local cosmetics.");
    const panel = el("section", "red-eye-menu-panel");
    panel.append(el("span", "card-meta", "Unlocks"), el("h2", "", "Pilot Closet"));
    const grid = el("div", "red-eye-info-grid");
    [
      ["5 Stars", "Coral body colour", records.freezeStars >= 5],
      ["10 Stars", "Gold scarf", records.freezeStars >= 10],
      ["18 Stars", "Robot wing badge", records.freezeStars >= 18],
      ["28 Stars", "Victory spin", records.freezeStars >= 28],
    ].forEach(([title, copy, unlocked]) => {
      const card = infoCard(title, unlocked ? `${copy} unlocked` : `${copy} locked`);
      card.classList.toggle("is-locked", !unlocked);
      grid.append(card);
    });
    panel.append(grid, actionButton("Back", "primary-action", renderIntro));
    root.append(panel);
  }

  function readPlayerInput() {
    const x = (hasKey(controls.right) ? 1 : 0) - (hasKey(controls.left) ? 1 : 0);
    const y = (hasKey(controls.down) ? 0.54 : 0) - (hasKey(controls.up) ? 1 : 0);
    const dive = pressed.has("dive") || hasKey(controls.dive);
    if (dive) pressed.delete("dive");
    return { x, y, sprint: hasKey(controls.sprint), dive };
  }

  function hasKey(codes) {
    return codes.some((code) => keys.has(code));
  }

  function getPlayer() {
    return state.race.contestants.find((contestant) => contestant.id === PLAYER);
  }

  function pauseGame() {
    if (!state.race || state.phase !== "playing") return;
    state.phase = "paused";
    shell("Pause menu", "Race paused. Movement detection is stopped.");
    const panel = el("section", "red-eye-menu-panel");
    panel.append(el("h2", "", "Paused"), el("p", "", "The watchkeeper is paused too."));
    const actions = el("div", "red-eye-menu-actions");
    actions.append(
      actionButton("Resume", "primary-action", resumeGame),
      actionButton("Restart", "", renderRestartConfirm),
      actionButton("Return to Arcade", "", renderReturnConfirm),
    );
    panel.append(actions);
    root.append(panel);
  }

  function resumeGame() {
    if (!state.race || state.phase !== "paused") return;
    state.phase = "playing";
    renderGameplay();
    startLoop();
  }

  function restartGame() {
    startRace({ practice: Boolean(state.race?.practice) });
  }

  function renderRestartConfirm() {
    renderConfirm("Restart race?", "This discards the current run and starts the same setup again.", restartGame);
  }

  function renderReturnConfirm() {
    renderConfirm("Return to Arcade?", "This stops Red-Eye Run and returns to the library.", exitToArcade);
  }

  function renderConfirm(title, copy, action) {
    const previousRace = state.race;
    state.phase = state.phase === "playing" ? "paused" : state.phase;
    shell(title, "Confirmation");
    state.race = previousRace;
    const panel = el("section", "red-eye-menu-panel");
    panel.append(el("h2", "", title), el("p", "", copy));
    const actions = el("div", "red-eye-menu-actions");
    actions.append(actionButton("Yes", "danger-action", action), actionButton("Cancel", "primary-action", () => {
      if (state.race && !state.race.ended) resumeGame();
      else renderIntro();
    }));
    panel.append(actions);
    root.append(panel);
  }

  function exitToArcade() {
    destroyGame();
    onExit?.();
  }

  function bindEvents() {
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);
    window.addEventListener("blur", handleBlur);
  }

  function handleKeydown(event) {
    if (shouldPreventScroll(event, controls)) event.preventDefault();
    keys.add(event.code);
    if (matchesControl(event, controls.pause)) {
      event.preventDefault();
      state.phase === "paused" ? resumeGame() : pauseGame();
    }
    if (matchesControl(event, controls.dive) && !event.repeat) {
      event.preventDefault();
      pressed.add("dive");
    }
  }

  function handleKeyup(event) {
    keys.delete(event.code);
  }

  function handleBlur() {
    keys.clear();
    pressed.clear();
  }

  async function toggleSound() {
    const enabled = !currentData.settings.sound;
    currentData = await updateData((draft) => {
      draft.settings.sound = enabled;
      return draft;
    });
    await audio.loadSettings?.();
    if (state.phase === "playing") renderGameplay();
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(720, Math.floor(rect.width * scale));
    canvas.height = Math.max(520, Math.floor(rect.height * scale));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx?.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function draw(time) {
    if (!canvas || !ctx || !state.race) return;
    renderer.draw(ctx, canvas, state, time);
  }

  function teardownCanvas() {
    cancelAnimationFrame(raf);
    raf = 0;
    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = null;
    canvas = null;
    ctx = null;
  }

  function destroyGame() {
    teardownCanvas();
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("keyup", handleKeyup);
    window.removeEventListener("blur", handleBlur);
    keys.clear();
    pressed.clear();
    state.phase = "ended";
  }

  function actionButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (className) button.className = className;
    button.addEventListener("click", () => {
      audio.play("button");
      handler();
    });
    return button;
  }

  function toggleButton(label, handler) {
    const button = actionButton(label, "primary-action", handler);
    button.setAttribute("aria-pressed", "true");
    return button;
  }

  return {
    initializeGame,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    destroyGame,
    saveResult,
    startGreenPhase: () => state.race && startGreenPhase(state.race.watchkeeper),
    startWarningPhase: () => state.race && startWarningPhase(state.race.watchkeeper),
    startRedPhase: () => state.race && startRedPhase(state.race.watchkeeper),
    rotateWatchkeeper: () => state.race?.watchkeeper,
    updatePlayerMovement: update,
    updateComputerAI,
    detectMovement,
    eliminateContestant,
    registerFinish: handleFinishers,
    completeMatch,
  };
}
