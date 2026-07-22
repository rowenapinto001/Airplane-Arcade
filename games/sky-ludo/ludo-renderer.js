import {
  CENTER,
  HOME_PATHS,
  MAIN_PATH,
  PLAYER_DEFINITIONS,
  SAFE_MAIN_INDICES,
  getPlayerDefinition,
  gridPositionForToken,
  isFinishedStep,
  isHomePathStep,
  isMainStep,
  logicalPosition,
  mainIndexFor,
} from "./ludo-board.js";
import { currentPlayer, tokensWithLogicalPosition } from "./ludo-rules.js";

const BOARD_UNITS = 15;

export function drawSkyLudo(ctx, canvas, state, options = {}) {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  const layout = boardLayout(canvas);
  ctx.scale(dpr, dpr);
  drawBackground(ctx, canvas.clientWidth, canvas.clientHeight, options);
  drawBoard(ctx, state, layout);
  drawTokens(ctx, state, layout);
  drawBoardLabels(ctx, state, layout);
  ctx.restore();
}

export function hitTestSkyLudoToken(canvas, state, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const layout = boardLayout(canvas);
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const hits = tokenDrawRecords(state, layout);
  return hits.find((hit) => Math.hypot(hit.x - x, hit.y - y) <= hit.radius + 4) || null;
}

function boardLayout(canvas) {
  const width = canvas.clientWidth || 760;
  const height = canvas.clientHeight || 760;
  const size = Math.min(width - 28, height - 28);
  const cell = size / BOARD_UNITS;
  return {
    size,
    cell,
    x: (width - size) / 2,
    y: (height - size) / 2,
  };
}

function drawBackground(ctx, width, height, options) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#a8e8ff");
  gradient.addColorStop(0.58, "#f7fbff");
  gradient.addColorStop(1, "#e8fbf3");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  if (options.reduceMotion) return;
  ctx.fillStyle = "rgba(255,255,255,0.58)";
  for (let i = 0; i < 7; i += 1) {
    const x = 40 + i * 132;
    const y = 35 + (i % 3) * 42;
    cloud(ctx, x, y, 0.65 + (i % 2) * 0.14);
  }
}

function cloud(ctx, x, y, scale) {
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 34 * scale, 16 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 24 * scale, y + 7, 26 * scale, 18 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 23 * scale, y + 10, 21 * scale, 14 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBoard(ctx, state, layout) {
  rounded(ctx, layout.x, layout.y, layout.size, layout.size, 18);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill();
  ctx.strokeStyle = "rgba(19,32,53,0.16)";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawYards(ctx, layout);
  drawMainPath(ctx, layout);
  drawHomePaths(ctx, layout);
  drawCenter(ctx, layout);
  drawArrows(ctx, layout);
}

function drawYards(ctx, layout) {
  for (const player of Object.values(PLAYER_DEFINITIONS)) {
    const x = layout.x + (player.yard.x - 1.9) * layout.cell;
    const y = layout.y + (player.yard.y - 1.9) * layout.cell;
    const size = layout.cell * 3.8;
    ctx.fillStyle = player.accent;
    rounded(ctx, x, y, size, size, 12);
    ctx.fill();
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = player.color;
    ctx.font = `900 ${layout.cell * 0.46}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(player.icon, x + size / 2, y + size / 2 + layout.cell * 0.16);
    ctx.font = `800 ${layout.cell * 0.18}px system-ui, sans-serif`;
    ctx.fillText(player.shortLabel.toUpperCase(), x + size / 2, y + size - layout.cell * 0.32);
  }
  ctx.textAlign = "start";
}

function drawMainPath(ctx, layout) {
  MAIN_PATH.forEach(([gx, gy], index) => {
    const safe = SAFE_MAIN_INDICES.has(index);
    drawSquare(ctx, layout, gx, gy, safe ? "#fff4c8" : "#f7fbff", safe ? "#ffd35a" : "rgba(19,32,53,0.22)");
    if (safe) {
      const center = gridCenter(layout, gx, gy);
      ctx.fillStyle = "#ff8a3d";
      ctx.font = `900 ${layout.cell * 0.38}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("*", center.x, center.y + layout.cell * 0.14);
      ctx.textAlign = "start";
    }
  });
  for (const player of Object.values(PLAYER_DEFINITIONS)) {
    const [gx, gy] = MAIN_PATH[player.startIndex];
    drawSquare(ctx, layout, gx, gy, player.accent, player.color, 3);
  }
}

