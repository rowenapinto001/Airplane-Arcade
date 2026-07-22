export const FOOD_CATEGORIES = [
  { id: "burgers", label: "Burgers", color: "#f47b43" },
  { id: "sandwiches", label: "Sandwiches", color: "#f3c546" },
  { id: "noodles", label: "Noodles", color: "#65b86d" },
  { id: "drinks", label: "Drinks", color: "#43acd8" },
  { id: "desserts", label: "Desserts", color: "#ef6da8" },
];

export const STATION_HELP = {
  "tray-station": "Pick up a clean tray before building an order.",
  "ingredient-counter": "Collect buns, bread, cheese, sauces, and raw ingredients.",
  "cutting-board": "Prepare chopped vegetables, fruit, and sandwich fillings.",
  grill: "Cook patties, chicken, and paneer. Serve ready food before it burns.",
  toaster: "Toast bread, buns, and warm sandwiches.",
  "noodle-boiler": "Boil noodles and dumplings until they are ready.",
  "drink-dispenser": "Pour cold drinks and juices.",
  blender: "Blend smoothies and shakes.",
  "coffee-machine": "Brew hot coffee drinks.",
  "dessert-counter": "Plate cakes, sundaes, cupcakes, and fruit desserts.",
  "serving-counter": "Serve completed trays to passengers.",
  "waste-bin": "Throw away wrong or burned food.",
  "washing-station": "Clean messy stations and rescue your kitchen flow.",
};

export const INGREDIENT_COLORS = {
  bun: "#f1b862",
  bread: "#ffe1a1",
  patty: "#7a4128",
  chicken: "#f0a065",
  paneer: "#f8e4ae",
  cheese: "#ffd75f",
  lettuce: "#53b85d",
  tomato: "#ef5b63",
  onion: "#efe2ff",
  noodles: "#f4d668",
  sauce: "#d54e3d",
  pineapple: "#ffd660",
  berry: "#e8457a",
  cream: "#fff4de",
  coffee: "#734222",
  chocolate: "#5c3526",
  pista: "#7fbd5d",
  sprinkles: "#7a65d8",
};

