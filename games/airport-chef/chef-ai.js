import { missingSteps, nextStepForOrder, orderLabel } from "./chef-recipes.js";
import { activeOrders, selectBestOrder } from "./chef-orders.js";

export function suggestNextAction(state, player) {
  const orders = activeOrders(state.orders);
  if (!orders.length) return "Wait for the next passenger at the serving counter.";
  const order = selectBestOrder(orders, player.tray?.orderId || state.selectedOrderId);
  if (!player.tray) return "Pick up a clean tray from the Tray Station.";
  if (player.tray.orderId && player.tray.orderId !== order?.id) {
    const ownedOrder = orders.find((item) => item.id === player.tray.orderId);
    if (ownedOrder) {
      const missing = missingSteps(ownedOrder, player.tray);
      return missing.length ? `Finish ${orderLabel(ownedOrder)} at ${stationName(missing[0].station)}.` : "Take the completed tray to Serve.";
    }
  }
  const step = order ? nextStepForOrder(order, player.tray) : null;
  if (!step) return `Serve ${order ? orderLabel(order) : "the completed order"} at the serving counter.`;
  return `${step.actionLabel || "Use"} ${step.label} at ${stationName(step.station)}.`;
}

export function orderUrgency(order) {
  if (!order) return 0;
  const patienceRatio = order.passenger.patience / order.passenger.patienceMax;
  return 1 - patienceRatio;
}

export function stationName(id) {
  return {
    "tray-station": "Tray Station",
    "ingredient-counter": "Ingredients",
    "cutting-board": "Cutting Board",
    grill: "Grill",
    toaster: "Toaster",
    "noodle-boiler": "Noodle Boiler",
    "drink-dispenser": "Drinks",
    blender: "Blender",
    "coffee-machine": "Coffee Machine",
    "dessert-counter": "Dessert Counter",
    "serving-counter": "Serve",
    "waste-bin": "Waste Bin",
    "washing-station": "Washing Station",
  }[id] || id;
}
