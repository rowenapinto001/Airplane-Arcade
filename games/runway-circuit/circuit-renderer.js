import { drawMiniMap } from "./circuit-minimap.js";
import { formatRaceTime, obstacleShape, ordinal, surfaceAt } from "./circuit-physics.js";
import { TOTAL_LAPS } from "./circuit-levels.js";

const WORLD_W = 1280;
const WORLD_H = 720;

export function createCircuitRenderer() {
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
      ctx.clearRect(0, 0, width, height);
      const scale = Math.min(width / WORLD_W, height / WORLD_H);
      ctx.translate((width - WORLD_W * scale) / 2, (height - WORLD_H * scale) / 2);
      ctx.scale(scale, scale);
      drawScene(ctx, state, state.reduceMotion ? 0 : time);
      ctx.restore();
    },
  };
}

function drawScene(ctx, state, time) {
  const race = state.race;
  if (!race) return;
  const player = race.player;
  const camera = cameraFor(player, state);
  drawBackground(ctx, race, state);
  ctx.save();
  ctx.translate(WORLD_W / 2, WORLD_H / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  drawTrack(ctx, race);
  drawDecorations(ctx, race, time);
  drawCheckpoints(ctx, race);
  drawObstacles(ctx, race);
  drawGhost(ctx, state);
  drawRacers(ctx, race);
  ctx.restore();
  drawHud(ctx, race, state);
}

function cameraFor(player, state) {
  const distance = state.cameraDistance || 1;
  const pullBack = player.boostActive ? 0.86 : 1;
  const look = 88 * distance;
  return {
    x: player.x + Math.cos(player.angle) * look,
    y: player.y + Math.sin(player.angle) * look,
    zoom: 0.88 * pullBack / distance,
  };
}

function drawBackground(ctx, race, state) {
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  gradient.addColorStop(0, race.level.sky || "#a8e8ff");
  gradient.addColorStop(1, race.level.ground || "#eaf7ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  for (let i = 0; i < 9; i += 1) {
    const cloudTime = state.reduceMotion ? 0 : race.time;
    const x = (i * 174 + cloudTime * 8) % (WORLD_W + 120) - 80;
    const y = 48 + (i % 4) * 68;
    cloud(ctx, x, y, 0.8 + (i % 3) * 0.12);
  }
}

function cloud(ctx, x, y, scale) {
  ctx.beginPath();
  ctx.ellipse(x, y + 15, 48 * scale, 22 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 35 * scale, y + 6, 34 * scale, 24 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 35 * scale, y + 12, 28 * scale, 19 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTrack(ctx, race) {
  const track = race.level;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(19, 32, 53, 0.16)";
  ctx.lineWidth = track.roadWidth + 26;
  pathTrack(ctx, track);
  ctx.stroke();
  ctx.strokeStyle = "#4e6170";
  ctx.lineWidth = track.roadWidth;
  pathTrack(ctx, track);
  ctx.stroke();
  ctx.strokeStyle = "#6f7d88";
  ctx.lineWidth = track.roadWidth - 18;
  pathTrack(ctx, track);
  ctx.stroke();
  ctx.setLineDash([34, 30]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
  ctx.lineWidth = 4;
  pathTrack(ctx, track);
  ctx.stroke();
  ctx.setLineDash([]);
  drawSurfaces(ctx, race);
  drawStartLine(ctx, track);
  drawDirectionArrows(ctx, track);
  ctx.restore();
}

function pathTrack(ctx, track) {
  ctx.beginPath();
  track.points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
}

function drawSurfaces(ctx, race) {
  for (const surface of race.level.surfaces) {
    const color = surface.type === "boost" ? "#ffd35a" : surface.type === "wet" ? "#46c7d9" : surface.type === "oil" ? "#182235" : surface.type === "cloud-gravel" ? "#dff8ff" : surface.type === "wind" ? "#b5fff1" : "#8aa0ae";
    const samples = 18;
    ctx.strokeStyle = color;
    ctx.globalAlpha = surface.type === "oil" ? 0.72 : 0.38;
    ctx.lineWidth = surface.type === "boost" ? race.level.roadWidth * 0.44 : race.level.roadWidth * 0.52;
    ctx.beginPath();
    for (let i = 0; i <= samples; i += 1) {
      const t = surface.from + (surface.to - surface.from) * (i / samples);
      const point = pointAt(race.level, t);
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawStartLine(ctx, track) {
  const start = track.start;
  ctx.save();
  ctx.translate(start.x, start.y);
  ctx.rotate(start.angle + Math.PI / 2);
  ctx.fillStyle = "#fff";
  for (let i = -4; i <= 3; i += 1) {
    ctx.fillRect(i * 12, -track.roadWidth / 2, 7, track.roadWidth);
  }
  ctx.strokeStyle = "#132035";
  ctx.lineWidth = 3;
  ctx.strokeRect(-54, -track.roadWidth / 2, 108, track.roadWidth);
  ctx.restore();
}

function drawDirectionArrows(ctx, track) {
  ctx.fillStyle = "rgba(255, 211, 90, 0.78)";
  for (let i = 0; i < 9; i += 1) {
    const point = pointAt(track, i / 9 + 0.045);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(point.angle);
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(-16, -17);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-16, 17);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawDecorations(ctx, race, time) {
  ctx.fillStyle = "rgba(19, 32, 53, 0.15)";
  for (const point of race.level.points) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  const hangars = [
    [96, 86, 132, 64, "#dff8ff"],
    [1030, 68, 146, 70, "#fff3c4"],
    [1040, 622, 130, 58, "#e8fbf3"],
    [76, 610, 154, 62, "#fce7ee"],
  ];
  for (const [x, y, w, h, color] of hangars) {
    ctx.fillStyle = color;
    rounded(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(19, 32, 53, 0.18)";
    ctx.fillRect(x + 12, y + h - 18, w - 24, 9);
  }
  ctx.fillStyle = "rgba(255, 211, 90, 0.75)";
  for (let i = 0; i < 16; i += 1) {
    const blink = Math.sin(time * 0.004 + i) > -0.2 ? 1 : 0.35;
    ctx.globalAlpha = blink;
    ctx.beginPath();
    ctx.arc(140 + i * 65, 682, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCheckpoints(ctx, race) {
  const player = race.player;
  race.level.checkpoints.forEach((checkpoint, index) => {
    const point = pointAt(race.level, checkpoint.progress);
    const completed = index < player.checkpointIndex;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(point.angle + Math.PI / 2);
    ctx.strokeStyle = completed ? "#2fb36d" : index === player.checkpointIndex ? "#ffd35a" : "rgba(255,255,255,0.34)";
    ctx.lineWidth = 5;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(-race.level.roadWidth / 2, 0);
    ctx.lineTo(race.level.roadWidth / 2, 0);
    ctx.stroke();
    ctx.restore();
  });
}

function drawObstacles(ctx, race) {
  for (const obstacle of race.obstacles) {
    const shape = obstacleShape(race, obstacle);
    if (!shape.active) {
      if (obstacle.type === "closing-gate") drawGateWarning(ctx, shape);
      continue;
    }
    ctx.save();
    ctx.translate(shape.x, shape.y);
    ctx.rotate(shape.angle);
    if (obstacle.type === "oil") {
      ctx.fillStyle = "rgba(19, 32, 53, 0.72)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 42, 24, 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (obstacle.type.includes("gate")) {
      ctx.fillStyle = "#ef5b63";
      rounded(ctx, -58, -9, 116, 18, 6);
      ctx.fill();
      ctx.fillStyle = "#ffd35a";
      ctx.fillRect(-44, -4, 88, 8);
    } else if (obstacle.type.includes("arm") || obstacle.type.includes("sign")) {
      ctx.fillStyle = "#7f59e8";
      rounded(ctx, -54, -8, 108, 16, 8);
      ctx.fill();
      ctx.fillStyle = "#ffd35a";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (obstacle.type.includes("wind")) {
      ctx.strokeStyle = "#46c7d9";
      ctx.lineWidth = 5;
      for (let i = 0; i < 3; i += 1) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(46, 0);
        ctx.stroke();
      }
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (obstacle.type === "speed-bump") {
      ctx.fillStyle = "#ffd35a";
      rounded(ctx, -55, -8, 110, 16, 8);
      ctx.fill();
    } else {
      ctx.fillStyle = obstacle.type.includes("luggage") ? "#ff8a3d" : "#c7824f";
      rounded(ctx, -24, -16, 48, 32, 7);
      ctx.fill();
      ctx.strokeStyle = "#132035";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawGateWarning(ctx, shape) {
  ctx.save();
  ctx.translate(shape.x, shape.y);
  ctx.rotate(shape.angle);
  ctx.strokeStyle = "#ef5b63";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.strokeRect(-60, -13, 120, 26);
  ctx.restore();
}

function drawGhost(ctx, state) {
  const ghost = state.showGhost && state.ghostPoint;
  if (!ghost) return;
  ctx.save();
  ctx.globalAlpha = 0.38;
  drawCar(ctx, { ...ghost, stats: { color: "#ffffff", accent: "#7f59e8" }, isGhost: true, name: "Ghost" });
  ctx.restore();
}

function drawRacers(ctx, race) {
  const racers = [...race.racers].sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0));
  for (const car of racers) drawCar(ctx, car);
}

function drawCar(ctx, car) {
  if (car.respawnTimer > 0 && Math.floor(car.respawnTimer * 10) % 2 === 0) return;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = "rgba(19, 32, 53, 0.24)";
  ctx.beginPath();
  ctx.ellipse(-2, 13, 24, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = car.stats.color;
  rounded(ctx, -23, -13, 46, 26, 8);
  ctx.fill();
  ctx.fillStyle = car.stats.accent;
  rounded(ctx, -4, -10, 16, 20, 5);
  ctx.fill();
  ctx.fillStyle = "#132035";
  ctx.fillRect(6, -16, 8, 5);
  ctx.fillRect(6, 11, 8, 5);
  if (car.isPlayer) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.strokeRect(-27, -17, 54, 34);
  }
  if (car.boostActive || car.boostFlash > 0) {
    ctx.fillStyle = "#ffd35a";
    ctx.beginPath();
    ctx.moveTo(-24, -7);
    ctx.lineTo(-43, 0);
    ctx.lineTo(-24, 7);
    ctx.fill();
  }
  ctx.restore();
}

function drawHud(ctx, race, state) {
  const player = race.player;
  panel(ctx, 18, 18, 210, 92);
  ctx.fillStyle = "#132035";
  ctx.font = "900 24px system-ui, sans-serif";
  ctx.fillText(`${ordinal(player.position)} / ${race.racers.length}`, 34, 53);
  ctx.font = "800 13px system-ui, sans-serif";
  ctx.fillText(`Level ${race.level.id}: ${race.level.name}`, 34, 78);
  ctx.fillText(state.difficultyLabel || "Normal", 34, 98);

  panel(ctx, 492, 18, 296, 92);
  ctx.fillStyle = "#132035";
  ctx.font = "900 20px system-ui, sans-serif";
  const lapLabel = player.lap >= TOTAL_LAPS ? `Final Lap - ${TOTAL_LAPS} / ${TOTAL_LAPS}` : `Lap ${Math.max(1, player.lap)} / ${TOTAL_LAPS}`;
  ctx.fillText(lapLabel, 514, 51);
  ctx.font = "800 13px system-ui, sans-serif";
  ctx.fillText(`Lap ${formatRaceTime(race.time - player.lapStartTime)}`, 514, 78);
  ctx.fillText(`Total ${formatRaceTime(race.time)}`, 514, 98);

  drawMiniMap(ctx, race, 1046, 18, 210, 142);

  panel(ctx, 18, 612, 250, 86);
  ctx.fillStyle = "#132035";
  ctx.font = "900 15px system-ui, sans-serif";
  ctx.fillText(`Speed ${Math.max(0, Math.round(player.speed))}`, 36, 642);
  ctx.fillText(player.driftAmount > 0.35 ? "DRIFT" : "GRIP", 36, 668);

  panel(ctx, 1005, 620, 250, 78);
  ctx.fillStyle = "rgba(19, 32, 53, 0.14)";
  rounded(ctx, 1028, 646, 200, 14, 8);
  ctx.fill();
  const boostRatio = Math.max(0, Math.min(1, player.boost / player.stats.boostCapacity));
  const gradient = ctx.createLinearGradient(1028, 0, 1228, 0);
  gradient.addColorStop(0, "#46c7d9");
  gradient.addColorStop(1, "#ffd35a");
  ctx.fillStyle = gradient;
  rounded(ctx, 1028, 646, 200 * boostRatio, 14, 8);
  ctx.fill();
  ctx.fillStyle = "#132035";
  ctx.font = "900 13px system-ui, sans-serif";
  ctx.fillText("BOOST - Shift", 1028, 680);

  if (race.message || race.lapNoticeTimer > 0 || race.checkpointNoticeTimer > 0) {
    const text = race.message || (race.lapNoticeTimer > 0 ? race.lapNotice : race.checkpointNotice);
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    rounded(ctx, 480, 312, 320, 86, 8);
    ctx.fill();
    ctx.fillStyle = race.checkpointNotice === "Wrong way" ? "#ef5b63" : "#132035";
    ctx.font = "900 34px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, 640, 365);
    ctx.textAlign = "start";
  }

  if (player.lap >= TOTAL_LAPS && race.phase === "racing") {
    ctx.strokeStyle = "rgba(255, 211, 90, 0.32)";
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, WORLD_W - 16, WORLD_H - 16);
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.84)";
  rounded(ctx, x, y, w, h, 8);
  ctx.fill();
}

function pointAt(track, progress) {
  const distance = ((progress % 1) + 1) % 1 * track.length;
  const segment = track.segments.find((item) => distance >= item.start && distance <= item.start + item.length) || track.segments[0];
  const t = segment.length ? (distance - segment.start) / segment.length : 0;
  return {
    x: segment.a.x + (segment.b.x - segment.a.x) * t,
    y: segment.a.y + (segment.b.y - segment.a.y) * t,
    angle: Math.atan2(segment.b.y - segment.a.y, segment.b.x - segment.a.x),
    surface: surfaceAt(track, progress),
  };
}

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
