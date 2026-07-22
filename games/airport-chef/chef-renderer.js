import { INGREDIENT_COLORS, categoryForRecipe, getRecipe, orderLabel, qualityLabel } from "./chef-recipes.js";
import { WORLD } from "./chef-kitchen.js";

export function createChefRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  let pixelRatio = 1;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    pixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.max(1, Math.floor(rect.width * pixelRatio));
    canvas.height = Math.max(1, Math.floor(rect.height * pixelRatio));
  }
  function draw(state) {
    if (!ctx) return;
    const width = canvas.width / pixelRatio;
    const height = canvas.height / pixelRatio;
    ctx.save();
    ctx.scale(pixelRatio, pixelRatio);
    ctx.clearRect(0, 0, width, height);
    const scale = Math.min(width / WORLD.width, height / WORLD.height);
    const offsetX = (width - WORLD.width * scale) / 2;
    const offsetY = (height - WORLD.height * scale) / 2;
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    drawScene(ctx, state);
    ctx.restore();
  }
  return { resize, draw };
}

function drawScene(ctx, state) {
  const theme = state.kitchen.theme;
  drawBackground(ctx, theme);
  drawPassengerQueue(ctx, state);
  for (const station of state.kitchen.stations) drawStation(ctx, station, state);
  drawFloorGuides(ctx, theme);
  for (const effect of state.effects) drawEffect(ctx, effect);
  for (const player of state.players) drawPlayer(ctx, player, state);
  drawSelectedHint(ctx, state);
}

function drawBackground(ctx, theme) {
  ctx.fillStyle = theme.wall;
  ctx.fillRect(0, 0, WORLD.width, 250);
  ctx.fillStyle = theme.floor;
  ctx.fillRect(0, 250, WORLD.width, WORLD.height - 250);
  ctx.strokeStyle = theme.floorLine;
  ctx.lineWidth = 3;
  for (let x = 0; x < WORLD.width; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 250);
    ctx.lineTo(x + 80, WORLD.height);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  roundedRect(ctx, 36, 24, 1128, 58, 8);
  ctx.fill();
  ctx.fillStyle = "#26354f";
  ctx.font = "900 24px system-ui, sans-serif";
  ctx.fillText("Airport Chef Food Court", 58, 61);
  drawPlaneWindow(ctx, 880, 30);
  drawPlaneWindow(ctx, 980, 30);
  drawPlaneWindow(ctx, 1080, 30);
}

