import { ABILITIES } from "./rally-vehicles.js";
import { terrainAt } from "./rally-terrain.js";
import { wheelPoint } from "./rally-physics.js";

export function createRallyRenderer() {
  function draw(ctx, canvas, state) {
    const { terrain, vehicleState } = state.run;
    const width = canvas.width;
    const height = canvas.height;
    const camera = state.run.camera;
    updateCamera(camera, vehicleState, width, height, state.settings.reduceMotion);
    drawSky(ctx, width, height, terrain, state.time);
    drawBackground(ctx, width, height, terrain, camera, state.time);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    drawTerrain(ctx, terrain, width, height, camera);
    drawCheckpoints(ctx, terrain);
    drawPickups(ctx, terrain, state.time);
    drawObstacles(ctx, terrain, state.time);
    drawVehicle(ctx, vehicleState, state.run.vehicle, state.time);
    drawStuntMessages(ctx, state.run, camera);
    ctx.restore();
    drawHud(ctx, width, height, state);
    if (state.run.crashTimer > 0) drawCrashFlash(ctx, width, height, state.run.crashTimer);
  }

  return { draw };
}

function updateCamera(camera, vehicle, width, height, reduceMotion) {
  const lookAhead = vehicle.vx >= 0 ? 240 : 90;
  const jumpPull = Math.min(0.18, vehicle.airtime * 0.08);
  const targetX = vehicle.x - width * (0.28 + jumpPull) + lookAhead;
  const targetY = vehicle.y - height * 0.58 - Math.min(90, Math.max(0, -vehicle.vy * 0.12));
  const ease = reduceMotion ? 0.24 : 0.08;
  camera.x += (targetX - camera.x) * ease;
  camera.y += (targetY - camera.y) * ease;
  camera.x = Math.max(-80, camera.x);
  camera.y = Math.max(-220, camera.y);
}

function drawSky(ctx, width, height, terrain, time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, terrain.environment.skyTop);
  gradient.addColorStop(1, terrain.environment.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  if (terrain.environment.id === "storm") {
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    for (let i = 0; i < 50; i += 1) {
      const x = (i * 77 + time * 120) % (width + 80) - 40;
      const y = (i * 43) % height;
      ctx.fillRect(x, y, 2, 18);
    }
  }
}

