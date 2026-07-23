function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function easeOut(t) {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
}

function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(640, Math.floor(rect.width || 960));
  const height = Math.max(480, Math.floor(rect.height || 620));
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
}

function seatPoint(layout, seat) {
  return layout.seats[seat] || layout.seats.bottom;
}

function buildLayout(width, height) {
  const catSize = clamp(Math.min(width, height) * 0.095, 52, 86);
  const center = { x: width / 2, y: height * 0.53 };
  return {
    width,
    height,
    center,
    table: {
      x: center.x,
      y: center.y,
      rx: clamp(width * 0.245, 170, 300),
      ry: clamp(height * 0.205, 105, 170),
    },
    catSize,
    seats: {
      bottom: { x: center.x, y: height * 0.835, cardX: center.x - 115, cardY: height - 120 },
      top: { x: center.x, y: height * 0.205, cardX: center.x - 115, cardY: 24 },
      left: { x: center.x - width * 0.33, y: center.y + 10, cardX: 24, cardY: center.y - 82 },
      right: { x: center.x + width * 0.33, y: center.y + 10, cardX: width - 254, cardY: center.y - 82 },
    },
  };
}

function drawBackground(ctx, layout, time, reduceMotion) {
  const { width, height } = layout;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#a8e9f5");
  sky.addColorStop(0.58, "#d9f4e6");
  sky.addColorStop(1, "#fff0bf");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  for (let i = 0; i < 7; i += 1) {
    const drift = reduceMotion ? 0 : Math.sin(time / 2100 + i) * 8;
    const x = ((i * 167 + 80 + drift) % (width + 160)) - 80;
    const y = 52 + (i % 3) * 54;
    drawCloud(ctx, x, y, 0.72 + (i % 2) * 0.18);
  }

  ctx.fillStyle = "rgba(35, 83, 88, 0.08)";
  ctx.fillRect(0, height * 0.72, width, height * 0.28);
  ctx.strokeStyle = "rgba(35, 83, 88, 0.12)";
  ctx.lineWidth = 2;
  for (let x = -40; x < width + 60; x += 96) {
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x + 130, height * 0.72);
    ctx.stroke();
  }
}