function drawPlaneWindow(ctx, x, y) {
  ctx.fillStyle = "#d9f4ff";
  roundedRect(ctx, x, y, 64, 38, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(38,53,79,0.18)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "rgba(67,172,216,0.35)";
  ctx.beginPath();
  ctx.arc(x + 46, y + 18, 15, 0, Math.PI * 2);
  ctx.fill();
}

function drawFloorGuides(ctx, theme) {
  ctx.strokeStyle = "rgba(255,255,255,0.26)";
  ctx.lineWidth = 5;
  ctx.setLineDash([26, 22]);
  ctx.beginPath();
  ctx.moveTo(92, 505);
  ctx.bezierCurveTo(300, 456, 420, 496, 548, 502);
  ctx.bezierCurveTo(725, 512, 878, 484, 1060, 516);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = theme.accent;
  ctx.globalAlpha = 0.16;
  ctx.fillRect(0, 244, WORLD.width, 18);
  ctx.globalAlpha = 1;
}

function drawPassengerQueue(ctx, state) {
  const active = state.orders.filter((order) => !order.served && !order.missed);
  active.slice(0, 8).forEach((order, index) => {
    const x = 72 + index * 132;
    const y = 148 + (index % 2) * 14;
    drawPassenger(ctx, x, y, order.passenger, order.id === state.selectedOrderId);
    drawOrderBubble(ctx, x + 34, y - 58, order);
  });
}

function drawPassenger(ctx, x, y, passenger, selected) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = selected ? "#ffd35a" : "rgba(255,255,255,0.62)";
  ctx.beginPath();
  ctx.ellipse(0, 68, selected ? 38 : 31, selected ? 10 : 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = passenger.color;
  roundedRect(ctx, -22, 10, 44, 58, 18);
  ctx.fill();
  ctx.fillStyle = passenger.accent;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#26354f";
  ctx.beginPath();
  ctx.arc(-8, -3, 3, 0, Math.PI * 2);
  ctx.arc(8, -3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#26354f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (passenger.mood === "worried") ctx.arc(0, 11, 9, Math.PI * 1.08, Math.PI * 1.92);
  else ctx.arc(0, 7, 9, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.restore();
}

function drawOrderBubble(ctx, x, y, order) {
  const recipe = getRecipe(order.items[0]);
  const category = categoryForRecipe(recipe.id);
  const ratio = order.passenger.patience / order.passenger.patienceMax;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.strokeStyle = order.selected ? category.color : "rgba(38,53,79,0.18)";
  ctx.lineWidth = 3;
  roundedRect(ctx, x, y, 112, 44, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = category.color;
  drawFoodIcon(ctx, recipe.category, x + 20, y + 22, 16);
  ctx.fillStyle = "#26354f";
  ctx.font = "800 11px system-ui, sans-serif";
  ctx.fillText(`#${order.number}`, x + 42, y + 17);
  ctx.fillText(order.items.length > 1 ? `${order.items.length} items` : recipe.name.slice(0, 10), x + 42, y + 32);
  ctx.fillStyle = ratio < 0.24 ? "#ef5b63" : ratio < 0.52 ? "#f47b43" : "#40a86f";
  roundedRect(ctx, x + 6, y + 37, Math.max(10, 100 * ratio), 5, 4);
  ctx.fill();
  ctx.restore();
}

function drawStation(ctx, station, state) {
  const theme = state.kitchen.theme;
  ctx.save();
  ctx.fillStyle = theme.shadow;
  roundedRect(ctx, station.x + 10, station.y + 12, station.w, station.h, 9);
  ctx.fill();
  ctx.fillStyle = station.color;
  roundedRect(ctx, station.x, station.y, station.w, station.h, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  roundedRect(ctx, station.x + 10, station.y + 8, station.w - 20, 22, 6);
  ctx.fill();
  ctx.fillStyle = "#182235";
  ctx.font = "900 16px system-ui, sans-serif";
  ctx.fillText(station.label, station.x + 14, station.y + 25);
  ctx.fillStyle = theme.counterTop;
  roundedRect(ctx, station.x + 14, station.y + 40, station.w - 28, station.h - 54, 8);
  ctx.fill();
  drawStationIcon(ctx, station);
  if (station.mess > 0) drawMess(ctx, station);
  for (const job of station.jobs) drawJob(ctx, station, job);
  if (state.nearStationId === station.id) {
    ctx.strokeStyle = "#ffd35a";
    ctx.lineWidth = 5;
    roundedRect(ctx, station.x - 5, station.y - 5, station.w + 10, station.h + 10, 12);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStationIcon(ctx, station) {
  const cx = station.cx;
  const cy = station.cy + 18;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "#26354f";
  ctx.strokeStyle = "#26354f";
  ctx.lineWidth = 5;
  if (station.id === "grill") {
    for (let x = -38; x <= 38; x += 19) {
      ctx.beginPath();
      ctx.moveTo(x, -20);
      ctx.lineTo(x, 26);
      ctx.stroke();
    }
  } else if (station.id === "cutting-board") {
    roundedRect(ctx, -42, -24, 84, 48, 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(28, 12);
    ctx.stroke();
  } else if (station.id === "drink-dispenser") {
    roundedRect(ctx, -34, -30, 68, 60, 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-12, -4, 7, 0, Math.PI * 2);
    ctx.arc(14, -4, 7, 0, Math.PI * 2);
    ctx.stroke();
  } else if (station.id === "serving-counter") {
    ctx.beginPath();
    ctx.moveTo(-42, 0);
    ctx.lineTo(42, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -2, 24, Math.PI, 0);
    ctx.stroke();
  } else if (station.id === "waste-bin") {
    roundedRect(ctx, -24, -22, 48, 54, 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-30, -22);
    ctx.lineTo(30, -22);
    ctx.stroke();
  } else if (station.id === "washing-station") {
    ctx.beginPath();
    ctx.arc(-16, 8, 14, 0, Math.PI * 2);
    ctx.arc(16, 8, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-20, -24);
    ctx.quadraticCurveTo(0, -40, 20, -24);
    ctx.stroke();
  } else {
    drawFoodIcon(ctx, station.id.includes("dessert") ? "desserts" : station.id.includes("noodle") ? "noodles" : station.id.includes("coffee") ? "drinks" : "burgers", 0, 0, 34);
  }
  ctx.restore();
}

function drawJob(ctx, station, job) {
  const index = station.jobs.indexOf(job);
  const x = station.x + 20 + index * 52;
  const y = station.y + station.h - 42;
  ctx.fillStyle = job.state === "burned" ? "#212633" : INGREDIENT_COLORS[job.step.id] || "#ffd35a";
  ctx.beginPath();
  ctx.ellipse(x + 20, y + 8, 22, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(38,53,79,0.18)";
  roundedRect(ctx, x, y + 24, 46, 8, 4);
  ctx.fill();
  ctx.fillStyle = job.state === "ready" ? "#40a86f" : job.state === "overcooked" ? "#f47b43" : job.state === "burned" ? "#ef5b63" : "#43acd8";
  roundedRect(ctx, x, y + 24, 46 * (job.state === "cooking" ? job.progress : 1), 8, 4);
  ctx.fill();
  ctx.fillStyle = "#26354f";
  ctx.font = "800 9px system-ui, sans-serif";
  ctx.fillText(job.state.toUpperCase(), x, y + 45);
}

function drawMess(ctx, station) {
  ctx.fillStyle = "rgba(38, 30, 28, 0.3)";
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    ctx.arc(station.x + 22 + i * 17, station.y + station.h - 18 - (i % 3) * 8, 5 + station.mess * 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx, player, state) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 42, 35, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = player.color;
  roundedRect(ctx, -22, -12, 44, 56, 17);
  ctx.fill();
  ctx.fillStyle = player.accent;
  ctx.beginPath();
  ctx.arc(0, -25, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#26354f";
  ctx.beginPath();
  ctx.arc(-8, -27, 3.5, 0, Math.PI * 2);
  ctx.arc(8, -27, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#26354f";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, -19, 8, 0.15, Math.PI - 0.15);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  roundedRect(ctx, -26, -52, 52, 17, 8);
  ctx.fill();
  ctx.fillStyle = player.color;
  roundedRect(ctx, -20, -49, 40, 9, 4);
  ctx.fill();
  if (player.tray) drawTray(ctx, player.tray, 36 * player.facing, -24);
  ctx.fillStyle = "#26354f";
  ctx.font = "900 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(player.label.slice(0, 12), 0, 58);
  ctx.textAlign = "start";
  ctx.restore();
}

function drawTray(ctx, tray, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#d8ecf4";
  roundedRect(ctx, -31, -14, 62, 28, 10);
  ctx.fill();
  ctx.strokeStyle = "#26354f";
  ctx.lineWidth = 3;
  ctx.stroke();
  tray.items.slice(0, 6).forEach((item, index) => {
    const ix = -20 + (index % 3) * 20;
    const iy = -4 + Math.floor(index / 3) * 10;
    ctx.fillStyle = item.color || "#ffd35a";
    drawFoodIcon(ctx, item.category, ix, iy, 7);
  });
  ctx.restore();
}

function drawFoodIcon(ctx, category, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  if (category === "burgers") {
    ctx.fillStyle = "#f1b862";
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.18, size, size * 0.58, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#7a4128";
    roundedRect(ctx, -size * 0.95, -size * 0.05, size * 1.9, size * 0.34, 4);
    ctx.fill();
    ctx.fillStyle = "#53b85d";
    roundedRect(ctx, -size * 0.85, size * 0.18, size * 1.7, size * 0.26, 4);
    ctx.fill();
  } else if (category === "sandwiches") {
    ctx.fillStyle = "#ffe1a1";
    ctx.beginPath();
    ctx.moveTo(-size, size * 0.78);
    ctx.lineTo(0, -size);
    ctx.lineTo(size, size * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#53b85d";
    ctx.fillRect(-size * 0.62, size * 0.2, size * 1.2, size * 0.25);
  } else if (category === "noodles") {
    ctx.fillStyle = "#f4d668";
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d28e35";
    ctx.lineWidth = Math.max(2, size * 0.15);
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.arc(i * size * 0.22, -1, size * 0.36, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
  } else if (category === "drinks") {
    ctx.fillStyle = "#43acd8";
    roundedRect(ctx, -size * 0.55, -size, size * 1.1, size * 1.8, 4);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(-size * 0.35, -size * 1.15, size * 0.22, size * 0.55);
  } else {
    ctx.fillStyle = "#ef6da8";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff4de";
    ctx.beginPath();
    ctx.arc(-size * 0.2, -size * 0.25, size * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEffect(ctx, effect) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, effect.life / effect.maxLife));
  ctx.translate(effect.x, effect.y - (effect.maxLife - effect.life) * 24);
  ctx.fillStyle = effect.color || "#ffd35a";
  ctx.font = `900 ${effect.size || 24}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(effect.text, 0, 0);
  ctx.restore();
}

function drawSelectedHint(ctx, state) {
  const order = state.orders.find((item) => item.id === state.selectedOrderId);
  if (!order) return;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  roundedRect(ctx, 786, 588, 364, 66, 8);
  ctx.fill();
  ctx.fillStyle = "#26354f";
  ctx.font = "900 15px system-ui, sans-serif";
  ctx.fillText(`Focused: ${orderLabel(order)}`.slice(0, 42), 806, 613);
  ctx.fillStyle = "#65708a";
  ctx.font = "800 12px system-ui, sans-serif";
  ctx.fillText(`Passenger mood: ${order.passenger.mood} | Quality shows as ${qualityLabel(100)}`, 806, 636);
  ctx.restore();
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