function drawBackground(ctx, width, height, terrain, camera, time) {
  for (let i = 0; i < 9; i += 1) {
    const x = ((i * 260 - camera.x * 0.25) % (width + 300)) - 120;
    const y = 80 + (i % 3) * 58 + Math.sin(time / 2200 + i) * 8;
    drawCloud(ctx, x, y, 52 + (i % 3) * 18);
  }
  const env = terrain.environment.id;
  if (env === "moon") {
    ctx.fillStyle = "#fff3a6";
    ctx.beginPath();
    ctx.arc(width - 160, 100, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.arc(width - 250, 165, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  if (env === "volcano") {
    ctx.fillStyle = "rgba(255,104,61,0.55)";
    ctx.fillRect(0, height - 64, width, 64);
  }
}

function drawCloud(ctx, x, y, size) {
  ctx.fillStyle = "rgba(255,255,255,0.76)";
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.18, size * 0.62, size * 0.25, 0, 0, Math.PI * 2);
  ctx.ellipse(x + size * 0.35, y, size * 0.42, size * 0.32, 0, 0, Math.PI * 2);
  ctx.ellipse(x - size * 0.28, y + 2, size * 0.38, size * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTerrain(ctx, terrain, width, height, camera) {
  const start = camera.x - 160;
  const end = camera.x + width + 220;
  ctx.save();
  ctx.beginPath();
  let started = false;
  for (let x = start; x <= end; x += 18) {
    const ground = terrainAt(terrain, x);
    if (!started) {
      ctx.moveTo(x, ground.y);
      started = true;
    } else {
      ctx.lineTo(x, ground.y);
    }
  }
  ctx.lineTo(end, camera.y + height + 260);
  ctx.lineTo(start, camera.y + height + 260);
  ctx.closePath();
  ctx.fillStyle = terrain.environment.ground;
  ctx.fill();
  ctx.strokeStyle = terrain.environment.groundDark;
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (let x = start; x <= end; x += 18) {
    const ground = terrainAt(terrain, x);
    if (x === start) ctx.moveTo(x, ground.y);
    else ctx.lineTo(x, ground.y);
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let x = Math.floor(start / 140) * 140; x < end; x += 140) {
    const ground = terrainAt(terrain, x);
    ctx.fillRect(x, ground.y + 14, 66, 7);
  }
  ctx.restore();
}

function drawPickups(ctx, terrain, time) {
  for (const pickup of terrain.pickups) {
    if (pickup.collected) continue;
    const bob = Math.sin(time / 300 + pickup.x * 0.02) * 5;
    ctx.save();
    ctx.translate(pickup.x, pickup.y + bob);
    if (pickup.type === "coin") drawCoin(ctx);
    else if (pickup.type === "fuel") drawFuel(ctx, pickup.size);
    else drawRare(ctx, pickup.type);
    ctx.restore();
  }
}

function drawCoin(ctx) {
  ctx.fillStyle = "#ffd35a";
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ff8a3d";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#fff8b7";
  ctx.fillRect(-3, -8, 6, 16);
}

function drawFuel(ctx, size) {
  const scale = size === "large" ? 1.25 : size === "medium" ? 1.05 : 0.9;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#46c7d9";
  ctx.beginPath();
  ctx.roundRect(-13, -18, 26, 36, 7);
  ctx.fill();
  ctx.fillStyle = "#dffaff";
  ctx.fillRect(-6, -22, 12, 7);
  ctx.fillStyle = "#2fb36d";
  ctx.beginPath();
  ctx.moveTo(-2, -8);
  ctx.lineTo(8, -8);
  ctx.lineTo(0, 12);
  ctx.lineTo(-8, 12);
  ctx.closePath();
  ctx.fill();
}

function drawRare(ctx, type) {
  ctx.fillStyle = type === "golden-propeller" ? "#ffd35a" : type === "boarding-star" ? "#7f59e8" : "#ef5b63";
  if (type === "golden-propeller") {
    for (let i = 0; i < 3; i += 1) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.ellipse(0, -9, 7, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#132035";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (type === "boarding-star") {
    starPath(ctx, 0, 0, 18, 8);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.roundRect(-15, -12, 30, 24, 5);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.strokeRect(-10, -7, 20, 14);
}

function drawObstacles(ctx, terrain, time) {
  for (const obstacle of terrain.obstacles) {
    const ground = terrainAt(terrain, obstacle.x);
    ctx.save();
    ctx.translate(obstacle.x, ground.y - obstacle.height / 2);
    if (obstacle.kind.includes("turbine")) ctx.rotate(Math.sin(time / 500 + obstacle.phase) * 0.12);
    ctx.fillStyle = obstacle.kind.includes("rock") || obstacle.kind.includes("crater") ? "#5c5154" : "#c7824f";
    if (obstacle.kind.includes("puddle")) {
      ctx.fillStyle = "rgba(70,199,217,0.55)";
      ctx.beginPath();
      ctx.ellipse(0, obstacle.height / 2, obstacle.width, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (obstacle.kind.includes("vent")) {
      ctx.fillStyle = "#ff8a3d";
      ctx.fillRect(-16, -36, 32, 72);
      ctx.fillStyle = "rgba(255,211,90,0.75)";
      ctx.beginPath();
      ctx.ellipse(0, -54 + Math.sin(time / 160) * 6, 22, 38, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.roundRect(-obstacle.width / 2, -obstacle.height / 2, obstacle.width, obstacle.height, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(19,32,53,0.25)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawCheckpoints(ctx, terrain) {
  for (const checkpoint of terrain.checkpoints) {
    const ground = terrainAt(terrain, checkpoint.x);
    ctx.fillStyle = checkpoint.reached ? "#2fb36d" : "#ffffff";
    ctx.fillRect(checkpoint.x - 4, ground.y - 116, 8, 116);
    ctx.fillStyle = checkpoint.reached ? "#dff8e8" : "#ffd35a";
    ctx.beginPath();
    ctx.moveTo(checkpoint.x + 4, ground.y - 114);
    ctx.lineTo(checkpoint.x + 58, ground.y - 96);
    ctx.lineTo(checkpoint.x + 4, ground.y - 78);
    ctx.closePath();
    ctx.fill();
  }
  if (terrain.finish) {
    const ground = terrainAt(terrain, terrain.finish.x);
    ctx.fillStyle = "#132035";
    ctx.fillRect(terrain.finish.x - 5, ground.y - 136, 10, 136);
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        ctx.fillStyle = (row + col) % 2 ? "#fff" : "#132035";
        ctx.fillRect(terrain.finish.x + col * 14, ground.y - 132 + row * 14, 14, 14);
      }
    }
  }
}

function drawVehicle(ctx, state, vehicle, time) {
  const rear = wheelPoint(state, -36);
  const front = wheelPoint(state, 42);
  ctx.save();
  ctx.strokeStyle = "rgba(19,32,53,0.34)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(rear.x, rear.y - 8);
  ctx.lineTo(state.x - 26, state.y + 8);
  ctx.moveTo(front.x, front.y - 8);
  ctx.lineTo(state.x + 30, state.y + 8);
  ctx.stroke();
  drawWheel(ctx, rear.x, rear.y, state.wheelSpin);
  drawWheel(ctx, front.x, front.y, state.wheelSpin);
  ctx.translate(state.x, state.y);
  ctx.rotate(state.angle);
  ctx.fillStyle = "rgba(19,32,53,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 44, 70, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = vehicle.color;
  ctx.beginPath();
  ctx.roundRect(-58, -28, 116, 50, 12);
  ctx.fill();
  ctx.fillStyle = vehicle.trim;
  ctx.beginPath();
  ctx.roundRect(-20, -48, 50, 30, 10);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillRect(-8, -42, 22, 18);
  if (vehicle.id.includes("propeller") || vehicle.ability === "turbo-propeller") {
    ctx.save();
    ctx.translate(68, -8);
    ctx.rotate(time / 80);
    ctx.fillStyle = "#132035";
    ctx.fillRect(-3, -22, 6, 44);
    ctx.fillRect(-22, -3, 44, 6);
    ctx.restore();
  }
  if (state.abilityTimer > 0) {
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 5;
    ctx.strokeRect(-64, -54, 132, 82);
  }
  ctx.restore();
}

function drawWheel(ctx, x, y, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.fillStyle = "#132035";
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.moveTo(-18, 0);
  ctx.lineTo(18, 0);
  ctx.moveTo(0, -18);
  ctx.lineTo(0, 18);
  ctx.stroke();
  ctx.restore();
}

function drawStuntMessages(ctx, run, camera) {
  const vehicle = run.vehicleState;
  let y = vehicle.y - 96;
  for (const message of run.messages.slice(0, 3)) {
    ctx.globalAlpha = Math.max(0, message.life / 1.5);
    ctx.fillStyle = "#132035";
    ctx.font = "950 22px system-ui";
    ctx.fillText(message.text, vehicle.x - 70, y);
    ctx.fillStyle = "#ffd35a";
    ctx.fillText(message.bonus ? `+${message.bonus}` : "", vehicle.x + 84, y);
    y -= 26;
  }
  ctx.globalAlpha = 1;
}

function drawHud(ctx, width, height, state) {
  const run = state.run;
  const vehicle = run.vehicleState;
  hudPanel(ctx, 16, 14, 232, 78, [
    `Distance ${Math.floor(Math.max(0, vehicle.distance - 120))}m`,
    run.mode === "campaign" ? run.level.name : `Endless ${run.terrain.environment.name}`,
    `Checkpoint ${run.checkpointIndex}/${run.terrain.checkpoints.length}`,
  ]);
  const fuelRatio = Math.max(0, vehicle.fuel / vehicle.maxFuel);
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.beginPath();
  ctx.roundRect(width / 2 - 154, 18, 308, 28, 14);
  ctx.fill();
  ctx.fillStyle = fuelRatio < 0.18 ? "#ef5b63" : "#2fb36d";
  ctx.beginPath();
  ctx.roundRect(width / 2 - 148, 24, 296 * fuelRatio, 16, 9);
  ctx.fill();
  ctx.fillStyle = "#132035";
  ctx.font = "900 13px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(fuelRatio < 0.18 ? "LOW FUEL" : "FUEL", width / 2, 39);
  ctx.textAlign = "left";
  hudPanel(ctx, width - 230, 14, 214, 78, [
    `Flight Coins ${run.coins}`,
    `Combo x${run.comboMultiplier.toFixed(1)}`,
    `Ability ${abilityLabel(run)}`,
  ]);
  ctx.fillStyle = "rgba(19,32,53,0.64)";
  ctx.font = "900 16px system-ui";
  ctx.fillText("Brake A / Left", 22, height - 26);
  ctx.fillText("D / Right Accelerate", width - 182, height - 26);
}

function abilityLabel(run) {
  const ability = ABILITIES[run.vehicle.ability];
  if (!ability) return "None";
  if (run.vehicleState.abilityTimer > 0) return `${ability.name} active`;
  if (run.vehicleState.abilityCooldown > 0) return `${Math.ceil(run.vehicleState.abilityCooldown)}s`;
  return ability.name;
}

function hudPanel(ctx, x, y, width, height, lines) {
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.fillStyle = "#132035";
  ctx.font = "900 14px system-ui";
  lines.forEach((line, index) => ctx.fillText(line, x + 12, y + 22 + index * 20));
}

function drawCrashFlash(ctx, width, height, timer) {
  ctx.fillStyle = `rgba(239,91,99,${Math.min(0.28, timer * 0.18)})`;
  ctx.fillRect(0, 0, width, height);
}

function starPath(ctx, x, y, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
