import { getRecipe, orderLabel, orderReward, recipesForLevel } from "./chef-recipes.js";
import { createPassenger, updatePassengerMood } from "./chef-passengers.js";

let orderSequence = 0;

export function resetOrderSequence() {
  orderSequence = 0;
}

export function createOrder(levelData, difficultyConfig, options = {}) {
  orderSequence += 1;
  const pool = (levelData.recipePool || recipesForLevel(levelData.number).map((recipe) => recipe.id))
    .map((id) => getRecipe(id))
    .filter(Boolean);
  const count = orderItemCount(levelData.number, options.forceSingle);
  const items = [];
  for (let index = 0; index < count; index += 1) {
    const offset = Math.floor(Math.random() * pool.length) + orderSequence + index * 2;
    const recipe = pool[offset % pool.length];
    if (recipe) items.push(recipe.id);
  }
  const passenger = createPassenger(levelData.number, difficultyConfig, orderSequence);
  const patienceBoost = count > 1 ? 8 : 0;
  passenger.patience += patienceBoost;
  passenger.patienceMax += patienceBoost;
  const order = {
    id: `order-${Date.now().toString(36)}-${orderSequence}`,
    number: orderSequence,
    items,
    passenger,
    reward: Math.round(orderReward({ items }) * passenger.tip),
    createdAt: performance.now(),
    served: false,
    missed: false,
    selected: false,
    warningPlayed: false,
    preview: options.preview || false,
  };
  return order;
}

function orderItemCount(level, forceSingle = false) {
  if (forceSingle || level < 5) return 1;
  const roll = Math.random();
  if (level >= 17 && roll > 0.5) return 3;
  if (level >= 9 && roll > 0.44) return 2;
  if (level >= 5 && roll > 0.72) return 2;
  return 1;
}

export function tickOrders(orders, dt, state) {
  const missed = [];
  for (const order of orders) {
    if (order.served || order.missed) continue;
    const patienceLoss = state.powerups?.happyPassengers?.time > 0 ? dt * 0.42 : dt;
    order.passenger.waiting += dt;
    order.passenger.patience = Math.max(0, order.passenger.patience - patienceLoss);
    updatePassengerMood(order);
    if (order.passenger.patience <= 0) {
      order.missed = true;
      missed.push(order);
    }
  }
  return missed;
}

export function activeOrders(orders) {
  return orders.filter((order) => !order.served && !order.missed);
}

export function selectBestOrder(orders, preferredId = null) {
  const active = activeOrders(orders);
  if (!active.length) return null;
  return active.find((order) => order.id === preferredId) || active.sort((a, b) => a.passenger.patience - b.passenger.patience)[0];
}

export function orderDisplay(order) {
  return {
    title: `#${order.number} ${orderLabel(order)}`,
    passenger: order.passenger.name,
    reward: order.reward,
    patiencePercent: Math.round((order.passenger.patience / order.passenger.patienceMax) * 100),
    mood: order.passenger.mood,
  };
}
