import { labelsFor, matchesControl, shouldPreventScroll } from "../../shared/controls.js";
import { recordGameResult } from "../../shared/storage.js";

const TARGET_SCORE = 5;

const SUMO_DIFFICULTY = {
  easy: {
    arenaScale: 0.37,
    moveAccel: 590,
    maxSpeed: 230,
    pushMaxSpeed: 385,
    pushCooldown: 0.82,
    pushDuration: 0.16,
    chargeAccel: 700,
    pushForce: 200,
    contactForce: 58,
    edgeVulnerability: 92,
    standingResist: 68,
    selfExitLimit: 0.32,
    aiInterval: 0.42,
    aiMistake: 0.28,
    aiPushChance: 0.48,
    edgeSense: 0.78,
    desiredRange: 102,
    moveBias: 0.78,
  },
  normal: {
    arenaScale: 0.34,
    moveAccel: 620,
    maxSpeed: 250,
    pushMaxSpeed: 430,
    pushCooldown: 0.72,
    pushDuration: 0.18,
    chargeAccel: 760,
    pushForce: 235,
    contactForce: 70,
    edgeVulnerability: 120,
    standingResist: 55,
    selfExitLimit: 0.25,
    aiInterval: 0.25,
    aiMistake: 0.14,
    aiPushChance: 0.68,
    edgeSense: 0.72,
    desiredRange: 92,
    moveBias: 0.9,
  },
  hard: {
    arenaScale: 0.31,
    moveAccel: 660,
    maxSpeed: 270,
    pushMaxSpeed: 455,
    pushCooldown: 0.66,
    pushDuration: 0.19,
    chargeAccel: 820,
    pushForce: 260,
    contactForce: 82,
    edgeVulnerability: 145,
    standingResist: 42,
    selfExitLimit: 0.18,
    aiInterval: 0.14,
    aiMistake: 0.07,
    aiPushChance: 0.82,
    edgeSense: 0.66,
    desiredRange: 84,
    moveBias: 1,
  },
};

