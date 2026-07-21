import { labelsFor, matchesControl, shouldPreventScroll } from "../../shared/controls.js";
import { getData, recordGameResult, updateData } from "../../shared/storage.js";
import { createAiBrain, difficultyConfig, updateComputerAI } from "./runway-rumble-ai.js";
import {
  COURSE_CHALLENGES,
  ROUND_QUALIFIERS,
  chooseCompetitionCourses,
  getCourseTitle,
  getRunwayCourse,
  getTutorialCourse,
} from "./runway-rumble-levels.js";
import {
  CUSTOMISE_GROUPS,
  DEFAULT_CHARACTER,
  characterSummary,
  cosmeticKey,
  createOpponentProfile,
  isCosmeticUnlocked,
  listCosmetics,
  resolveCharacter,
} from "./runway-rumble-customisation.js";
import {
  createObstacleStates,
  createStartSlots,
  checkCheckpoint as physicsCheckCheckpoint,
  finishReached,
  respawnContestant as physicsRespawnContestant,
  resolveContestantCollisions,
  startFall,
  updateContestantPhysics,
  updateObstacleStates,
} from "./runway-rumble-physics.js";
import { createRunwayRenderer } from "./runway-rumble-renderer.js";

const PLAYER = "player";
const TOTAL_CONTESTANTS = 16;
const FINAL_ROUND = 3;
const MAX_PARTICLES = 120;

