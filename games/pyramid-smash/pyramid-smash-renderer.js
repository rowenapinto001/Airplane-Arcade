import { getBallType } from "./pyramid-smash-balls.js";
import { OBJECT_TYPES } from "./pyramid-smash-levels.js";
import { requiredRemaining, WORLD_HEIGHT, WORLD_WIDTH } from "./pyramid-smash-physics.js";

function rounded(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawStar(ctx, x, y, radius, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const size = i % 2 ? radius * 0.45 : radius;
    ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

export function createPyramidRenderer() {
  return {
    draw(ctx, canvas, state, time = performance.now()) {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.save();
      ctx.setTransform(width / WORLD_WIDTH, 0, 0, height / WORLD_HEIGHT, 0, 0);
      drawBackground(ctx, state, time);
      if (state.run?.world) {
        drawWorld(ctx, state, time);
      }
      ctx.restore();
    },
  };
}

function drawBackground(ctx, state, time) {
  const world = state.run?.world;
  const level = world?.level;
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  if (level?.environment === "Night Airport" || level?.environment === "Moon Cargo Station" || level?.id >= 20) {
    gradient.addColorStop(0, "#17233a");
    gradient.addColorStop(0.48, "#34587c");
    gradient.addColorStop(1, "#d9edf0");
  } else {
    gradient.addColorStop(0, "#a8e8ff");
    gradient.addColorStop(0.52, "#e8f8ff");
    gradient.addColorStop(1, "#fff1c5");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.globalAlpha = 0.72;
  for (let i = 0; i < 8; i += 1) {
    const x = ((i * 170 + time * 0.012) % 1280) - 120;
    const y = 52 + (i % 3) * 55;
    drawCloud(ctx, x, y, 1 + (i % 2) * 0.25);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(19, 32, 53, 0.08)";
  ctx.fillRect(0, 545, WORLD_WIDTH, 80);
  for (let x = 20; x < WORLD_WIDTH; x += 86) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillRect(x, 566, 46, 8);
  }
  ctx.fillStyle = "rgba(19, 32, 53, 0.55)";
  ctx.font = "900 18px system-ui, sans-serif";
  ctx.fillText(level?.environment || "Airport Cargo Yard", 34, 40);
}

function drawCloud(ctx, x, y, scale) {
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 42 * scale, 22 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 32 * scale, y + 8, 32 * scale, 24 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 32 * scale, y + 12, 25 * scale, 19 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawWorld(ctx, state, time) {
  const { world } = state.run;
  drawLauncher(ctx, state);
  drawAim(ctx, state);
  drawPlatforms(ctx, world);
  drawBarriers(ctx, world);
  drawObjects(ctx, world);
  drawBalls(ctx, world);
  drawEffects(ctx, world, time);
  drawHud(ctx, state);
}

function drawLauncher(ctx, state) {
  const { world } = state.run;
  const { x, y } = world.launcher;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(19, 32, 53, 0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 36, 56, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#132035";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, 42, Math.PI * 0.2, Math.PI * 1.8);
  ctx.stroke();
  ctx.fillStyle = "#ff8a3d";
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd35a";
  ctx.fillRect(-12, -54, 24, 34);
  ctx.strokeStyle = "#132035";
  ctx.lineWidth = 4;
  ctx.strokeRect(-12, -54, 24, 34);
  ctx.restore();
}

function drawAim(ctx, state) {
  const run = state.run;
  if (!run || !["aiming", "charging"].includes(run.phase)) return;
  const ballType = getBallType(run.inventory[run.selectedBallIndex] || "standard");
  const { x, y } = run.world.launcher;
  const power = run.charging ? run.chargePower : run.power;
  const length = 80 + power * 140;
  const endX = x + Math.cos(run.aimAngle) * length;
  const endY = y + Math.sin(run.aimAngle) * length;
  ctx.save();
  ctx.strokeStyle = ballType.color;
  ctx.lineWidth = 6;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);
  drawTrajectory(ctx, run, ballType, power);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#132035";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(endX, endY, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawTrajectory(ctx, run, ballType, power) {
  const speed = 320 + Math.max(0.12, Math.min(1, power)) * 570;
  let x = run.world.launcher.x;
  let y = run.world.launcher.y;
  let vx = Math.cos(run.aimAngle) * speed;
  let vy = Math.sin(run.aimAngle) * speed;
  ctx.fillStyle = "rgba(19, 32, 53, 0.28)";
  for (let i = 0; i < 22; i += 1) {
    vx += (run.world.wind || 0) * (ballType.windScale || 1) * 0.055;
    vy += 880 * 0.055;
    x += vx * 0.055;
    y += vy * 0.055;
    if (i % 2 === 0) {
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (y > 560 || x > WORLD_WIDTH) break;
  }
}

function drawPlatforms(ctx, world) {
  for (const platform of world.platforms) {
    ctx.save();
    ctx.translate(platform.x, platform.y + platform.h / 2);
    ctx.rotate(platform.tilt || 0);
    ctx.fillStyle = "rgba(19, 32, 53, 0.18)";
    rounded(ctx, -platform.w / 2 + 8, 8, platform.w, platform.h, 8);
    ctx.fill();
    const gradient = ctx.createLinearGradient(0, -platform.h / 2, 0, platform.h / 2);
    gradient.addColorStop(0, "#70533d");
    gradient.addColorStop(1, "#4f3829");
    ctx.fillStyle = gradient;
    rounded(ctx, -platform.w / 2, -platform.h / 2, platform.w, platform.h, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    for (let x = -platform.w / 2 + 20; x < platform.w / 2 - 30; x += 64) {
      ctx.fillRect(x, -6, 38, 6);
    }
    if (platform.kind === "moving" || platform.kind === "rotating" || platform.kind === "tilting") {
      ctx.strokeStyle = "#ffd35a";
      ctx.lineWidth = 3;
      ctx.strokeRect(-platform.w / 2 + 6, -platform.h / 2 + 6, platform.w - 12, platform.h - 12);
    }
    ctx.restore();
  }
}

function drawBarriers(ctx, world) {
  for (const barrier of world.barriers) {
    ctx.save();
    ctx.translate(barrier.x, barrier.y);
    ctx.fillStyle = "#132035";
    rounded(ctx, -barrier.w / 2, -barrier.h / 2, barrier.w, barrier.h, 7);
    ctx.fill();
    ctx.fillStyle = "#ffd35a";
    for (let y = -barrier.h / 2 + 10; y < barrier.h / 2 - 8; y += 22) {
      ctx.fillRect(-barrier.w / 2 + 5, y, barrier.w - 10, 7);
    }
    ctx.restore();
  }
}

function drawObjects(ctx, world) {
  const objects = [...world.objects].sort((a, b) => a.y - b.y);
  for (const object of objects) {
    if (object.removed) continue;
    const config = object.config || OBJECT_TYPES[object.type] || OBJECT_TYPES.normal;
    ctx.save();
    ctx.translate(object.x, object.y);
    ctx.rotate(object.angle);
    ctx.fillStyle = "rgba(19, 32, 53, 0.18)";
    rounded(ctx, -object.w / 2 + 5, -object.h / 2 + 7, object.w, object.h, 7);
    ctx.fill();
    ctx.fillStyle = object.hitFlash > 0 ? "#ffffff" : config.color;
    rounded(ctx, -object.w / 2, -object.h / 2, object.w, object.h, 7);
    ctx.fill();
    ctx.strokeStyle = config.accent;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = config.accent;
    if (object.type === "heavy") drawHeavyMark(ctx, object);
    else if (object.type === "ice") drawIceMark(ctx, object);
    else if (object.type === "spring") drawSpringMark(ctx, object);
    else if (object.type === "glass") drawGlassMark(ctx, object);
    else if (object.type === "bonus") drawStar(ctx, 0, 0, Math.min(object.w, object.h) * 0.27, config.accent);
    else if (object.type === "locked") drawLockMark(ctx, object);
    else if (object.type === "moving") drawMovingMark(ctx, object);
    else if (object.type === "balloon") drawBalloonMark(ctx, object);
    else {
      ctx.fillRect(-object.w / 2 + 8, -4, object.w - 16, 8);
      ctx.fillRect(-4, -object.h / 2 + 8, 8, object.h - 16);
    }
    ctx.restore();
  }
}

function drawHeavyMark(ctx, object) {
  ctx.fillRect(-object.w / 2 + 9, -object.h / 2 + 10, object.w - 18, 7);
  ctx.fillRect(-object.w / 2 + 9, 3, object.w - 18, 7);
}

function drawIceMark(ctx, object) {
  ctx.beginPath();
  ctx.moveTo(-object.w * 0.28, object.h * 0.22);
  ctx.lineTo(object.w * 0.22, -object.h * 0.28);
  ctx.lineTo(object.w * 0.32, -object.h * 0.06);
  ctx.lineTo(-object.w * 0.08, object.h * 0.3);
  ctx.closePath();
  ctx.fill();
}

function drawSpringMark(ctx, object) {
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#fff2b6";
  ctx.beginPath();
  for (let x = -object.w * 0.28; x <= object.w * 0.28; x += 8) {
    const y = Math.sin((x + object.w * 0.28) * 0.55) * 10;
    if (x === -object.w * 0.28) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawGlassMark(ctx, object) {
  ctx.strokeStyle = "#7f59e8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-object.w * 0.22, object.h * 0.25);
  ctx.lineTo(-object.w * 0.04, -object.h * 0.04);
  ctx.lineTo(object.w * 0.16, object.h * 0.06);
  ctx.lineTo(object.w * 0.3, -object.h * 0.25);
  ctx.stroke();
}

function drawLockMark(ctx, object) {
  ctx.strokeStyle = "#ffd35a";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, -4, object.w * 0.2, Math.PI, Math.PI * 2);
  ctx.stroke();
  rounded(ctx, -object.w * 0.22, -2, object.w * 0.44, object.h * 0.32, 5);
  ctx.fill();
}

function drawMovingMark(ctx, object) {
  ctx.beginPath();
  ctx.moveTo(-object.w * 0.22, 0);
  ctx.lineTo(object.w * 0.08, -object.h * 0.18);
  ctx.lineTo(object.w * 0.08, object.h * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(object.w * 0.08, -3, object.w * 0.18, 6);
}

function drawBalloonMark(ctx, object) {
  ctx.beginPath();
  ctx.ellipse(0, -4, object.w * 0.21, object.h * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = object.config.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, object.h * 0.15);
  ctx.lineTo(0, object.h * 0.34);
  ctx.stroke();
}

function drawBalls(ctx, world) {
  for (const ball of world.balls) {
    if (!ball.active) continue;
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.spin);
    ctx.fillStyle = "rgba(19, 32, 53, 0.18)";
    ctx.beginPath();
    ctx.ellipse(4, 7, ball.radius * 0.95, ball.radius * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ball.accent;
    ctx.lineWidth = Math.max(3, ball.radius * 0.18);
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius * 0.62, -0.5, 2.1);
    ctx.stroke();
    if (ball.split && !ball.splitDone) {
      ctx.fillStyle = ball.accent;
      ctx.fillRect(-2, -ball.radius * 0.72, 4, ball.radius * 1.44);
    }
    ctx.restore();
  }
}

function drawEffects(ctx, world, time) {
  for (const effect of world.effects) {
    const t = effect.age / effect.life;
    const alpha = Math.max(0, 1 - t);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (effect.kind === "bonus") {
      drawStar(ctx, effect.x, effect.y - t * 44, 20 + t * 6, "#ffd35a");
    } else if (effect.kind === "spring") {
      ctx.strokeStyle = "#ff8a3d";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 24 + t * 70, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = effect.color || "#ffffff";
      for (let i = 0; i < 8; i += 1) {
        const angle = i * Math.PI * 0.25 + time * 0.001;
        const distance = 12 + t * 42 * (effect.power || 1);
        ctx.beginPath();
        ctx.arc(effect.x + Math.cos(angle) * distance, effect.y + Math.sin(angle) * distance, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

function drawHud(ctx, state) {
  const run = state.run;
  const world = run.world;
  drawPanel(ctx, 22, 78, 238, 116);
  ctx.fillStyle = "#132035";
  ctx.font = "900 18px system-ui, sans-serif";
  ctx.fillText(`Level ${world.level.id}: ${world.level.name}`, 42, 112);
  ctx.font = "800 14px system-ui, sans-serif";
  ctx.fillText(`Targets left ${requiredRemaining(world)} / ${world.totalRequired}`, 42, 139);
  ctx.fillText(`Shots ${run.shots} / ${world.level.maxShots}`, 42, 164);
  ctx.fillText(`Ball ${run.inventory.length ? getBallType(run.inventory[run.selectedBallIndex]).name : "None"}`, 42, 187);

  drawPanel(ctx, WORLD_WIDTH - 276, 78, 248, 116);
  const stars = run.previewStars || 0;
  ctx.fillStyle = "#132035";
  ctx.font = "900 16px system-ui, sans-serif";
  ctx.fillText("Star Goals", WORLD_WIDTH - 252, 111);
  ctx.font = "800 13px system-ui, sans-serif";
  ctx.fillText(`3 stars: ${world.level.starShots.three} shots`, WORLD_WIDTH - 252, 137);
  ctx.fillText(`2 stars: ${world.level.starShots.two} shots`, WORLD_WIDTH - 252, 160);
  ctx.fillText(`1 star: finish by ${world.level.maxShots}`, WORLD_WIDTH - 252, 183);
  for (let i = 0; i < 3; i += 1) {
    drawStar(ctx, WORLD_WIDTH - 74 + i * 20, 105, 8, i < stars ? "#ffd35a" : "rgba(19,32,53,0.2)");
  }

  if (world.wind) {
    drawPanel(ctx, 434, 18, 230, 44);
    ctx.fillStyle = "#132035";
    ctx.font = "900 15px system-ui, sans-serif";
    ctx.fillText(`Wind ${world.wind > 0 ? ">" : "<"} ${Math.abs(world.wind)}`, 456, 47);
  }

  if (run.phase === "charging") {
    drawPower(ctx, run.chargePower);
  } else if (run.phase === "aiming") {
    drawPower(ctx, run.power);
  }
}

function drawPanel(ctx, x, y, w, h) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  rounded(ctx, x, y, w, h, 8);
  ctx.fill();
}

function drawPower(ctx, power) {
  drawPanel(ctx, 430, WORLD_HEIGHT - 76, 250, 38);
  ctx.fillStyle = "rgba(19, 32, 53, 0.14)";
  rounded(ctx, 452, WORLD_HEIGHT - 62, 206, 12, 8);
  ctx.fill();
  const gradient = ctx.createLinearGradient(452, 0, 658, 0);
  gradient.addColorStop(0, "#2fb36d");
  gradient.addColorStop(0.55, "#ffd35a");
  gradient.addColorStop(1, "#ef5b63");
  ctx.fillStyle = gradient;
  rounded(ctx, 452, WORLD_HEIGHT - 62, 206 * Math.max(0.04, power), 12, 8);
  ctx.fill();
  ctx.fillStyle = "#132035";
  ctx.font = "900 13px system-ui, sans-serif";
  ctx.fillText("POWER", 452, WORLD_HEIGHT - 44);
}
