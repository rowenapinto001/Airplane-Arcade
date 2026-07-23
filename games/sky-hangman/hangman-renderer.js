export function createHangmanRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  let ratio = 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  }

  function draw(round, animation = {}) {
    if (!ctx) return;
    const width = canvas.width / ratio;
    const height = canvas.height / ratio;
    ctx.save();
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);
    drawScene(ctx, width, height, round, animation);
    ctx.restore();
  }

  return { resize, draw };
}

function drawScene(ctx, width, height, round, animation) {
  const mistakes = round?.mistakes || 0;
  const max = round?.maxMistakes || 6;
  const stage = Math.ceil((mistakes / Math.max(1, max)) * 6);
  const won = round?.finished && round?.won;
  const failed = round?.finished && !round?.won;
  drawSky(ctx, width, height, stage, won);
  drawRunway(ctx, width, height, stage, won);
  drawLuggage(ctx, width, height, stage);
  drawAirplane(ctx, width, height, stage, won, animation);
  drawWeather(ctx, width, height, stage, won);
  drawBoard(ctx, width, height, failed, won);
}

function drawSky(ctx, width, height, stage, won) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, won ? "#bdf2ff" : stage >= 5 ? "#a7bdd0" : "#c7f1ff");
  gradient.addColorStop(0.62, won ? "#e9fbff" : stage >= 3 ? "#d7e6ee" : "#ecfbff");
  gradient.addColorStop(1, "#fff7de");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  drawCloud(ctx, width * 0.18, height * 0.18, 42, "#ffffff");
  drawCloud(ctx, width * 0.76, height * 0.16, 34, "#ffffff");
  if (won) {
    ctx.fillStyle = "#ffd35a";
    ctx.beginPath();
    ctx.arc(width * 0.12, height * 0.12, 34, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRunway(ctx, width, height, stage, won) {
  const y = height * 0.72;
  ctx.fillStyle = "#3f4a5c";
  roundedRect(ctx, width * 0.08, y, width * 0.84, height * 0.14, 8);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.setLineDash([24, 20]);
  ctx.beginPath();
  ctx.moveTo(width * 0.15, y + height * 0.07);
  ctx.lineTo(width * 0.85, y + height * 0.07);
  ctx.stroke();
  ctx.setLineDash([]);
  const lightColor = won ? "#2fb36d" : stage >= 4 ? "#ef5b63" : "#ffd35a";
  for (let i = 0; i < 8; i += 1) {
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.arc(width * (0.16 + i * 0.096), y - 12, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAirplane(ctx, width, height, stage, won, animation) {
  ctx.save();
  const lift = won ? Math.min(90, (animation.takeoff || 0) * 90) : 0;
  const x = width * (won ? 0.5 + Math.min(0.22, (animation.takeoff || 0) * 0.22) : 0.5);
  const y = height * 0.58 - lift;
  ctx.translate(x, y);
  ctx.rotate(won ? -0.12 : 0);
  ctx.fillStyle = "rgba(19,32,53,0.16)";
  ctx.beginPath();
  ctx.ellipse(0, 68 + lift * 0.4, 96, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fffdf8";
  roundedRect(ctx, -100, -26, 190, 52, 26);
  ctx.fill();
  ctx.strokeStyle = "#26354f";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = "#46c7d9";
  ctx.beginPath();
  ctx.moveTo(-24, -10);
  ctx.lineTo(34, -66);
  ctx.lineTo(66, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-20, 12);
  ctx.lineTo(42, 56);
  ctx.lineTo(70, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ef5b63";
  ctx.beginPath();
  ctx.moveTo(72, -20);
  ctx.lineTo(112, -52);
  ctx.lineTo(104, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = "#dff7ff";
    ctx.beginPath();
    ctx.arc(-52 + i * 34, -5, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = stage >= 5 && !won ? "#6b7280" : "#ffd35a";
  ctx.beginPath();
  ctx.arc(95, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  if (stage < 5 || won) {
    ctx.strokeStyle = "#26354f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(95, -24);
    ctx.lineTo(95, 24);
    ctx.moveTo(71, 0);
    ctx.lineTo(119, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWeather(ctx, width, height, stage, won) {
  if (won || stage <= 0) return;
  drawCloud(ctx, width * 0.34, height * 0.21, 50, "#748399");
  if (stage >= 2) {
    ctx.strokeStyle = "#3294d1";
    ctx.lineWidth = 4;
    for (let i = 0; i < 12; i += 1) {
      const x = width * 0.25 + i * 18;
      ctx.beginPath();
      ctx.moveTo(x, height * 0.28);
      ctx.lineTo(x - 8, height * 0.34);
      ctx.stroke();
    }
  }
}

function drawLuggage(ctx, width, height, stage) {
  const baseX = width * 0.18;
  const baseY = height * 0.62;
  ctx.fillStyle = "#26354f";
  ctx.fillRect(baseX - 34, baseY + 35, 96, 8);
  drawBag(ctx, baseX, baseY, "#7f59e8", stage >= 3 ? -24 : 0, stage >= 3 ? 26 : 0);
  drawBag(ctx, baseX + 34, baseY - 8, "#ff8a3d", 0, 0);
  drawBag(ctx, baseX - 30, baseY - 2, "#2fb36d", 0, 0);
}

function drawBag(ctx, x, y, color, dx, dy) {
  ctx.fillStyle = color;
  roundedRect(ctx, x + dx - 14, y + dy - 20, 28, 34, 6);
  ctx.fill();
  ctx.strokeStyle = "#26354f";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + dx, y + dy - 20, 8, Math.PI, 0);
  ctx.stroke();
}

function drawBoard(ctx, width, height, failed, won) {
  const x = width * 0.66;
  const y = height * 0.32;
  ctx.fillStyle = "#26354f";
  roundedRect(ctx, x, y, width * 0.24, height * 0.12, 8);
  ctx.fill();
  ctx.fillStyle = won ? "#2fb36d" : failed ? "#ffd35a" : "#46c7d9";
  ctx.font = `900 ${Math.max(14, width * 0.022)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(won ? "CLEARED" : failed ? "DELAYED" : "ON TIME", x + width * 0.12, y + height * 0.073);
  ctx.textAlign = "start";
}

function drawCloud(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x - size * 0.42, y + size * 0.12, size * 0.38, 0, Math.PI * 2);
  ctx.arc(x, y, size * 0.52, 0, Math.PI * 2);
  ctx.arc(x + size * 0.46, y + size * 0.12, size * 0.36, 0, Math.PI * 2);
  ctx.rect(x - size * 0.82, y + size * 0.12, size * 1.64, size * 0.36);
  ctx.fill();
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
