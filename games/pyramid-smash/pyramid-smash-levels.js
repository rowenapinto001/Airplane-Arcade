import { inventorySummary } from "./pyramid-smash-balls.js";

export const OBJECT_TYPES = {
  normal: { name: "Cargo Box", color: "#c7824f", accent: "#7b4c31", mass: 1, friction: 0.83, bounce: 0.22, strength: 1 },
  light: { name: "Light Parcel", color: "#ffd35a", accent: "#cc8d2b", mass: 0.68, friction: 0.76, bounce: 0.28, strength: 0.82 },
  heavy: { name: "Steel Crate", color: "#657386", accent: "#dbe6ee", mass: 2.2, friction: 0.88, bounce: 0.12, strength: 1.8 },
  ice: { name: "Ice Block", color: "#aeefff", accent: "#46c7d9", mass: 0.9, friction: 0.45, bounce: 0.24, strength: 0.95 },
  sticky: { name: "Rubber Block", color: "#2fb36d", accent: "#155d39", mass: 1.18, friction: 0.96, bounce: 0.16, strength: 1.15 },
  spring: { name: "Spring Box", color: "#ff8a3d", accent: "#fff2b6", mass: 1, friction: 0.78, bounce: 0.72, strength: 1, spring: true },
  glass: { name: "Breakable Core", color: "#dff8ff", accent: "#7f59e8", mass: 0.72, friction: 0.62, bounce: 0.18, strength: 0.58, breakable: true },
  bonus: { name: "Bonus Star Box", color: "#ffe066", accent: "#7f59e8", mass: 0.72, friction: 0.7, bounce: 0.24, strength: 0.7, required: false, bonus: true },
  locked: { name: "Locked Cargo", color: "#132035", accent: "#ffd35a", mass: 1.28, friction: 0.86, bounce: 0.12, strength: 1.2, locked: true },
  moving: { name: "Moving Box", color: "#46c7d9", accent: "#132035", mass: 1, friction: 0.8, bounce: 0.22, strength: 1, moving: true },
  balloon: { name: "Balloon Box", color: "#ef5b63", accent: "#ffffff", mass: 0.52, friction: 0.74, bounce: 0.36, strength: 0.74, lift: 120 },
  mystery: { name: "Mystery Box", color: "#7f59e8", accent: "#ffd35a", mass: 0.95, friction: 0.78, bounce: 0.25, strength: 0.9, mystery: "push-left" },
};