function drawHomePaths(ctx, layout) {
  for (const [playerId, path] of Object.entries(HOME_PATHS)) {
    const player = getPlayerDefinition(playerId);
    path.forEach(([gx, gy], index) => {
      drawSquare(ctx, layout, gx, gy, player.accent, player.color, index === path.length - 1 ? 3 : 1.5);
      const center = gridCenter(layout, gx, gy);
      ctx.fillStyle = player.color;
      ctx.font = `900 ${layout.cell * 0.24}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(String(index + 1), center.x, center.y + layout.cell * 0.1);
    });
  }
  ctx.textAlign = "start";
}

function drawCenter(ctx, layout) {
  const [gx, gy] = CENTER;
  const c = gridCenter(layout, gx, gy);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#132035";
  ctx.lineWidth = 2;
  rounded(ctx, -layout.cell * 0.92, -layout.cell * 0.92, layout.cell * 1.84, layout.cell * 1.84, 12);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = "#132035";
  ctx.font = `900 ${layout.cell * 0.25}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("SKY", c.x, c.y - layout.cell * 0.08);
  ctx.fillText("HOME", c.x, c.y + layout.cell * 0.22);
  ctx.textAlign = "start";
}

function drawArrows(ctx, layout) {
  ctx.fillStyle = "rgba(56,174,226,0.44)";
  for (let i = 2; i < MAIN_PATH.length; i += 6) {
    const [gx, gy] = MAIN_PATH[i];
    const [nx, ny] = MAIN_PATH[(i + 1) % MAIN_PATH.length];
    const a = gridCenter(layout, gx, gy);
    const b = gridCenter(layout, nx, ny);
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(layout.cell * 0.21, 0);
    ctx.lineTo(-layout.cell * 0.15, -layout.cell * 0.12);
    ctx.lineTo(-layout.cell * 0.08, 0);
    ctx.lineTo(-layout.cell * 0.15, layout.cell * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawTokens(ctx, state, layout) {
  const records = tokenDrawRecords(state, layout);
  const movable = new Set(state.validMoves.map((move) => move.tokenId));
  const selected = state.validMoves[state.selectedMoveIndex]?.tokenId;
  for (const record of records) {
    const player = getPlayerDefinition(record.playerId);
    const isCurrent = currentPlayer(state).id === record.playerId;
    const isMovable = movable.has(record.tokenId);
    ctx.save();
    if (isMovable) {
      ctx.strokeStyle = selected === record.tokenId ? "#132035" : player.color;
      ctx.lineWidth = selected === record.tokenId ? 6 : 4;
      ctx.beginPath();
      ctx.arc(record.x, record.y, record.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(19,32,53,0.22)";
    ctx.beginPath();
    ctx.ellipse(record.x + 2, record.y + record.radius * 0.64, record.radius * 0.82, record.radius * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(record.x, record.y, record.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isCurrent ? "#ffffff" : "rgba(19,32,53,0.38)";
    ctx.lineWidth = isCurrent ? 4 : 2;
    ctx.stroke();
    ctx.fillStyle = player.accent;
    ctx.font = `900 ${record.radius * 0.72}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(player.icon, record.x, record.y + record.radius * 0.27);
    ctx.restore();
  }
  ctx.textAlign = "start";
}

function drawBoardLabels(ctx, state, layout) {
  const player = currentPlayer(state);
  const def = getPlayerDefinition(player.id);
  const labelY = layout.y + layout.size + 26;
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  rounded(ctx, layout.x, labelY - 21, layout.size, 34, 8);
  ctx.fill();
  ctx.fillStyle = def.color;
  ctx.font = "900 14px system-ui, sans-serif";
  ctx.fillText(`${player.name}'s turn`, layout.x + 16, labelY);
  ctx.fillStyle = "#132035";
  ctx.font = "800 13px system-ui, sans-serif";
  ctx.fillText(state.message || "Roll the dice", layout.x + 190, labelY);
}

export function tokenDrawRecords(state, layout) {
  const grouped = new Map();
  for (const player of state.players) {
    player.tokens.forEach((token, index) => {
      const key = logicalPosition(player.id, token.steps);
      grouped.set(key, grouped.get(key) || []);
      grouped.get(key).push({ player, token, index });
    });
  }
  const records = [];
  for (const player of state.players) {
    player.tokens.forEach((token, index) => {
      const key = logicalPosition(player.id, token.steps);
      const stack = grouped.get(key) || [];
      const stackIndex = stack.findIndex((item) => item.token.id === token.id);
      const [gx, gy] = gridPositionForToken(player.id, token, index);
      const base = gridCenter(layout, gx, gy);
      const offsets = stackOffsets(stack.length, layout.cell * 0.18);
      const offset = offsets[stackIndex] || { x: 0, y: 0 };
      records.push({
        tokenId: token.id,
        playerId: player.id,
        tokenIndex: index,
        x: base.x + offset.x,
        y: base.y + offset.y,
        radius: isFinishedStep(token.steps) ? layout.cell * 0.2 : layout.cell * 0.27,
      });
    });
  }
  return records;
}

function stackOffsets(count, amount) {
  if (count <= 1) return [{ x: 0, y: 0 }];
  if (count === 2) return [{ x: -amount, y: -amount }, { x: amount, y: amount }];
  if (count === 3) return [{ x: -amount, y: -amount }, { x: amount, y: -amount }, { x: 0, y: amount }];
  return [
    { x: -amount, y: -amount },
    { x: amount, y: -amount },
    { x: -amount, y: amount },
    { x: amount, y: amount },
  ];
}

function drawSquare(ctx, layout, gx, gy, fill, stroke, lineWidth = 1.5) {
  const x = layout.x + gx * layout.cell;
  const y = layout.y + gy * layout.cell;
  ctx.fillStyle = fill;
  rounded(ctx, x + 1, y + 1, layout.cell - 2, layout.cell - 2, 5);
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function gridCenter(layout, gx, gy) {
  return {
    x: layout.x + (gx + 0.5) * layout.cell,
    y: layout.y + (gy + 0.5) * layout.cell,
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
