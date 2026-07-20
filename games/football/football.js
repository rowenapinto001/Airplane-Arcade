import { labelsFor, matchesControl, shouldPreventScroll } from "../../shared/controls.js";
import { formatDuration } from "../../shared/navigation.js";
import { recordGameResult } from "../../shared/storage.js";

const FOOTBALL_DIFFICULTY = {
  easy: {
    ai: { cooldown: 0.7, chance: 0.62, mistake: 0.34 },
    matchSeconds: 75,
    goalHeight: 230,
    playerTap: 164,
    aiTap: 96,
    playerKick: 610,
    aiKick: 410,
    kickRange: 36,
    kickAccuracy: 145,
    verticalAssist: 3.1,
    playerFriction: 0.87,
    ballFriction: 0.986,
    wallBounce: -0.7,
  },
  normal: {
    ai: { cooldown: 0.42, chance: 0.82, mistake: 0.16 },
    matchSeconds: 60,
    goalHeight: 184,
    playerTap: 142,
    aiTap: 118,
    playerKick: 540,
    aiKick: 470,
    kickRange: 24,
    kickAccuracy: 110,
    verticalAssist: 2.6,
    playerFriction: 0.9,
    ballFriction: 0.992,
    wallBounce: -0.78,
  },
  hard: {
    ai: { cooldown: 0.26, chance: 0.92, mistake: 0.08 },
    matchSeconds: 50,
    goalHeight: 150,
    playerTap: 128,
    aiTap: 132,
    playerKick: 500,
    aiKick: 500,
    kickRange: 14,
    kickAccuracy: 88,
    verticalAssist: 2.1,
    playerFriction: 0.92,
    ballFriction: 0.995,
    wallBounce: -0.86,
  },
};

