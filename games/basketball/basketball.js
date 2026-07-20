import { labelsFor, matchesControl, shouldPreventScroll } from "../../shared/controls.js";
import { formatDuration } from "../../shared/navigation.js";
import { recordGameResult } from "../../shared/storage.js";

const DIFFICULTY = {
  easy: {
    basketMove: 0,
    basketSpeed: 1.1,
    wind: 0,
    rimWidth: 112,
    rimHeight: 22,
    angleSpeed: 30,
    powerRate: 0.6,
    perfectPower: 0.56,
    perfectPowerWindow: 0.14,
    perfectAngleWindow: 10,
    gravity: 700,
    launchBase: 390,
    launchPower: 430,
    rushTime: 75,
    targetBaskets: 6,
    targetThrows: 14,
    twoThrows: 6,
  },
  normal: {
    basketMove: 34,
    basketSpeed: 1.55,
    wind: 0,
    rimWidth: 84,
    rimHeight: 16,
    angleSpeed: 42,
    powerRate: 0.78,
    perfectPower: 0.68,
    perfectPowerWindow: 0.09,
    perfectAngleWindow: 6,
    gravity: 760,
    launchBase: 420,
    launchPower: 470,
    rushTime: 60,
    targetBaskets: 8,
    targetThrows: 12,
    twoThrows: 5,
  },
  hard: {
    basketMove: 64,
    basketSpeed: 2.2,
    wind: 36,
    rimWidth: 66,
    rimHeight: 12,
    angleSpeed: 62,
    powerRate: 0.96,
    perfectPower: 0.78,
    perfectPowerWindow: 0.07,
    perfectAngleWindow: 5,
    gravity: 810,
    launchBase: 440,
    launchPower: 500,
    rushTime: 45,
    targetBaskets: 10,
    targetThrows: 10,
    twoThrows: 5,
  },
};