const LEVEL_SPECS = [
  ["First Stack", "First three-row cargo pyramid with one obvious weak point.", 1, 2, 3, "wide", ["standard", "standard", "standard"], "pyramid", ["normal"], 0, "Try hitting the lower centre cargo box."],
  ["Twin Towers", "Two short towers that can knock into each other.", 2, 3, 4, "wide", ["standard", "standard", "standard", "standard"], "twin", ["normal"], 0, "Hit the inner side of either tower."],
  ["Centre Support", "A pyramid balanced on one central support.", 1, 2, 4, "wide", ["standard", "standard", "heavy", "standard"], "support", ["normal"], 0, "Aim for the single centre support."],
  ["Split Stack", "Two connected pyramid sections with light parcels on top.", 2, 3, 5, "wide", ["standard", "standard", "bouncy", "standard", "standard"], "split", ["normal", "light"], 0, "Use the bouncy ball to push one side into the other."],
  ["First Heavy Box", "Heavy crate base with cargo stacked above.", 2, 3, 5, "wide", ["standard", "heavy", "standard", "standard", "standard"], "heavy", ["normal", "heavy"], 0, "Do not waste shots on the steel crate; hit the upper supports."],
  ["Ice Slide", "Ice support can slide and collapse the stack.", 2, 3, 5, "wide", ["standard", "standard", "heavy", "standard", "standard"], "support", ["ice", "normal"], 0, "Let the ice block slide into the lower tower."],
  ["Cargo Bridge", "Two short platforms connected by boxes.", 2, 4, 6, "split", ["standard", "bouncy", "standard", "heavy", "standard", "standard"], "bridge", ["normal", "light"], 0, "A low shot through the bridge can start a chain reaction."],
  ["Spring Support", "A spring box can shove nearby cargo.", 2, 3, 5, "wide", ["standard", "standard", "bouncy", "standard", "standard"], "spring", ["normal", "spring"], 0, "Aim for the orange spring box."],
  ["Narrow Landing", "A narrow platform rewards accurate low shots.", 2, 3, 5, "narrow", ["precision", "standard", "standard", "heavy", "standard"], "pyramid", ["normal", "light"], 0, "Use the precision ball on the bottom row."],
  ["Three Towers", "Three connected towers with a middle support.", 3, 4, 6, "wide", ["standard", "bouncy", "standard", "heavy", "standard", "standard"], "triple", ["normal", "light"], 0, "Break the middle tower first."],
  ["Protected Pyramid", "A low barrier blocks direct throws.", 3, 5, 6, "wide", ["bouncy", "standard", "precision", "heavy", "standard", "standard"], "protected", ["normal", "light"], 0, "Use an angled shot over the barrier."],
  ["High and Low", "Upper boxes can fall into the lower structure.", 3, 5, 6, "multi", ["standard", "bouncy", "heavy", "standard", "standard", "precision"], "high-low", ["normal", "light", "ice"], 0, "Drop the upper boxes into the lower stack."],
  ["Glass Core", "Breakable centre weakens the pyramid.", 2, 4, 5, "wide", ["precision", "standard", "heavy", "standard", "standard"], "core", ["normal", "glass"], 0, "Hit the glass-style core directly."],
  ["Sticky Base", "Rubber blocks grip the lower section.", 3, 5, 7, "wide", ["standard", "heavy", "bouncy", "standard", "precision", "standard", "standard"], "sticky", ["sticky", "normal", "light"], 0, "Target the upper cargo to rotate the sticky base."],
  ["Moving Cargo", "Predictable moving target platform.", 3, 5, 7, "moving", ["standard", "precision", "heavy", "bouncy", "standard", "standard", "standard"], "moving", ["normal", "moving"], 0, "Time the throw when the moving support is near the edge."],
  ["Double Platform", "Two platforms allow bounce shots between structures.", 3, 5, 7, "split", ["bouncy", "standard", "heavy", "precision", "standard", "standard", "standard"], "double", ["normal", "ice", "light"], 0, "Bounce the first ball between the platforms."],
  ["Wind Lane", "Light side wind bends air balls.", 3, 5, 8, "wide", ["air", "standard", "bouncy", "heavy", "standard", "precision", "standard", "standard"], "pyramid", ["normal", "balloon", "light"], 36, "Aim a little into the wind."],
  ["Heavy Foundation", "Steel crates support lighter upper boxes.", 4, 6, 8, "wide", ["heavy", "standard", "standard", "bouncy", "precision", "heavy", "standard", "standard"], "heavy", ["heavy", "normal", "light"], 0, "Use heavy balls on side weak points."],
  ["Tilting Deck", "The platform gently tilts based on cargo movement.", 4, 6, 8, "tilting", ["standard", "heavy", "bouncy", "precision", "standard", "sticky", "standard", "standard"], "split", ["normal", "ice", "sticky"], 0, "Let the deck tilt before the follow-up shot."],
  ["Cargo Fortress", "Large layered structure with barriers and mixed materials.", 4, 6, 9, "wide", ["heavy", "standard", "bouncy", "precision", "spring", "standard", "heavy", "standard", "standard"], "fortress", ["normal", "heavy", "ice", "spring"], 0, "Hit the spring or an outer steel support."],
  ["Rotating Runway", "A slow rotating platform protects a weak support.", 4, 6, 9, "rotating", ["precision", "standard", "heavy", "bouncy", "sticky", "standard", "standard", "heavy", "standard"], "protected", ["normal", "locked", "light"], 0, "Wait for the weak support to face the launcher."],
  ["Triple Island", "Three floating platforms make chain reactions possible.", 4, 7, 10, "triple", ["bouncy", "standard", "air", "heavy", "precision", "standard", "sticky", "standard", "standard", "heavy"], "triple-island", ["normal", "ice", "balloon"], 0, "Use a bouncing shot to connect the islands."],
  ["Cargo Maze", "Barriers create limited bounce angles and a bonus target.", 5, 7, 10, "wide", ["bouncy", "precision", "heavy", "standard", "sticky", "air", "standard", "heavy", "standard", "standard"], "maze", ["normal", "locked", "bonus", "glass"], 0, "Bank shots from the cargo barrier."],
  ["Sky Warehouse", "Large structure with moving boxes, two cores, and light wind.", 5, 8, 11, "multi", ["split", "heavy", "bouncy", "precision", "standard", "air", "sticky", "standard", "heavy", "standard", "standard"], "warehouse", ["normal", "heavy", "moving", "glass", "spring"], 26, "Break either core, then use the split ball for cleanup."],
  ["Grand Pyramid", "The largest multi-section cargo pyramid.", 5, 7, 12, "grand", ["split", "heavy", "bouncy", "precision", "air", "sticky", "standard", "heavy", "standard", "bouncy", "precision", "standard"], "grand", ["normal", "light", "heavy", "ice", "sticky", "spring", "glass", "moving", "bonus"], 22, "Start with a core or spring hit, then clean up with split shots."],
];

export const PYRAMID_LEVELS = LEVEL_SPECS.map((spec, index) => buildLevel(index + 1, spec));