export const RECIPES = [
  {
    id: "cloud-burger",
    name: "Cloud Burger",
    category: "burgers",
    reward: 95,
    color: "#f47b43",
    unlockLevel: 1,
    steps: [
      collect("bun", "Soft Bun", "ingredient-counter"),
      cook("patty", "Cooked Patty", "grill", 5.2, 6.8, "Raw Patty"),
      prep("lettuce", "Chopped Lettuce", "cutting-board", 2.1),
      collect("cheese", "Cheese Slice", "ingredient-counter"),
    ],
  },
  {
    id: "runway-cheeseburger",
    name: "Runway Cheeseburger",
    category: "burgers",
    reward: 120,
    color: "#ed6b36",
    unlockLevel: 4,
    steps: [
      toast("bun", "Toasted Bun", "toaster", 2.2),
      cook("patty", "Cooked Patty", "grill", 5.8, 6.5, "Raw Patty"),
      collect("cheese", "Double Cheese", "ingredient-counter"),
      prep("tomato", "Tomato Slices", "cutting-board", 2.3),
      collect("sauce", "Airport Sauce", "ingredient-counter"),
    ],
  },
  {
    id: "jumbo-paneer-burger",
    name: "Jumbo Paneer Burger",
    category: "burgers",
    reward: 145,
    color: "#dd8842",
    unlockLevel: 7,
    steps: [
      toast("bun", "Toasted Bun", "toaster", 2.3),
      cook("paneer", "Grilled Paneer", "grill", 5.4, 6.2, "Raw Paneer"),
      prep("onion", "Onion Rings", "cutting-board", 2.2),
      collect("cheese", "Cheese Slice", "ingredient-counter"),
      collect("sauce", "Spiced Sauce", "ingredient-counter"),
    ],
  },
  {
    id: "gate-club",
    name: "Gate Club Sandwich",
    category: "sandwiches",
    reward: 100,
    color: "#e8b849",
    unlockLevel: 2,
    steps: [
      toast("bread", "Toast Bread", "toaster", 2.0),
      cook("chicken", "Grilled Chicken", "grill", 4.8, 6.4, "Raw Chicken"),
      prep("lettuce", "Chopped Lettuce", "cutting-board", 2.0),
      prep("tomato", "Tomato Slices", "cutting-board", 2.1),
    ],
  },
  {
    id: "tropical-toastie",
    name: "Tropical Toastie",
    category: "sandwiches",
    reward: 115,
    color: "#f0ca47",
    unlockLevel: 6,
    steps: [
      toast("bread", "Toast Bread", "toaster", 2.4),
      collect("cheese", "Cheese Slice", "ingredient-counter"),
      prep("pineapple", "Pineapple Pieces", "cutting-board", 2.4),
      collect("sauce", "Sweet Sauce", "ingredient-counter"),
    ],
  },
  {
    id: "captain-veggie-stack",
    name: "Captain Veggie Stack",
    category: "sandwiches",
    reward: 130,
    color: "#e0bd37",
    unlockLevel: 11,
    steps: [
      toast("bread", "Triple Toast", "toaster", 2.6),
      prep("lettuce", "Chopped Lettuce", "cutting-board", 2.0),
      prep("tomato", "Tomato Slices", "cutting-board", 2.1),
      prep("onion", "Onion Rings", "cutting-board", 2.2),
      collect("sauce", "Herb Sauce", "ingredient-counter"),
    ],
  },
  {
    id: "terminal-noodles",
    name: "Terminal Noodles",
    category: "noodles",
    reward: 120,
    color: "#65b86d",
    unlockLevel: 3,
    steps: [
      cook("noodles", "Boiled Noodles", "noodle-boiler", 5.0, 6.2, "Raw Noodles"),
      prep("lettuce", "Veggie Mix", "cutting-board", 2.4),
      collect("sauce", "Soy Sauce", "ingredient-counter"),
    ],
  },
  {
    id: "skyline-spicy-noodles",
    name: "Skyline Spicy Noodles",
    category: "noodles",
    reward: 145,
    color: "#4aa75c",
    unlockLevel: 9,
    steps: [
      cook("noodles", "Boiled Noodles", "noodle-boiler", 5.5, 5.8, "Raw Noodles"),
      cook("chicken", "Grilled Chicken", "grill", 4.8, 6.0, "Raw Chicken"),
      prep("tomato", "Chilli Tomato", "cutting-board", 2.5),
      collect("sauce", "Spicy Sauce", "ingredient-counter"),
    ],
  },
  {
    id: "moon-dumpling-bowl",
    name: "Moon Dumpling Bowl",
    category: "noodles",
    reward: 165,
    color: "#62a756",
    unlockLevel: 17,
    steps: [
      cook("noodles", "Boiled Noodles", "noodle-boiler", 5.8, 5.4, "Raw Noodles"),
      cook("paneer", "Steamed Dumplings", "noodle-boiler", 4.2, 4.8, "Raw Dumplings"),
      prep("onion", "Spring Onion", "cutting-board", 2.0),
      collect("sauce", "Moon Sauce", "ingredient-counter"),
    ],
  },
  {
    id: "orange-takeoff",
    name: "Orange Takeoff",
    category: "drinks",
    reward: 70,
    color: "#ff984d",
    unlockLevel: 1,
    steps: [pour("pineapple", "Orange Juice", "drink-dispenser", 1.8)],
  },
  {
    id: "berry-boarding-smoothie",
    name: "Berry Boarding Smoothie",
    category: "drinks",
    reward: 95,
    color: "#d84d8d",
    unlockLevel: 5,
    steps: [
      prep("berry", "Washed Berries", "cutting-board", 1.8),
      cook("cream", "Blended Smoothie", "blender", 3.8, 6.8, "Smoothie Mix"),
    ],
  },
  {
    id: "pilot-coffee",
    name: "Pilot Coffee",
    category: "drinks",
    reward: 85,
    color: "#7b4a2a",
    unlockLevel: 8,
    steps: [brew("coffee", "Pilot Coffee", "coffee-machine", 3.2)],
  },
  {
    id: "cloud-cupcake",
    name: "Cloud Cupcake",
    category: "desserts",
    reward: 85,
    color: "#ef6da8",
    unlockLevel: 2,
    steps: [
      plate("cream", "Cupcake Base", "dessert-counter", 1.4),
      prep("sprinkles", "Rainbow Sprinkles", "cutting-board", 1.6),
    ],
  },
  {
    id: "runway-sundae",
    name: "Runway Sundae",
    category: "desserts",
    reward: 115,
    color: "#b77be8",
    unlockLevel: 10,
    steps: [
      plate("cream", "Vanilla Scoop", "dessert-counter", 1.6),
      collect("chocolate", "Chocolate Chips", "ingredient-counter"),
      prep("berry", "Berry Crown", "cutting-board", 1.8),
    ],
  },
  {
    id: "pista-gate-pudding",
    name: "Pista Gate Pudding",
    category: "desserts",
    reward: 135,
    color: "#7fbd5d",
    unlockLevel: 14,
    steps: [
      plate("cream", "Pudding Cup", "dessert-counter", 1.8),
      collect("pista", "Pista Crumble", "ingredient-counter"),
      prep("sprinkles", "Sugar Stars", "cutting-board", 1.7),
    ],
  },
];

