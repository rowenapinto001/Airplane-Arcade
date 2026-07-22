import { WORLD } from "./chef-kitchen.js";

export function createPlayers(mode, names = {}, upgrades = {}) {
  const speed = 185 + Number(upgrades.walkingSpeed || 0) * 18;
  const players = [
    {
      id: "player1",
      label: names.player1 || "Player 1",
      color: "#f47b43",
      accent: "#ffe3b7",
      x: WORLD.width * 0.42,
      y: WORLD.height * 0.48,
      vx: 0,
      vy: 0,
      speed,
      tray: null,
      targetStation: null,
      actionCooldown: 0,
      facing: 1,
      scoreContribution: 0,
    },
  ];
  if (mode === "two") {
    players.push({
      id: "player2",
      label: names.player2 || "Player 2",
      color: "#43acd8",
      accent: "#e3f7ff",
      x: WORLD.width * 0.58,
      y: WORLD.height * 0.48,
      vx: 0,
      vy: 0,
      speed,
      tray: null,
      targetStation: null,
      actionCooldown: 0,
      facing: -1,
      scoreContribution: 0,
    });
  }
  return players;
}

export function updatePlayers(players, inputForPlayer, dt) {
  for (const player of players) {
    const input = inputForPlayer(player.id);
    let dx = Number(Boolean(input.right)) - Number(Boolean(input.left));
    let dy = Number(Boolean(input.down)) - Number(Boolean(input.up));
    if (player.targetStation) {
      const tx = player.targetStation.cx;
      const ty = player.targetStation.cy + 76;
      const deltaX = tx - player.x;
      const deltaY = ty - player.y;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance > 9) {
        dx = deltaX / Math.max(1, distance);
        dy = deltaY / Math.max(1, distance);
      } else {
        player.targetStation = null;
      }
    } else if (dx || dy) {
      const length = Math.hypot(dx, dy) || 1;
      dx /= length;
      dy /= length;
    }
    player.vx = dx * player.speed;
    player.vy = dy * player.speed;
    player.x = clamp(player.x + player.vx * dt, 36, WORLD.width - 36);
    player.y = clamp(player.y + player.vy * dt, 246, WORLD.height - 42);
    if (Math.abs(dx) > 0.05) player.facing = dx > 0 ? 1 : -1;
    player.actionCooldown = Math.max(0, player.actionCooldown - dt);
  }
}

export function playerNear(player, station, range = 100) {
  if (!station) return false;
  return Math.hypot(player.x - station.cx, player.y - station.cy) <= range;
}

export function makeTray(orderId = null) {
  return {
    id: `tray-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`,
    orderId,
    items: [],
  };
}

export function trayCapacity(upgrades = {}) {
  return 8 + Math.min(3, Number(upgrades.traySlot || 0));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