export function getPyramidLevel(levelId = 1) {
  return PYRAMID_LEVELS.find((level) => level.id === Number(levelId)) || PYRAMID_LEVELS[0];
}

export function levelStarsLabel(level) {
  return `3★ ${level.starShots.three} shots | 2★ ${level.starShots.two} shots | 1★ ${level.maxShots} shots`;
}

function buildLevel(id, spec) {
  const [name, objective, three, two, max, platformType, inventory, pattern, materials, wind, hint] = spec;
  const platforms = createPlatforms(platformType, id);
  const objects = createStructure(pattern, materials, platforms, id);
  return {
    id,
    name,
    objective,
    environment: environmentFor(id),
    platformType,
    pattern,
    platforms,
    barriers: createBarriers(pattern, id),
    objects,
    inventory,
    maxShots: max,
    starShots: { three, two, one: max },
    recommended: three === two ? `${three} shots` : `${three}-${two} shots`,
    wind,
    hint,
    special: specialFor(id),
    inventoryLabel: inventorySummary(inventory),
  };
}

function environmentFor(id) {
  if (id <= 5) return "Airport Cargo Yard";
  if (id <= 10) return "Cloud Delivery Terminal";
  if (id <= 15) return "Runway Loading Zone";
  if (id <= 20) return "Night Airport";
  if (id <= 24) return "Moon Cargo Station";
  return "Final Sky Warehouse";
}

function specialFor(id) {
  if (id === 25) return "Pyramid Champion badge";
  if (id >= 21) return "Expert platform";
  if (id >= 17) return "Wind and special balls";
  if (id >= 13) return "Breakable or sticky targets";
  if (id >= 8) return "Special cargo object";
  return "Cargo basics";
}

function createPlatforms(type, id) {
  const baseY = 495;
  const platform = (x, y, w, h = 28, kind = type) => ({ x, y, w, h, kind, phase: id * 0.7 });
  if (type === "narrow") return [platform(620, baseY, 275)];
  if (type === "split") return [platform(520, baseY, 260, 28, "split"), platform(820, baseY - 20, 260, 28, "split")];
  if (type === "multi") return [platform(520, baseY, 275, 28, "low"), platform(775, baseY - 110, 260, 28, "high")];
  if (type === "moving") return [platform(655, baseY, 330, 28, "moving")];
  if (type === "tilting") return [platform(660, baseY, 420, 28, "tilting")];
  if (type === "rotating") return [platform(665, baseY, 390, 28, "rotating")];
  if (type === "triple") return [platform(455, baseY + 5, 220, 28, "island"), platform(670, baseY - 55, 220, 28, "island"), platform(890, baseY + 8, 220, 28, "island")];
  if (type === "grand") return [platform(455, baseY + 14, 250, 28, "grand"), platform(705, baseY - 48, 300, 28, "grand"), platform(965, baseY + 4, 250, 28, "grand")];
  return [platform(680, baseY, 500, 28, "wide")];
}

function createBarriers(pattern, id) {
  const barriers = [];
  if (pattern === "protected" || pattern === "maze" || pattern === "fortress") {
    barriers.push({ x: 455, y: 422, w: 28, h: 120, kind: "cargo-barrier" });
  }
  if (pattern === "maze") {
    barriers.push({ x: 600, y: 365, w: 28, h: 120, kind: "cargo-barrier" });
    barriers.push({ x: 770, y: 440, w: 26, h: 86, kind: "cargo-barrier" });
  }
  if (id >= 20) barriers.push({ x: 512, y: 455, w: 24, h: 70, kind: "low-rail" });
  return barriers;
}

