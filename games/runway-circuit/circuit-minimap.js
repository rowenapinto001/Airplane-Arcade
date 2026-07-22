export function drawMiniMap(ctx, race, x, y, width, height) {
  const bounds = trackBounds(race.level);
  const scale = Math.min(width / bounds.w, height / bounds.h) * 0.86;
  const ox = x + width / 2 - (bounds.x + bounds.w / 2) * scale;
  const oy = y + height / 2 - (bounds.y + bounds.h / 2) * scale;
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
  rounded(ctx, x, y, width, height, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(19, 32, 53, 0.18)";
  ctx.stroke();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#516173";
  ctx.lineWidth = Math.max(8, race.level.roadWidth * scale * 0.18);
  ctx.beginPath();
  race.level.points.forEach((point, index) => {
    const px = ox + point.x * scale;
    const py = oy + point.y * scale;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = "#f7fbff";
  ctx.lineWidth = 2;
  ctx.stroke();

  const start = race.level.start;
  ctx.strokeStyle = "#ff8a3d";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(ox + start.x * scale - 7, oy + start.y * scale - 7);
  ctx.lineTo(ox + start.x * scale + 7, oy + start.y * scale + 7);
  ctx.stroke();

  const checkpoint = race.player?.nextCheckpoint;
  if (checkpoint) {
    const point = pointAtProgress(race.level, checkpoint.progress);
    ctx.fillStyle = "#ffd35a";
    ctx.beginPath();
    ctx.arc(ox + point.x * scale, oy + point.y * scale, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const car of race.racers) {
    ctx.fillStyle = car.isPlayer ? "#ef5b63" : car.stats.color;
    ctx.beginPath();
    ctx.arc(ox + car.x * scale, oy + car.y * scale, car.isPlayer ? 5 : 4, 0, Math.PI * 2);
    ctx.fill();
    if (car.isPlayer) {
      ctx.strokeStyle = "#132035";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  ctx.fillStyle = "#132035";
  ctx.font = "800 11px system-ui, sans-serif";
  ctx.fillText("MINI MAP", x + 10, y + 16);
  ctx.restore();
}

function pointAtProgress(track, progress) {
  const distance = progress * track.length;
  const segment = track.segments.find((item) => distance >= item.start && distance <= item.start + item.length) || track.segments[0];
  const t = segment.length ? (distance - segment.start) / segment.length : 0;
  return {
    x: segment.a.x + (segment.b.x - segment.a.x) * t,
    y: segment.a.y + (segment.b.y - segment.a.y) * t,
  };
}

function trackBounds(track) {
  const xs = track.points.map((point) => point.x);
  const ys = track.points.map((point) => point.y);
  const minX = Math.min(...xs) - track.roadWidth;
  const maxX = Math.max(...xs) + track.roadWidth;
  const minY = Math.min(...ys) - track.roadWidth;
  const maxY = Math.max(...ys) + track.roadWidth;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
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