export function createBasketballGame(context) {
  const { root, audio, options, onExit, onSetup, onResult } = context;
  const controls = options.controls;
  const config = DIFFICULTY[options.difficulty] || DIFFICULTY.normal;
  const maxThrows =
    options.mode === "two" ? config.twoThrows : options.challenge === "target" ? config.targetThrows : Infinity;
  const targetBaskets = config.targetBaskets;
  const rushTime = config.rushTime;

  let canvas;
  let ctx;
  let raf = 0;
  let resizeObserver;
  let resultSaved = false;
  let state;

  function initialState() {
    return {
      paused: false,
      over: false,
      started: false,
      lastTime: performance.now(),
      elapsed: 0,
      timeLeft: rushTime,
      currentPlayer: 1,
      scores: { 1: 0, 2: 0 },
      baskets: { 1: 0, 2: 0 },
      throws: { 1: 0, 2: 0 },
      holding: false,
      holdPlayer: 1,
      power: 0,
      angle: -48,
      angleDirection: 1,
      basketPhase: 0,
      basketPulse: 0,
      feedback: "Hold and release to throw",
      ball: createRestingBall(),
      width: 900,
      height: 540,
    };
  }

  function createRestingBall() {
    return {
      x: 120,
      y: 388,
      vx: 0,
      vy: 0,
      r: 15,
      active: false,
      scored: false,
      trail: [],
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
    root.className = "arcade-view basketball-game";
    root.innerHTML = "";

    const bar = document.createElement("section");
    bar.className = "game-bar";
    const title = document.createElement("div");
    title.className = "game-title";
    title.innerHTML = `
      <h1>Basket & Ball</h1>
      <p>${options.mode === "solo" ? soloLabel() : "Turn-based two-player"} - ${options.difficulty}</p>
    `;
    const scoreStrip = document.createElement("div");
    scoreStrip.className = "score-strip";
    scoreStrip.id = "basketHud";
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
    shell.className = "basketball-shell";
    const court = document.createElement("div");
    court.className = "basketball-court";
    canvas = document.createElement("canvas");
    canvas.id = "basketballCanvas";
    court.append(canvas, overlay("basketOverlay"));
    ctx = canvas.getContext("2d");

    const side = document.createElement("aside");
    side.className = "basketball-side";
    side.append(
      sideTitle("Timing"),
      textLine(difficultyLine()),
      textLine("Hold to charge power. Release when angle and power line up with the basket."),
      meter("Power", "basketPower"),
      meter("Angle", "basketAngle"),
      sideTitle("Controls"),
      textLine(controlLine()),
      actionButton("Hold / Release", "court-action", () => {
        if (!state.holding) startHold(1);
        else releaseHold(1);
      }),
      actionButton("Back to setup", "", () => {
        destroyGame();
        onSetup();
      }),
    );
    shell.append(court, side);
    root.append(bar, shell);
  }

  function soloLabel() {
    return options.challenge === "target" ? `Limited balls: ${targetBaskets} baskets` : `${rushTime}s rush`;
  }

  function difficultyLine() {
    if (options.difficulty === "easy") {
      return "Easy uses a wide rim, slow aim, no wind, and extra time or attempts.";
    }
    if (options.difficulty === "hard") {
      return "Hard uses a narrow moving rim, faster aim, wind, and fewer chances.";
    }
    return "Normal uses a moving rim with balanced aim speed and standard limits.";
  }

  function controlLine() {
    if (options.mode === "two") {
      return `${options.player1}: ${labelsFor(controls.p1Action)} | ${options.player2}: ${labelsFor(controls.p2Action)}`;
    }
    return `${options.player1}: ${labelsFor(controls.p1Action)} or press the court`;
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

  function meter(label, id) {
    const wrap = document.createElement("div");
    wrap.className = "power-stack";
    const text = document.createElement("span");
    text.className = "field-label";
    text.textContent = label;
    const meterNode = document.createElement("div");
    meterNode.className = id === "basketPower" ? "power-meter" : "angle-meter";
    const fill = document.createElement("span");
    fill.id = id;
    meterNode.append(fill);
    wrap.append(text, meterNode);
    return wrap;
  }

  function overlay(id) {
    const node = document.createElement("div");
    node.className = "game-overlay";
    node.id = id;
    return node;
  }

  function bindEvents() {
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas.parentElement);
  }

  function startGame() {
    cancelAnimationFrame(raf);
    state.started = true;
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
    state.elapsed += dt;
    if (options.mode === "solo" && options.challenge === "rush") {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0 && !state.ball.active) finishGame();
    }

    state.angle += state.angleDirection * dt * config.angleSpeed;
    if (state.angle > -30 || state.angle < -72) {
      state.angleDirection *= -1;
      state.angle = Math.max(-72, Math.min(-30, state.angle));
    }

    if (state.holding) {
      state.power = Math.min(1, state.power + dt * config.powerRate);
    }

    state.basketPhase += dt;
    state.basketPulse = Math.max(0, state.basketPulse - dt * 3);

    if (state.ball.active) updateBall(dt);
    updateHud();
  }

  function updateBall(dt) {
    const ball = state.ball;
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 18) ball.trail.shift();
    ball.vx += wind() * dt;
    ball.vy += config.gravity * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    const basket = basketPosition();
    const insideRim =
      !ball.scored &&
      ball.vy > 0 &&
      ball.x > basket.x - config.rimWidth / 2 &&
      ball.x < basket.x + config.rimWidth / 2 &&
      Math.abs(ball.y - basket.y) < config.rimHeight;

    if (insideRim) {
      ball.scored = true;
      const perfect =
        Math.abs(state.power - idealPower()) < config.perfectPowerWindow &&
        Math.abs(state.angle - idealAngle()) < config.perfectAngleWindow;
      const points = perfect ? 2 : 1;
      state.scores[state.currentPlayer] += points;
      state.baskets[state.currentPlayer] += 1;
      state.basketPulse = 1;
      state.feedback = perfect ? "Perfect basket! +2" : "Basket! +1";
      audio.play("basket");
    }

    if (ball.y > state.height + 60 || ball.x > state.width + 90 || ball.x < -60) {
      if (!ball.scored) {
        state.feedback = "Missed. Resetting ball.";
        audio.play("miss");
      }
      setTimeout(resolveThrow, 240);
      ball.active = false;
    }
  }

  function startHold(player) {
    if (state.paused || state.over || state.ball.active || state.holding) return;
    if (player !== state.currentPlayer) return;
    state.holding = true;
    state.holdPlayer = player;
    state.power = 0;
    state.feedback = `${playerName(player)} charging`;
  }

  function releaseHold(player) {
    if (!state.holding || state.holdPlayer !== player || state.ball.active || state.over) return;
    state.holding = false;
    throwBall();
  }

  function throwBall() {
    const player = state.currentPlayer;
    state.throws[player] += 1;
    const angle = (state.angle * Math.PI) / 180;
    const speed = config.launchBase + state.power * config.launchPower;
    state.ball = {
      ...createRestingBall(),
      active: true,
      x: 132,
      y: 380,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      trail: [],
    };
    state.feedback = `${playerName(player)} throws`;
    audio.play("kick");
  }

  function resolveThrow() {
    if (state.over) return;
    state.ball = createRestingBall();
    state.power = 0;

    if (options.mode === "solo") {
      if (options.challenge === "target") {
        if (state.baskets[1] >= targetBaskets || state.throws[1] >= maxThrows) {
          finishGame();
          return;
        }
        state.feedback = `${targetBaskets - state.baskets[1]} baskets left`;
      }
      return;
    }

    if (state.throws[1] >= maxThrows && state.throws[2] >= maxThrows) {
      finishGame();
      return;
    }

    state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
    if (state.throws[state.currentPlayer] >= maxThrows) {
      state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
    }
    state.feedback = `${playerName(state.currentPlayer)}'s turn`;
  }

  function playerName(player) {
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
    if (matchesControl(event, controls.p1Action)) startHold(1);
    if (options.mode === "two" && matchesControl(event, controls.p2Action)) startHold(2);
  }

  function handleKeyup(event) {
    if (shouldPreventScroll(event, controls)) event.preventDefault();
    if (matchesControl(event, controls.p1Action)) releaseHold(1);
    if (options.mode === "two" && matchesControl(event, controls.p2Action)) releaseHold(2);
  }

  function handlePointerDown(event) {
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    startHold(state.currentPlayer);
  }

  function handlePointerUp(event) {
    event.preventDefault();
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    releaseHold(state.currentPlayer);
  }

  function updateHud() {
    const hud = root.querySelector("#basketHud");
    if (!hud) return;
    const primary =
      options.mode === "solo"
        ? options.challenge === "rush"
          ? `Time: ${formatDuration(state.timeLeft)}`
          : `Throws: ${state.throws[1]}/${maxThrows}`
        : `Turn: ${playerName(state.currentPlayer)}`;
    hud.replaceChildren(
      pill(primary),
      pill(`${options.player1}: ${state.scores[1]}`),
      options.mode === "two" ? pill(`${options.player2}: ${state.scores[2]}`) : pill(`Baskets: ${state.baskets[1]}`),
      pill(state.feedback),
    );
    const power = root.querySelector("#basketPower");
    const angle = root.querySelector("#basketAngle");
    if (power) power.style.width = `${Math.round(state.power * 100)}%`;
    if (angle) angle.style.width = `${Math.round(((state.angle + 72) / 42) * 100)}%`;
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
    state.width = Math.max(720, rect.width);
    state.height = 540;
    canvas.width = Math.round(state.width * dpr);
    canvas.height = Math.round(state.height * dpr);
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, state.width, state.height);
    drawCourt();
    drawPlayer();
    drawBasket();
    drawAim();
    drawBall();
  }

  function drawCourt() {
    const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
    gradient.addColorStop(0, "#9ee9ff");
    gradient.addColorStop(0.58, "#ffe6a6");
    gradient.addColorStop(1, "#f5b56d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.fillStyle = "rgba(255,255,255,0.32)";
    for (let x = 0; x < state.width; x += 84) {
      ctx.fillRect(x, state.height - 128, 42, 128);
    }

    ctx.strokeStyle = "rgba(19,32,53,0.16)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(150, state.height - 68, 112, 0, Math.PI * 2);
    ctx.stroke();

    if (config.wind) {
      ctx.fillStyle = "rgba(19,32,53,0.58)";
      ctx.font = "900 16px system-ui";
      ctx.fillText(`Wind ${wind() > 0 ? ">" : "<"}`, 24, 34);
    }
  }

  function drawPlayer() {
    ctx.save();
    ctx.translate(120, 390);
    ctx.fillStyle = "#ff8a3d";
    ctx.beginPath();
    ctx.arc(0, -48, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#142033";
    ctx.fillRect(-18, -28, 36, 54);
    ctx.fillStyle = "#46c7d9";
    ctx.fillRect(-34, -18, 68, 12);
    ctx.fillStyle = "#2fb36d";
    ctx.fillRect(-22, 22, 14, 48);
    ctx.fillRect(8, 22, 14, 48);
    ctx.restore();
  }

  function drawBasket() {
    const basket = basketPosition();
    ctx.save();
    ctx.translate(basket.x, basket.y);
    const pulse = 1 + state.basketPulse * 0.18;
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#142033";
    ctx.fillRect(42, -92, 12, 138);
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.fillRect(0, -90, 54, 44);
    ctx.strokeStyle = "#ef5b63";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, config.rimWidth / 2, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(19,32,53,0.28)";
    ctx.lineWidth = 2;
    for (let x = -config.rimWidth / 2 + 8; x < config.rimWidth / 2; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, 8);
      ctx.lineTo(x * 0.55, 62);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAim() {
    if (state.ball.active) return;
    const startX = 132;
    const startY = 380;
    const angle = (state.angle * Math.PI) / 180;
    const length = 86 + state.power * 62;
    ctx.strokeStyle = "#7f59e8";
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + Math.cos(angle) * length, startY + Math.sin(angle) * length);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawBall() {
    const ball = state.ball;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.64)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < ball.trail.length; i += 1) {
      const point = ball.trail[i];
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();

    ctx.fillStyle = "#d85b28";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(19,32,53,0.48)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ball.x - ball.r, ball.y);
    ctx.lineTo(ball.x + ball.r, ball.y);
    ctx.moveTo(ball.x, ball.y - ball.r);
    ctx.lineTo(ball.x, ball.y + ball.r);
    ctx.stroke();
    ctx.restore();
  }

  function basketPosition() {
    return {
      x: state.width - 150,
      y: 198 + Math.sin(state.basketPhase * config.basketSpeed) * config.basketMove,
    };
  }

  function wind() {
    return Math.sin(state.elapsed * 0.8) * config.wind;
  }

  function idealAngle() {
    return -48;
  }

  function idealPower() {
    return config.perfectPower;
  }

  async function finishGame() {
    state.over = true;
    cancelAnimationFrame(raf);
    let winner = "solo";
    let title = "Challenge complete";
    if (options.mode === "two") {
      if (state.scores[1] > state.scores[2]) {
        winner = "player1";
        title = `${options.player1} wins`;
      } else if (state.scores[2] > state.scores[1]) {
        winner = "player2";
        title = `${options.player2} wins`;
      } else {
        winner = "draw";
        title = "Draw";
      }
    }

    const success = options.mode === "solo" && options.challenge === "target" ? state.baskets[1] >= targetBaskets : true;
    const result = {
      gameId: "basketball",
      mode: options.mode,
      difficulty: options.difficulty,
      challenge: options.mode === "solo" ? options.challenge : "turns",
      winner,
      score: state.scores[1],
      player1Score: state.scores[1],
      player2Score: state.scores[2],
      throwsUsed: state.throws[1],
      success,
      summary:
        options.mode === "solo"
          ? `${state.scores[1]} points, ${state.throws[1]} throws`
          : `${state.scores[1]}-${state.scores[2]} after ${maxThrows} throws each`,
    };
    await saveResult(result);
    audio.play(winner === "draw" ? "draw" : "win");
    showOverlay(title, resultSummary(result), true);
  }

  function resultSummary(result) {
    if (options.mode === "solo" && options.challenge === "target") {
      return result.success
        ? `Target cleared in ${result.throwsUsed} throws with ${result.score} points.`
        : `Target missed. You scored ${result.score} points.`;
    }
    if (options.mode === "solo") return `You scored ${result.score} points before time ran out.`;
    return `${options.player1}: ${result.player1Score} | ${options.player2}: ${result.player2Score}.`;
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
    showOverlay("Paused", "The ball is waiting on the hardwood.", false);
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
    startGame();
    hideOverlay();
  }

  function showOverlay(title, message, results) {
    const node = root.querySelector("#basketOverlay");
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
    const node = root.querySelector("#basketOverlay");
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
    window.removeEventListener("keyup", handleKeyup);
    canvas?.removeEventListener("pointerdown", handlePointerDown);
    canvas?.removeEventListener("pointerup", handlePointerUp);
    canvas?.removeEventListener("pointercancel", handlePointerUp);
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
