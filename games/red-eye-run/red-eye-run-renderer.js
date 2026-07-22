import { COURSE, velocityLabel } from "./red-eye-run-physics.js";
import { watchkeeperSignal } from "./red-eye-run-watchkeeper.js";

export function createRedEyeRenderer() {
  const clouds = Array.from({ length: 36 }, (_, index) => ({
    x: (index * 211) % 1100 - 140,
    y: (index * 347) % 2800,
    r: 28 + (index % 5) * 9,
  }));

  function draw(ctx, canvas, state, time = 0) {
    if (!state.race) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateCamera(canvas, state);
    drawSky(ctx, canvas, state, time);
    withCamera(ctx, canvas, state, () => {
      drawRunway(ctx, state, time);
      drawContestants(ctx, state, time);
      drawWatchkeeper(ctx, state, time);
      drawEffects(ctx, state);
    });
    drawHud(ctx, canvas, state);
  }

  function updateCamera(canvas, state) {
    const player = state.race.contestants.find((item) => item.isPlayer);
    if (!player) return;
    const speed = Math.hypot(player.vx, player.vy);
    const targetY = player.y - 250 - Math.min(110, speed * 0.22);
    state.camera.x += (COURSE.width / 2 - state.camera.x) * 0.06;
    state.camera.y += (targetY - state.camera.y) * 0.08;
    state.camera.scale = Math.max(0.56, Math.min(0.9, canvas.width / 1040));
  }

  function withCamera(ctx, canvas, state, fn) {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height * 0.7);
    ctx.scale(state.camera.scale, state.camera.scale);
    ctx.translate(-state.camera.x, -state.camera.y);
    fn();
    ctx.restore();
  }

  function drawSky(ctx, canvas, state, time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#d9f6ff");
    gradient.addColorStop(0.65, "#f6fbff");
    gradient.addColorStop(1, "#fff3ce");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (const cloud of clouds) {
      const x = ((cloud.x + Math.sin(time / 1800 + cloud.r) * 16) % (canvas.width + 220)) - 110;
      const y = ((cloud.y - state.camera.y * 0.16) % (canvas.height + 130)) - 70;
      drawCloud(ctx, x, y, cloud.r);
    }
    ctx.restore();
  }

  function drawCloud(ctx, x, y, r) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.45, r * 0.56, 0, 0, Math.PI * 2);
    ctx.ellipse(x + r * 0.62, y - 2, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.ellipse(x - r * 0.58, y + 4, r * 0.9, r * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRunway(ctx, state, time) {
    const race = state.race;
    const signal = watchkeeperSignal(race.watchkeeper);
    const lightColor = signal === "RED" ? "#ef3f55" : signal === "WARNING" ? "#ffd35a" : "#2fb36d";
    ctx.fillStyle = "rgba(24, 104, 132, 0.15)";
    ctx.fillRect(-120, COURSE.finishY - 240, COURSE.width + 240, COURSE.startY + 540);
    roundedRect(ctx, 0, COURSE.finishY - 60, COURSE.width, COURSE.startY - COURSE.finishY + 250, 28);
    ctx.fillStyle = "#e9f7fb";
    ctx.fill();
    ctx.strokeStyle = "#6fc9dc";
    ctx.lineWidth = 7;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    for (let y = COURSE.finishY + 160; y < COURSE.startY; y += 220) {
      ctx.fillRect(COURSE.width / 2 - 8, y, 16, 84);
      ctx.fillStyle = "#7898a3";
      ctx.font = "800 24px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.max(0, Math.round((COURSE.startY - y) / 10))}m`, COURSE.width - 75, y + 45);
      ctx.fillStyle = "rgba(255,255,255,0.72)";
    }

    drawLine(ctx, COURSE.startY, "#132035", "START");
    drawLine(ctx, COURSE.finishY, "#2fb8a2", "BOARDING ARCH");
    drawBoardingArch(ctx, COURSE.width / 2, COURSE.finishY - 40, lightColor);

    for (let y = COURSE.finishY + 60; y < COURSE.startY + 80; y += 96) {
      const pulse = state.reduceMotion ? 0.7 : 0.5 + Math.sin(time / 180 + y) * 0.18;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = lightColor;
      ctx.beginPath();
      ctx.arc(34, y, 8, 0, Math.PI * 2);
      ctx.arc(COURSE.width - 34, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    roundedRect(ctx, COURSE.spectatorX - 34, 360, 112, 720, 18);
    ctx.fillStyle = "rgba(255,255,255,0.64)";
    ctx.fill();
    ctx.strokeStyle = "#c7dce4";
    ctx.stroke();
    ctx.fillStyle = "#132035";
    ctx.font = "900 20px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Spectator Zone", COURSE.spectatorX + 22, 336);
  }

  function drawLine(ctx, y, color, label) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(44, y);
    ctx.lineTo(COURSE.width - 44, y);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "900 25px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(label, COURSE.width / 2, y + 35);
  }

  function drawBoardingArch(ctx, x, y, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(x - 300, y + 78);
    ctx.lineTo(x - 300, y + 10);
    ctx.quadraticCurveTo(x, y - 98, x + 300, y + 10);
    ctx.lineTo(x + 300, y + 78);
    ctx.stroke();
    ctx.fillStyle = "#132035";
    ctx.font = "900 24px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("SAFE FINISH", x, y - 18);
    ctx.restore();
  }

  function drawWatchkeeper(ctx, state, time) {
    const watch = state.race.watchkeeper;
    const x = COURSE.width / 2;
    const y = COURSE.finishY - 185;
    ctx.save();
    roundedRect(ctx, x - 138, y + 92, 276, 58, 18);
    ctx.fillStyle = "#264b60";
    ctx.fill();
    ctx.strokeStyle = "#ffd35a";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.translate(x, y + 58);
    ctx.rotate(Math.sin(watch.rotation) * 0.05);
    drawRobotBody(ctx, watch, time);
    ctx.restore();
  }

  function drawRobotBody(ctx, watch, time) {
    const red = watch.phase === "red";
    const warning = watch.phase === "warning";
    ctx.fillStyle = "#f7fbff";
    roundedRect(ctx, -52, -20, 104, 92, 24);
    ctx.fill();
    ctx.strokeStyle = "#46c7d9";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "#ffd35a";
    ctx.fillRect(-44, -52, 88, 18);
    ctx.fillStyle = "#2fb8a2";
    ctx.beginPath();
    ctx.arc(0, -68, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, -70, 43, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = red ? "#ef3f55" : warning ? "#ffd35a" : "#8fdc98";
    const glow = red && Math.sin(time / 120) > -0.2 ? 7 : 0;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = glow;
    ctx.beginPath();
    ctx.arc(-18, -70, 9, 0, Math.PI * 2);
    ctx.arc(18, -70, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#132035";
    ctx.font = "900 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("WATCHKEEPER", 0, 16);
    ctx.strokeStyle = "#ff8a3d";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-52, 20);
    ctx.lineTo(-84, 38);
    ctx.moveTo(52, 20);
    ctx.lineTo(84, 38);
    ctx.stroke();
  }

  function drawContestants(ctx, state, time) {
    const contestants = [...state.race.contestants].sort((a, b) => a.y - b.y);
    for (const contestant of contestants) drawContestant(ctx, contestant, time);
  }

  function drawContestant(ctx, contestant, time) {
    ctx.save();
    ctx.translate(contestant.x, contestant.y);
    ctx.rotate(contestant.bodyAngle);
    ctx.globalAlpha = contestant.eliminated ? 0.46 : 1;
    const squash = contestant.state === "diving" ? 0.52 : contestant.state === "standing" ? 0.75 : 1;
    ctx.scale(1, squash);
    ctx.fillStyle = contestant.eliminated ? "rgba(80, 205, 230, 0.24)" : contestant.color;
    ctx.strokeStyle = contestant.isPlayer ? "#132035" : contestant.accent;
    ctx.lineWidth = contestant.isPlayer ? 5 : 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-7, -7, 4, 0, Math.PI * 2);
    ctx.arc(7, -7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = contestant.accent;
    ctx.lineWidth = 4;
    if (contestant.accessory?.includes("cap") || contestant.accessory === "pilot cap") {
      ctx.beginPath();
      ctx.arc(0, -24, 16, Math.PI, 0);
      ctx.stroke();
    } else if (contestant.accessory === "scarf") {
      ctx.beginPath();
      ctx.moveTo(14, 6);
      ctx.lineTo(34, 18 + Math.sin(time / 130) * 4);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-18, -22);
      ctx.lineTo(18, -22);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = contestant.isPlayer ? "#132035" : "rgba(19,32,53,0.72)";
    ctx.font = contestant.isPlayer ? "900 15px system-ui" : "800 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(contestant.name, contestant.x, contestant.y + 42);
  }

  function drawEffects(ctx, state) {
    const watch = state.race.watchkeeper;
    if (watch.phase === "red") {
      const x = COURSE.width / 2;
      const y = COURSE.finishY - 92;
      const sweep = 70 + watch.scanSweep * (COURSE.startY - COURSE.finishY);
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#ef3f55";
      ctx.beginPath();
      ctx.moveTo(x - 36, y);
      ctx.lineTo(58, COURSE.finishY + sweep);
      ctx.lineTo(COURSE.width - 58, COURSE.finishY + sweep + 80);
      ctx.lineTo(x + 36, y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    for (const effect of state.race.effects) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, effect.life);
      ctx.strokeStyle = effect.color || "#ef3f55";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 30 + (1 - effect.life) * 48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawHud(ctx, canvas, state) {
    const race = state.race;
    const player = race.contestants.find((item) => item.isPlayer);
    const signal = watchkeeperSignal(race.watchkeeper);
    const signalColor = signal === "RED" ? "#ef3f55" : signal === "WARNING" ? "#ffd35a" : "#2fb36d";
    const remaining = race.contestants.filter((item) => !item.eliminated && !item.qualified).length;
    const qualified = race.finishers.length;
    hudPanel(ctx, 16, 14, 250, 92, [
      `Position ${ordinal(race.position)}`,
      `Remaining ${remaining}`,
      `Qualified ${qualified}/${race.qualifyLimit}`,
    ]);
    ctx.save();
    roundedRect(ctx, canvas.width / 2 - 165, 14, 330, 74, 18);
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fill();
    ctx.strokeStyle = signalColor;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = signalColor;
    ctx.font = "950 32px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(signal, canvas.width / 2, 48);
    ctx.fillStyle = "#132035";
    ctx.font = "800 14px system-ui";
    const countdown = race.countdownOn ? ` | ${formatTime(race.timeLeft)}` : "";
    ctx.fillText(`${race.watchkeeper.message}${countdown}`, canvas.width / 2, 70);
    ctx.restore();
    hudPanel(ctx, canvas.width - 238, 14, 222, 92, [
      `Red phases ${race.redPhasesSurvived}`,
      `Freezes ${player.successfulFreezes}`,
      `Mode ${race.mode === "champion" ? "First Place" : "Qualification"}`,
    ]);
    hudPanel(ctx, 16, canvas.height - 96, 285, 76, [
      "Move W/A/S/D or Arrows",
      "Shift sprint | Space dive-freeze",
    ]);
    hudPanel(ctx, canvas.width - 278, canvas.height - 96, 262, 76, [
      `Dive ${player.diveCooldown > 0 ? `${player.diveCooldown.toFixed(1)}s` : "Ready"}`,
      `Velocity ${velocityLabel(player, race.watchkeeper.config)}`,
    ]);
  }

  function hudPanel(ctx, x, y, width, height, lines) {
    ctx.save();
    roundedRect(ctx, x, y, width, height, 14);
    ctx.fillStyle = "rgba(255,255,255,0.86)";
    ctx.fill();
    ctx.strokeStyle = "rgba(19,32,53,0.12)";
    ctx.stroke();
    ctx.fillStyle = "#132035";
    ctx.font = "850 14px system-ui";
    ctx.textAlign = "left";
    lines.forEach((line, index) => ctx.fillText(line, x + 14, y + 26 + index * 24));
    ctx.restore();
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
  }

  function ordinal(value) {
    const number = Number(value);
    const suffix = number % 10 === 1 && number % 100 !== 11 ? "st" : number % 10 === 2 && number % 100 !== 12 ? "nd" : number % 10 === 3 && number % 100 !== 13 ? "rd" : "th";
    return `${number}${suffix}`;
  }

  return { draw };
}
