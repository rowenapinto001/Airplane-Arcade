import { UPGRADE_TYPES, VEHICLES, getVehicle, isVehicleUnlocked, totalStars, upgradedStats, upgradeCost } from "./rally-vehicles.js";

export function garageVehicleCards(records) {
  return VEHICLES.map((vehicle) => ({
    ...vehicle,
    unlocked: isVehicleUnlocked(vehicle, records),
    selected: records.selectedVehicle === vehicle.id,
    stats: upgradedStats(vehicle, records.upgrades?.[vehicle.id] || {}),
  }));
}

export function garageSummary(records) {
  return {
    coins: records.flightCoins || 0,
    stars: totalStars(records),
    level: records.highestUnlockedLevel || 1,
    vehicle: getVehicle(records.selectedVehicle || "baggage-buggy").name,
    bestCombo: records.bestStuntCombo || 0,
  };
}

export function upgradeRows(vehicle, records) {
  const levels = records.upgrades?.[vehicle.id] || {};
  return UPGRADE_TYPES.map((upgrade) => {
    const level = Math.max(0, Number(levels[upgrade.id] || 0));
    return {
      ...upgrade,
      level,
      maxed: level >= 5,
      cost: upgradeCost(vehicle.id, upgrade.id, level),
      current: statPreview(vehicle, records, upgrade.id, level),
      next: statPreview(vehicle, records, upgrade.id, Math.min(5, level + 1)),
    };
  });
}

function statPreview(vehicle, records, upgradeId, level) {
  const levels = { ...(records.upgrades?.[vehicle.id] || {}), [upgradeId]: level };
  const stats = upgradedStats(vehicle, levels);
  const upgrade = UPGRADE_TYPES.find((item) => item.id === upgradeId);
  const value = stats[upgrade.stat];
  if (upgrade.stat === "fuelCapacity") return `${Math.round(value)} fuel`;
  if (upgrade.stat === "maxSpeed" || upgrade.stat === "engine" || upgrade.stat === "brake") return String(Math.round(value));
  return value.toFixed(2);
}