function drawCloud(ctx, x, y, scale) {
  ctx.beginPath();
  ctx.ellipse(x, y + 8 * scale, 44 * scale, 18 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 30 * scale, y, 30 * scale, 23 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 34 * scale, y + 2 * scale, 27 * scale, 20 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTable(ctx, layout) {
  const { table } = layout;
  ctx.save();
  ctx.fillStyle = "rgba(30, 51, 73, 0.16)";
  ctx.beginPath();
  ctx.ellipse(table.x + 10, table.y + 18, table.rx + 22, table.ry + 18, 0, 0, Math.PI * 2);
  ctx.fill();

  const top = ctx.createLinearGradient(table.x - table.rx, table.y - table.ry, table.x + table.rx, table.y + table.ry);
  top.addColorStop(0, "#f2cf8f");
  top.addColorStop(0.52, "#ffdca4");
  top.addColorStop(1, "#e1ad69");
  ctx.fillStyle = top;
  ctx.strokeStyle = "#9d6740";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(table.x, table.y, table.rx, table.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(112, 70, 37, 0.24)";
  ctx.lineWidth = 3;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(table.x - table.rx * 0.76, table.y + i * 34);
    ctx.quadraticCurveTo(table.x, table.y + i * 18, table.x + table.rx * 0.76, table.y + i * 34);
    ctx.stroke();
  }
  ctx.restore();
}

function catAngle(seat) {
  if (seat === "top") return Math.PI;
  if (seat === "left") return Math.PI / 2;
  if (seat === "right") return -Math.PI / 2;
  return 0;
}

function drawCat(ctx, cat, layout) {
  const seat = seatPoint(layout, cat.seat);
  const size = layout.catSize;
  const angle = catAngle(cat.seat);
  ctx.save();
  ctx.translate(seat.x, seat.y);
  ctx.rotate(angle);

  ctx.fillStyle = "rgba(19, 32, 53, 0.16)";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.48, size * 0.92, size * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = cat.color;
  ctx.strokeStyle = "#142033";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-size * 0.58, size * 0.05, size * 1.16, size * 0.88, size * 0.28);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = cat.ear;
  ctx.beginPath();
  ctx.moveTo(-size * 0.42, -size * 0.16);
  ctx.lineTo(-size * 0.2, -size * 0.58);
  ctx.lineTo(-size * 0.02, -size * 0.11);
  ctx.closePath();
  ctx.moveTo(size * 0.42, -size * 0.16);
  ctx.lineTo(size * 0.2, -size * 0.58);
  ctx.lineTo(size * 0.02, -size * 0.11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = cat.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.62, size * 0.56, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#132035";
  ctx.beginPath();
  ctx.arc(-size * 0.2, -size * 0.05, size * 0.055, 0, Math.PI * 2);
  ctx.arc(size * 0.2, -size * 0.05, size * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(19, 32, 53, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, size * 0.02);
  ctx.lineTo(-size * 0.05, size * 0.1);
  ctx.moveTo(0, size * 0.02);
  ctx.lineTo(size * 0.05, size * 0.1);
  ctx.moveTo(-size * 0.36, size * 0.06);
  ctx.lineTo(-size * 0.58, size * 0.01);
  ctx.moveTo(size * 0.36, size * 0.06);
  ctx.lineTo(size * 0.58, size * 0.01);
  ctx.stroke();

  drawAccessory(ctx, cat, size);
  ctx.restore();
}

function drawAccessory(ctx, cat, size) {
  ctx.fillStyle = cat.accent;
  ctx.strokeStyle = "#132035";
  ctx.lineWidth = 2;
  if (cat.accessory === "cap") {
    ctx.beginPath();
    ctx.roundRect(-size * 0.34, -size * 0.52, size * 0.68, size * 0.22, size * 0.06);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff8d8";
    ctx.beginPath();
    ctx.moveTo(-size * 0.08, -size * 0.41);
    ctx.lineTo(size * 0.15, -size * 0.41);
    ctx.lineTo(size * 0.03, -size * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  if (cat.accessory === "goggles") {
    ctx.strokeStyle = cat.accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(-size * 0.22, -size * 0.08, size * 0.16, 0, Math.PI * 2);
    ctx.arc(size * 0.22, -size * 0.08, size * 0.16, 0, Math.PI * 2);
    ctx.moveTo(-size * 0.06, -size * 0.08);
    ctx.lineTo(size * 0.06, -size * 0.08);
    ctx.stroke();
  }
  if (cat.accessory === "star") {
    drawStar(ctx, 0, -size * 0.44, size * 0.2, cat.accent, "#132035");
  }
  if (cat.accessory === "scarf") {
    ctx.beginPath();
    ctx.roundRect(-size * 0.48, size * 0.28, size * 0.96, size * 0.14, size * 0.05);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(size * 0.12, size * 0.38, size * 0.14, size * 0.36);
  }
}

function drawStar(ctx, x, y, radius, fill, stroke) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const a = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function pawAnchor(layout, cat) {
  const seat = seatPoint(layout, cat.seat);
  const center = layout.center;
  const dx = center.x - seat.x;
  const dy = center.y - seat.y;
  const length = Math.hypot(dx, dy) || 1;
  const size = layout.catSize;
  return {
    x: seat.x + (dx / length) * size * 0.58,
    y: seat.y + (dy / length) * size * 0.44,
  };
}

function drawPaw(ctx, cat, layout, time) {
  const start = pawAnchor(layout, cat);
  const end = layout.center;
  const raw = cat.paw?.start ? (time - cat.paw.start) / (cat.paw.duration || 420) : 0;
  let progress = 0;
  if (cat.paw?.result === "grab") progress = clamp(easeOut(raw), 0, 1);
  if (cat.paw?.result === "early") progress = Math.sin(clamp(raw, 0, 1) * Math.PI) * 0.48;
  const x = start.x + (end.x - start.x) * progress;
  const y = start.y + (end.y - start.y) * progress;
  const pawSize = layout.catSize * 0.2;
  ctx.save();
  ctx.strokeStyle = cat.color;
  ctx.lineWidth = pawSize * 0.72;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.strokeStyle = "#132035";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(x, y);
  ctx.stroke();

  ctx.fillStyle = cat.color;
  ctx.strokeStyle = "#132035";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, pawSize * 1.15, pawSize * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = cat.accent;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.arc(x + i * pawSize * 0.45, y - pawSize * 0.42, pawSize * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawNormalFish(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#46c7d9";
  ctx.strokeStyle = "#132035";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 46, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ff8a3d";
  ctx.beginPath();
  ctx.moveTo(38, 0);
  ctx.lineTo(76, -25);
  ctx.lineTo(72, 0);
  ctx.lineTo(76, 25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-22, -6, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#132035";
  ctx.beginPath();
  ctx.arc(-20, -5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd35a";
  drawStar(ctx, -55, -30, 9, "#ffd35a", "#132035");
  drawStar(ctx, 56, 35, 7, "#ffd35a", "#132035");
  ctx.restore();
}

function drawBombFish(ctx, x, y, scale, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#303a49";
  ctx.strokeStyle = "#132035";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 48, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#5d6878";
  ctx.beginPath();
  ctx.moveTo(40, 0);
  ctx.lineTo(75, -23);
  ctx.lineTo(70, 0);
  ctx.lineTo(75, 23);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff8d8";
  ctx.beginPath();
  ctx.arc(-22, -6, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#132035";
  ctx.beginPath();
  ctx.arc(-19, -5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffcc42";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -26);
  ctx.quadraticCurveTo(18, -46, 38, -36);
  ctx.stroke();
  ctx.fillStyle = Math.sin(time / 100) > 0 ? "#ff5a66" : "#ffd35a";
  ctx.beginPath();
  ctx.arc(42, -36, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd35a";
  ctx.strokeStyle = "#132035";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-2, -17);
  ctx.lineTo(21, 21);
  ctx.lineTo(-24, 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#132035";
  ctx.font = "900 24px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("!", -2, 16);
  ctx.restore();
}

function fishPosition(layout, state, time) {
  const base = { ...layout.center };
  const animation = state.animation;
  if (!animation?.catId || animation.fishType !== state.round?.fishType) return base;
  const cat = state.cats.find((item) => item.id === animation.catId);
  if (!cat) return base;
  const target = pawAnchor(layout, cat);
  const progress = easeOut((time - animation.start) / (animation.duration || 680));
  return {
    x: base.x + (target.x - base.x) * progress * 0.72,
    y: base.y + (target.y - base.y) * progress * 0.72,
  };
}

function drawFish(ctx, layout, state, time) {
  const visible = state.phase === "active" || state.phase === "resolving" || state.animation?.fishType;
  if (!visible || !state.round?.fishType) return;
  const pos = fishPosition(layout, state, time);
  const pulse = state.reduceMotion ? 0 : Math.sin(time / 140) * 0.04;
  if (state.round.fishType === "bomb") drawBombFish(ctx, pos.x, pos.y, 0.82 + pulse, time);
  else drawNormalFish(ctx, pos.x, pos.y, 0.88 + pulse);
}

function drawScoreCard(ctx, cat, layout) {
  const seat = seatPoint(layout, cat.seat);
  const x = clamp(seat.cardX, 18, layout.width - 238);
  const y = clamp(seat.cardY, 16, layout.height - 116);
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.84)";
  ctx.strokeStyle = "rgba(19, 32, 53, 0.16)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, 230, 92, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = cat.accent;
  ctx.fillRect(x, y, 8, 92);
  ctx.fillStyle = "#132035";
  ctx.font = "900 17px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(cat.displayName, x + 18, y + 27);
  ctx.font = "800 12px system-ui";
  ctx.fillStyle = "#627086";
  const role = cat.controller === "human" ? (cat.player === 2 ? "Player 2" : "Player 1") : "Computer";
  ctx.fillText(`${role} - ${cat.name}`, x + 18, y + 46);
  ctx.fillStyle = "#132035";
  ctx.font = "950 26px system-ui";
  ctx.fillText(String(cat.score), x + 18, y + 76);
  ctx.font = "800 12px system-ui";
  ctx.fillStyle = cat.locked ? "#ef5b63" : cat.accent;
  ctx.textAlign = "right";
  ctx.fillText(cat.status || "Ready", x + 214, y + 75);
  ctx.restore();
}

function drawCenterText(ctx, layout, state) {
  ctx.save();
  const { center } = layout;
  if (state.phase === "countdown") {
    ctx.fillStyle = "rgba(19, 32, 53, 0.78)";
    ctx.beginPath();
    ctx.arc(center.x, center.y, 78, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "950 64px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(state.countdown), center.x, center.y);
  }

  if (state.round?.fishType === "bomb" && state.phase === "active") {
    ctx.fillStyle = "rgba(239, 91, 99, 0.92)";
    ctx.beginPath();
    ctx.roundRect(center.x - 74, center.y + 72, 148, 34, 8);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 14px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Bomb Fish: avoid!", center.x, center.y + 89);
  }

  if (state.phase === "waiting") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.beginPath();
    ctx.roundRect(center.x - 138, center.y - 26, 276, 52, 8);
    ctx.fill();
    ctx.fillStyle = "#132035";
    ctx.font = "900 18px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Wait for the fish", center.x, center.y);
  }
  ctx.restore();
}

export function createFishGrabRenderer() {
  let layout = null;
  return {
    draw(canvas, state, time = performance.now()) {
      const prepared = prepareCanvas(canvas);
      const { ctx, width, height } = prepared;
      layout = buildLayout(width, height);
      drawBackground(ctx, layout, time, state.reduceMotion);
      for (const cat of state.cats || []) drawCat(ctx, cat, layout);
      drawTable(ctx, layout);
      drawFish(ctx, layout, state, time);
      for (const cat of state.cats || []) drawPaw(ctx, cat, layout, time);
      drawCenterText(ctx, layout, state);
      for (const cat of state.cats || []) drawScoreCard(ctx, cat, layout);
      return layout;
    },
    getLayout() {
      return layout;
    },
  };
}
