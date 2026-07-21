import { labelsFor, matchesControl, shouldPreventScroll } from "../../shared/controls.js";
import { recordGameResult } from "../../shared/storage.js";

const TOTAL_ROUNDS = 3;
const MAX_SCORE = 300;

const ARCHERY_DIFFICULTY = {
  easy: {
    targetScale: 0.33,
    swayAmp: 0,
    swaySpeed: 0.8,
    wind: 0,
    jitter: 2,
    keyboardSpeed: 330,
  },
  normal: {
    targetScale: 0.29,
    swayAmp: 11,
    swaySpeed: 1.1,
    wind: 0,
    jitter: 4,
    keyboardSpeed: 300,
  },
  hard: {
    targetScale: 0.25,
    swayAmp: 20,
    swaySpeed: 1.45,
    wind: 15,
    jitter: 6,
    keyboardSpeed: 280,
  },
};

export function scoreArcheryShot(dx, dy, targetRadius) {
  const ratio = Math.hypot(dx, dy) / targetRadius;
  if (ratio <= 0.2) return 100;
  if (ratio <= 0.45) return 75;
  if (ratio <= 0.7) return 50;
  if (ratio <= 1) return 25;
  return 0;
}

export function getArcheryRating(total) {
  if (total >= 275) return "Perfect Shooter";
  if (total >= 225) return "Target Expert";
  if (total >= 175) return "Sharp Shooter";
  if (total >= 100) return "Good Aim";
  return "Beginner";
}

