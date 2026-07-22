import { KITCHEN_THEMES } from "./chef-levels.js";

export const WORLD = { width: 1200, height: 720 };

export const STATIONS = [
  station("tray-station", "Tray Station", 46, 330, 150, 92, "#8ec5d9"),
  station("ingredient-counter", "Ingredients", 52, 98, 210, 120, "#f5c35c"),
  station("cutting-board", "Cutting Board", 304, 82, 150, 120, "#77c783"),
  station("grill", "Grill", 506, 74, 168, 124, "#58465c"),
  station("toaster", "Toaster", 716, 76, 150, 116, "#e88b44"),
  station("noodle-boiler", "Noodle Boiler", 922, 92, 188, 122, "#43acd8"),
  station("drink-dispenser", "Drinks", 946, 304, 162, 110, "#56b8e5"),
  station("blender", "Blender", 734, 324, 132, 100, "#d84d8d"),
  station("coffee-machine", "Coffee", 522, 334, 130, 98, "#7b4a2a"),
  station("dessert-counter", "Desserts", 302, 328, 154, 104, "#ef6da8"),
  station("serving-counter", "Serve", 480, 576, 272, 100, "#40a86f"),
  station("waste-bin", "Waste", 922, 564, 110, 98, "#6b7280"),
  station("washing-station", "Wash", 1048, 554, 112, 100, "#7bcbd6"),
];

function station(id, label, x, y, w, h, color) {
  return {
    id,
    label,
    x,
    y,
    w,
    h,
    color,
    cx: x + w / 2,
    cy: y + h / 2,
    job: null,
    mess: 0,
    capacity: id === "grill" ? 1 : 1,
  };
}

export function createKitchenState(themeId = "runway-cafe", upgrades = {}) {
  const theme = KITCHEN_THEMES[themeId] || KITCHEN_THEMES["runway-cafe"];
  return {
    theme,
    stations: STATIONS.map((item) => ({
      ...item,
      capacity: item.id === "grill" ? 1 + Math.min(3, Number(upgrades.grillSize || 0)) : 1,
      jobs: [],
      job: null,
      mess: 0,
      pulse: 0,
    })),
  };
}

export function getStation(kitchen, id) {
  return kitchen.stations.find((stationData) => stationData.id === id) || null;
}

export function nearestStation(kitchen, x, y, distance = 96) {
  let best = null;
  let bestDistance = distance;
  for (const stationData of kitchen.stations) {
    const dx = x - stationData.cx;
    const dy = y - stationData.cy;
    const value = Math.hypot(dx, dy);
    if (value < bestDistance) {
      best = stationData;
      bestDistance = value;
    }
  }
  return best;
}

export function stationAt(kitchen, x, y) {
  return kitchen.stations.find((stationData) => x >= stationData.x && x <= stationData.x + stationData.w && y >= stationData.y && y <= stationData.y + stationData.h) || null;
}

export function updateKitchenJobs(kitchen, dt, difficulty, upgrades = {}, events = []) {
  const speedBoost = 1 + Number(upgrades.freshness || 0) * 0.1;
  for (const stationData of kitchen.stations) {
    stationData.pulse = Math.max(0, stationData.pulse - dt);
    stationData.mess = Math.max(0, stationData.mess - dt * 0.015);
    for (const job of stationData.jobs) {
      if (job.state === "cooking") {
        job.progress += dt / Math.max(0.25, job.seconds);
        if (job.progress >= 1) {
          job.state = "ready";
          job.readyElapsed = 0;
          stationData.pulse = 0.8;
          events.push({ type: "ready", stationId: stationData.id, label: job.step.label });
        }
      } else if (job.state === "ready" || job.state === "overcooked") {
        job.readyElapsed += dt / speedBoost;
        if (job.state === "ready" && job.readyElapsed > job.step.readyWindow) {
          job.state = "overcooked";
          events.push({ type: "overcooked", stationId: stationData.id, label: job.step.label });
        }
        if (job.readyElapsed > job.step.burnAfter) {
          job.state = "burned";
          stationData.mess = Math.max(stationData.mess, 1);
          events.push({ type: "burned", stationId: stationData.id, label: job.step.label });
        }
      }
    }
  }
}

export function stationCanStart(stationData) {
  return stationData.jobs.length < stationData.capacity && stationData.mess < 0.75;
}

export function createStationJob(step, difficulty, upgrades = {}) {
  let multiplier = difficulty.cookMultiplier || 1;
  if (step.station === "grill") multiplier *= 1 - Math.min(0.36, Number(upgrades.grillSpeed || 0) * 0.065);
  if (step.station === "noodle-boiler") multiplier *= 1 - Math.min(0.36, Number(upgrades.boilerSpeed || 0) * 0.065);
  if (step.station === "drink-dispenser") multiplier *= 1 - Math.min(0.3, Number(upgrades.drinkMachine || 0) * 0.055);
  if (step.station === "blender") multiplier *= 1 - Math.min(0.34, Number(upgrades.blenderSpeed || 0) * 0.065);
  return {
    id: `${step.key}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`,
    step,
    progress: step.seconds > 0 ? 0 : 1,
    seconds: Math.max(0.45, step.seconds * multiplier),
    state: step.seconds > 0 ? "cooking" : "ready",
    readyElapsed: 0,
  };
}

export function removeJob(stationData, jobId) {
  const index = stationData.jobs.findIndex((job) => job.id === jobId);
  if (index === -1) return null;
  return stationData.jobs.splice(index, 1)[0];
}

export function firstReadyJob(stationData) {
  return stationData.jobs.find((job) => job.state === "ready" || job.state === "overcooked") || null;
}

export function firstBurnedJob(stationData) {
  return stationData.jobs.find((job) => job.state === "burned") || null;
}

export function cleanStation(stationData, amount) {
  stationData.mess = Math.max(0, stationData.mess - amount);
  if (stationData.mess <= 0.05) {
    stationData.mess = 0;
    stationData.jobs = stationData.jobs.filter((job) => job.state !== "burned");
  }
}
