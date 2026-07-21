import { PORTAL_TYPES } from "./cloud-crew-levels.js";

const TEAM = {
  player: {
    main: "#2aa7c9",
    dark: "#17657f",
    light: "#d7f7ff",
    symbol: "W",
  },
  rival: {
    main: "#ff944d",
    dark: "#9a5126",
    light: "#fff0df",
    symbol: "C",
  },
  neutral: {
    main: "#c9d1dd",
    dark: "#667386",
    light: "#f8fbff",
    symbol: "N",
  },
};

export function createCloudCrewRenderer() {
  return {
    draw,
    toWorldPoint,
  };
}

function draw(ctx, canvas, state, level, time) {
  const scaleX = canvas.width / level.width;
  const scaleY = canvas.height / level.height;
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scaleX, scaleY);
  drawSky(ctx, level);
  drawClouds(ctx, level, time);
  drawRoutes(ctx, level, state);
  drawHazards(ctx, level, time);
  drawEnergy(ctx, state);
  drawStations(ctx, level, state);
  drawCargo(ctx, state);
  drawPortals(ctx, level, time);
  drawHubs(ctx, state, level);
  drawCommander(ctx, state, time);
  drawAbilities(ctx, state, time);
  drawUnits(ctx, state);
  drawParticles(ctx, state);
  drawLauncher(ctx, state);
  ctx.restore();
}

function toWorldPoint(canvas, level, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / Math.max(1, rect.width)) * level.width,
    y: ((clientY - rect.top) / Math.max(1, rect.height)) * level.height,
  };
}

