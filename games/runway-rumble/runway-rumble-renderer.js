import { centeredRect, platformRects } from "./runway-rumble-physics.js";

export function createRunwayRenderer() {
  const clouds = Array.from({ length: 42 }, (_, index) => ({
    x: (index * 193) % 1200 - 100,
    y: (index * 311) % 3200,
    r: 34 + (index % 5) * 12,
    a: 0.22 + (index % 4) * 0.04,
  }));

  function draw(ctx, canvas, state, time = 0) {
    const course = state.course;
    if (!course) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateCamera(canvas, state, time);
    drawSky(ctx, canvas, state, time);
    withCamera(ctx, canvas, state, () => {
      drawCourseBase(ctx, course, state);
      drawCheckpoints(ctx, course, state);
      drawObstacles(ctx, course, state, time);
      drawFinish(ctx, course, state, time);
      drawParticles(ctx, state);
      drawContestants(ctx, state, time);
    });
    drawVignette(ctx, canvas, state);
  }

  function updateCamera(canvas, state) {
    const player = state.contestants.find((contestant) => contestant.isPlayer) || state.contestants[0];
    if (!player) return;
    const speed = Math.hypot(player.vx, player.vy);
    const pullback = Math.min(95, speed * 0.25);
    const targetX = player.x;
    const targetY = player.y - 95 - pullback;
    if (!state.camera.ready) {
      state.camera.x = targetX;
      state.camera.y = targetY;
      state.camera.ready = true;
    }
    state.camera.x += (targetX - state.camera.x) * 0.09;
    state.camera.y += (targetY - state.camera.y) * 0.09;
    state.camera.scale = Math.max(0.74, Math.min(1.05, canvas.width / 1150));
  }

  function withCamera(ctx, canvas, state, drawFn) {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height * 0.62);
    ctx.scale(state.camera.scale, state.camera.scale);
    ctx.rotate(state.camera.angle);
    ctx.translate(-state.camera.x, -state.camera.y);
    drawFn();
    ctx.restore();
  }

  function drawSky(ctx, canvas, state, time) {
    const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grd.addColorStop(0, "#dff8ff");
    grd.addColorStop(0.62, "#f6fbff");
    grd.addColorStop(1, "#fff4d7");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalAlpha = state.reduceMotion ? 0.22 : 0.32;
    for (const cloud of clouds) {
      const sx = ((cloud.x + Math.sin(time / 1700 + cloud.r) * 18) % (canvas.width + 160)) - 80;
      const sy = ((cloud.y - state.camera.y * 0.12) % (canvas.height + 120)) - 60;
      drawCloud(ctx, sx, sy, cloud.r, cloud.a);
    }
    ctx.restore();
  }

  function drawCloud(ctx, x, y, radius, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 1.3, radius * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(x + radius * 0.65, y + 4, radius, radius * 0.48, 0, 0, Math.PI * 2);
    ctx.ellipse(x - radius * 0.55, y + 5, radius * 0.85, radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCourseBase(ctx, course, state) {
    ctx.save();
    ctx.fillStyle = "rgba(35, 113, 143, 0.12)";
    ctx.fillRect(0, 0, course.width, course.height);
    for (const platform of platformRects(course, state.obstacleStates)) drawPlatform(ctx, platform);
    for (const sign of course.signs || []) drawSign(ctx, sign.x, sign.y, sign.label);
    ctx.restore();
  }

  function drawPlatform(ctx, platform) {
    const color = platform.kind === "moving-wing"
      ? "#d8f2ff"
      : platform.kind === "safe"
        ? "#dff8ed"
        : platform.kind === "risky"
          ? "#ffece2"
          : platform.kind?.includes("cloud")
            ? "#f5fbff"
            : "#eef6f8";
    roundedRect(ctx, platform.x, platform.y, platform.w, platform.h, 26);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = platform.kind === "moving-wing" ? "#71cce1" : "#67c6d4";
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    for (let y = platform.y + 42; y < platform.y + platform.h - 20; y += 82) {
      ctx.beginPath();
      ctx.moveTo(platform.x + platform.w * 0.28, y);
      ctx.lineTo(platform.x + platform.w * 0.72, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCheckpoints(ctx, course, state) {
    for (const checkpoint of course.checkpoints) {
      const reached = state.contestants.find((contestant) => contestant.isPlayer)?.checkpointIndex > course.checkpoints.indexOf(checkpoint);
      const x = checkpoint.x - checkpoint.w / 2;
      const y = checkpoint.y - checkpoint.h / 2;
      ctx.save();
      ctx.fillStyle = reached ? "rgba(47, 179, 109, 0.24)" : "rgba(255, 211, 90, 0.28)";
      roundedRect(ctx, x, y, checkpoint.w, checkpoint.h, 18);
      ctx.fill();
      ctx.strokeStyle = reached ? "#2fb36d" : "#ffb447";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "#132035";
      ctx.font = "800 20px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(checkpoint.label, checkpoint.x, checkpoint.y - 24);
      ctx.restore();
    }
  }

  function drawFinish(ctx, course, state, time) {
    const finish = course.finish;
    if (course.final) {
      ctx.save();
      const pulse = state.reduceMotion ? 0 : Math.sin(time / 250) * 5;
      ctx.translate(finish.x, finish.y - 20 - pulse);
      ctx.fillStyle = "#ffd35a";
      ctx.strokeStyle = "#b86f1e";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-42, 10);
      ctx.lineTo(-24, -38);
      ctx.lineTo(0, -8);
      ctx.lineTo(24, -38);
      ctx.lineTo(42, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff7c5";
      ctx.beginPath();
      ctx.arc(0, -2, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawSign(ctx, finish.x, finish.y + 82, "Sky Crown");
      return;
    }
    ctx.save();
    ctx.strokeStyle = "#2fb8a2";
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(finish.x - 300, finish.y + 52);
    ctx.lineTo(finish.x - 300, finish.y - 26);
    ctx.quadraticCurveTo(finish.x, finish.y - 100, finish.x + 300, finish.y - 26);
    ctx.lineTo(finish.x + 300, finish.y + 52);
    ctx.stroke();
    ctx.fillStyle = "#132035";
    ctx.font = "900 30px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FINISH", finish.x, finish.y - 40);
    ctx.restore();
  }

  function drawObstacles(ctx, course, state, time) {
    for (const obstacle of course.obstacles) {
      const runtime = state.obstacleStates[obstacle.id] || obstacle;
      if (obstacle.type === "conveyor") drawConveyor(ctx, obstacle, time);
      if (obstacle.type === "closingGate") drawGate(ctx, obstacle, runtime);
      if (obstacle.type === "windTurbine") drawWind(ctx, obstacle, time);
      if (obstacle.type === "fogZone") drawFog(ctx, obstacle);
      if (obstacle.type === "slipperyCloud") drawSlippery(ctx, obstacle);
      if (obstacle.type === "jumpPad") drawJumpPad(ctx, obstacle);
      if (obstacle.type === "tiltingPlatform") drawTilt(ctx, obstacle, runtime);
      if (obstacle.type === "movingWing") drawMovingWingHint(ctx, obstacle, runtime);
      if (obstacle.type === "cargoCrusher") drawCrusher(ctx, obstacle, runtime);
      if (obstacle.type === "bouncingSuitcase") drawSuitcase(ctx, runtime.x, runtime.y, obstacle.radius || 34, "#ff8a3d", "BAG");
      if (obstacle.type === "rollingWheel") drawWheel(ctx, runtime.x, runtime.y, obstacle.radius || 42, time);
      if (obstacle.type === "rotatingBar") drawRotatingBar(ctx, obstacle, runtime);
    }
  }

  function drawConveyor(ctx, obstacle, time) {
    const rect = centeredRect(obstacle);
    ctx.save();
    roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 18);
    ctx.fillStyle = "#d8edf3";
    ctx.fill();
    ctx.strokeStyle = "#3aaec5";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "#197c93";
    const shift = (time / 18) % 58;
    for (let y = rect.y + 25 - shift; y < rect.y + rect.h + 58; y += 58) {
      drawArrow(ctx, obstacle.x, y, Math.atan2(obstacle.dirY, obstacle.dirX));
    }
    drawWarning(ctx, obstacle.x, rect.y - 14, obstacle.warning);
    ctx.restore();
  }

  function drawGate(ctx, obstacle, runtime) {
    const rect = centeredRect(obstacle);
    const open = runtime.open ? obstacle.w * 0.32 : obstacle.w * 0.08;
    ctx.save();
    ctx.fillStyle = runtime.open ? "rgba(47, 179, 109, 0.22)" : "rgba(239, 91, 99, 0.25)";
    roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 18);
    ctx.fill();
    ctx.fillStyle = "#f2bf4a";
    roundedRect(ctx, rect.x, rect.y, (rect.w - open) / 2, rect.h, 16);
    ctx.fill();
    roundedRect(ctx, rect.x + rect.w - (rect.w - open) / 2, rect.y, (rect.w - open) / 2, rect.h, 16);
    ctx.fill();
    drawWarning(ctx, obstacle.x, rect.y - 14, runtime.open ? "Gate open" : "Gate closing");
    ctx.restore();
  }

  function drawWind(ctx, obstacle, time) {
    const rect = centeredRect(obstacle);
    ctx.save();
    ctx.fillStyle = "rgba(70, 199, 217, 0.14)";
    roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 24);
    ctx.fill();
    ctx.strokeStyle = "rgba(58, 174, 197, 0.52)";
    ctx.lineWidth = 4;
    for (let i = 0; i < 7; i += 1) {
      const y = rect.y + 25 + i * (rect.h / 7);
      ctx.beginPath();
      ctx.moveTo(rect.x + 25, y + Math.sin(time / 230 + i) * 10);
      ctx.lineTo(rect.x + rect.w - 25, y + Math.cos(time / 240 + i) * 10);
      ctx.stroke();
    }
    ctx.fillStyle = "#3aaec5";
    ctx.beginPath();
    ctx.arc(obstacle.x, obstacle.y, 35, 0, Math.PI * 2);
    ctx.fill();
    drawWarning(ctx, obstacle.x, rect.y - 14, obstacle.warning);
    ctx.restore();
  }

  function drawFog(ctx, obstacle) {
    const rect = centeredRect(obstacle);
    ctx.save();
    ctx.globalAlpha = obstacle.opacity || 0.25;
    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 28);
    ctx.fill();
    ctx.restore();
  }

  function drawSlippery(ctx, obstacle) {
    const rect = centeredRect(obstacle);
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
    roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 24);
    ctx.fill();
    ctx.strokeStyle = "#b4d8ee";
    ctx.lineWidth = 4;
    ctx.stroke();
    drawWarning(ctx, obstacle.x, rect.y - 12, obstacle.warning);
    ctx.restore();
  }

  function drawJumpPad(ctx, obstacle) {
    const rect = centeredRect(obstacle);
    ctx.save();
    ctx.fillStyle = "#ffd35a";
    roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 20);
    ctx.fill();
    ctx.strokeStyle = "#ff8a3d";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "#132035";
    drawArrow(ctx, obstacle.x, obstacle.y, -Math.PI / 2);
    drawWarning(ctx, obstacle.x, rect.y - 14, obstacle.warning);
    ctx.restore();
  }

  function drawTilt(ctx, obstacle, runtime) {
    const rect = centeredRect(obstacle);
    ctx.save();
    ctx.translate(obstacle.x, obstacle.y);
    ctx.rotate((runtime.tiltX || 0) * 0.08);
    ctx.fillStyle = "rgba(127, 89, 232, 0.16)";
    roundedRect(ctx, -rect.w / 2, -rect.h / 2, rect.w, rect.h, 22);
    ctx.fill();
    ctx.strokeStyle = "#7f59e8";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    drawWarning(ctx, obstacle.x, rect.y - 14, obstacle.warning);
  }

  function drawMovingWingHint(ctx, obstacle, runtime) {
    ctx.save();
    ctx.strokeStyle = "rgba(19, 32, 53, 0.22)";
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(obstacle.x - (obstacle.axis === "x" ? obstacle.range : 0), obstacle.y - (obstacle.axis === "y" ? obstacle.range : 0));
    ctx.lineTo(obstacle.x + (obstacle.axis === "x" ? obstacle.range : 0), obstacle.y + (obstacle.axis === "y" ? obstacle.range : 0));
    ctx.stroke();
    ctx.setLineDash([]);
    drawWarning(ctx, runtime.x, runtime.y - obstacle.h / 2 - 12, obstacle.warning);
    ctx.restore();
  }

  function drawCrusher(ctx, obstacle, runtime) {
    ctx.save();
    ctx.fillStyle = "#ffb36a";
    roundedRect(ctx, runtime.x - obstacle.w / 2, runtime.y - obstacle.h / 2, obstacle.w, obstacle.h, 18);
    ctx.fill();
    ctx.strokeStyle = "#bd6b25";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "#7c471d";
    ctx.font = "900 20px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CARGO", runtime.x, runtime.y + 6);
    drawWarning(ctx, obstacle.x, obstacle.y - obstacle.h / 2 - 18, obstacle.warning);
    ctx.restore();
  }

  function drawRotatingBar(ctx, obstacle, runtime) {
    const angle = runtime.time * obstacle.speed;
    ctx.save();
    ctx.translate(obstacle.x, obstacle.y);
    ctx.rotate(angle);
    roundedRect(ctx, -obstacle.length / 2, -obstacle.width / 2, obstacle.length, obstacle.width, 15);
    ctx.fillStyle = "#ef5b63";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = "#132035";
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawWarning(ctx, obstacle.x, obstacle.y - obstacle.radius - 18, obstacle.warning);
  }

  function drawSuitcase(ctx, x, y, radius, color, label) {
    ctx.save();
    ctx.fillStyle = color;
    roundedRect(ctx, x - radius * 1.1, y - radius * 0.75, radius * 2.2, radius * 1.5, 12);
    ctx.fill();
    ctx.strokeStyle = "#132035";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#132035";
    ctx.font = "900 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x, y + 5);
    ctx.restore();
  }

  function drawWheel(ctx, x, y, radius, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time / 280);
    ctx.fillStyle = "#f6f7fb";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ff8a3d";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = "#46c7d9";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-radius, 0);
    ctx.lineTo(radius, 0);
    ctx.moveTo(0, -radius);
    ctx.lineTo(0, radius);
    ctx.stroke();
    ctx.restore();
  }

  function drawContestants(ctx, state, time) {
    const contestants = [...state.contestants].filter((contestant) => !contestant.eliminated || contestant.isPlayer).sort((a, b) => a.y - b.y);
    const labelBoxes = [];
    for (const contestant of contestants) drawContestant(ctx, contestant, state, time, labelBoxes);
  }

  function drawContestant(ctx, contestant, state, time, labelBoxes) {
    if (contestant.finished && state.phase === "playing") return;
    const bob = contestant.falling ? 0 : Math.sin(contestant.animationTime * 12) * Math.min(4, Math.hypot(contestant.vx, contestant.vy) / 65);
    const z = contestant.z + bob;
    ctx.save();
    ctx.globalAlpha = contestant.protection > 0 && Math.floor(time / 120) % 2 === 0 ? 0.7 : 1;
    ctx.fillStyle = "rgba(19, 32, 53, 0.2)";
    ctx.beginPath();
    ctx.ellipse(contestant.x, contestant.y + 22, contestant.radius * 1.05, contestant.radius * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(contestant.x, contestant.y - z);
    if (contestant.stumble > 0) ctx.rotate(Math.sin(time / 80 + contestant.id.length) * 0.12);
    ctx.lineWidth = contestant.isPlayer ? 6 : 3;
    ctx.strokeStyle = contestant.isPlayer ? "#ffffff" : "rgba(19, 32, 53, 0.28)";
    ctx.fillStyle = contestant.bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, -8, contestant.radius * 0.76, contestant.radius * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    drawLimbs(ctx, contestant, time);
    drawFace(ctx, contestant);
    drawAccessory(ctx, contestant);
    ctx.restore();

    if (contestant.isPlayer) {
      ctx.save();
      ctx.fillStyle = "#132035";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(contestant.x, contestant.y - z - 74);
      ctx.lineTo(contestant.x - 13, contestant.y - z - 48);
      ctx.lineTo(contestant.x + 13, contestant.y - z - 48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawName(ctx, contestant.x, contestant.y - z - 84, "YOU");
      labelBoxes.push({ x: contestant.x - 28, y: contestant.y - z - 101, w: 56, h: 20 });
      ctx.restore();
    } else if (state.phase !== "countdown") {
      const box = { x: contestant.x - 48, y: contestant.y - z - 66, w: 96, h: 18 };
      if (!labelBoxes.some((other) => boxesOverlap(box, other))) {
        drawName(ctx, contestant.x, contestant.y - z - 52, contestant.name);
        labelBoxes.push(box);
      }
    }
  }

  function boxesOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function drawLimbs(ctx, contestant, time) {
    const speed = Math.min(1, Math.hypot(contestant.vx, contestant.vy) / 180);
    const stride = Math.sin(time / 90 + contestant.id.length) * 8 * speed;
    ctx.strokeStyle = contestant.accent || "#132035";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-13, -6);
    ctx.lineTo(-26, 4 + stride);
    ctx.moveTo(13, -6);
    ctx.lineTo(26, 4 - stride);
    ctx.moveTo(-9, 18);
    ctx.lineTo(-18, 30 - stride);
    ctx.moveTo(9, 18);
    ctx.lineTo(18, 30 + stride);
    ctx.stroke();
  }

  function drawFace(ctx, contestant) {
    ctx.fillStyle = "#132035";
    ctx.beginPath();
    ctx.arc(-8, -18, 3, 0, Math.PI * 2);
    ctx.arc(8, -18, contestant.face === "wink" ? 1.5 : 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#132035";
    ctx.beginPath();
    if (contestant.face === "focus") {
      ctx.moveTo(-7, -6);
      ctx.lineTo(7, -6);
    } else {
      ctx.arc(0, -8, 10, 0.1, Math.PI - 0.1);
    }
    ctx.stroke();
  }

  function drawAccessory(ctx, contestant) {
    if (contestant.hat === "pilot" || contestant.accessory === "cap") {
      ctx.fillStyle = "#263142";
      roundedRect(ctx, -15, -38, 30, 12, 6);
      ctx.fill();
    }
    if (contestant.hat === "cloud") {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-8, -38, 9, 0, Math.PI * 2);
      ctx.arc(2, -43, 11, 0, Math.PI * 2);
      ctx.arc(12, -38, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = contestant.scarfColor || contestant.accent || "#ef5b63";
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(18, 0);
    ctx.lineTo(8, 10);
    ctx.closePath();
    ctx.fill();
  }

  function drawParticles(ctx, state) {
    for (const particle of state.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y - particle.z, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawName(ctx, x, y, name) {
    ctx.save();
    ctx.font = "900 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.94)";
    ctx.strokeText(name, x, y);
    ctx.fillStyle = "#132035";
    ctx.fillText(name, x, y);
    ctx.restore();
  }

  function drawWarning(ctx, x, y, text) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    roundedRect(ctx, x - 78, y - 16, 156, 30, 8);
    ctx.fill();
    ctx.fillStyle = "#516078";
    ctx.font = "800 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, x, y + 5);
    ctx.restore();
  }

  function drawSign(ctx, x, y, text) {
    ctx.save();
    ctx.fillStyle = "#132035";
    roundedRect(ctx, x - 82, y - 24, 164, 44, 8);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, x, y + 6);
    ctx.restore();
  }

  function drawArrow(ctx, x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-14, -12);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-14, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawVignette(ctx, canvas, state) {
    if (!state.fade) return;
    ctx.save();
    ctx.globalAlpha = state.fade;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
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

  return { draw };
}