export function createFootballGame(context) {
  const { root, audio, options, onExit, onSetup, onResult } = context;
  const controls = options.controls;
  const config = FOOTBALL_DIFFICULTY[options.difficulty] || FOOTBALL_DIFFICULTY.normal;
  const targetScore = 3;
  const matchSeconds = config.matchSeconds;
  let canvas;
  let ctx;
  let raf = 0;
  let resizeObserver;
  let resultSaved = false;
  let state;

  function initialState() {
    return {
      width: 900,
      height: 540,
      paused: false,
      over: false,
      countdown: 3.2,
      timeLeft: matchSeconds,
      score: { 1: 0, 2: 0 },
      goalPause: 0,
      feedback: "Tap fast when the countdown ends",
      crowdPulse: 0,
      aiCooldown: 0.4,
      lastTime: performance.now(),
      players: {
        1: createPlayer(1),
        2: createPlayer(2),
      },
      ball: createBall(),
    };
  }

  function createPlayer(id) {
    return {
      id,
      x: id === 1 ? 164 : 736,
      y: 270,
      vx: 0,
      vy: 0,
      radius: 29,
      tapGlow: 0,
      facing: id === 1 ? 1 : -1,
    };
  }

  function createBall() {
    return {
      x: 450,
      y: 270,
      vx: 0,
      vy: 0,
      radius: 18,
      spin: 0,
    };
  }

  function initializeGame() {
    state = initialState();
    renderShell();
    bindEvents();
    resizeCanvas();
    updateHud();
    draw();
  }

  function renderShell() {
    root.className = "arcade-view football-game";
    root.innerHTML = "";

    const bar = document.createElement("section");
    bar.className = "game-bar";
    const title = document.createElement("div");
    title.className = "game-title";
    title.innerHTML = `
      <h1>Simple Football</h1>
      <p>${options.mode === "solo" ? "Solo vs computer" : "Local two-player"} - ${options.difficulty}, first to 3</p>
    `;
    const scoreStrip = document.createElement("div");
    scoreStrip.className = "score-strip";
    scoreStrip.id = "footballHud";
    const actions = document.createElement("div");
    actions.className = "game-actions";
    actions.append(
      actionButton("Pause", "primary-action", pauseGame),
      actionButton("Restart", "", restartGame),
      actionButton("Library", "", () => {
        destroyGame();
        onExit();
      }),
    );
    bar.append(title, scoreStrip, actions);

    const shell = document.createElement("section");
    shell.className = "football-shell";
    const field = document.createElement("div");
    field.className = "football-field";
    canvas = document.createElement("canvas");
    canvas.id = "footballCanvas";
    field.append(canvas, overlay("footballOverlay"));
    ctx = canvas.getContext("2d");

    const side = document.createElement("aside");
    side.className = "football-side";
    side.append(
      sideTitle("Controls"),
      textLine(
        options.mode === "two"
          ? `${options.player1}: ${labelsFor(controls.p1Action)} | ${options.player2}: ${labelsFor(controls.p2Action)}`
          : `${options.player1}: ${labelsFor(controls.p1Action)}. Computer reacts on ${options.difficulty}.`,
      ),
      sideTitle("How it works"),
      textLine(difficultyLine()),
      textLine("Tap repeatedly to chase the ball. Tap near the ball to kick it toward the goal."),
      textLine("The dummy auto-lines up vertically so one-button play stays comfortable."),
      actionButton("Tap Player 1", "tap-button", () => tapPlayer(1)),
      options.mode === "two" ? actionButton("Tap Player 2", "tap-button", () => tapPlayer(2)) : textLine("In solo, the second dummy is computer-controlled."),
      actionButton("Back to setup", "", () => {
        destroyGame();
        onSetup();
      }),
    );

    shell.append(field, side);
    root.append(bar, shell);
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

  function difficultyLine() {
    if (options.difficulty === "easy") {
      return "Easy gives you bigger goals, stronger taps, a longer timer, and a slower computer.";
    }
    if (options.difficulty === "hard") {
      return "Hard gives you smaller goals, tighter kick timing, a faster ball, and a sharper computer.";
    }
    return "Normal keeps the match balanced with standard goals, timer, and computer reactions.";
  }

  function overlay(id) {
    const node = document.createElement("div");
    node.className = "game-overlay";
    node.id = id;
    return node;
  }

  function bindEvents() {
    window.addEventListener("keydown", handleKeydown);
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
    if (state.countdown > 0) {
      const previous = Math.ceil(state.countdown);
      state.countdown -= dt;
      if (Math.ceil(state.countdown) !== previous && state.countdown > 0) audio.play("countdown");
      updateHud();
      return;
    }

    if (state.goalPause > 0) {
      state.goalPause -= dt;
      if (state.goalPause <= 0) resetPositions();
      updateHud();
      return;
    }

    state.timeLeft -= dt;
    state.crowdPulse = Math.max(0, state.crowdPulse - dt * 2.2);
    if (options.mode === "solo") updateAi(dt);
    updatePlayers(dt);
    updateBall(dt);
    handleCollisions();
    checkGoal();
    updateHud();

    if (state.timeLeft <= 0) finishGame();
  }

  function updateAi(dt) {
    const ai = config.ai;
    state.aiCooldown -= dt;
    if (state.aiCooldown > 0) return;
    const ballThreat = state.ball.x > state.width * 0.42 || Math.abs(state.ball.y - state.players[2].y) < 120;
    if (ballThreat && Math.random() < ai.chance) {
      if (Math.random() > ai.mistake) tapPlayer(2, true);
    }
    state.aiCooldown = ai.cooldown + Math.random() * ai.cooldown;
  }

  function updatePlayers(dt) {
    for (const player of Object.values(state.players)) {
      const targetY = state.ball.y;
      player.vy += (targetY - player.y) * dt * config.verticalAssist;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      player.vx *= config.playerFriction;
      player.vy *= 0.84;
      player.tapGlow = Math.max(0, player.tapGlow - dt * 4);
      player.x = Math.max(70, Math.min(state.width - 70, player.x));
      player.y = Math.max(86, Math.min(state.height - 86, player.y));
    }
  }

  function updateBall(dt) {
    const ball = state.ball;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.vx *= config.ballFriction;
    ball.vy *= config.ballFriction;
    ball.spin += ball.vx * dt * 0.04;

    const goalTop = state.height / 2 - config.goalHeight / 2;
    const goalBottom = state.height / 2 + config.goalHeight / 2;
    if (ball.y < 54 || ball.y > state.height - 54) {
      ball.y = Math.max(54, Math.min(state.height - 54, ball.y));
      ball.vy *= config.wallBounce;
    }
    const inGoalMouth = ball.y > goalTop && ball.y < goalBottom;
    if (!inGoalMouth && (ball.x < 42 || ball.x > state.width - 42)) {
      ball.x = Math.max(42, Math.min(state.width - 42, ball.x));
      ball.vx *= config.wallBounce;
    }
  }

  function handleCollisions() {
    for (const player of Object.values(state.players)) {
      const ball = state.ball;
      const dx = ball.x - player.x;
      const dy = ball.y - player.y;
      const distance = Math.hypot(dx, dy) || 1;
      const minDistance = player.radius + ball.radius;
      if (distance >= minDistance) continue;
      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = minDistance - distance;
      ball.x += nx * overlap;
      ball.y += ny * overlap;
      ball.vx += nx * 80 + player.vx * 0.46;
      ball.vy += ny * 80 + player.vy * 0.46;
      player.vx -= nx * 36;
      player.vy -= ny * 36;
    }
  }

  function checkGoal() {
    const ball = state.ball;
    const goalTop = state.height / 2 - config.goalHeight / 2;
    const goalBottom = state.height / 2 + config.goalHeight / 2;
    if (ball.y < goalTop || ball.y > goalBottom) return;
    if (ball.x < 12) scoreGoal(2);
    if (ball.x > state.width - 12) scoreGoal(1);
  }

  function scoreGoal(player) {
    state.score[player] += 1;
    state.goalPause = 1.6;
    state.feedback = `${playerName(player)} scores!`;
    state.crowdPulse = 1;
    state.ball.vx = 0;
    state.ball.vy = 0;
    audio.play("goal");
    if (state.score[player] >= targetScore) finishGame();
  }

  function resetPositions() {
    state.players[1] = { ...createPlayer(1), x: state.width * 0.18, y: state.height / 2 };
    state.players[2] = { ...createPlayer(2), x: state.width * 0.82, y: state.height / 2 };
    state.ball = { ...createBall(), x: state.width / 2, y: state.height / 2 };
    state.feedback = "Tap to win the next ball";
  }

  function tapPlayer(playerId, aiTap = false) {
    if (state.paused || state.over || state.countdown > 0 || state.goalPause > 0) return;
    const player = state.players[playerId];
    const ball = state.ball;
    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const distance = Math.hypot(dx, dy);
    const towardBall = Math.sign(dx) || player.facing;

    player.tapGlow = 1;
    player.vx += towardBall * (aiTap ? config.aiTap : config.playerTap);
    player.vy += Math.sign(dy || 1) * 28;

    if (distance < player.radius + ball.radius + config.kickRange) {
      const attack = playerId === 1 ? 1 : -1;
      const accuracy = Math.max(-0.8, Math.min(0.8, dy / config.kickAccuracy));
      ball.vx += attack * (aiTap ? config.aiKick : config.playerKick);
      ball.vy += accuracy * 260 + player.vy * 0.16;
      state.feedback = `${playerName(playerId)} kicks!`;
      audio.play("kick");
    }
  }

  function playerName(player) {
    if (options.mode === "solo" && player === 2) return "Computer";
    return player === 1 ? options.player1 : options.player2;
  }

  function handleKeydown(event) {
    if (shouldPreventScroll(event, controls)) event.preventDefault();
    if (matchesControl(event, controls.pause)) {
      event.preventDefault();
      state.paused ? resumeGame() : pauseGame();
      return;
    }
    if (event.repeat) return;
    if (matchesControl(event, controls.p1Action)) tapPlayer(1);
    if (options.mode === "two" && matchesControl(event, controls.p2Action)) tapPlayer(2);
  }

  function handlePointerDown(event) {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (options.mode === "two" && x > rect.width / 2) tapPlayer(2);
    else tapPlayer(1);
  }

  function updateHud() {
    const hud = root.querySelector("#footballHud");
    if (!hud) return;
    const timer =
      state.countdown > 0
        ? `Kickoff: ${Math.ceil(state.countdown)}`
        : `Time: ${formatDuration(state.timeLeft)}`;
    hud.replaceChildren(
      pill(timer),
      pill(`${options.player1}: ${state.score[1]}`),
      pill(`${playerName(2)}: ${state.score[2]}`),
      pill(state.feedback),
    );
  }

  function pill(text) {
    const element = document.createElement("div");
    element.className = "score-pill";
    element.textContent = text;
    return element;
  }

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const oldWidth = state.width;
    const oldHeight = state.height;
    state.width = Math.max(720, rect.width);
    state.height = 540;
    canvas.width = Math.round(state.width * dpr);
    canvas.height = Math.round(state.height * dpr);
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const xScale = state.width / oldWidth;
    const yScale = state.height / oldHeight;
    for (const player of Object.values(state.players)) {
      player.x *= xScale;
      player.y *= yScale;
    }
    state.ball.x *= xScale;
    state.ball.y *= yScale;
    draw();
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, state.width, state.height);
    drawField();
    drawCrowd();
    drawGoals();
    drawPlayer(state.players[1], "#46c7d9", "#ffd35a");
    drawPlayer(state.players[2], "#ef5b63", "#7f59e8");
    drawBall();
    drawOverlayText();
  }

  function drawField() {
    const grass = ctx.createLinearGradient(0, 0, state.width, state.height);
    grass.addColorStop(0, "#7fd672");
    grass.addColorStop(1, "#2fb36d");
    ctx.fillStyle = grass;
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let x = 0; x < state.width; x += 120) ctx.fillRect(x, 0, 60, state.height);
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 42, state.width - 72, state.height - 84);
    ctx.beginPath();
    ctx.moveTo(state.width / 2, 42);
    ctx.lineTo(state.width / 2, state.height - 42);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(state.width / 2, state.height / 2, 76, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawCrowd() {
    const pulse = state.crowdPulse;
    for (let i = 0; i < 42; i += 1) {
      const x = 30 + i * ((state.width - 60) / 41);
      const y = 22 + Math.sin(i + pulse * 8) * 4;
      ctx.fillStyle = ["#ffd35a", "#46c7d9", "#ef5b63", "#7f59e8"][i % 4];
      ctx.beginPath();
      ctx.arc(x, y, 5 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, state.height - y, 5 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGoals() {
    const top = state.height / 2 - config.goalHeight / 2;
    ctx.fillStyle = "rgba(255,255,255,0.64)";
    ctx.fillRect(0, top, 28, config.goalHeight);
    ctx.fillRect(state.width - 28, top, 28, config.goalHeight);
    ctx.strokeStyle = "rgba(19,32,53,0.24)";
    ctx.lineWidth = 2;
    for (let y = top + 18; y < top + config.goalHeight; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(28, y);
      ctx.moveTo(state.width - 28, y);
      ctx.lineTo(state.width, y);
      ctx.stroke();
    }
  }

  function drawPlayer(player, body, hat) {
    ctx.save();
    ctx.translate(player.x, player.y);
    const bob = Math.sin(performance.now() * 0.016 + player.id) * 2;
    ctx.fillStyle = "rgba(19,32,53,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 34, 34, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    if (player.tapGlow > 0) {
      ctx.globalAlpha = player.tapGlow * 0.32;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, bob, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.roundRect(-24, -8 + bob, 48, 58, 10);
    ctx.fill();
    ctx.fillStyle = "#ffe3ba";
    ctx.beginPath();
    ctx.arc(0, -26 + bob, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hat;
    ctx.beginPath();
    ctx.moveTo(-24, -38 + bob);
    ctx.lineTo(22, -42 + bob);
    ctx.lineTo(10, -60 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#132035";
    ctx.beginPath();
    ctx.arc(-7, -29 + bob, 3, 0, Math.PI * 2);
    ctx.arc(8, -29 + bob, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBall() {
    const ball = state.ball;
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.spin);
    ctx.fillStyle = "#fffaf0";
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#132035";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius * 0.58, 0, Math.PI * 2);
    ctx.moveTo(-ball.radius, 0);
    ctx.lineTo(ball.radius, 0);
    ctx.moveTo(0, -ball.radius);
    ctx.lineTo(0, ball.radius);
    ctx.stroke();
    ctx.restore();
  }

  function drawOverlayText() {
    if (state.countdown > 0) {
      centerText(String(Math.ceil(state.countdown)), 96);
    } else if (state.goalPause > 0) {
      centerText("GOAL!", 76);
    }
    ctx.fillStyle = "rgba(19,32,53,0.64)";
    ctx.font = "900 18px system-ui";
    ctx.fillText(labelsFor(controls.p1Action), 64, state.height - 58);
    const rightLabel = options.mode === "two" ? labelsFor(controls.p2Action) : "CPU";
    ctx.fillText(rightLabel, state.width - 130, state.height - 58);
  }

  function centerText(text, size) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.strokeStyle = "rgba(19,32,53,0.28)";
    ctx.lineWidth = 8;
    ctx.font = `950 ${size}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText(text, state.width / 2, state.height / 2);
    ctx.fillText(text, state.width / 2, state.height / 2);
    ctx.restore();
  }

  async function finishGame() {
    if (state.over) return;
    state.over = true;
    cancelAnimationFrame(raf);
    let winner = "draw";
    let title = "Draw";
    if (state.score[1] > state.score[2]) {
      winner = options.mode === "solo" ? "solo" : "player1";
      title = `${options.player1} wins`;
    } else if (state.score[2] > state.score[1]) {
      winner = options.mode === "solo" ? "computer" : "player2";
      title = `${playerName(2)} wins`;
    }

    const result = {
      gameId: "football",
      mode: options.mode,
      difficulty: options.difficulty,
      winner,
      score: state.score[1],
      player1Score: state.score[1],
      player2Score: state.score[2],
      time: Math.floor(matchSeconds - state.timeLeft),
      summary: `${state.score[1]}-${state.score[2]} in ${formatDuration(matchSeconds - state.timeLeft)}`,
    };
    await saveResult(result);
    audio.play(winner === "draw" ? "draw" : "win");
    showOverlay(title, result.summary, true);
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
    showOverlay("Paused", "The dummies are catching their breath.", false);
  }

  function resumeGame() {
    if (!state.paused) return;
    state.paused = false;
    state.lastTime = performance.now();
    hideOverlay();
  }

  function restartGame() {
    cancelAnimationFrame(raf);
    resultSaved = false;
    state = initialState();
    resizeCanvas();
    updateHud();
    hideOverlay();
    startGame();
  }

  function showOverlay(title, message, results) {
    const node = root.querySelector("#footballOverlay");
    node.classList.add("is-visible");
    node.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "game-overlay-panel";
    panel.append(createText("h2", title), createText("p", message));
    const actions = document.createElement("div");
    actions.className = "overlay-actions";
    if (!results) actions.append(actionButton("Resume", "primary-action", resumeGame));
    actions.append(
      actionButton("Restart", results ? "primary-action" : "", restartGame),
      actionButton("Library", "", () => {
        destroyGame();
        onExit();
      }),
    );
    panel.append(actions);
    node.append(panel);
  }

  function hideOverlay() {
    const node = root.querySelector("#footballOverlay");
    if (!node) return;
    node.classList.remove("is-visible");
    node.innerHTML = "";
  }

  function createText(tag, text) {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  }

  function destroyGame() {
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", handleKeydown);
    canvas?.removeEventListener("pointerdown", handlePointerDown);
    resizeObserver?.disconnect();
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