export function createRunwayRumbleGame(context) {
  const { root, audio, data, options, onExit, onSetup, onResult } = context;
  const controls = options.controls;
  const renderer = createRunwayRenderer();

  let currentData = data;
  let records = currentData.progress.runwayRumbleRecords;
  let canvas;
  let ctx;
  let resizeObserver;
  let raf = 0;
  let lastTime = 0;
  let resultSaved = false;
  let state = createMenuState();

  const keys = new Set();
  const pressed = new Set();

  function createMenuState() {
    return {
      screen: "intro",
      phase: "menu",
      difficulty: options.difficulty || records.selectedDifficulty || "normal",
      character: { ...DEFAULT_CHARACTER, ...(records.selectedCharacter || {}) },
      courseOrder: [...(records.selectedCourseOrder || [])],
      competition: null,
      course: null,
      courseId: null,
      round: 1,
      contestants: [],
      roster: [],
      obstacleStates: {},
      qualifiers: [],
      finishers: [],
      qualificationLimit: 10,
      countdown: 3,
      elapsed: 0,
      runSoundTimer: 0,
      fade: 0,
      particles: [],
      camera: {
        x: 490,
        y: 2400,
        angle: 0,
        targetAngle: 0,
        scale: 1,
        ready: false,
        sensitivity: records.cameraSensitivity ?? 0.65,
      },
      reduceMotion: Boolean(currentData.settings.reduceMotion),
      tutorial: false,
      pendingScreen: null,
    };
  }

  async function initializeGame() {
    currentData = await getData();
    records = currentData.progress.runwayRumbleRecords;
    state = createMenuState();
    bindEvents();
    await markRecentlyPlayed();
    if (options.continueCompetition && records.pausedCompetition) {
      restorePausedCompetition(records.pausedCompetition);
      renderCoursePreview(state.round);
    } else {
      renderIntro();
    }
  }

  function startGame() {
    if (state.phase === "playing" || state.phase === "countdown") startLoop();
  }

  async function markRecentlyPlayed() {
    currentData = await updateData((draft) => {
      draft.progress.recentlyPlayed = "runway-rumble";
      return draft;
    });
    records = currentData.progress.runwayRumbleRecords;
    await onResult?.({ gameId: "runway-rumble", summary: "Runway Rumble opened" });
  }

  function shell(title, subtitle = "") {
    teardownCanvas();
    root.className = "arcade-view runway-rumble-game";
    root.replaceChildren();
    const bar = el("section", "game-bar runway-game-bar");
    const heading = el("div", "game-title");
    heading.append(el("h1", "", "Runway Rumble"), el("p", "", subtitle || "Solo airport obstacle-course knockout"));
    const actions = el("div", "game-actions");
    actions.append(
      actionButton("Challenges", "", renderChallenges),
      actionButton("Stats", "", renderStatsScreen),
      actionButton("Arcade", "", () => renderReturnConfirm()),
    );
    bar.append(heading, quickStats(), actions);
    root.append(bar);
    if (title) {
      const sr = el("span", "runway-screen-title", title);
      sr.setAttribute("aria-live", "polite");
      root.append(sr);
    }
  }

  function quickStats() {
    const strip = el("div", "score-strip runway-mini-stats");
    strip.append(
      miniStat("Stars", records.boardingStars),
      miniStat("Best", records.bestPlacement ? ordinal(records.bestPlacement) : "None"),
      miniStat("Wins", records.finalVictories),
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
    shell("Game introduction", "Race 15 local computer contestants through floating airport courses.");
    const panel = el("section", "runway-menu-panel");
    panel.append(
      el("span", "card-meta", "Game introduction"),
      el("h2", "", "Outlast the terminal crowd"),
      el("p", "", "Runway Rumble is a solo knockout race across cheerful sky-airport obstacle courses. Qualify from two rounds, then claim the Sky Crown before every dummy rival."),
    );
    const grid = el("div", "runway-info-grid");
    [
      ["16 contestants", "You control one rounded dummy. Fifteen computer opponents race locally with the same checkpoints and obstacle rules."],
      ["Three rounds", "Round 1 keeps 10 racers, Round 2 keeps 6 racers, and the final round has one champion."],
      ["No instant elimination", "Falling sends contestants back to their latest checkpoint. Qualification slots decide elimination."],
      ["Offline rewards", "Boarding Stars unlock original character colours, scarves, hats, trails, and celebrations."],
    ].forEach(([heading, copy]) => grid.append(infoCard(heading, copy)));
    const actions = el("div", "runway-menu-actions");
    if (records.pausedCompetition) actions.append(actionButton("Continue Competition", "primary-action", () => {
      restorePausedCompetition(records.pausedCompetition);
      renderCoursePreview(state.round);
    }));
    actions.append(
      actionButton(records.tutorialComplete ? "Replay Tutorial" : "Tutorial", "", renderTutorial),
      actionButton("Choose Difficulty", "primary-action", renderDifficultyScreen),
      actionButton("Character Customisation", "", renderCustomisation),
      actionButton("Competition Overview", "", renderCompetitionOverview),
    );
    panel.append(grid, actions);
    root.append(panel);
  }

  function infoCard(title, copy) {
    const card = el("article", "runway-info-card");
    card.append(el("h3", "", title), el("p", "", copy));
    return card;
  }

  function renderTutorial() {
    state.screen = "tutorial";
    state.phase = "menu";
    shell("Tutorial", "Practice the runway basics without elimination pressure.");
    const panel = el("section", "runway-menu-panel");
    panel.append(el("span", "card-meta", "Tutorial"), el("h2", "", "Practice Runway"));
    const list = el("ul", "instructions-list");
    [
      `Move with ${labelsFor([controls.up[0], controls.left[0], controls.down[0], controls.right[0]])}.`,
      `Jump gaps with ${labelsFor(controls.jump)} and dive or slide with ${labelsFor(controls.dive)}.`,
      "Glowing runway markers save your latest checkpoint before a fall.",
      "The qualification counter shows how many racers can still advance.",
      "Moving bars, conveyors, gates, wind, and platforms affect you and computer contestants equally.",
    ].forEach((line) => list.append(el("li", "", line)));
    const actions = el("div", "runway-menu-actions");
    actions.append(
      actionButton("Start Practice Runway", "primary-action", startTutorialRun),
      actionButton("Skip Tutorial", "", renderDifficultyScreen),
      actionButton(records.tutorialReminders ? "Disable Reminders" : "Reminders Off", "", async () => {
        currentData = await updateData((draft) => {
          draft.progress.runwayRumbleRecords.tutorialReminders = false;
          return draft;
        });
        records = currentData.progress.runwayRumbleRecords;
        renderTutorial();
      }),
    );
    panel.append(list, actions);
    root.append(panel);
  }

  function renderDifficultyScreen() {
    state.screen = "difficulty";
    state.phase = "menu";
    shell("Difficulty selection", "Choose how efficiently the local computer contestants race.");
    const panel = el("section", "runway-menu-panel");
    panel.append(el("span", "card-meta", "Difficulty selection"), el("h2", "", "Knockout Pressure"));
    const grid = el("div", "runway-choice-grid");
    [
      ["easy", "Easy", "Slower opponents, frequent mistakes, longer obstacle waits, and extra qualification room."],
      ["normal", "Normal", "Balanced speed, route choices, mistakes, and fair knockout pressure."],
      ["hard", "Hard", "Efficient fair opponents, quicker recovery, smarter routes, and rare mistakes."],
    ].forEach(([id, label, copy]) => {
      grid.append(choiceCard(label, copy, state.difficulty === id, async () => {
        state.difficulty = id;
        currentData = await updateData((draft) => {
          draft.progress.runwayRumbleRecords.selectedDifficulty = id;
          return draft;
        });
        records = currentData.progress.runwayRumbleRecords;
        renderDifficultyScreen();
      }));
    });
    const actions = el("div", "runway-menu-actions");
    actions.append(actionButton("Character Customisation", "primary-action", renderCustomisation), actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderCustomisation() {
    state.screen = "customise";
    state.phase = "menu";
    shell("Character customisation", "Make the player dummy easy to spot.");
    const panel = el("section", "runway-custom-panel");
    const header = el("div", "runway-section-header");
    const character = resolveCharacter({ selectedCharacter: state.character });
    header.append(
      el("div", "", [
        el("span", "card-meta", "Character customisation"),
        el("h2", "", "Your Runway Dummy"),
        el("p", "", characterSummary(state.character)),
      ]),
      previewDummy(character),
    );
    const grid = el("div", "runway-custom-grid");
    CUSTOMISE_GROUPS.forEach((group) => {
      const card = el("section", "runway-custom-group");
      card.append(el("h3", "", group.label));
      listCosmetics(group.id).forEach((item) => {
        const unlocked = isCosmeticUnlocked(records, group.id, item.id);
        const selected = state.character[group.id] === item.id;
        const button = actionButton(`${item.name}${unlocked ? "" : ` (${item.cost} stars)`}`, selected ? "is-selected" : "", async () => {
          if (!unlocked) return renderCosmeticUnlock(group.id, item.id);
          state.character[group.id] = item.id;
          await saveCharacter();
          renderCustomisation();
        });
        button.disabled = !unlocked && records.boardingStars < item.cost;
        if (item.color) {
          const swatch = el("i", "runway-swatch");
          swatch.style.background = item.color;
          button.prepend(swatch);
        }
        card.append(button);
      });
      grid.append(card);
    });
    const actions = el("div", "runway-menu-actions");
    actions.append(
      actionButton("Unlock Cosmetics", "", renderCosmeticUnlocks),
      actionButton("Competition Overview", "primary-action", renderCompetitionOverview),
      actionButton("Back", "", renderDifficultyScreen),
    );
    panel.append(header, grid, actions);
    root.append(panel);
  }

  function previewDummy(character) {
    const preview = el("div", "runway-dummy-preview");
    preview.style.setProperty("--dummy", character.body?.color || "#39bde5");
    preview.style.setProperty("--scarf", character.scarfItem?.color || "#ef5b63");
    preview.append(el("span", "runway-preview-hat", character.hat === "pilot" ? "CAP" : character.hat === "cloud" ? "CLOUD" : ""), el("strong", "", "YOU"));
    return preview;
  }

  async function saveCharacter() {
    currentData = await updateData((draft) => {
      draft.progress.runwayRumbleRecords.selectedCharacter = { ...state.character };
      return draft;
    });
    records = currentData.progress.runwayRumbleRecords;
  }

  function renderCompetitionOverview() {
    state.screen = "overview";
    state.phase = "menu";
    shell("Competition overview", "Three rounds, one local champion.");
    const panel = el("section", "runway-menu-panel");
    panel.append(el("span", "card-meta", "Competition overview"), el("h2", "", "Knockout Rules"));
    const grid = el("div", "runway-info-grid");
    [
      ["Round 1", "16 contestants start. First 10 qualify; 6 are eliminated."],
      ["Round 2", "10 contestants start. First 6 qualify; 4 are eliminated."],
      ["Final Round", "6 contestants chase the Sky Crown. First touch wins."],
      ["Fair recoveries", "Falling respawns contestants at checkpoints; nobody is removed for one mistake."],
    ].forEach(([heading, copy]) => grid.append(infoCard(heading, copy)));
    const order = state.courseOrder.length === 3 ? state.courseOrder : chooseCompetitionCourses();
    state.courseOrder = order;
    const preview = courseOrderPanel(order);
    const actions = el("div", "runway-menu-actions");
    actions.append(
      actionButton("Select New Courses", "", async () => {
        state.courseOrder = chooseCompetitionCourses();
        await saveCourseOrder();
        renderCompetitionOverview();
      }),
      actionButton("Course Preview", "primary-action", async () => {
        await saveCourseOrder();
        startCompetition(state.courseOrder);
        renderCoursePreview(1);
      }),
      actionButton("Back", "", renderCustomisation),
    );
    panel.append(grid, preview, actions);
    root.append(panel);
  }

  function courseOrderPanel(order) {
    const card = el("section", "runway-course-order");
    card.append(el("h3", "", "Selected Courses"));
    order.forEach((courseId, index) => card.append(el("p", "", `Round ${index + 1}: ${getCourseTitle(courseId)}`)));
    return card;
  }

  async function saveCourseOrder() {
    currentData = await updateData((draft) => {
      draft.progress.runwayRumbleRecords.selectedCourseOrder = [...state.courseOrder];
      return draft;
    });
    records = currentData.progress.runwayRumbleRecords;
  }

  function startCompetition(order) {
    state.competition = {
      round: 1,
      courseOrder: [...order],
      aliveIds: [PLAYER, ...Array.from({ length: 15 }, (_, index) => `bot-${index + 1}`)],
      completedRounds: [],
      starsEarned: 0,
      round1Qualified: false,
      round2Qualified: false,
      finalAppearance: false,
      totalFalls: 0,
      totalCheckpoints: 0,
      challengeState: {
        roundFalls: 0,
        roundJumps: 0,
        roundBarHits: 0,
        competitionCheckpoints: 0,
      },
      completedChallenges: [],
    };
    state.roster = buildRoster();
    state.round = 1;
  }

  function restorePausedCompetition(saved) {
    const order = saved.courseOrder?.length === 3 ? saved.courseOrder : chooseCompetitionCourses();
    state.courseOrder = order;
    state.roster = saved.roster?.length ? saved.roster : buildRoster();
    state.competition = {
      round: saved.round || 1,
      courseOrder: order,
      aliveIds: saved.aliveIds?.length ? saved.aliveIds : [PLAYER, ...Array.from({ length: 15 }, (_, index) => `bot-${index + 1}`)],
      completedRounds: saved.completedRounds || [],
      starsEarned: saved.starsEarned || 0,
      round1Qualified: Boolean(saved.round1Qualified),
      round2Qualified: Boolean(saved.round2Qualified),
      finalAppearance: Boolean(saved.finalAppearance),
      totalFalls: saved.totalFalls || 0,
      totalCheckpoints: saved.totalCheckpoints || 0,
      challengeState: saved.challengeState || { roundFalls: 0, roundJumps: 0, roundBarHits: 0, competitionCheckpoints: 0 },
      completedChallenges: saved.completedChallenges || [],
    };
    state.round = state.competition.round;
  }

  function buildRoster() {
    const character = resolveCharacter({ selectedCharacter: state.character });
    const player = {
      id: PLAYER,
      name: "YOU",
      isPlayer: true,
      bodyColor: character.body?.color || "#39bde5",
      accent: "#ffffff",
      scarfColor: character.scarfItem?.color || "#ef5b63",
      face: state.character.face,
      hat: state.character.hat,
      accessory: state.character.accessory,
      trail: state.character.trail,
      victory: state.character.victory,
    };
    const config = difficultyConfig(state.difficulty);
    return [
      player,
      ...Array.from({ length: 15 }, (_, index) => {
        const profile = createOpponentProfile(index, config.aiSpeed);
        return {
          id: profile.id,
          name: profile.name,
          isPlayer: false,
          bodyColor: profile.bodyColor,
          accent: profile.accent,
          scarfColor: profile.accent,
          face: profile.face,
          hat: profile.accessory === "cap" ? "pilot" : "none",
          accessory: profile.accessory,
          trail: "spark",
          victory: "wave",
        };
      }),
    ];
  }

  function renderCoursePreview(roundNumber = state.round) {
    state.screen = "preview";
    state.phase = "menu";
    shell("Course preview", "Review the next floating airport course.");
    if (!state.competition) startCompetition(state.courseOrder.length === 3 ? state.courseOrder : chooseCompetitionCourses());
    const courseId = state.competition.courseOrder[roundNumber - 1];
    const course = getRunwayCourse(courseId);
    const panel = el("section", "runway-preview-panel");
    const status = roundNumber === FINAL_ROUND ? "Final Round" : `First ${ROUND_QUALIFIERS[roundNumber]} qualify`;
    panel.append(el("span", "card-meta", `Round ${roundNumber}`), el("h2", "", course.title), el("p", "", `${course.purpose} ${status}.`));
    const grid = el("div", "runway-info-grid");
    grid.append(
      infoCard("Objective", course.objective),
      infoCard("Contestants", `${state.competition.aliveIds.length} racers start this round.`),
      infoCard("Checkpoints", `${course.checkpoints.length} glowing checkpoint marker${course.checkpoints.length === 1 ? "" : "s"}.`),
      infoCard("Obstacles", [...new Set(course.obstacles.map((obstacle) => obstacle.warning))].slice(0, 5).join(", ")),
    );
    const actions = el("div", "runway-menu-actions");
    actions.append(
      actionButton(`Start Round ${roundNumber}`, "primary-action", () => loadCourse(roundNumber)),
      actionButton("Course Challenges", "", renderChallenges),
      actionButton("Restart Competition", "", renderRestartCompetitionConfirm),
      actionButton("Back", "", renderCompetitionOverview),
    );
    panel.append(grid, courseOrderPanel(state.competition.courseOrder), actions);
    root.append(panel);
  }

  function startTutorialRun() {
    state.tutorial = true;
    state.competition = null;
    state.roster = buildRoster().slice(0, 1);
    loadCourse(1, getTutorialCourse());
  }

  function loadCourse(roundNumber, overrideCourse = null) {
    resultSaved = false;
    state.round = roundNumber;
    state.course = overrideCourse || getRunwayCourse(state.competition.courseOrder[roundNumber - 1]);
    state.courseId = state.course.id;
    state.phase = "countdown";
    state.screen = "playing";
    state.countdown = 3;
    state.elapsed = 0;
    state.fade = 0;
    state.qualifiers = [];
    state.finishers = [];
    state.particles = [];
    state.qualificationLimit = state.tutorial ? 1 : ROUND_QUALIFIERS[roundNumber];
    state.obstacleStates = createObstacleStates(state.course);
    state.camera.ready = false;
    state.competition?.challengeState && Object.assign(state.competition.challengeState, {
      roundFalls: 0,
      roundJumps: 0,
      roundBarHits: 0,
    });
    spawnContestants();
    renderGameplay();
    audio.play("runwayCountdown");
    startLoop();
  }

  function spawnContestants() {
    const activeIds = state.tutorial ? [PLAYER] : state.competition.aliveIds;
    const slots = createStartSlots(state.course, activeIds.length);
    const config = difficultyConfig(state.difficulty);
    state.contestants = activeIds.map((id, index) => {
      const profile = state.roster.find((item) => item.id === id) || buildRoster().find((item) => item.id === id);
      const slot = slots[index];
      const contestant = {
        ...profile,
        x: slot.x,
        y: slot.y,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        radius: profile.isPlayer ? 22 : 20,
        facingX: 0,
        facingY: -1,
        speedMultiplier: profile.isPlayer ? 1 : config.aiSpeed,
        spawnOffsetX: profile.isPlayer ? 0 : (Math.random() - 0.5) * 22,
        spawnOffsetY: profile.isPlayer ? 0 : (Math.random() - 0.5) * 22,
        checkpointIndex: 0,
        checkpointsUsed: 0,
        falls: 0,
        jumps: 0,
        obstacleHits: 0,
        rotatingBarHits: 0,
        finished: false,
        eliminated: false,
        finishPosition: null,
        finishTime: null,
        falling: false,
        fallTimer: 0,
        protection: 0,
        jumpCooldown: 0,
        diveCooldown: 0,
        diveTimer: 0,
        stumble: 0,
        padCooldown: 0,
        animationTime: Math.random(),
        ai: profile.isPlayer ? null : createAiBrain(index, state.difficulty, state.course),
      };
      if (!profile.isPlayer && contestant.ai) contestant.speedMultiplier = contestant.ai.skill;
      return contestant;
    });
  }

  function renderGameplay() {
    teardownCanvas();
    root.className = "arcade-view runway-rumble-game is-playing";
    root.replaceChildren();
    const top = el("section", "runway-topbar");
    top.append(
      statPanel("Round", state.tutorial ? "Tutorial" : `${state.round} / 3`, state.course.title),
      statPanel("Position", "-", "Current race place", "runwayPosition"),
      statPanel("Qualified", qualificationText(), state.course.final ? "Claim the Sky Crown" : "Slots filled", "runwayQualified"),
      actionButton("Pause", "primary-action", pauseGame),
      actionButton(currentData.settings.sound ? "Sound On" : "Sound Off", "", toggleSound),
    );
    const play = el("section", "runway-play-shell");
    canvas = document.createElement("canvas");
    canvas.id = "runwayRumbleCanvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Runway Rumble floating airport obstacle course with contestants, checkpoints, moving obstacles, and finish objective.");
    ctx = canvas.getContext("2d");
    const overlay = el("div", "game-overlay");
    overlay.id = "runwayOverlay";
    play.append(canvas, overlay);
    const bottom = el("section", "runway-bottom-hud");
    bottom.append(
      liveLine("Objective", "runwayObjective"),
      liveLine("Dive cooldown", "runwayDive"),
      liveLine("Checkpoint", "runwayCheckpoint"),
      liveLine("Controls", "runwayControls"),
    );
    const side = el("aside", "runway-qualified-list");
    side.append(el("h2", "", state.course.final ? "Final Chase" : "Qualified Contestants"), el("ol", "", "", "runwayQualifiedList"));
    const layout = el("section", "runway-layout");
    layout.append(play, side);
    root.append(top, layout, bottom);
    observeCanvas();
    resizeCanvas();
    updateHud();
  }

  function statPanel(label, value, detail, id = "") {
    const panel = el("div", "runway-stat-panel");
    panel.append(el("span", "field-label", label), el("strong", "", value), el("small", "", detail));
    if (id) panel.querySelector("strong").id = id;
    return panel;
  }

  function liveLine(label, id) {
    const row = el("div", "runway-live-line");
    row.append(el("span", "", label), el("strong", "", ""));
    row.querySelector("strong").id = id;
    return row;
  }

  function observeCanvas() {
    resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(760, Math.floor(rect.width || 930));
    const height = Math.max(500, Math.floor(rect.height || 620));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function teardownCanvas() {
    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = null;
    canvas = null;
    ctx = null;
  }

  function startLoop() {
    cancelAnimationFrame(raf);
    lastTime = performance.now();
    const tick = (time) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      if ((state.phase === "playing" || state.phase === "countdown") && !state.paused) update(dt);
      if ((state.phase === "playing" || state.phase === "countdown" || state.phase === "paused") && ctx && canvas) {
        renderer.draw(ctx, canvas, state, time);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function update(dt) {
    state.elapsed += dt;
    updateCameraInput(dt);
    updateParticles(dt);
    if (state.phase === "countdown") {
      state.countdown -= dt;
      updateOverlay();
      if (state.countdown <= 0) {
        state.phase = "playing";
        audio.play("runwayStart");
      }
      return;
    }
    updateObstacleStates(state.course, state.obstacleStates, state.contestants, dt);
    const config = difficultyConfig(state.difficulty);
    const player = playerContestant();
    for (const contestant of state.contestants) {
      const input = contestant.isPlayer
        ? playerInput()
        : updateComputerAI(contestant, state.course, state.obstacleStates, state.difficulty, dt);
      const events = updateContestantPhysics(contestant, input, state.course, state.obstacleStates, config, dt);
      processEvents(contestant, events);
      if (finishReached(contestant, state.course)) registerFinish(contestant);
    }
    resolveContestantCollisions(state.contestants, dt);
    if (player && player.y > state.course.height + 160) processEvents(player, startFall(player) ? ["fall"] : []);
    updateRunSound(dt);
    updateHud();
  }

  function updateCameraInput(dt) {
    const sensitivity = state.camera.sensitivity || 0.65;
    if (controls.cameraLeft?.some((code) => keys.has(code))) state.camera.targetAngle -= dt * sensitivity;
    if (controls.cameraRight?.some((code) => keys.has(code))) state.camera.targetAngle += dt * sensitivity;
    if (controls.cameraReset?.some((code) => keys.has(code))) state.camera.targetAngle += (0 - state.camera.targetAngle) * Math.min(1, dt * 8);
    state.camera.targetAngle = Math.max(-0.55, Math.min(0.55, state.camera.targetAngle));
    state.camera.angle += (state.camera.targetAngle - state.camera.angle) * Math.min(1, dt * 7);
  }

  function playerInput() {
    const x = (controls.right.some((code) => keys.has(code)) ? 1 : 0) - (controls.left.some((code) => keys.has(code)) ? 1 : 0);
    const y = (controls.down.some((code) => keys.has(code)) ? 1 : 0) - (controls.up.some((code) => keys.has(code)) ? 1 : 0);
    return {
      x,
      y,
      jump: consume(controls.jump),
      dive: consume(controls.dive),
    };
  }

  function consume(codes) {
    const match = codes.some((code) => pressed.has(code));
    if (match) codes.forEach((code) => pressed.delete(code));
    return match;
  }

  function processEvents(contestant, events) {
    if (!events.length) return;
    for (const event of events) {
      if (contestant.isPlayer) {
        if (event === "jump" || event === "jumpPad") audio.play("runwayJump");
        if (event === "dive") audio.play("runwayDive");
        if (event === "fall") audio.play("runwayFall");
        if (event === "checkpoint") audio.play("runwayCheckpoint");
        if (event === "bar" || event === "obstacle") audio.play("runwayBump");
      }
      if (event === "fall" && state.competition) {
        state.competition.totalFalls += contestant.isPlayer ? 1 : 0;
        if (contestant.isPlayer) state.competition.challengeState.roundFalls += 1;
      }
      if (event === "checkpoint" && state.competition && contestant.isPlayer) {
        state.competition.totalCheckpoints += 1;
        state.competition.challengeState.competitionCheckpoints += 1;
      }
      if ((event === "jump" || event === "jumpPad") && state.competition && contestant.isPlayer) state.competition.challengeState.roundJumps += 1;
      if (event === "bar" && state.competition && contestant.isPlayer) state.competition.challengeState.roundBarHits += 1;
      if (["fall", "respawn", "checkpoint", "obstacle", "bar", "jumpPad"].includes(event)) addBurst(contestant.x, contestant.y, event === "fall" ? "#ffffff" : "#ffd35a");
    }
  }

  function registerFinish(contestant) {
    if (contestant.finished || state.phase !== "playing") return;
    contestant.finished = true;
    contestant.finishPosition = state.finishers.length + 1;
    contestant.finishTime = state.elapsed;
    state.finishers.push(contestant.id);
    if (state.tutorial) {
      completeTutorialRun();
      return;
    }
    if (state.course.final) {
      completeCompetition(contestant);
      return;
    }
    if (state.qualifiers.length < state.qualificationLimit) {
      state.qualifiers.push(contestant.id);
      if (contestant.isPlayer) audio.play("runwayQualify");
    }
    if (state.qualifiers.length >= state.qualificationLimit) completeRound();
  }

  function completeRound() {
    if (state.phase !== "playing") return;
    state.phase = "round-result";
    cancelAnimationFrame(raf);
    const playerQualified = state.qualifiers.includes(PLAYER);
    const player = playerContestant();
    const placement = player?.finishPosition || currentPosition(PLAYER);
    state.competition.completedRounds.push({
      round: state.round,
      courseId: state.course.id,
      qualifiers: [...state.qualifiers],
      placement,
    });
    const alive = [...state.qualifiers];
    state.competition.aliveIds = alive;
    awardRoundChallenges(placement);
    if (state.round === 1 && playerQualified) {
      state.competition.round1Qualified = true;
      state.competition.starsEarned += 2;
    }
    if (state.round === 2 && playerQualified) {
      state.competition.round2Qualified = true;
      state.competition.finalAppearance = true;
      state.competition.starsEarned += 3;
    }
    savePausedCompetition();
    if (playerQualified) renderQualifiedScreen(placement);
    else eliminatePlayer(placement);
  }

  function awardRoundChallenges(placement) {
    if (!state.competition) return;
    const challenges = state.competition.challengeState;
    if (challenges.roundFalls === 0) completeChallenge("no-falls");
    if (placement <= 3) completeChallenge("top-three");
    if (challenges.roundJumps >= 5) completeChallenge("five-jumps");
    if (challenges.roundBarHits === 0) completeChallenge("avoid-bars");
  }

  function completeChallenge(id) {
    const challenge = COURSE_CHALLENGES.find((item) => item.id === id);
    if (!challenge || state.competition.completedChallenges.includes(id) || records.completedChallenges.includes(id)) return;
    state.competition.completedChallenges.push(id);
    state.competition.starsEarned += challenge.reward;
  }

  function renderQualifiedScreen(placement) {
    state.screen = "qualified";
    shell("Qualified result", "Continue only when you are ready.");
    const panel = resultPanel("Qualified!", "runway-qualified");
    panel.append(resultGrid([
      ["Your position", ordinal(placement)],
      ["Round reached", state.round],
      ["Course", state.course.title],
      ["Boarding Stars so far", state.competition.starsEarned],
    ]));
    panel.append(qualifiedList());
    const actions = el("div", "runway-menu-actions");
    actions.append(
      actionButton(state.round === 2 ? "Start Final Round" : "Continue", "primary-action", () => {
        state.round += 1;
        state.competition.round = state.round;
        renderCoursePreview(state.round);
      }),
      actionButton("Restart Competition", "", renderRestartCompetitionConfirm),
      actionButton("Return to Arcade", "", renderReturnConfirm),
    );
    panel.append(actions);
    root.append(panel);
  }

  function eliminatePlayer(placement) {
    audio.play("runwayEliminate");
    state.screen = "eliminated";
    state.phase = "ended";
    const stars = state.competition.starsEarned;
    saveResult({
      gameId: "runway-rumble",
      mode: "solo",
      difficulty: state.difficulty,
      winner: "computer",
      score: stars,
      competitionEnded: true,
      roundNumber: state.round,
      roundsPlayed: state.round,
      finalPlacement: placement,
      boardingStars: stars,
      round1Qualified: state.competition.round1Qualified,
      round2Qualified: state.competition.round2Qualified,
      finalAppearance: state.competition.finalAppearance,
      falls: state.competition.totalFalls,
      checkpointsUsed: state.competition.totalCheckpoints,
      completedChallenges: state.competition.completedChallenges,
      selectedCourseOrder: state.competition.courseOrder,
      character: { ...state.character },
      cameraSensitivity: state.camera.sensitivity,
      summary: `Eliminated in Round ${state.round} at ${ordinal(placement)}`,
    });
    shell("Eliminated result", "The qualification slots filled before you reached safety.");
    const panel = resultPanel("Eliminated", "runway-eliminated");
    panel.append(resultGrid([
      ["Your position", ordinal(placement)],
      ["Round reached", state.round],
      ["Boarding Stars earned", stars],
      ["Qualified contestants", state.qualifiers.map(nameFor).join(", ")],
    ]));
    const actions = el("div", "runway-menu-actions");
    actions.append(actionButton("Retry Competition", "primary-action", restartCompetition), actionButton("Return to Arcade", "", exitToArcade));
    panel.append(actions);
    root.append(panel);
  }

  function completeCompetition(winner) {
    if (state.phase !== "playing") return;
    state.phase = "ended";
    cancelAnimationFrame(raf);
    const playerWon = winner.id === PLAYER;
    const playerPlacement = playerWon ? 1 : Math.max(2, currentPosition(PLAYER));
    if (state.competition.challengeState.competitionCheckpoints < 3) completeChallenge("few-checkpoints");
    if (playerWon && state.difficulty === "normal") completeChallenge("normal-win");
    if (playerWon && state.difficulty === "hard") completeChallenge("hard-win");
    const stars = state.competition.starsEarned + (playerWon ? 10 : 4);
    saveResult({
      gameId: "runway-rumble",
      mode: "solo",
      difficulty: state.difficulty,
      winner: playerWon ? "solo" : "computer",
      score: playerWon ? 1000 + stars * 10 : stars * 10,
      competitionEnded: true,
      roundNumber: 3,
      roundsPlayed: 3,
      finalPlacement: playerPlacement,
      boardingStars: stars,
      round1Qualified: state.competition.round1Qualified,
      round2Qualified: state.competition.round2Qualified,
      finalAppearance: true,
      falls: state.competition.totalFalls,
      checkpointsUsed: state.competition.totalCheckpoints,
      completedChallenges: state.competition.completedChallenges,
      selectedCourseOrder: state.competition.courseOrder,
      character: { ...state.character },
      cameraSensitivity: state.camera.sensitivity,
      summary: playerWon ? "Runway Champion!" : `${winner.name} claimed the Sky Crown`,
    });
    audio.play(playerWon ? "runwayVictory" : "runwayEliminate");
    if (playerWon) renderFinalVictory(stars, playerPlacement);
    else renderComputerVictory(winner, stars, playerPlacement);
  }

  async function completeTutorialRun() {
    state.phase = "ended";
    cancelAnimationFrame(raf);
    audio.play("runwayQualify");
    await saveResult({
      gameId: "runway-rumble",
      mode: "solo",
      difficulty: state.difficulty,
      winner: "solo",
      score: 30,
      tutorialComplete: true,
      boardingStars: records.tutorialComplete ? 0 : 3,
      roundsPlayed: 0,
      character: { ...state.character },
      cameraSensitivity: state.camera.sensitivity,
      summary: "Tutorial completed",
    });
    shell("Tutorial complete", "The practice runway is complete.");
    const panel = resultPanel("Tutorial Complete", "runway-qualified");
    panel.append(el("p", "", records.tutorialComplete ? "Practice complete." : "You earned 3 Boarding Stars."));
    const actions = el("div", "runway-menu-actions");
    actions.append(actionButton("Choose Difficulty", "primary-action", renderDifficultyScreen), actionButton("Replay Tutorial", "", renderTutorial));
    panel.append(actions);
    root.append(panel);
  }

  function renderFinalVictory(stars) {
    state.screen = "victory";
    shell("Final victory result", "You claimed the Sky Crown.");
    const panel = resultPanel("Runway Champion!", "runway-champion");
    panel.append(resultGrid([
      ["Final placement", "1st"],
      ["Courses completed", state.competition.courseOrder.map(getCourseTitle).join(", ")],
      ["Falls", state.competition.totalFalls],
      ["Checkpoints used", state.competition.totalCheckpoints],
      ["Boarding Stars earned", stars],
    ]));
    panel.append(unlockSummary());
    const actions = el("div", "runway-menu-actions");
    actions.append(actionButton("Play Again", "primary-action", restartCompetition), actionButton("Cosmetics", "", renderCosmeticUnlocks), actionButton("Return to Arcade", "", exitToArcade));
    panel.append(actions);
    root.append(panel);
  }

  function renderComputerVictory(winner, stars, playerPlacement) {
    state.screen = "computer-victory";
    shell("Computer victory result", `${winner.name} touched the Sky Crown first.`);
    const panel = resultPanel("Sky Crown Claimed", "runway-eliminated");
    panel.append(resultGrid([
      ["Winner", winner.name],
      ["Your placement", ordinal(playerPlacement)],
      ["Boarding Stars earned", stars],
      ["Courses completed", state.competition.courseOrder.map(getCourseTitle).join(", ")],
    ]));
    const actions = el("div", "runway-menu-actions");
    actions.append(actionButton("Retry Competition", "primary-action", restartCompetition), actionButton("Return to Arcade", "", exitToArcade));
    panel.append(actions);
    root.append(panel);
  }

  function resultPanel(title, className) {
    const panel = el("section", `runway-result-panel ${className}`);
    panel.append(el("span", "card-meta", state.tutorial ? "Tutorial" : `Round ${state.round}`), el("h2", "", title));
    return panel;
  }

  function resultGrid(rows) {
    const grid = el("dl", "runway-result-grid");
    rows.forEach(([label, value]) => {
      grid.append(el("dt", "", label), el("dd", "", String(value)));
    });
    return grid;
  }

  function qualifiedList() {
    const card = el("section", "runway-qualified-card");
    card.append(el("h3", "", "Qualified Contestants"));
    const list = el("ol");
    state.qualifiers.forEach((id) => list.append(el("li", "", nameFor(id))));
    card.append(list);
    return card;
  }

  function unlockSummary() {
    const card = el("section", "runway-qualified-card");
    card.append(el("h3", "", "Challenges Completed"));
    if (!state.competition.completedChallenges.length) {
      card.append(el("p", "", "No new course challenges this run."));
      return card;
    }
    const list = el("ul", "instructions-list");
    state.competition.completedChallenges.forEach((id) => {
      const challenge = COURSE_CHALLENGES.find((item) => item.id === id);
      if (challenge) list.append(el("li", "", `${challenge.name}: +${challenge.reward} Boarding Stars`));
    });
    card.append(list);
    return card;
  }

  function renderChallenges() {
    state.screen = "challenges";
    state.phase = "menu";
    shell("Course challenges", "Optional offline goals reward Boarding Stars.");
    const panel = el("section", "runway-menu-panel");
    panel.append(el("span", "card-meta", "Course challenges"), el("h2", "", "Boarding Star Goals"));
    const grid = el("div", "runway-info-grid");
    COURSE_CHALLENGES.forEach((challenge) => {
      const done = records.completedChallenges.includes(challenge.id);
      grid.append(infoCard(done ? `${challenge.name} completed` : challenge.name, `${challenge.description} Reward: ${challenge.reward} Boarding Stars.`));
    });
    const actions = el("div", "runway-menu-actions");
    actions.append(actionButton("Back", "primary-action", renderIntro), actionButton("Start Competition", "", renderCompetitionOverview));
    panel.append(grid, actions);
    root.append(panel);
  }

  function renderCosmeticUnlocks() {
    renderCosmeticUnlock();
  }

  function renderCosmeticUnlock(groupId = null, itemId = null) {
    state.screen = "cosmetics";
    state.phase = "menu";
    shell("Cosmetic unlock screen", "Spend Boarding Stars on original offline items.");
    const panel = el("section", "runway-custom-panel");
    panel.append(el("span", "card-meta", "Cosmetic unlock screen"), el("h2", "", `${records.boardingStars} Boarding Stars`));
    const grid = el("div", "runway-custom-grid");
    CUSTOMISE_GROUPS.forEach((group) => {
      const card = el("section", "runway-custom-group");
      card.append(el("h3", "", group.label));
      listCosmetics(group.id).forEach((item) => {
        const unlocked = isCosmeticUnlocked(records, group.id, item.id);
        const button = actionButton(unlocked ? `${item.name} unlocked` : `Unlock ${item.name} (${item.cost})`, item.id === itemId && group.id === groupId ? "is-selected" : "", async () => {
          if (unlocked || records.boardingStars < item.cost) return;
          await unlockCosmetic(group.id, item);
          renderCosmeticUnlock(group.id, item.id);
        });
        button.disabled = unlocked || records.boardingStars < item.cost;
        card.append(button);
      });
      grid.append(card);
    });
    const actions = el("div", "runway-menu-actions");
    actions.append(actionButton("Character Customisation", "primary-action", renderCustomisation), actionButton("Back", "", renderIntro));
    panel.append(grid, actions);
    root.append(panel);
  }

  async function unlockCosmetic(groupId, item) {
    currentData = await updateData((draft) => {
      const record = draft.progress.runwayRumbleRecords;
      const key = cosmeticKey(groupId, item.id);
      if (record.unlockedCosmetics.includes(key) || record.boardingStars < item.cost) return draft;
      record.boardingStars -= item.cost;
      record.unlockedCosmetics.push(key);
      return draft;
    });
    records = currentData.progress.runwayRumbleRecords;
    audio.play("runwayQualify");
  }

  function renderStatsScreen() {
    state.screen = "stats";
    state.phase = "menu";
    shell("Statistics screen", "Local Runway Rumble records.");
    const panel = el("section", "runway-menu-panel");
    panel.append(el("span", "card-meta", "Statistics"), el("h2", "", "Runway Records"));
    panel.append(resultGrid([
      ["Best placement", records.bestPlacement ? ordinal(records.bestPlacement) : "No final yet"],
      ["Competitions played", records.totalCompetitions],
      ["Total races", records.totalRaces],
      ["Total qualifications", records.totalQualifications],
      ["Round 1 qualifications", records.round1Qualifications],
      ["Round 2 qualifications", records.round2Qualifications],
      ["Final appearances", records.finalAppearances],
      ["Final victories", records.finalVictories],
      ["Boarding Stars", records.boardingStars],
    ]));
    const actions = el("div", "runway-menu-actions");
    actions.append(actionButton("Back", "primary-action", renderIntro), actionButton("Start Competition", "", renderCompetitionOverview));
    panel.append(actions);
    root.append(panel);
  }

  function pauseGame() {
    if (state.phase !== "playing" && state.phase !== "countdown") return;
    state.paused = true;
    state.phase = "paused";
    savePausedCompetition();
    renderPauseOverlay();
  }

  function renderPauseOverlay(view = "main") {
    const overlay = root.querySelector("#runwayOverlay");
    if (!overlay) return;
    overlay.replaceChildren();
    overlay.classList.add("is-visible");
    const panel = el("div", "overlay-card runway-pause-card");
    panel.append(el("h2", "", view === "controls" ? "Controls" : view === "sound" ? "Sound Settings" : "Paused"));
    if (view === "controls") {
      const list = el("ul", "control-list");
      [
        `Move: ${labelsFor([controls.up[0], controls.left[0], controls.down[0], controls.right[0]])}`,
        `Jump: ${labelsFor(controls.jump)}`,
        `Dive: ${labelsFor(controls.dive)}`,
        `Camera: ${labelsFor([controls.cameraLeft[0], controls.cameraRight[0], controls.cameraReset[0]])}`,
        `Pause: ${labelsFor(controls.pause)}`,
      ].forEach((line) => list.append(el("li", "", line)));
      panel.append(list);
    }
    if (view === "sound") {
      const volume = document.createElement("input");
      volume.type = "range";
      volume.min = "0";
      volume.max = "1";
      volume.step = "0.05";
      volume.value = String(currentData.settings.volume);
      volume.addEventListener("input", () => audio.setVolume(Number(volume.value)));
      panel.append(actionButton(currentData.settings.sound ? "Sound On" : "Sound Off", "", toggleSound), volume);
    }
    if (view === "main") {
      panel.append(
        actionButton("Resume", "primary-action", resumeGame),
        actionButton("Restart Round", "", renderRestartRoundConfirm),
        actionButton("Restart Competition", "", renderRestartCompetitionConfirm),
        actionButton("Controls", "", () => renderPauseOverlay("controls")),
        actionButton("Sound Settings", "", () => renderPauseOverlay("sound")),
        actionButton("Return to Arcade", "", renderReturnConfirm),
      );
    } else {
      panel.append(actionButton("Back to Pause", "primary-action", () => renderPauseOverlay("main")));
    }
    overlay.append(panel);
  }

  function resumeGame() {
    if (state.phase !== "paused") return;
    const overlay = root.querySelector("#runwayOverlay");
    overlay?.classList.remove("is-visible");
    overlay?.replaceChildren();
    state.paused = false;
    state.phase = state.countdown > 0 ? "countdown" : "playing";
    startLoop();
  }

  function renderRestartRoundConfirm() {
    showOverlayConfirm("Restart Round?", "This restarts the current course from the start line.", () => loadCourse(state.round));
  }

  function renderRestartCompetitionConfirm() {
    if (canvas) showOverlayConfirm("Restart Competition?", "This clears the current three-round run.", restartCompetition);
    else renderConfirmScreen("Restart confirmation", "Restart Competition?", "This clears the current three-round run.", restartCompetition, renderIntro);
  }

  function renderReturnConfirm() {
    if (canvas) showOverlayConfirm("Return to Arcade?", "Your competition progress will be saved locally.", exitToArcade);
    else renderConfirmScreen("Return-to-arcade confirmation", "Return to Arcade?", "Your competition progress will be saved locally.", exitToArcade, renderIntro);
  }

  function showOverlayConfirm(title, copy, confirm) {
    state.paused = true;
    state.phase = "paused";
    const overlay = root.querySelector("#runwayOverlay");
    if (!overlay) return;
    overlay.replaceChildren();
    overlay.classList.add("is-visible");
    const panel = el("div", "overlay-card runway-pause-card");
    panel.append(el("h2", "", title), el("p", "", copy), actionButton("Stay", "primary-action", resumeGame), actionButton(title.includes("Return") ? "Return to Arcade" : "Restart", "", confirm));
    overlay.append(panel);
  }

  function renderConfirmScreen(screenTitle, title, copy, confirm, cancel) {
    state.screen = "confirm";
    state.phase = "menu";
    shell(screenTitle, copy);
    const panel = el("section", "runway-menu-panel");
    panel.append(el("span", "card-meta", screenTitle), el("h2", "", title), el("p", "", copy));
    const actions = el("div", "runway-menu-actions");
    actions.append(actionButton("Stay", "primary-action", cancel), actionButton(title.includes("Return") ? "Return to Arcade" : "Restart", "", confirm));
    panel.append(actions);
    root.append(panel);
  }

  function restartRound() {
    loadCourse(state.round);
  }

  function restartCompetition() {
    cancelAnimationFrame(raf);
    state.tutorial = false;
    state.courseOrder = chooseCompetitionCourses();
    startCompetition(state.courseOrder);
    saveCourseOrder();
    renderCoursePreview(1);
  }

  async function exitToArcade() {
    if (state.competition && state.phase !== "ended") await savePausedCompetition();
    destroyGame();
    await onExit?.();
  }

  async function savePausedCompetition() {
    if (!state.competition || state.tutorial || state.phase === "ended") return;
    const saved = {
      round: state.round,
      courseOrder: [...state.competition.courseOrder],
      aliveIds: [...state.competition.aliveIds],
      roster: state.roster,
      completedRounds: state.competition.completedRounds,
      starsEarned: state.competition.starsEarned,
      round1Qualified: state.competition.round1Qualified,
      round2Qualified: state.competition.round2Qualified,
      finalAppearance: state.competition.finalAppearance,
      totalFalls: state.competition.totalFalls,
      totalCheckpoints: state.competition.totalCheckpoints,
      challengeState: state.competition.challengeState,
      completedChallenges: state.competition.completedChallenges,
    };
    currentData = await updateData((draft) => {
      draft.progress.runwayRumbleRecords.pausedCompetition = saved;
      draft.progress.runwayRumbleRecords.selectedCourseOrder = [...state.competition.courseOrder];
      draft.progress.runwayRumbleRecords.cameraSensitivity = state.camera.sensitivity;
      return draft;
    });
    records = currentData.progress.runwayRumbleRecords;
  }

  async function clearPausedCompetition() {
    currentData = await updateData((draft) => {
      draft.progress.runwayRumbleRecords.pausedCompetition = null;
      return draft;
    });
    records = currentData.progress.runwayRumbleRecords;
  }

  async function saveResult(result) {
    if (resultSaved && !result.tutorialComplete) return;
    resultSaved = true;
    currentData = await recordGameResult(result);
    records = currentData.progress.runwayRumbleRecords;
    if (result.competitionEnded) await clearPausedCompetition();
    await onResult?.(result);
  }

  async function toggleSound() {
    await audio.setSound(!currentData.settings.sound);
    currentData = await getData();
    const button = [...root.querySelectorAll("button")].find((item) => item.textContent === "Sound On" || item.textContent === "Sound Off");
    if (button) button.textContent = currentData.settings.sound ? "Sound On" : "Sound Off";
  }

  function updateRunSound(dt) {
    const player = playerContestant();
    if (!player || player.falling || player.finished) return;
    state.runSoundTimer -= dt;
    if (state.runSoundTimer <= 0 && Math.hypot(player.vx, player.vy) > 80 && player.z <= 2) {
      audio.play("runwayRun");
      state.runSoundTimer = 1.1;
    }
  }

  function updateParticles(dt) {
    for (const particle of state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.z = Math.max(0, particle.z + particle.vz * dt);
      particle.vz -= 120 * dt;
      particle.life -= dt;
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function addBurst(x, y, color) {
    if (state.reduceMotion && state.particles.length > 35) return;
    for (let i = 0; i < 6 && state.particles.length < MAX_PARTICLES; i += 1) {
      state.particles.push({
        x,
        y,
        z: 8,
        vx: (Math.random() - 0.5) * 90,
        vy: (Math.random() - 0.5) * 90,
        vz: 40 + Math.random() * 70,
        color,
        size: 3 + Math.random() * 5,
        life: 0.5,
        maxLife: 0.5,
      });
    }
  }

  function updateHud() {
    if (state.screen !== "playing") return;
    setText("runwayPosition", ordinal(currentPosition(PLAYER)));
    setText("runwayQualified", qualificationText());
    setText("runwayObjective", state.course.final ? "Claim the Sky Crown" : `Finish before ${state.qualificationLimit} slots fill`);
    const player = playerContestant();
    setText("runwayDive", player ? `${Math.ceil(player.diveCooldown * 10) / 10}s` : "-");
    setText("runwayCheckpoint", player ? `${player.checkpointIndex} / ${state.course.checkpoints.length}` : "-");
    setText("runwayControls", `${labelsFor([controls.up[0], controls.left[0], controls.down[0], controls.right[0]])} move, ${labelsFor(controls.jump)} jump, ${labelsFor(controls.dive)} dive`);
    const list = root.querySelector("#runwayQualifiedList");
    if (list) {
      list.replaceChildren();
      const ids = state.course.final ? state.finishers : state.qualifiers;
      ids.forEach((id) => list.append(el("li", "", nameFor(id))));
    }
    updateOverlay();
  }

  function updateOverlay() {
    const overlay = root.querySelector("#runwayOverlay");
    if (!overlay || state.phase === "paused") return;
    overlay.replaceChildren();
    overlay.classList.toggle("is-visible", state.phase === "countdown");
    if (state.phase === "countdown") {
      const card = el("div", "overlay-card runway-countdown");
      card.append(el("span", "field-label", state.course.title), el("strong", "", state.countdown > 1 ? String(Math.ceil(state.countdown)) : "GO"));
      overlay.append(card);
    }
  }

  function qualificationText() {
    if (state.course?.final) return state.finishers.length ? "Crown claimed" : "Crown open";
    return `${state.qualifiers?.length || 0} / ${state.qualificationLimit}`;
  }

  function currentPosition(id) {
    const contestant = state.contestants.find((item) => item.id === id);
    if (!contestant) return state.contestants.length;
    if (contestant.finishPosition) return contestant.finishPosition;
    const unfinished = state.contestants.filter((item) => !item.finished).sort((a, b) => a.y - b.y);
    return state.finishers.length + unfinished.findIndex((item) => item.id === id) + 1;
  }

  function playerContestant() {
    return state.contestants.find((contestant) => contestant.isPlayer);
  }

  function nameFor(id) {
    return state.roster.find((item) => item.id === id)?.name || (id === PLAYER ? "YOU" : id);
  }

  function setText(id, value) {
    const node = root.querySelector(`#${id}`);
    if (node) node.textContent = String(value);
  }

  function bindEvents() {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  }

  function handleKeyDown(event) {
    if ((state.phase === "playing" || state.phase === "countdown" || state.phase === "paused") && shouldPreventScroll(event, controls)) event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
    if (matchesControl(event, controls.pause)) {
      event.preventDefault();
      if (state.phase === "playing" || state.phase === "countdown") pauseGame();
      else if (state.phase === "paused") resumeGame();
    }
  }

  function handleKeyUp(event) {
    keys.delete(event.code);
  }

  function destroyGame() {
    cancelAnimationFrame(raf);
    teardownCanvas();
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    keys.clear();
    pressed.clear();
    state.phase = "destroyed";
  }

  function restartGame() {
    renderRestartCompetitionConfirm();
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

  function choiceCard(title, copy, active, handler) {
    const button = actionButton("", "runway-choice-card", handler);
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", String(active));
    button.append(el("strong", "", title), el("span", "", copy));
    return button;
  }

  function el(tag, className = "", text = "", id = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (id) node.id = id;
    if (Array.isArray(text)) node.append(...text);
    else if (text !== "") node.textContent = text;
    return node;
  }

  function ordinal(value) {
    const number = Number(value);
    const suffix = number % 10 === 1 && number % 100 !== 11 ? "st" : number % 10 === 2 && number % 100 !== 12 ? "nd" : number % 10 === 3 && number % 100 !== 13 ? "rd" : "th";
    return `${number}${suffix}`;
  }

  return {
    initializeGame,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    destroyGame,
    saveResult,
    loadCourse,
    spawnContestants,
    updatePlayer: playerInput,
    updateComputerAI,
    updateObstacles: updateObstacleStates,
    checkCheckpoint: (contestant = playerContestant()) => contestant && state.course ? physicsCheckCheckpoint(contestant, state.course) : false,
    respawnContestant: (contestant = playerContestant()) => contestant && state.course ? physicsRespawnContestant(contestant, state.course) : null,
    registerQualification: registerFinish,
    completeRound,
    eliminatePlayer,
    startNextRound: () => renderCoursePreview(state.round + 1),
    completeCompetition,
  };
}