function collect(ingredient, label, station) {
  return { id: ingredient, label, station, action: "collect", seconds: 0, readyWindow: 999, burnAfter: 999 };
}

function prep(ingredient, label, station, seconds) {
  return { id: ingredient, label, station, action: "prep", seconds, readyWindow: 7, burnAfter: 999 };
}

function cook(ingredient, label, station, seconds, readyWindow, rawLabel) {
  return { id: ingredient, label, station, action: "cook", seconds, readyWindow, burnAfter: readyWindow + 4.2, rawLabel };
}

function toast(ingredient, label, station, seconds) {
  return { id: ingredient, label, station, action: "toast", seconds, readyWindow: 5.5, burnAfter: 8.8, rawLabel: label.replace("Toasted", "Plain").replace("Toast", "Plain") };
}

function pour(ingredient, label, station, seconds) {
  return { id: ingredient, label, station, action: "pour", seconds, readyWindow: 8, burnAfter: 999 };
}

function brew(ingredient, label, station, seconds) {
  return { id: ingredient, label, station, action: "brew", seconds, readyWindow: 7, burnAfter: 999 };
}

function plate(ingredient, label, station, seconds) {
  return { id: ingredient, label, station, action: "plate", seconds, readyWindow: 9, burnAfter: 999 };
}

export function getRecipe(id) {
  return RECIPES.find((recipe) => recipe.id === id) || RECIPES[0];
}

export function recipesForLevel(level) {
  return RECIPES.filter((recipe) => recipe.unlockLevel <= level);
}

export function recipesByCategory(level) {
  return FOOD_CATEGORIES.map((category) => ({
    ...category,
    recipes: recipesForLevel(level).filter((recipe) => recipe.category === category.id),
  }));
}

export function componentKey(recipeId, stepId) {
  return `${recipeId}:${stepId}`;
}

export function requiredKeysForOrder(order) {
  return order.items.flatMap((recipeId) => getRecipe(recipeId).steps.map((step) => componentKey(recipeId, step.id)));
}

export function orderReward(order) {
  return order.items.reduce((sum, recipeId) => sum + getRecipe(recipeId).reward, 0);
}

export function orderLabel(order) {
  return order.items.map((recipeId) => getRecipe(recipeId).name).join(" + ");
}

export function describeOrderSteps(order) {
  return order.items.flatMap((recipeId) =>
    getRecipe(recipeId).steps.map((step) => ({
      ...step,
      recipeId,
      recipeName: getRecipe(recipeId).name,
      key: componentKey(recipeId, step.id),
    })),
  );
}

export function missingSteps(order, tray) {
  const completed = new Set((tray?.items || []).map((item) => item.key));
  return describeOrderSteps(order).filter((step) => !completed.has(step.key));
}

export function nextStepForOrder(order, tray) {
  return missingSteps(order, tray)[0] || null;
}

export function canServeTray(order, tray) {
  if (!order || !tray) return false;
  const required = new Set(requiredKeysForOrder(order));
  const held = new Set((tray.items || []).map((item) => item.key));
  if (required.size !== held.size) return false;
  for (const key of required) {
    if (!held.has(key)) return false;
  }
  return true;
}

export function hasWrongComponents(order, tray) {
  if (!order || !tray) return false;
  const required = new Set(requiredKeysForOrder(order));
  return (tray.items || []).some((item) => !required.has(item.key));
}

export function trayQuality(tray) {
  if (!tray?.items?.length) return 100;
  const total = tray.items.reduce((sum, item) => sum + (item.quality || 70), 0);
  return Math.max(20, Math.round(total / tray.items.length));
}

export function qualityLabel(value) {
  if (value >= 92) return "Perfect";
  if (value >= 78) return "Great";
  if (value >= 60) return "Good";
  return "Messy";
}

export function buildCompletedComponent(step, stationState) {
  let quality = 96;
  if (stationState?.state === "overcooked") quality = 58;
  if (stationState?.state === "ready") {
    const readyElapsed = Math.max(0, stationState.readyElapsed || 0);
    quality = Math.max(70, Math.round(100 - readyElapsed * 3.8));
  }
  return {
    key: step.key,
    recipeId: step.recipeId,
    stepId: step.id,
    label: step.label,
    ingredient: step.id,
    category: getRecipe(step.recipeId).category,
    quality,
    color: INGREDIENT_COLORS[step.id] || getRecipe(step.recipeId).color,
  };
}

export function categoryForRecipe(recipeId) {
  return FOOD_CATEGORIES.find((category) => category.id === getRecipe(recipeId).category) || FOOD_CATEGORIES[0];
}