function drawSky(ctx, level) {
  const gradient = ctx.createLinearGradient(0, 0, 0, level.height);
  gradient.addColorStop(0, "#dff7ff");
  gradient.addColorStop(0.55, "#f6fbff");
  gradient.addColorStop(1, "#fff7df");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, level.width, level.height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  for (const cloud of [
    [130, 72, 78, 26],
    [312, 86, 116, 32],
    [720, 76, 100, 28],
    [850, 430, 128, 34],
    [118, 430, 108, 30],
  ]) {
    ctx.beginPath();
    ctx.ellipse(cloud[0], cloud[1], cloud[2], cloud[3], 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawClouds(ctx, level, time) {
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 7; i += 1) {
    const x = ((time * 0.009 + i * 168) % (level.width + 180)) - 90;
    const y = 40 + (i % 3) * 68;
    ctx.beginPath();
    ctx.ellipse(x, y, 52, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 38, y + 5, 45, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRoutes(ctx, level, state) {
  for (const route of level.routes) {
    const selected = route.id === state.selectedRouteId;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = routeColor(route.style, 0.22);
    ctx.lineWidth = selected ? 48 : 40;
    strokeRoute(ctx, route);
    ctx.strokeStyle = selected ? routeColor(route.style, 0.92) : routeColor(route.style, 0.5);
    ctx.lineWidth = selected ? 8 : 5;
    strokeRoute(ctx, route);
    drawRouteArrows(ctx, route, selected);
    ctx.restore();
  }
}

function strokeRoute(ctx, route) {
  ctx.beginPath();
  route.points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
}

function drawRouteArrows(ctx, route, selected) {
  ctx.fillStyle = selected ? "#15324a" : "rgba(21, 50, 74, 0.46)";
  for (let index = 1; index < route.points.length - 1; index += 2) {
    const prev = route.points[index - 1];
    const next = route.points[index + 1];
    const point = route.points[index];
    const angle = Math.atan2(next.y - prev.y, next.x - prev.x);
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-10, -9);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-10, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function routeColor(style, alpha) {
  const color = {
    safe: `rgba(74, 189, 214, ${alpha})`,
    attack: `rgba(239, 91, 99, ${alpha})`,
    energy: `rgba(47, 179, 109, ${alpha})`,
    risky: `rgba(127, 89, 232, ${alpha})`,
  }[style];
  return color || `rgba(70, 199, 217, ${alpha})`;
}

function drawHubs(ctx, state) {
  drawHub(ctx, state.playerHub, TEAM.player, "Departure Hub", true);
  drawHub(ctx, state.rivalHub, TEAM.rival, "Rival Hub", false);
}

function drawHub(ctx, hub, team, label, left) {
  ctx.save();
  ctx.translate(hub.x, hub.y);
  if (hub.flash > 0) {
    ctx.globalAlpha = 0.35 + hub.flash * 0.4;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, hub.radius + 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = team.light;
  ctx.strokeStyle = team.dark;
  ctx.lineWidth = 4;
  roundRect(ctx, -hub.radius, -hub.radius * 0.78, hub.radius * 2, hub.radius * 1.56, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = team.main;
  ctx.beginPath();
  if (left) {
    ctx.moveTo(-20, -4);
    ctx.lineTo(23, -17);
    ctx.lineTo(13, 0);
    ctx.lineTo(23, 17);
    ctx.closePath();
  } else {
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.moveTo(0, -26);
    ctx.lineTo(7, -8);
    ctx.lineTo(26, 0);
    ctx.lineTo(7, 8);
    ctx.lineTo(0, 26);
    ctx.lineTo(-7, 8);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-7, -8);
  }
  ctx.fill();
  ctx.fillStyle = "#132035";
  ctx.font = "900 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(team.symbol, 0, 5);
  ctx.restore();

  const barW = 112;
  const x = hub.x - barW / 2;
  const y = hub.y - hub.radius - 28;
  ctx.fillStyle = "rgba(19, 32, 53, 0.16)";
  roundRect(ctx, x, y, barW, 10, 999);
  ctx.fill();
  ctx.fillStyle = team.main;
  roundRect(ctx, x, y, barW * Math.max(0, hub.health / hub.maxHealth), 10, 999);
  ctx.fill();
  ctx.fillStyle = "#132035";
  ctx.font = "800 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, hub.x, hub.y + hub.radius + 24);
}

function drawStations(ctx, level) {
  for (const station of level.stations) {
    const team = TEAM[station.owner || "neutral"] || TEAM.neutral;
    ctx.save();
    ctx.translate(station.x, station.y);
    ctx.fillStyle = "rgba(255,255,255,0.76)";
    ctx.strokeStyle = team.dark;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, station.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = team.main;
    ctx.beginPath();
    ctx.arc(0, 0, station.radius * 0.54, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, Math.abs(station.capture || 0) / 100));
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.fillStyle = "#132035";
    ctx.font = "900 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(station.type === "core" ? "CORE" : station.type === "energy" ? "ENG" : station.type === "bonus" ? "BON" : "STA", 0, 0);
    ctx.fillStyle = "#263142";
    ctx.font = "800 11px system-ui, sans-serif";
    ctx.fillText(station.name, 0, station.radius + 14);
    ctx.restore();
  }
}

function drawPortals(ctx, level, time) {
  for (const portal of level.portals) {
    const info = PORTAL_TYPES[portal.type];
    const pulse = Math.sin(time * 0.006 + portal.x) * 0.08 + 1;
    ctx.save();
    ctx.translate(portal.x, portal.y);
    ctx.rotate(time * 0.0008);
    ctx.strokeStyle = portalColor(portal.type);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 24 * pulse, 34 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(-time * 0.0016);
    ctx.strokeStyle = "rgba(255,255,255,0.88)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 23, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#132035";
    ctx.font = "900 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(info?.icon || "?", 0, 0);
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.86)";
    roundRect(ctx, portal.x - 54, portal.y + 38, 108, 28, 8);
    ctx.fill();
    ctx.fillStyle = "#263142";
    ctx.font = "850 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(portal.label || info?.name || "Portal", portal.x, portal.y + 56);
  }
}

function portalColor(type) {
  return {
    growth: "#2fb36d",
    echo: "#7f59e8",
    speed: "#46c7d9",
    shield: "#72c8f2",
    heavy: "#8b6244",
    jump: "#ff8a3d",
    split: "#ef5b63",
    magnet: "#ffd35a",
    heal: "#9fe182",
  }[type] || "#46c7d9";
}

function drawHazards(ctx, level, time) {
  for (const hazard of level.hazards) {
    const active = 0.5 + Math.sin(time * 0.002 * (hazard.speed || 1) + hazard.x) * 0.5;
    ctx.save();
    ctx.translate(hazard.x, hazard.y);
    ctx.fillStyle = "rgba(255, 211, 90, 0.24)";
    ctx.strokeStyle = "#b77717";
    ctx.lineWidth = 2;
    roundRect(ctx, -hazard.w / 2 - 10, -hazard.h / 2 - 10, hazard.w + 20, hazard.h + 20, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = hazard.type === "fog" ? "rgba(205, 216, 229, 0.68)" : "#fff8e8";
    roundRect(ctx, -hazard.w / 2, -hazard.h / 2, hazard.w, hazard.h, 10);
    ctx.fill();
    ctx.strokeStyle = "#263142";
    ctx.lineWidth = 3;
    if (hazard.type === "wind") {
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 4; i += 1) {
        ctx.save();
        ctx.rotate(time * 0.004 + i * Math.PI / 2);
        ctx.fillStyle = "#46c7d9";
        ctx.fillRect(0, -4, 28, 8);
        ctx.restore();
      }
    } else if (hazard.type === "gate") {
      const gap = 12 + active * 18;
      ctx.fillStyle = "#ef5b63";
      ctx.fillRect(-hazard.w / 2, -hazard.h / 2, hazard.w / 2 - gap, hazard.h);
      ctx.fillRect(gap, -hazard.h / 2, hazard.w / 2 - gap, hazard.h);
    } else if (hazard.type === "cart") {
      ctx.fillStyle = "#ff944d";
      roundRect(ctx, -22 + active * 18, -10, 44, 20, 6);
      ctx.fill();
    } else if (hazard.type === "ice") {
      ctx.strokeStyle = "#72c8f2";
      for (let i = -24; i <= 24; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, -10);
        ctx.lineTo(i + 16, 10);
        ctx.stroke();
      }
    } else if (hazard.type === "conveyor") {
      ctx.fillStyle = "#657184";
      for (let i = -30; i <= 30; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i + active * 10, -8);
        ctx.lineTo(i + 12 + active * 10, 0);
        ctx.lineTo(i + active * 10, 8);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = "#aeb5c1";
      ctx.globalAlpha = 0.62;
      ctx.beginPath();
      ctx.ellipse(0, 0, hazard.w / 2, hazard.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#132035";
    ctx.globalAlpha = 1;
    ctx.font = "900 10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("!", 0, -hazard.h / 2 - 15);
    ctx.restore();
  }
}

function drawEnergy(ctx, state) {
  for (const capsule of state.energyCapsules) {
    if (capsule.collected) continue;
    ctx.save();
    ctx.translate(capsule.x, capsule.y);
    ctx.fillStyle = "#ffd35a";
    ctx.strokeStyle = "#b77717";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(12, -2);
    ctx.lineTo(7, 13);
    ctx.lineTo(-9, 11);
    ctx.lineTo(-13, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawCargo(ctx, state) {
  if (!state.cargo) return;
  ctx.save();
  ctx.translate(state.cargo.x, state.cargo.y);
  ctx.fillStyle = "#fff8e8";
  ctx.strokeStyle = "#8b6244";
  ctx.lineWidth = 3;
  roundRect(ctx, -32, -20, 64, 40, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#46c7d9";
  ctx.fillRect(-18, -7, 36, 14);
  ctx.fillStyle = "#132035";
  ctx.font = "900 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CARGO", 0, 36);
  ctx.restore();
}

function drawCommander(ctx, state, time) {
  const cmd = state.commander;
  if (!cmd?.active || cmd.health <= 0) return;
  ctx.save();
  ctx.translate(cmd.x, cmd.y + Math.sin(time * 0.004) * 4);
  ctx.fillStyle = "#fff0df";
  ctx.strokeStyle = "#9a5126";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 31, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ff944d";
  ctx.fillRect(-22, -7, 44, 14);
  ctx.fillStyle = "#132035";
  ctx.font = "900 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CMD", 0, 5);
  ctx.fillStyle = "rgba(19,32,53,0.16)";
  roundRect(ctx, -42, -52, 84, 8, 999);
  ctx.fill();
  ctx.fillStyle = "#ff944d";
  roundRect(ctx, -42, -52, 84 * Math.max(0, cmd.health / cmd.maxHealth), 8, 999);
  ctx.fill();
  ctx.restore();
}

function drawAbilities(ctx, state, time) {
  for (const marker of state.abilityMarkers) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, marker.life / marker.maxLife));
    ctx.strokeStyle = marker.team === "player" ? "#2aa7c9" : "#ff944d";
    ctx.fillStyle = marker.type === "shield" ? "rgba(114, 200, 242, 0.2)" : "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, marker.radius + Math.sin(time * 0.006) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#132035";
    ctx.font = "900 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(marker.type === "rally" ? "RALLY" : marker.type === "shield" ? "SHIELD" : "TURBO", marker.x, marker.y + 4);
    ctx.restore();
  }
}

function drawUnits(ctx, state) {
  const units = state.units;
  for (const unit of units) {
    const team = TEAM[unit.team];
    ctx.save();
    ctx.translate(unit.x, unit.y);
    if (unit.state === "eliminated") ctx.globalAlpha = Math.max(0, unit.life || 0);
    ctx.fillStyle = unit.shield > 0 ? "#d7f7ff" : team.light;
    ctx.strokeStyle = team.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, unit.radius || 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = team.main;
    ctx.beginPath();
    ctx.arc(0, -5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#132035";
    ctx.font = "900 8px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(unit.symbol || team.symbol, 0, 2);
    if (unit.boosted > 0) {
      ctx.strokeStyle = "#46c7d9";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (unit.carrying > 0) {
      ctx.fillStyle = "#ffd35a";
      ctx.beginPath();
      ctx.arc(7, -7, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawParticles(ctx, state) {
  for (const particle of state.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.translate(particle.x, particle.y);
    if (particle.shape === "star") {
      drawStar(ctx, 0, 0, particle.size || 7);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, particle.size || 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawLauncher(ctx, state) {
  const launcher = state.launcher;
  ctx.save();
  ctx.translate(launcher.x, launcher.y);
  ctx.rotate(launcher.angle);
  ctx.fillStyle = "#d7f7ff";
  ctx.strokeStyle = "#17657f";
  ctx.lineWidth = 4;
  roundRect(ctx, -14, -16, 58, 32, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#2aa7c9";
  ctx.beginPath();
  ctx.moveTo(34, 0);
  ctx.lineTo(4, -13);
  ctx.lineTo(7, 0);
  ctx.lineTo(4, 13);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(19,32,53,0.16)";
  roundRect(ctx, launcher.x - 42, launcher.y + 34, 84, 8, 999);
  ctx.fill();
  ctx.fillStyle = state.launching ? "#2fb36d" : "#2aa7c9";
  roundRect(ctx, launcher.x - 42, launcher.y + 34, 84 * Math.min(1, state.launchMeter), 8, 999);
  ctx.fill();
  ctx.fillStyle = "#132035";
  ctx.font = "850 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Crew Launcher", launcher.x, launcher.y + 58);
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawStar(ctx, x, y, radius) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