export function createArcheryGame(context) {
  const { root, audio, data, options, onExit, onSetup, onResult } = context;
  const controls = options.controls;
  const config = ARCHERY_DIFFICULTY[options.difficulty] || ARCHERY_DIFFICULTY.normal;

  let canvas;
  let ctx;
  let resizeObserver;
  let raf = 0;
  let resultSaved = false;
  let state;
  let bestSoloTotal = data.progress.archeryRecords.bestSoloTotal || 0;

  const keys = new Set();

  function initialState() {
    return {
      width: 900,
      height: 560,
      paused: false,
      over: false,
      phase: "aiming",
      round: 1,
      currentPlayer: 1,
      message: "Aim for the centre",
      lastShotScore: null,
      resultTimer: 0,
      swayTime: 0,
      aimSoundCooldown: 0,
      projectile: null,
      impact: null,
      particles: [],
      popups: [],
      wind: { x: 0, y: 0 },
      target: { x: 570, y: 260, radius: 160 },
      launcher: { x: 150, y: 475 },
      crosshair: { x: 570, y: 260 },
      scores: {
        1: [null, null, null],
        2: [null, null, null],
      },
      totals: { 1: 0, 2: 0 },
      centerHits: { 1: 0, 2: 0 },
      bestShot: 0,
    };
  }

  function initializeGame() {
    state = initialState();
    renderShell();
    bindEvents();
    resizeCanvas();
    resetTurn("Aim for the centre");
    updateHud();
    draw();
  }

  function renderShell() {
    root.className = "arcade-view archery-game";
    root.innerHTML = "";

    const bar = document.createElement("section");
    bar.className = "game-bar";
    const title = document.createElement("div");
    title.className = "game-title";
    title.innerHTML = `
      <h1>Archery</h1>
      <p>${options.mode === "solo" ? "Solo target run" : "Local two-player"} - ${options.difficulty}, three rounds</p>
    `;
    const scoreStrip = document.createElement("div");
    scoreStrip.className = "score-strip";
    scoreStrip.id = "archeryHud";
    const actions = document.createElement("div");
    actions.className = "game-actions";
    actions.append(
      actionButton("Pause", "primary-action", pauseGame),
      actionButton("Restart", "", restartGameWithConfirm),
      actionButton("Library", "", () => {
        destroyGame();
        onExit();
      }),
    );
    bar.append(title, scoreStrip, actions);

    const shell = document.createElement("section");
    shell.className = "archery-shell";
    const range = document.createElement("div");
    range.className = "archery-range";
    canvas = document.createElement("canvas");
    canvas.id = "archeryCanvas";
    range.append(canvas, overlay("archeryOverlay"));
    ctx = canvas.getContext("2d");

    const side = document.createElement("aside");
    side.className = "archery-side";
    side.append(
      sideTitle("Three rounds"),
      textLine("Aim at the circular target. Each turn fires exactly one shot."),
      textLine(difficultyLine()),
      scoringPanel(),
      windPanel(),
      scoreboardPanel(),
      sideTitle("Controls"),
      textLine(controlLine()),
      actionButton("Fire", "archery-fire", fireShot),
      actionButton("Back to setup", "", () => {
        destroyGame();
        onSetup();
      }),
    );

    shell.append(range, side);
    root.append(bar, shell);
  }

  function difficultyLine() {
    if (options.difficulty === "easy") return "Easy uses a large target, steady aim, and no wind.";
    if (options.difficulty === "hard") return "Hard uses a smaller target, stronger sway, and light wind.";
    return "Normal uses a standard target with smooth crosshair sway.";
  }

  function controlLine() {
    return `Mouse aims and clicks to shoot. Keyboard: ${labelsFor([
      controls.up[0],
      controls.left[0],
      controls.down[0],
      controls.right[0],
    ])} aim, ${labelsFor(controls.shoot)} shoots.`;
  }

  function actionButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = className;
    button.addEventListener("click", () => {
      audio.play("button");
      handler();
    });
    return button;
  }

  function sideTitle(text) {
    const heading = document.createElement("h2");
    heading.textContent = text;
    return heading;
  }

  function textLine(text) {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    return paragraph;
  }

  function overlay(id) {
    const node = document.createElement("div");
    node.className = "game-overlay";
    node.id = id;
    return node;
  }

  function scoringPanel() {
    const panel = document.createElement("div");
    panel.className = "archery-scoring";
    for (const [value, label] of [
      [100, "Centre"],
      [75, "Inner"],
      [50, "Middle"],
      [25, "Outer edge"],
    ]) {
      const chip = document.createElement("span");
      chip.textContent = `${value} ${label}`;
      panel.append(chip);
    }
    return panel;
  }

  function windPanel() {
    const panel = document.createElement("div");
    panel.className = "archery-wind";
    panel.id = "archeryWind";
    return panel;
  }

  function scoreboardPanel() {
    const panel = document.createElement("div");
    panel.className = "archery-scoreboard";
    panel.id = "archeryScoreboard";
    return panel;
  }

  function bindEvents() {
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerdown", handlePointerDown);
    resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas.parentElement);
  }

  function startGame() {
    cancelAnimationFrame(raf);
    state.lastTime = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - state.lastTime) / 1000 || 0);
    state.lastTime = now;
    if (!state.paused && !state.over) update(dt);
    draw();
    if (!state.over) raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    updateParticles(dt);
    state.aimSoundCooldown = Math.max(0, state.aimSoundCooldown - dt);

    if (state.phase === "aiming") {
      state.swayTime += dt;
      updateKeyboardAim(dt);
    }

    if (state.phase === "flying") {
      updateProjectile(dt);
    }

    if (state.phase === "shotResult") {
      state.resultTimer -= dt;
      if (state.resultTimer <= 0) advanceTurn();
    }

    updateHud();
  }

  function updateKeyboardAim(dt) {
    let x = Number(hasAny(controls.right)) - Number(hasAny(controls.left));
    let y = Number(hasAny(controls.down)) - Number(hasAny(controls.up));
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    if (len <= 0) return;
    state.crosshair.x += x * config.keyboardSpeed * dt;
    state.crosshair.y += y * config.keyboardSpeed * dt;
    clampCrosshair();
    if (state.aimSoundCooldown <= 0) {
      audio.play("archeryAim");
      state.aimSoundCooldown = 0.28;
    }
  }

  function updateProjectile(dt) {
    const projectile = state.projectile;
    if (!projectile || projectile.scored) return;
    projectile.t = Math.min(1, projectile.t + dt / 0.62);
    const eased = 1 - (1 - projectile.t) ** 3;
    projectile.x = lerp(projectile.start.x, projectile.impact.x, eased);
    projectile.y = lerp(projectile.start.y, projectile.impact.y, eased) - Math.sin(eased * Math.PI) * 46;
    if (projectile.t >= 1) {
      scoreProjectile();
    }
  }

  function fireShot() {
    if (state.phase !== "aiming" || state.paused || state.over) return;
    const aim = currentAimPoint();
    const impact = finalImpactPoint(aim);
    state.phase = "flying";
    state.message = `${playerName(state.currentPlayer)} fires`;
    state.lastShotScore = null;
    state.projectile = {
      start: { ...state.launcher },
      impact,
      x: state.launcher.x,
      y: state.launcher.y,
      t: 0,
      scored: false,
    };
    audio.play("archeryShoot");
    audio.play("archeryTravel");
    updateHud();
  }

  function finalImpactPoint(aim) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * config.jitter;
    return {
      x: aim.x + state.wind.x + Math.cos(angle) * radius,
      y: aim.y + state.wind.y + Math.sin(angle) * radius,
    };
  }

  function scoreProjectile() {
    const projectile = state.projectile;
    if (!projectile || projectile.scored) return;
    projectile.scored = true;

    const score = scoreArcheryShot(
      projectile.impact.x - state.target.x,
      projectile.impact.y - state.target.y,
      state.target.radius,
    );
    const player = state.currentPlayer;
    const roundIndex = state.round - 1;
    state.scores[player][roundIndex] = score;
    state.totals[player] += score;
    state.bestShot = Math.max(state.bestShot, score);
    if (score === 100) state.centerHits[player] += 1;

    state.lastShotScore = score;
    state.impact = {
      x: projectile.impact.x,
      y: projectile.impact.y,
      score,
      player,
      round: state.round,
    };
    state.phase = "shotResult";
    state.resultTimer = 1.25;
    state.message = score === 100 ? "Bullseye!" : score ? `${score} points` : "Missed target";
    spawnImpact(projectile.impact.x, projectile.impact.y, score);
    spawnPopup(projectile.impact.x, projectile.impact.y - 26, score === 100 ? "Bullseye! 100" : score ? `+${score}` : "0", score);
    audio.play("archeryImpact");
    audio.play(scoreSound(score));
    updateScoreboard();
  }

  function scoreSound(score) {
    if (score === 100) return "archeryBullseye";
    if (score === 75) return "archery75";
    if (score === 50) return "archery50";
    if (score === 25) return "archery25";
    return "miss";
  }

  function advanceTurn() {
    if (matchComplete()) {
      finishGame();
      return;
    }

    if (options.mode === "two" && state.currentPlayer === 1) {
      state.currentPlayer = 2;
      audio.play("archeryTurn");
      resetTurn(`${playerName(2)} takes aim`);
      return;
    }

    state.round += 1;
    state.currentPlayer = 1;
    audio.play("archeryRound");
    resetTurn(`Round ${state.round}`);
  }

  function matchComplete() {
    if (options.mode === "solo") return playedShots(1) >= TOTAL_ROUNDS;
    return state.round >= TOTAL_ROUNDS && state.currentPlayer === 2 && state.scores[2][TOTAL_ROUNDS - 1] !== null;
  }

  function resetTurn(message) {
    state.phase = "aiming";
    state.message = message;
    state.lastShotScore = null;
    state.projectile = null;
    state.impact = null;
    state.resultTimer = 0;
    state.crosshair = { x: state.target.x, y: state.target.y };
    state.wind = createWind();
    updateWindPanel();
    updateScoreboard();
    updateHud();
  }

  function createWind() {
    if (!config.wind) return { x: 0, y: 0 };
    const angle = -0.35 + Math.random() * 0.7;
    const direction = Math.random() < 0.5 ? -1 : 1;
    const strength = config.wind * (0.65 + Math.random() * 0.55);
    return {
      x: Math.cos(angle) * strength * direction,
      y: Math.sin(angle) * strength,
    };
  }

  function handlePointerMove(event) {
    if (state.phase !== "aiming" || state.paused || state.over) return;
    updateAimFromPointer(event);
  }

  function handlePointerDown(event) {
    if (state.phase !== "aiming" || state.paused || state.over) return;
    event.preventDefault();
    updateAimFromPointer(event);
    fireShot();
  }

  function updateAimFromPointer(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = state.width / rect.width;
    const scaleY = state.height / rect.height;
    state.crosshair.x = (event.clientX - rect.left) * scaleX;
    state.crosshair.y = (event.clientY - rect.top) * scaleY;
    clampCrosshair();
  }

  function handleKeydown(event) {
    if (shouldPreventScroll(event, controls)) event.preventDefault();
    if (matchesControl(event, controls.pause)) {
      event.preventDefault();
      state.paused ? resumeGame() : pauseGame();
      return;
    }
    keys.add(event.code);
    if (event.repeat) return;
    if (matchesControl(event, controls.shoot)) {
      event.preventDefault();
      fireShot();
    }
  }

  function handleKeyup(event) {
    if (shouldPreventScroll(event, controls)) event.preventDefault();
    keys.delete(event.code);
  }

  function hasAny(codes) {
    return codes.some((code) => keys.has(code));
  }

  function clampCrosshair() {
    state.crosshair.x = Math.max(26, Math.min(state.width - 26, state.crosshair.x));
    state.crosshair.y = Math.max(26, Math.min(state.height - 26, state.crosshair.y));
  }

  function currentAimPoint() {
    const swayX = Math.sin(state.swayTime * Math.PI * config.swaySpeed) * config.swayAmp;
    const swayY = Math.cos(state.swayTime * Math.PI * config.swaySpeed * 0.75) * config.swayAmp * 0.35;
    return {
      x: Math.max(22, Math.min(state.width - 22, state.crosshair.x + swayX)),
      y: Math.max(22, Math.min(state.height - 22, state.crosshair.y + swayY)),
    };
  }

  function updateHud() {
    const hud = root.querySelector("#archeryHud");
    if (!hud) return;
    hud.replaceChildren(
      pill(`Round ${state.round}/${TOTAL_ROUNDS}`),
      pill(`Current: ${playerName(state.currentPlayer)}`),
      pill(`Shots left: ${remainingShots()}`),
      pill(`Total: ${state.totals[state.currentPlayer]}`),
      pill(state.lastShotScore === null ? state.message : `Last shot: ${state.lastShotScore}`),
    );
    updateWindPanel();
  }

  function updateWindPanel() {
    const panel = root.querySelector("#archeryWind");
    if (!panel) return;
    const strength = Math.round(Math.hypot(state.wind.x, state.wind.y));
    const direction = state.wind.x > 1 ? "right" : state.wind.x < -1 ? "left" : "steady";
    panel.textContent = strength ? `Wind ${direction}: ${strength}` : "Wind: none";
  }

  function updateScoreboard() {
    const panel = root.querySelector("#archeryScoreboard");
    if (!panel) return;
    panel.replaceChildren();
    panel.append(scoreGroup(options.player1, 1));
    if (options.mode === "two") panel.append(scoreGroup(options.player2, 2));
    if (options.mode === "solo") {
      const best = document.createElement("div");
      best.className = "archery-best";
      best.textContent = `Best total: ${bestSoloTotal}`;
      panel.append(best);
    }
  }

  function scoreGroup(name, player) {
    const group = document.createElement("div");
    group.className = "archery-score-group";
    const heading = document.createElement("h3");
    heading.textContent = name;
    group.append(heading);
    for (let i = 0; i < TOTAL_ROUNDS; i += 1) {
      const row = document.createElement("div");
      row.className = "archery-score-row";
      const score = state.scores[player][i];
      row.append(createText("span", `Round ${i + 1}`), createText("strong", score === null ? "" : String(score)));
      group.append(row);
    }
    const total = document.createElement("div");
    total.className = "archery-total";
    total.append(createText("span", "Total"), createText("strong", String(state.totals[player])));
    group.append(total);
    return group;
  }

  function pill(text) {
    const node = document.createElement("div");
    node.className = "score-pill";
    node.textContent = text;
    return node;
  }

  function remainingShots() {
    if (options.mode === "solo") return TOTAL_ROUNDS - playedShots(1);
    return TOTAL_ROUNDS * 2 - playedShots(1) - playedShots(2);
  }

  function playedShots(player) {
    return state.scores[player].filter((score) => score !== null).length;
  }

  function resizeCanvas() {
    const parent = canvas.parentElement;
    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const oldWidth = state.width;
    const oldHeight = state.height;
    state.width = Math.max(740, Math.floor(parent.clientWidth || rect.width || 740));
    state.height = Math.max(580, Math.floor(parent.clientHeight || rect.height || 580));
    canvas.width = Math.round(state.width * dpr);
    canvas.height = Math.round(state.height * dpr);
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const xScale = state.width / oldWidth;
    const yScale = state.height / oldHeight;
    state.target = {
      x: state.width * 0.64,
      y: state.height * 0.43,
      radius: Math.min(state.width, state.height) * config.targetScale,
    };
    state.launcher = {
      x: Math.max(86, state.width * 0.16),
      y: state.height - 78,
    };
    state.crosshair.x *= xScale;
    state.crosshair.y *= yScale;
    clampCrosshair();
    draw();
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, state.width, state.height);
    drawBackground();
    drawRangeDeck();
    drawTarget();
    drawLauncher();
    drawImpact();
    drawProjectile();
    drawCrosshair();
    drawParticles();
    drawPopups();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, state.width, state.height);
    gradient.addColorStop(0, "#e3f8ff");
    gradient.addColorStop(0.55, "#fff4d7");
    gradient.addColorStop(1, "#e9fbf0");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    for (let i = 0; i < 6; i += 1) {
      const x = ((i * 211 + state.width * 0.08) % (state.width + 150)) - 75;
      const y = 70 + (i % 3) * 64;
      ctx.beginPath();
      ctx.ellipse(x, y, 58, 17, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 42, y + 4, 34, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRangeDeck() {
    ctx.fillStyle = "rgba(19,32,53,0.12)";
    ctx.beginPath();
    ctx.roundRect(40, state.height - 118, state.width - 80, 82, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.roundRect(58, state.height - 102, state.width - 116, 50, 8);
    ctx.fill();
  }

  function drawTarget() {
    const { x, y, radius } = state.target;
    const rings = [
      { ratio: 1, color: "#46c7d9", label: "25", labelY: y + radius * 0.78 },
      { ratio: 0.7, color: "#ffd35a", label: "50", labelY: y + radius * 0.54 },
      { ratio: 0.45, color: "#ff8a3d", label: "75", labelY: y - radius * 0.34 },
      { ratio: 0.2, color: "#de5b8c", label: "100", labelY: y },
    ];

    ctx.fillStyle = "rgba(19,32,53,0.18)";
    ctx.beginPath();
    ctx.ellipse(x + 18, y + radius + 22, radius * 0.9, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    for (const ring of rings) {
      ctx.beginPath();
      ctx.arc(x, y, radius * ring.ratio, 0, Math.PI * 2);
      ctx.fillStyle = ring.color;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#132035";
      ctx.stroke();
    }

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 20px system-ui";
    ctx.fillStyle = "#132035";
    ctx.strokeStyle = "rgba(255,255,255,0.78)";
    ctx.lineWidth = 5;
    for (const ring of rings) {
      ctx.strokeText(ring.label, x, ring.labelY);
      ctx.fillText(ring.label, x, ring.labelY);
    }
    ctx.restore();
  }

  function drawLauncher() {
    const { x, y } = state.launcher;
    const aim = state.projectile ? state.projectile.impact : currentAimPoint();
    const angle = Math.atan2(aim.y - y, aim.x - x);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(19,32,53,0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 26, 58, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7f59e8";
    ctx.strokeStyle = "#132035";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(-18, -16, 92, 32, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#46c7d9";
    ctx.beginPath();
    ctx.roundRect(38, -11, 45, 22, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffd35a";
    ctx.beginPath();
    ctx.arc(-18, 0, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ff8a3d";
    ctx.beginPath();
    ctx.roundRect(-8, 12, 24, 34, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawCrosshair() {
    if (state.phase !== "aiming" || state.paused || state.over) return;
    const aim = currentAimPoint();
    ctx.save();
    ctx.translate(aim.x, aim.y);
    ctx.strokeStyle = "#132035";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.moveTo(-30, 0);
    ctx.lineTo(-10, 0);
    ctx.moveTo(10, 0);
    ctx.lineTo(30, 0);
    ctx.moveTo(0, -30);
    ctx.lineTo(0, -10);
    ctx.moveTo(0, 10);
    ctx.lineTo(0, 30);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.78)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawProjectile() {
    const projectile = state.projectile;
    if (!projectile || projectile.scored) return;
    ctx.save();
    ctx.strokeStyle = "rgba(127,89,232,0.55)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(projectile.start.x, projectile.start.y);
    ctx.lineTo(projectile.x, projectile.y);
    ctx.stroke();
    ctx.fillStyle = "#fffdf8";
    ctx.strokeStyle = "#132035";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#de5b8c";
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawImpact() {
    if (!state.impact) return;
    ctx.save();
    ctx.translate(state.impact.x, state.impact.y);
    ctx.strokeStyle = state.impact.score === 100 ? "#fffdf8" : "#132035";
    ctx.lineWidth = state.impact.score === 100 ? 6 : 4;
    ctx.beginPath();
    ctx.moveTo(-13, -13);
    ctx.lineTo(13, 13);
    ctx.moveTo(13, -13);
    ctx.lineTo(-13, 13);
    ctx.stroke();
    ctx.restore();
  }

  function spawnImpact(x, y, score) {
    const count = score === 100 ? 20 : 10;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * (70 + Math.random() * 120),
        vy: Math.sin(angle) * (70 + Math.random() * 120),
        life: score === 100 ? 0.46 : 0.32,
        size: 3 + Math.random() * 6,
        color: ["#ffd35a", "#de5b8c", "#46c7d9", "#ff8a3d"][i % 4],
      });
    }
  }

  function spawnPopup(x, y, text, score) {
    state.popups.push({
      x,
      y,
      text,
      life: 0.9,
      color: score === 100 ? "#de5b8c" : score ? "#132035" : "#627086",
    });
  }

  function updateParticles(dt) {
    for (const particle of state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      particle.vx *= 0.94;
      particle.vy *= 0.94;
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
    for (const popup of state.popups) {
      popup.y -= 42 * dt;
      popup.life -= dt;
    }
    state.popups = state.popups.filter((popup) => popup.life > 0);
  }

  function drawParticles() {
    for (const particle of state.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life / 0.46);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPopups() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 30px system-ui";
    for (const popup of state.popups) {
      ctx.globalAlpha = Math.max(0, popup.life / 0.9);
      ctx.strokeStyle = "rgba(255,255,255,0.84)";
      ctx.lineWidth = 6;
      ctx.fillStyle = popup.color;
      ctx.strokeText(popup.text, popup.x, popup.y);
      ctx.fillText(popup.text, popup.x, popup.y);
    }
    ctx.restore();
  }

  async function finishGame() {
    state.over = true;
    state.phase = "matchOver";
    cancelAnimationFrame(raf);

    const p1Total = state.totals[1];
    const p2Total = state.totals[2];
    const bullseyes = state.centerHits[1] + state.centerHits[2];
    let winner = "solo";
    let title = `${getArcheryRating(p1Total)}!`;
    let summary = `${p1Total}/${MAX_SCORE}, ${state.bestShot} best shot`;

    if (options.mode === "two") {
      if (p1Total > p2Total) {
        winner = "player1";
        title = `${options.player1} Wins!`;
      } else if (p2Total > p1Total) {
        winner = "player2";
        title = `${options.player2} Wins!`;
      } else {
        winner = "draw";
        title = "It's a Tie - Both Players Win!";
      }
      summary = `${p1Total}-${p2Total}, best shot ${state.bestShot}`;
    }

    const result = {
      gameId: "archery",
      mode: options.mode,
      difficulty: options.difficulty,
      winner,
      score: options.mode === "solo" ? p1Total : Math.max(p1Total, p2Total),
      player1Score: p1Total,
      player2Score: options.mode === "two" ? p2Total : 0,
      roundScores: [...state.scores[1]],
      player2RoundScores: options.mode === "two" ? [...state.scores[2]] : [],
      bestShot: state.bestShot,
      bullseyes,
      rating: getArcheryRating(p1Total),
      summary,
    };

    if (options.mode === "solo") bestSoloTotal = Math.max(bestSoloTotal, p1Total);
    await saveResult(result);
    audio.play(winner === "draw" ? "archeryTie" : "win");
    showFinalOverlay(title, result);
  }

  async function saveResult(result) {
    if (resultSaved) return;
    resultSaved = true;
    await recordGameResult(result);
    await onResult(result);
  }

  function pauseGame() {
    if (state.over || state.paused) return;
    state.paused = true;
    showOverlay("Paused", "Your shot is waiting.", false);
  }

  function resumeGame() {
    if (!state.paused) return;
    state.paused = false;
    state.lastTime = performance.now();
    hideOverlay();
  }

  function restartGameWithConfirm() {
    if (!window.confirm("Restart this Archery match?")) return;
    restartGame();
  }

  function restartGame() {
    cancelAnimationFrame(raf);
    resultSaved = false;
    keys.clear();
    state = initialState();
    resizeCanvas();
    resetTurn("Aim for the centre");
    hideOverlay();
    startGame();
  }

  function showOverlay(title, message, results) {
    const node = root.querySelector("#archeryOverlay");
    node.classList.add("is-visible");
    node.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "game-overlay-panel";
    panel.append(createText("h2", title), createText("p", message));
    const actions = document.createElement("div");
    actions.className = "overlay-actions";
    if (!results) actions.append(actionButton("Resume", "primary-action", resumeGame));
    actions.append(
      actionButton(results ? "Play Again" : "Restart", results ? "primary-action" : "", restartGame),
      actionButton("Return to Arcade", "", () => {
        destroyGame();
        onExit();
      }),
    );
    panel.append(actions);
    node.append(panel);
  }

  function showFinalOverlay(title, result) {
    const node = root.querySelector("#archeryOverlay");
    node.classList.add("is-visible");
    node.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "game-overlay-panel archery-results";
    panel.append(createText("h2", title), createText("p", finalSummaryText(result)));

    const grid = document.createElement("div");
    grid.className = "archery-result-grid";
    grid.append(resultSummaryCard(options.player1, result.roundScores, result.player1Score, state.centerHits[1]));
    if (options.mode === "two") {
      grid.append(resultSummaryCard(options.player2, result.player2RoundScores, result.player2Score, state.centerHits[2]));
    }
    panel.append(grid);
    panel.append(createText("p", `Highest shot: ${result.bestShot}. Centre hits: ${result.bullseyes}.`));

    const actions = document.createElement("div");
    actions.className = "overlay-actions";
    actions.append(
      actionButton("Play Again", "primary-action", restartGame),
      actionButton("Change Mode", "", () => {
        destroyGame();
        onSetup();
      }),
      actionButton("Return to Arcade", "", () => {
        destroyGame();
        onExit();
      }),
    );
    panel.append(actions);
    node.append(panel);
  }

  function finalSummaryText(result) {
    if (options.mode === "solo") return `${result.rating}: ${result.player1Score}/${MAX_SCORE}.`;
    if (result.winner === "draw") return `Equal totals at ${result.player1Score}-${result.player2Score}. Shared victory.`;
    return `Final score ${result.player1Score}-${result.player2Score}.`;
  }

  function resultSummaryCard(name, scores, total, centers) {
    const card = document.createElement("div");
    card.className = "archery-result-card";
    card.append(createText("h3", name));
    for (let i = 0; i < TOTAL_ROUNDS; i += 1) {
      const row = document.createElement("div");
      row.append(createText("span", `Round ${i + 1}`), createText("strong", String(scores[i] ?? 0)));
      card.append(row);
    }
    const totalRow = document.createElement("div");
    totalRow.className = "archery-result-total";
    totalRow.append(createText("span", "Total"), createText("strong", String(total)));
    card.append(totalRow, createText("p", `Centre hits: ${centers}`));
    return card;
  }

  function hideOverlay() {
    const node = root.querySelector("#archeryOverlay");
    if (!node) return;
    node.classList.remove("is-visible");
    node.innerHTML = "";
  }

  function createText(tag, text) {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  }

  function playerName(player) {
    return player === 1 ? options.player1 : options.player2;
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function destroyGame() {
    cancelAnimationFrame(raf);
    keys.clear();
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("keyup", handleKeyup);
    canvas?.removeEventListener("pointermove", handlePointerMove);
    canvas?.removeEventListener("pointerdown", handlePointerDown);
    resizeObserver?.disconnect();
    state.projectile = null;
    root.innerHTML = "";
  }

  return {
    initializeGame,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    destroyGame,
    saveResult,
  };
}