function createStructure(pattern, materials, platforms, id) {
  const objects = [];
  const add = (type, x, y, options = {}) => objects.push(box(type, x, y, options));
  const main = platforms[Math.min(platforms.length - 1, Math.floor(platforms.length / 2))];
  const topY = (platform) => platform.y - 21;

  if (pattern === "twin") {
    tower(objects, platforms[0], 585, 3, materials);
    tower(objects, platforms[0], 760, 3, materials);
  } else if (pattern === "support") {
    add(materials[0], main.x, topY(main), { tag: "support" });
    pyramid(objects, main, main.x, 3, materials.slice(1).length ? materials.slice(1) : materials);
  } else if (pattern === "split") {
    pyramid(objects, platforms[0], platforms[0].x - 45, 3, materials);
    pyramid(objects, platforms[platforms.length - 1], platforms[platforms.length - 1].x + 35, 3, materials);
  } else if (pattern === "heavy") {
    tower(objects, main, main.x - 90, 2, ["heavy", "normal"]);
    tower(objects, main, main.x + 60, 3, materials);
    add("heavy", main.x - 15, topY(main), { tag: "foundation" });
  } else if (pattern === "bridge") {
    tower(objects, platforms[0], platforms[0].x - 55, 2, materials);
    tower(objects, platforms[1], platforms[1].x + 55, 2, materials);
    add("normal", 670, platforms[0].y - 66, { w: 124, h: 32 });
  } else if (pattern === "spring") {
    add("spring", main.x - 60, topY(main), { tag: "spring" });
    pyramid(objects, main, main.x + 35, 3, materials);
  } else if (pattern === "triple") {
    tower(objects, main, main.x - 140, 3, materials);
    tower(objects, main, main.x, 4, materials);
    tower(objects, main, main.x + 140, 3, materials);
  } else if (pattern === "protected") {
    pyramid(objects, main, main.x + 55, 4, materials);
    add("locked", main.x - 28, topY(main), { tag: "locked" });
  } else if (pattern === "high-low") {
    pyramid(objects, platforms[1], platforms[1].x + 12, 3, materials);
    tower(objects, platforms[0], platforms[0].x - 40, 3, materials);
  } else if (pattern === "core") {
    pyramid(objects, main, main.x, 4, ["normal", "light"]);
    add("glass", main.x, main.y - 92, { tag: "core" });
  } else if (pattern === "sticky") {
    add("sticky", main.x - 70, topY(main));
    add("sticky", main.x + 18, topY(main));
    pyramid(objects, main, main.x - 25, 4, materials);
  } else if (pattern === "moving") {
    add("moving", main.x - 80, topY(main), { rail: { min: main.x - 130, max: main.x + 80, speed: 38 } });
    pyramid(objects, main, main.x + 50, 3, materials);
  } else if (pattern === "double") {
    pyramid(objects, platforms[0], platforms[0].x, 3, materials);
    pyramid(objects, platforms[1], platforms[1].x, 3, materials);
  } else if (pattern === "fortress") {
    pyramid(objects, main, main.x, 5, materials);
    add("spring", main.x - 132, topY(main));
    add("heavy", main.x + 132, topY(main));
  } else if (pattern === "triple-island") {
    platforms.forEach((platform, index) => pyramid(objects, platform, platform.x, index === 1 ? 3 : 2, materials));
  } else if (pattern === "maze") {
    pyramid(objects, main, main.x + 90, 4, materials);
    add("bonus", main.x + 210, main.y - 72, { required: false });
    add("glass", main.x + 90, main.y - 126);
  } else if (pattern === "warehouse") {
    pyramid(objects, platforms[0], platforms[0].x + 10, 4, materials);
    pyramid(objects, platforms[1], platforms[1].x, 4, materials);
    add("glass", platforms[0].x, platforms[0].y - 120);
    add("glass", platforms[1].x + 30, platforms[1].y - 120);
    add("moving", platforms[1].x - 92, topY(platforms[1]), { rail: { min: platforms[1].x - 120, max: platforms[1].x + 90, speed: 32 } });
  } else if (pattern === "grand") {
    platforms.forEach((platform, index) => pyramid(objects, platform, platform.x, index === 1 ? 5 : 4, materials));
    add("spring", platforms[1].x - 130, topY(platforms[1]));
    add("glass", platforms[1].x, platforms[1].y - 164);
    add("moving", platforms[2].x - 70, topY(platforms[2]), { rail: { min: platforms[2].x - 110, max: platforms[2].x + 82, speed: 30 } });
    add("bonus", platforms[2].x + 85, platforms[2].y - 90, { required: false });
  } else {
    pyramid(objects, main, main.x, id <= 3 ? 3 : Math.min(5, 3 + Math.floor(id / 6)), materials);
  }
  return objects.map((item, index) => ({ ...item, id: `object-${index + 1}` }));
}

function pyramid(objects, platform, centerX, rows, materials) {
  const size = 42;
  const step = size - 2;
  for (let row = 0; row < rows; row += 1) {
    const count = rows - row;
    for (let col = 0; col < count; col += 1) {
      const x = centerX + (col - (count - 1) / 2) * step;
      const y = platform.y - size / 2 - row * step;
      objects.push(box(materials[(row + col) % materials.length], x, y));
    }
  }
}

function tower(objects, platform, x, height, materials) {
  const size = 42;
  const step = size - 2;
  for (let row = 0; row < height; row += 1) {
    objects.push(box(materials[row % materials.length], x, platform.y - size / 2 - row * step));
  }
}

function box(type, x, y, options = {}) {
  const config = OBJECT_TYPES[type] || OBJECT_TYPES.normal;
  return {
    type,
    x,
    y,
    w: options.w || 42,
    h: options.h || 42,
    required: options.required ?? config.required ?? true,
    health: config.breakable ? 1 : 2,
    rail: options.rail || null,
    tag: options.tag || "",
  };
}