export function createSumoGame(context) {
  const { root, audio, options, onExit, onSetup, onResult } = context;
  const controls = options.controls;
  const config = SUMO_DIFFICULTY[options.difficulty] || SUMO_DIFFICULTY.normal;

  let canvas;
  let ctx;
  let raf = 0;
  let resizeObserver;
  let resultSaved = false;
  let roundTimer = 0;
  let state;

  const keys = new Set();

  function initialState() {
    return {
      width: 900,
      height: 560,
      ring: { x: 450, y: 280, radius: 190 },
      phase: "countdown",
      paused: false,
      over: false,
      countdown: 3,
      round: 0,
      roundsPlayed: 0,
      roundResolved: false,
      message: "First to 5 wins",
      score: { 1: 0, 2: 0 },
      lastTime: performance.now(),
      aiTimer: 0,
      aiIntent: { x: -1, y: 0, push: false },
      impactCooldown: 0,
      moveSoundCooldown: 0,
      particles: [],
      players: {
        1: createPlayer(1),
        2: createPlayer(2),
      },
    };
  }

  function createPlayer(id) {
    return {
      id,
      x: id === 1 ? 360 : 540,
      y: 280,
      vx: 0,
      vy: 0,
      ax: 0,
      ay: 0,
      radius: 32,
      facing: id === 1 ? 0 : Math.PI,
      pushCooldown: 0,
      pushTimer: 0,
      eliminated: false,
      externalForceTimer: 0,
      fallSpin: 0,
      dustTimer: 0,
      previousDistance: 0,
      currentDistance: 0,
      lastSafeDistance: 0,
    };
  }

  function initializeGame() {
    state = initialState();
    renderShell();
    bindEvents();
    resizeCanvas();
    resetRound();
    updateHud();
    draw();
  }

  function renderShell() {
    root.className = "arcade-view sumo-game";
    root.innerHTML = "";

    const bar = document.createElement("section");
    bar.className = "game-bar";
    const title = document.createElement("div");
    title.className = "game-title";
    title.innerHTML = `
      <h1>Sumo</h1>
      <p>${options.mode === "solo" ? "Solo vs computer" : "Local two-player"} - ${options.difficulty}</p>
    `;
    const scoreStrip = document.createElement("div");
    scoreStrip.className = "score-strip";
    scoreStrip.id = "sumoHud";
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
    shell.className = "sumo-shell";
    const arena = document.createElement("div");
    arena.className = "sumo-arena";
    canvas = document.createElement("canvas");
    canvas.id = "sumoCanvas";
    arena.append(canvas, overlay("sumoOverlay"));
    ctx = canvas.getContext("2d");

    const side = document.createElement("aside");
    side.className = "sumo-side";
    side.append(
      sideTitle("First to 5 wins"),
      textLine("Push your opponent completely outside the circular ring. There is no timer."),
      textLine(difficultyLine()),
      sideTitle("Controls"),
      textLine(controlLine()),
      cooldownPanel(),
      pushButtons(),
      actionButton("Back to setup", "", () => {
        destroyGame();
        onSetup();
      }),
    );

    shell.append(arena, side);
    root.append(bar, shell);
  }

  function difficultyLine() {
    if (options.difficulty === "easy") {
      const aiText = options.mode === "solo" ? " The computer also reacts slowly." : "";
      return `Easy uses a larger ring, gentler impacts, and slower push recovery.${aiText}`;
    }
    if (options.difficulty === "hard") {
      const aiText = options.mode === "solo" ? " The computer also creates better angles." : "";
      return `Hard uses a tighter ring, sharper impacts, and faster push recovery.${aiText}`;
    }
    const aiText = options.mode === "solo" ? " The computer keeps near centre and pushes when close." : "";
    return `Normal keeps the ring, physics, and push cooldowns balanced.${aiText}`;
  }

  function controlLine() {
    if (options.mode === "two") {
      return `${options.player1}: ${labelsFor([controls.p1Up[0], controls.p1Left[0], controls.p1Down[0], controls.p1Right[0]])}, push ${labelsFor(controls.p1Push)}. ${options.player2}: Arrow keys, push ${labelsFor(controls.p2Push)}.`;
    }
    return `${options.player1}: ${labelsFor([controls.p1Up[0], controls.p1Left[0], controls.p1Down[0], controls.p1Right[0]])}, push ${labelsFor(controls.p1Push)}.`;
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

  function cooldownPanel() {
    const panel = document.createElement("div");
    panel.className = "cooldown-stack";
    panel.innerHTML = `
      <div class="cooldown-row">
        <span>${options.player1} push</span>
        <div class="cooldown-meter"><i id="sumoP1Cooldown"></i></div>
      </div>
      <div class="cooldown-row">
        <span>${opponentName()} push</span>
        <div class="cooldown-meter"><i id="sumoP2Cooldown"></i></div>
      </div>
    `;
    return panel;
  }

  function pushButtons() {
    const wrap = document.createElement("div");
    wrap.className = "sumo-push-buttons";
    wrap.append(actionButton("Push P1", "", () => requestPush(1)));
    if (options.mode === "two") {
      wrap.append(actionButton("Push P2", "", () => requestPush(2)));
    } else {
      wrap.classList.add("is-solo");
      const note = document.createElement("p");
      note.className = "sumo-cpu-note";
      note.textContent = "Computer pushes automatically.";
      wrap.append(note);
    }
    return wrap;
  }

  function bindEvents() {
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);
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

    if (state.phase === "countdown") {
      const previous = Math.ceil(state.countdown);
      state.countdown -= dt;
      if (Math.ceil(state.countdown) !== previous && state.countdown > 0) audio.play("countdown");
      if (state.countdown <= 0) {
        state.phase = "playing";
        state.message = "Push!";
        audio.play("sumoStart");
      }
      updateHud();
      return;
    }

    if (state.phase === "roundOver") {
      roundTimer -= dt;
      updateFalling(dt);
      if (roundTimer <= 0) {
        resetRound();
      }
      updateHud();
      return;
    }

    if (state.phase !== "playing") return;

    state.impactCooldown = Math.max(0, state.impactCooldown - dt);
    state.moveSoundCooldown = Math.max(0, state.moveSoundCooldown - dt);
    if (options.mode === "solo") updateAi(dt);
    updatePlayerInput();
    updatePlayers(dt);
    handlePlayerCollision();
    checkBoundary();
    updateHud();
  }

  function updateAi(dt) {
    state.aiTimer -= dt;
    if (state.aiTimer > 0) return;
    state.aiTimer = config.aiInterval;

    const ai = state.players[2];
    const human = state.players[1];
    const ring = state.ring;
    const aiEdge = distance(ai.x, ai.y, ring.x, ring.y) / ring.radius;
    const humanEdge = distance(human.x, human.y, ring.x, ring.y) / ring.radius;
    let targetX = human.x;
    let targetY = human.y;

    if (aiEdge > config.edgeSense) {
      targetX = ring.x;
      targetY = ring.y;
    } else if (humanEdge > 0.68) {
      const toEdgeX = human.x - ring.x;
      const toEdgeY = human.y - ring.y;
      targetX = human.x - toEdgeY * 0.22;
      targetY = human.y + toEdgeX * 0.22;
    } else {
      const behindX = human.x + (human.x - ring.x) * 0.18;
      const behindY = human.y + (human.y - ring.y) * 0.18;
      targetX = behindX;
      targetY = behindY;
    }

    if (Math.random() < config.aiMistake) {
      targetX = ring.x + (Math.random() - 0.5) * ring.radius * 0.9;
      targetY = ring.y + (Math.random() - 0.5) * ring.radius * 0.9;
    }

    const dx = targetX - ai.x;
    const dy = targetY - ai.y;
    const len = Math.hypot(dx, dy) || 1;
    state.aiIntent.x = (dx / len) * config.moveBias;
    state.aiIntent.y = (dy / len) * config.moveBias;

    const close = distance(ai.x, ai.y, human.x, human.y) < config.desiredRange;
    state.aiIntent.push = close && Math.random() < config.aiPushChance;
    if (state.aiIntent.push) requestPush(2);
  }

  function updatePlayerInput() {
    const p1 = axisFor(1);
    state.players[1].ax = p1.x;
    state.players[1].ay = p1.y;

    if (options.mode === "two") {
      const p2 = axisFor(2);
      state.players[2].ax = p2.x;
      state.players[2].ay = p2.y;
    } else {
      state.players[2].ax = state.aiIntent.x;
      state.players[2].ay = state.aiIntent.y;
    }
  }

  function axisFor(player) {
    const map =
      player === 1
        ? {
            up: controls.p1Up,
            down: controls.p1Down,
            left: controls.p1Left,
            right: controls.p1Right,
          }
        : {
            up: controls.p2Up,
            down: controls.p2Down,
            left: controls.p2Left,
            right: controls.p2Right,
          };
    let x = Number(hasAny(map.right)) - Number(hasAny(map.left));
    let y = Number(hasAny(map.down)) - Number(hasAny(map.up));
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  function updatePlayers(dt) {
    for (const player of Object.values(state.players)) {
      player.pushCooldown = Math.max(0, player.pushCooldown - dt);
      player.pushTimer = Math.max(0, player.pushTimer - dt);
      player.externalForceTimer = Math.max(0, player.externalForceTimer - dt);
      player.dustTimer -= dt;
      player.previousDistance = distance(player.x, player.y, state.ring.x, state.ring.y);

      const moving = Math.hypot(player.ax, player.ay) > 0.1;
      const accel = moving ? config.moveAccel : 0;
      player.vx += player.ax * accel * dt;
      player.vy += player.ay * accel * dt;

      if (moving) {
        player.facing = Math.atan2(player.ay, player.ax);
      }

      if (player.pushTimer > 0) {
        player.vx += Math.cos(player.facing) * config.chargeAccel * dt;
        player.vy += Math.sin(player.facing) * config.chargeAccel * dt;
        if (player.dustTimer <= 0) {
          spawnDust(player.x - Math.cos(player.facing) * 24, player.y - Math.sin(player.facing) * 24);
          player.dustTimer = 0.035;
        }
      }

      const speed = Math.hypot(player.vx, player.vy);
      const maxSpeed = player.pushTimer > 0 ? config.pushMaxSpeed : config.maxSpeed;
      if (speed > maxSpeed) {
        player.vx = (player.vx / speed) * maxSpeed;
        player.vy = (player.vy / speed) * maxSpeed;
      }

      const standingFriction = moving ? 0.92 : 0.84;
      player.vx *= standingFriction;
      player.vy *= standingFriction;
      player.x += player.vx * dt;
      player.y += player.vy * dt;

      softenSelfExit(player);
      player.currentDistance = distance(player.x, player.y, state.ring.x, state.ring.y);
      player.lastSafeDistance = player.currentDistance;

      if (moving && speed > 35 && state.moveSoundCooldown <= 0) {
        audio.play("sumoMove");
        state.moveSoundCooldown = 0.48;
      }
    }
  }

  function softenSelfExit(player) {
    const ring = state.ring;
    const dx = player.x - ring.x;
    const dy = player.y - ring.y;
    const d = Math.hypot(dx, dy) || 1;
    const softLimit = ring.radius - player.radius * 0.55;
    if (d <= softLimit) return;
    const nx = dx / d;
    const ny = dy / d;
    const outward = player.vx * nx + player.vy * ny;
    if (player.externalForceTimer <= 0) {
      const holdLimit = ring.radius - player.radius * config.selfExitLimit;
      if (d > holdLimit) {
        player.x = ring.x + nx * holdLimit;
        player.y = ring.y + ny * holdLimit;
      }
    }
    if (outward > 0 && player.externalForceTimer <= 0) {
      player.vx -= nx * outward * 0.54;
      player.vy -= ny * outward * 0.54;
    }
  }

  function requestPush(playerId) {
    if (state.phase !== "playing" || state.paused || state.over) return;
    const player = state.players[playerId];
    if (player.pushCooldown > 0) return;
    player.pushCooldown = config.pushCooldown;
    player.pushTimer = config.pushDuration;
    state.message = `${playerName(playerId)} pushes`;
    audio.play("sumoPush");
  }

  function handlePlayerCollision() {
    const a = state.players[1];
    const b = state.players[2];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const min = a.radius + b.radius;
    if (d >= min) return;

    const nx = dx / d;
    const ny = dy / d;
    const overlap = min - d;
    a.x -= nx * overlap * 0.5;
    a.y -= ny * overlap * 0.5;
    b.x += nx * overlap * 0.5;
    b.y += ny * overlap * 0.5;

    applyImpact(a, b, -nx, -ny);
    applyImpact(b, a, nx, ny);
    if (state.impactCooldown <= 0) {
      spawnImpact((a.x + b.x) / 2, (a.y + b.y) / 2);
      audio.play("sumoImpact");
      state.impactCooldown = 0.13;
    }
  }

  function applyImpact(source, target, nx, ny) {
    const sourceSpeed = Math.hypot(source.vx, source.vy);
    const targetSpeed = Math.hypot(target.vx, target.vy);
    const pushBoost = source.pushTimer > 0 ? config.pushForce : config.contactForce;
    const momentumBoost = Math.min(130, sourceSpeed * 0.38);
    const edgeVulnerability = Math.max(0, target.lastSafeDistance / state.ring.radius - 0.58) * config.edgeVulnerability;
    const movingVulnerability = Math.min(80, targetSpeed * 0.22);
    const standingResist = targetSpeed < 35 ? config.standingResist : 0;
    const force = Math.max(25, pushBoost + momentumBoost + edgeVulnerability + movingVulnerability - standingResist);
    target.vx -= nx * force;
    target.vy -= ny * force;
    target.externalForceTimer = Math.max(target.externalForceTimer, 0.5);
    source.vx += nx * force * 0.1;
    source.vy += ny * force * 0.1;
  }

  function checkBoundary() {
    if (state.roundResolved) return;
    const out = [1, 2].filter((id) => {
      const player = state.players[id];
      return distance(player.x, player.y, state.ring.x, state.ring.y) > state.ring.radius + player.radius;
    });

    if (!out.length) return;
    state.roundResolved = true;
    state.phase = "roundOver";
    state.roundsPlayed += 1;
    roundTimer = 1.55;

    if (out.length === 2) {
      const firstOut = earliestBoundaryExit(out);
      if (firstOut) {
        awardRound(firstOut === 1 ? 2 : 1, firstOut);
        return;
      }
      state.message = "Draw round";
      audio.play("draw");
      state.players[1].eliminated = true;
      state.players[2].eliminated = true;
      return;
    }

    const loser = out[0];
    const winner = loser === 1 ? 2 : 1;
    awardRound(winner, loser);
  }

  function earliestBoundaryExit(ids) {
    const exits = ids.map((id) => {
      const player = state.players[id];
      const threshold = state.ring.radius + player.radius;
      const before = player.previousDistance || 0;
      const after = player.currentDistance || before;
      const span = after - before;
      const stepFraction = span > 0 ? (threshold - before) / span : 0;
      return { id, stepFraction: Math.max(0, Math.min(1, stepFraction)) };
    });
    const [first, second] = exits.sort((a, b) => a.stepFraction - b.stepFraction);
    return Math.abs(first.stepFraction - second.stepFraction) > 0.002 ? first.id : null;
  }

  function awardRound(winner, loser) {
    state.players[loser].eliminated = true;
    state.score[winner] = Math.min(TARGET_SCORE, state.score[winner] + 1);
    state.message = `${playerName(winner)} wins the round`;
    audio.play("sumoFall");
    audio.play("sumoPoint");

    if (state.score[winner] >= TARGET_SCORE) {
      finishGame(winner);
    }
  }

  function updateFalling(dt) {
    for (const player of Object.values(state.players)) {
      if (!player.eliminated) continue;
      player.fallSpin += dt * 7;
      player.vx *= 0.96;
      player.vy *= 0.96;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
    }
  }

  function resetRound() {
    keys.clear();
    state.phase = "countdown";
    state.countdown = 3;
    state.roundResolved = false;
    state.round += 1;
    state.message = "First to 5 wins";
    state.aiIntent = { x: -1, y: 0, push: false };
    state.aiTimer = 0.2;
    state.particles = [];
    const gap = Math.min(92, state.ring.radius * 0.42);
    state.players[1] = { ...createPlayer(1), x: state.ring.x - gap, y: state.ring.y };
    state.players[2] = { ...createPlayer(2), x: state.ring.x + gap, y: state.ring.y };
    updateHud();
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
    if (matchesControl(event, controls.p1Push)) requestPush(1);
    if (options.mode === "two" && matchesControl(event, controls.p2Push)) requestPush(2);
  }

  function handleKeyup(event) {
    if (shouldPreventScroll(event, controls)) event.preventDefault();
    keys.delete(event.code);
  }

  function hasAny(codes) {
    return codes.some((code) => keys.has(code));
  }

  function updateHud() {
    const hud = root.querySelector("#sumoHud");
    if (!hud) return;
    const p1 = state.players[1];
    const p2 = state.players[2];
    hud.replaceChildren(
      pill("First to 5"),
      pill(`Round ${state.round}`),
      pill(`${options.player1}: ${state.score[1]}`),
      pill(`${opponentName()}: ${state.score[2]}`),
      pill(state.phase === "countdown" ? `Round starts: ${Math.max(1, Math.ceil(state.countdown))}` : state.message),
    );
    const p1Meter = root.querySelector("#sumoP1Cooldown");
    const p2Meter = root.querySelector("#sumoP2Cooldown");
    if (p1Meter) p1Meter.style.transform = `scaleX(${1 - Math.min(1, p1.pushCooldown / config.pushCooldown)})`;
    if (p2Meter) p2Meter.style.transform = `scaleX(${1 - Math.min(1, p2.pushCooldown / config.pushCooldown)})`;
  }

  function pill(text) {
    const node = document.createElement("div");
    node.className = "score-pill";
    node.textContent = text;
    return node;
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
    state.ring = {
      x: state.width / 2,
      y: state.height / 2 + 10,
      radius: Math.min(state.width, state.height) * config.arenaScale,
    };
    for (const player of Object.values(state.players)) {
      player.x *= xScale;
      player.y *= yScale;
    }
    draw();
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, state.width, state.height);
    drawBackground();
    drawArena();
    drawParticles();
    drawPlayer(state.players[1], "#46c7d9", "#2fb36d");
    drawPlayer(state.players[2], "#de5b8c", "#ff8a3d");
    drawCentreText();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, state.width, state.height);
    gradient.addColorStop(0, "#dff8ff");
    gradient.addColorStop(0.55, "#fff1cf");
    gradient.addColorStop(1, "#e8fbf3");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.fillStyle = "rgba(255,255,255,0.68)";
    for (let i = 0; i < 7; i += 1) {
      const x = ((i * 173 + state.width * 0.12) % (state.width + 160)) - 80;
      const y = 70 + (i % 3) * 58;
      ctx.beginPath();
      ctx.ellipse(x, y, 54, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 38, y + 4, 32, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawArena() {
    const ring = state.ring;
    ctx.save();
    ctx.translate(ring.x, ring.y);
    ctx.fillStyle = "rgba(19,32,53,0.17)";
    ctx.beginPath();
    ctx.ellipse(0, ring.radius * 0.1, ring.radius * 1.12, ring.radius * 1.02, 0, 0, Math.PI * 2);
    ctx.fill();

    const mat = ctx.createRadialGradient(-ring.radius * 0.25, -ring.radius * 0.28, 20, 0, 0, ring.radius);
    mat.addColorStop(0, "#fff8da");
    mat.addColorStop(1, "#fdcf76");
    ctx.fillStyle = mat;
    ctx.beginPath();
    ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 16;
    ctx.strokeStyle = "#132035";
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#de5b8c";
    ctx.beginPath();
    ctx.arc(0, 0, ring.radius - 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(19,32,53,0.12)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-ring.radius + 28, 0);
    ctx.lineTo(ring.radius - 28, 0);
    ctx.moveTo(0, -ring.radius + 28);
    ctx.lineTo(0, ring.radius - 28);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayer(player, body, trim) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.eliminated ? player.fallSpin : 0);
    const squash = player.pushTimer > 0 ? 0.9 : 1;
    ctx.fillStyle = "rgba(19,32,53,0.2)";
    ctx.beginPath();
    ctx.ellipse(0, player.radius + 8, player.radius * 1.1, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = body;
    ctx.strokeStyle = "#132035";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, 8, player.radius * 1.08, player.radius * 0.95 * squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffd7bd";
    ctx.beginPath();
    ctx.arc(0, -22, player.radius * 0.74, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = trim;
    ctx.beginPath();
    ctx.roundRect(-22, -2, 44, 16, 7);
    ctx.fill();

    ctx.fillStyle = "#132035";
    ctx.beginPath();
    ctx.arc(-8, -25, 3, 0, Math.PI * 2);
    ctx.arc(8, -25, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = trim;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(Math.cos(player.facing) * 15, Math.sin(player.facing) * 15);
    ctx.lineTo(Math.cos(player.facing) * 34, Math.sin(player.facing) * 34);
    ctx.stroke();

    if (player.pushTimer > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, player.radius + 9, -0.55, 0.55);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCentreText() {
    if (state.phase !== "countdown" && state.phase !== "roundOver") return;
    const text =
      state.phase === "countdown"
        ? state.countdown > 0.45
          ? String(Math.ceil(state.countdown))
          : "Push!"
        : state.message;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `950 ${state.phase === "countdown" ? 76 : 42}px system-ui`;
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(19,32,53,0.36)";
    ctx.fillStyle = "#fffdf8";
    ctx.strokeText(text, state.ring.x, state.ring.y);
    ctx.fillText(text, state.ring.x, state.ring.y);
    ctx.restore();
  }

  function spawnDust(x, y) {
    for (let i = 0; i < 3; i += 1) {
      state.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 90,
        vy: (Math.random() - 0.5) * 90,
        life: 0.36,
        size: 5 + Math.random() * 6,
        color: "rgba(255,255,255,0.72)",
      });
    }
  }

  function spawnImpact(x, y) {
    for (let i = 0; i < 10; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * (80 + Math.random() * 130),
        vy: Math.sin(angle) * (80 + Math.random() * 130),
        life: 0.28,
        size: 3 + Math.random() * 6,
        color: ["#ffd35a", "#de5b8c", "#46c7d9"][i % 3],
      });
    }
  }

  function updateParticles(dt) {
    for (const particle of state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function drawParticles() {
    for (const particle of state.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life / 0.36);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  async function finishGame(winnerId) {
    state.over = true;
    state.phase = "matchOver";
    cancelAnimationFrame(raf);
    const winner =
      winnerId === 1 ? (options.mode === "solo" ? "solo" : "player1") : options.mode === "solo" ? "computer" : "player2";
    const title = `${playerName(winnerId)} Wins!`;
    const result = {
      gameId: "sumo",
      mode: options.mode,
      difficulty: options.difficulty,
      winner,
      score: state.score[1],
      player1Score: state.score[1],
      player2Score: state.score[2],
      rounds: state.roundsPlayed,
      summary: `${state.score[1]}-${state.score[2]}, ${state.roundsPlayed} rounds`,
    };
    await saveResult(result);
    audio.play("win");
    showOverlay(title, `Final score ${state.score[1]}-${state.score[2]}. Total rounds: ${state.roundsPlayed}.`, true);
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
    showOverlay("Paused", "The ring is waiting.", false);
  }

  function resumeGame() {
    if (!state.paused) return;
    state.paused = false;
    state.lastTime = performance.now();
    hideOverlay();
  }

  function restartGameWithConfirm() {
    if (!window.confirm("Restart this Sumo match?")) return;
    restartGame();
  }

  function restartGame() {
    cancelAnimationFrame(raf);
    resultSaved = false;
    state = initialState();
    resizeCanvas();
    resetRound();
    hideOverlay();
    updateHud();
    startGame();
  }

  function showOverlay(title, message, results) {
    const node = root.querySelector("#sumoOverlay");
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

  function hideOverlay() {
    const node = root.querySelector("#sumoOverlay");
    if (!node) return;
    node.classList.remove("is-visible");
    node.innerHTML = "";
  }

  function createText(tag, text) {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  }

  function playerName(id) {
    return id === 1 ? options.player1 : opponentName();
  }

  function opponentName() {
    return options.mode === "solo" ? "Computer" : options.player2;
  }

  function distance(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function destroyGame() {
    cancelAnimationFrame(raf);
    keys.clear();
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("keyup", handleKeyup);
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
