const BASE_WIDTH = 980;

export const ROUND_QUALIFIERS = {
  1: 10,
  2: 6,
  3: 1,
};

export const COURSE_CHALLENGES = [
  { id: "no-falls", name: "Cloud Clean Run", description: "Finish a round without falling.", reward: 4 },
  { id: "top-three", name: "Gate Leader", description: "Qualify in the top three.", reward: 5 },
  { id: "few-checkpoints", name: "Direct Flight", description: "Use fewer than three checkpoint respawns in a competition.", reward: 6 },
  { id: "five-jumps", name: "Jump Crew", description: "Make five successful jumps in one round.", reward: 3 },
  { id: "avoid-bars", name: "No Luggage Whacks", description: "Avoid every rotating luggage bar in a round.", reward: 4 },
  { id: "normal-win", name: "Normal Runway Champion", description: "Win a competition on Normal difficulty.", reward: 10 },
  { id: "hard-win", name: "Hard Runway Champion", description: "Win a competition on Hard difficulty.", reward: 16 },
];

function rect(x, y, w, h, kind = "runway") {
  return { x, y, w, h, kind };
}

function point(x, y, label = "") {
  return { x, y, label };
}

function baseCourse(id, title, purpose, config) {
  return {
    id,
    title,
    purpose,
    width: BASE_WIDTH,
    height: config.height || 2920,
    start: config.start || { x: 490, y: 2740 },
    finish: config.finish || { x: 490, y: 150, radius: 70 },
    objective: config.objective || "Reach the finish arch before the qualification slots fill.",
    platforms: config.platforms,
    checkpoints: config.checkpoints,
    waypoints: config.waypoints,
    obstacles: config.obstacles,
    signs: config.signs || [],
    final: Boolean(config.final),
  };
}

const WIDE_SEGMENTS = [
  rect(120, 2420, 740, 360),
  rect(150, 2020, 680, 330),
  rect(110, 1580, 760, 350),
  rect(170, 1120, 640, 350),
  rect(130, 650, 720, 360),
  rect(150, 105, 680, 470),
];

const CLOUDWAY_SPRINT = baseCourse("cloudway-sprint", "Cloudway Sprint", "Beginner course with movement, jumping, and simple timing.", {
  platforms: WIDE_SEGMENTS,
  checkpoints: [
    { id: "cp1", x: 490, y: 2050, w: 610, h: 42, label: "Checkpoint 1" },
    { id: "cp2", x: 490, y: 1148, w: 560, h: 42, label: "Checkpoint 2" },
  ],
  waypoints: [
    point(490, 2500, "Wide start"),
    point(430, 2180, "First gap"),
    point(520, 1750, "Luggage bars"),
    point(480, 1320, "Conveyor"),
    point(540, 820, "Second checkpoint"),
    point(490, 220, "Finish arch"),
  ],
  obstacles: [
    { id: "cw-bar-a", type: "rotatingBar", x: 390, y: 1760, length: 250, width: 28, radius: 124, speed: 1.05, warning: "Rotating Luggage Bar" },
    { id: "cw-bar-b", type: "rotatingBar", x: 590, y: 920, length: 245, width: 28, radius: 120, speed: -1.2, warning: "Rotating Luggage Bar" },
    { id: "cw-conv-a", type: "conveyor", x: 490, y: 1360, w: 460, h: 110, dirX: 0.45, dirY: -1, speed: 78, warning: "Conveyor Runway" },
    { id: "cw-gate-a", type: "closingGate", x: 490, y: 520, w: 530, h: 72, period: 3.1, openRatio: 0.58, warning: "Boarding Gate" },
  ],
  signs: [point(492, 2860, "Tutorial course"), point(490, 1180, "Checkpoint")],
});

const BAGGAGE_BELT_BLITZ = baseCourse("baggage-belt-blitz", "Baggage Belt Blitz", "Split-path conveyor course with bouncing luggage and route choices.", {
  platforms: [
    rect(135, 2430, 710, 330),
    rect(100, 1940, 350, 440, "safe"),
    rect(525, 1940, 360, 440, "risky"),
    rect(140, 1510, 720, 360),
    rect(90, 950, 360, 470, "safe"),
    rect(530, 950, 340, 470, "risky"),
    rect(140, 520, 720, 330),
    rect(165, 100, 650, 350),
  ],
  checkpoints: [
    { id: "cp1", x: 490, y: 1530, w: 610, h: 42, label: "Sorter Checkpoint" },
    { id: "cp2", x: 490, y: 550, w: 570, h: 42, label: "Cart Checkpoint" },
  ],
  waypoints: [
    point(490, 2520, "Start belt"),
    point(280, 2110, "Safe long route"),
    point(660, 2110, "Risky shortcut"),
    point(500, 1630, "Belt merge"),
    point(290, 1140, "Cart lane"),
    point(665, 1120, "Short conveyor"),
    point(490, 625, "Final belt"),
    point(490, 200, "Finish"),
  ],
  obstacles: [
    { id: "bb-conv-a", type: "conveyor", x: 280, y: 2130, w: 260, h: 360, dirX: 0, dirY: -1, speed: 96, warning: "Fast Safe Belt" },
    { id: "bb-conv-b", type: "conveyor", x: 665, y: 2100, w: 250, h: 300, dirX: 0.25, dirY: -1, speed: 138, warning: "Risky Belt" },
    { id: "bb-suitcase-a", type: "bouncingSuitcase", x: 490, y: 1670, w: 680, h: 90, radius: 34, speed: 150, warning: "Bouncing Suitcase" },
    { id: "bb-suitcase-b", type: "bouncingSuitcase", x: 490, y: 1160, w: 720, h: 90, radius: 30, speed: -170, warning: "Luggage Cart" },
    { id: "bb-conv-c", type: "conveyor", x: 490, y: 720, w: 520, h: 130, dirX: -0.55, dirY: -0.6, speed: 88, warning: "Side Belt" },
    { id: "bb-jump-a", type: "jumpPad", x: 660, y: 850, w: 140, h: 90, pushX: -80, pushY: -220, jump: 360, warning: "Shortcut Jump Pad" },
  ],
});

const TURBULENCE_TERMINAL = baseCourse("turbulence-terminal", "Turbulence Terminal", "Wind currents, turbines, closing boarding gates, and floating platforms.", {
  platforms: [
    rect(150, 2440, 680, 330),
    rect(170, 1970, 640, 350),
    rect(110, 1560, 760, 320),
    rect(190, 1110, 600, 330),
    rect(120, 680, 740, 320),
    rect(180, 120, 620, 450),
  ],
  checkpoints: [
    { id: "cp1", x: 490, y: 1980, w: 560, h: 42, label: "Wind Sock Checkpoint" },
    { id: "cp2", x: 490, y: 700, w: 580, h: 42, label: "Terminal Checkpoint" },
  ],
  waypoints: [
    point(490, 2520, "Start"),
    point(360, 2140, "Left wind"),
    point(640, 1700, "Turbine cross"),
    point(490, 1260, "Gate timing"),
    point(390, 790, "Fog lane"),
    point(490, 230, "Finish"),
  ],
  obstacles: [
    { id: "tt-wind-a", type: "windTurbine", x: 480, y: 2160, w: 650, h: 180, dirX: 1, dirY: -0.1, strength: 130, warning: "Crosswind" },
    { id: "tt-wind-b", type: "windTurbine", x: 520, y: 1570, w: 680, h: 180, dirX: -1, dirY: 0, strength: 150, warning: "Wind Turbine" },
    { id: "tt-gate-a", type: "closingGate", x: 490, y: 1280, w: 520, h: 78, period: 2.8, openRatio: 0.46, warning: "Closing Boarding Gate" },
    { id: "tt-fog-a", type: "fogZone", x: 490, y: 820, w: 610, h: 280, opacity: 0.3, warning: "Fog Zone" },
    { id: "tt-wing-a", type: "movingWing", x: 390, y: 1010, w: 280, h: 95, axis: "x", range: 120, speed: 0.9, warning: "Floating Platform" },
  ],
});

const WING_WALK_WOBBLE = baseCourse("wing-walk-wobble", "Wing Walk Wobble", "Moving airplane wings, tilting platforms, narrow paths, and jump pads.", {
  platforms: [
    rect(190, 2460, 600, 310),
    rect(270, 2050, 440, 270),
    rect(160, 1660, 300, 300, "left-wing"),
    rect(535, 1660, 290, 300, "right-wing"),
    rect(210, 1220, 560, 290),
    rect(300, 800, 380, 290),
    rect(200, 125, 580, 460),
  ],
  checkpoints: [
    { id: "cp1", x: 490, y: 2060, w: 380, h: 42, label: "Wing Checkpoint" },
    { id: "cp2", x: 490, y: 830, w: 340, h: 42, label: "Tilt Checkpoint" },
  ],
  waypoints: [
    point(490, 2540, "Start"),
    point(490, 2140, "Narrow wing"),
    point(300, 1760, "Left wing"),
    point(680, 1760, "Right wing"),
    point(490, 1320, "Tilt deck"),
    point(490, 890, "Jump pad"),
    point(490, 230, "Finish"),
  ],
  obstacles: [
    { id: "ww-wing-a", type: "movingWing", x: 300, y: 1770, w: 300, h: 120, axis: "y", range: 75, speed: 0.85, warning: "Moving Plane Wing" },
    { id: "ww-wing-b", type: "movingWing", x: 675, y: 1760, w: 300, h: 120, axis: "x", range: 95, speed: 0.75, warning: "Moving Plane Wing" },
    { id: "ww-tilt-a", type: "tiltingPlatform", x: 490, y: 1340, w: 530, h: 240, maxTilt: 0.8, warning: "Tilting Platform" },
    { id: "ww-slip-a", type: "slipperyCloud", x: 490, y: 1180, w: 500, h: 125, slide: 0.42, warning: "Slippery Cloud Path" },
    { id: "ww-jump-a", type: "jumpPad", x: 490, y: 900, w: 180, h: 110, pushX: 0, pushY: -260, jump: 420, warning: "Jump Pad" },
    { id: "ww-bar-a", type: "rotatingBar", x: 490, y: 610, length: 310, width: 30, radius: 150, speed: 1.45, warning: "Soft Propeller" },
  ],
});

const CARGO_CHAOS = baseCourse("cargo-chaos", "Cargo Chaos", "Cargo crushers, conveyor intersections, rolling wheels, and route choices.", {
  platforms: [
    rect(130, 2440, 720, 330),
    rect(120, 1980, 720, 350),
    rect(90, 1500, 370, 410, "safe"),
    rect(520, 1500, 360, 410, "risky"),
    rect(140, 1030, 710, 360),
    rect(110, 620, 760, 330),
    rect(175, 120, 630, 440),
  ],
  checkpoints: [
    { id: "cp1", x: 490, y: 1990, w: 590, h: 42, label: "Cargo Checkpoint" },
    { id: "cp2", x: 490, y: 650, w: 600, h: 42, label: "Wheel Checkpoint" },
  ],
  waypoints: [
    point(490, 2540, "Start"),
    point(490, 2140, "Crushers"),
    point(260, 1660, "Safe crates"),
    point(690, 1660, "Risky crates"),
    point(490, 1160, "Intersection"),
    point(490, 720, "Wheel lane"),
    point(490, 230, "Finish"),
  ],
  obstacles: [
    { id: "cc-crush-a", type: "cargoCrusher", x: 335, y: 2120, w: 160, h: 160, axis: "x", range: 145, speed: 1, warning: "Cargo Crusher" },
    { id: "cc-crush-b", type: "cargoCrusher", x: 650, y: 2120, w: 160, h: 160, axis: "x", range: 145, speed: -1.1, warning: "Cargo Crusher" },
    { id: "cc-conv-a", type: "conveyor", x: 300, y: 1640, w: 320, h: 290, dirX: 0.75, dirY: -0.45, speed: 90, warning: "Cross Conveyor" },
    { id: "cc-conv-b", type: "conveyor", x: 680, y: 1640, w: 300, h: 290, dirX: -0.2, dirY: -1, speed: 130, warning: "Shortcut Conveyor" },
    { id: "cc-wheel-a", type: "rollingWheel", x: 490, y: 760, w: 720, h: 85, radius: 42, speed: 205, warning: "Inflatable Wheel" },
    { id: "cc-fog-a", type: "fogZone", x: 490, y: 1110, w: 650, h: 220, opacity: 0.22, warning: "Cargo Fog" },
  ],
});

const SKY_CROWN_FINAL = baseCourse("sky-crown-final", "Sky Crown Final", "Final round: claim the floating Sky Crown beacon first.", {
  final: true,
  objective: "Reach the end platform and claim the Sky Crown beacon first.",
  platforms: [
    rect(160, 2460, 660, 320),
    rect(190, 2050, 600, 280),
    rect(125, 1680, 315, 270, "left-cloud"),
    rect(540, 1680, 315, 270, "right-cloud"),
    rect(245, 1260, 490, 260),
    rect(330, 845, 320, 270),
    rect(235, 440, 510, 250),
    rect(365, 115, 250, 250, "crown"),
  ],
  checkpoints: [
    { id: "cp1", x: 490, y: 2065, w: 500, h: 42, label: "Final Checkpoint 1" },
    { id: "cp2", x: 490, y: 860, w: 285, h: 42, label: "Final Checkpoint 2" },
  ],
  finish: { x: 490, y: 165, radius: 58, crown: true },
  waypoints: [
    point(490, 2545, "Final start"),
    point(490, 2140, "Gate"),
    point(310, 1780, "Left cloud"),
    point(675, 1780, "Right cloud"),
    point(490, 1370, "Wind tunnel"),
    point(490, 930, "Difficult jump"),
    point(490, 520, "Crown bridge"),
    point(490, 170, "Sky Crown"),
  ],
  obstacles: [
    { id: "sc-wing-a", type: "movingWing", x: 490, y: 2120, w: 420, h: 105, axis: "x", range: 120, speed: 0.95, warning: "Moving Cloud Platform" },
    { id: "sc-bar-a", type: "rotatingBar", x: 310, y: 1780, length: 265, width: 28, radius: 132, speed: 1.35, warning: "Rotating Beam" },
    { id: "sc-bar-b", type: "rotatingBar", x: 675, y: 1780, length: 265, width: 28, radius: 132, speed: -1.35, warning: "Rotating Beam" },
    { id: "sc-wind-a", type: "windTurbine", x: 490, y: 1360, w: 520, h: 170, dirX: 0.85, dirY: -0.2, strength: 150, warning: "Wind Tunnel" },
    { id: "sc-tilt-a", type: "tiltingPlatform", x: 490, y: 560, w: 500, h: 220, maxTilt: 0.95, warning: "Tilting Final Platform" },
    { id: "sc-slip-a", type: "slipperyCloud", x: 490, y: 420, w: 440, h: 110, slide: 0.38, warning: "Slippery Crown Cloud" },
    { id: "sc-jump-a", type: "jumpPad", x: 490, y: 950, w: 170, h: 110, pushX: 0, pushY: -310, jump: 450, warning: "Crown Jump Pad" },
    { id: "sc-gate-a", type: "closingGate", x: 490, y: 1110, w: 430, h: 76, period: 2.5, openRatio: 0.44, warning: "Final Gate" },
  ],
});

const TUTORIAL_RUNWAY = baseCourse("practice-runway", "Practice Runway", "Small optional tutorial runway.", {
  height: 1500,
  start: { x: 490, y: 1370 },
  finish: { x: 490, y: 130, radius: 65 },
  objective: "Practice movement, jumping, diving, checkpoints, and moving obstacles.",
  platforms: [
    rect(190, 1220, 600, 240),
    rect(210, 850, 560, 260),
    rect(190, 480, 600, 260),
    rect(220, 80, 540, 290),
  ],
  checkpoints: [{ id: "tcp1", x: 490, y: 870, w: 480, h: 42, label: "Practice Checkpoint" }],
  waypoints: [point(490, 1310, "Start"), point(490, 970, "Jump gap"), point(490, 620, "Conveyor"), point(490, 170, "Finish")],
  obstacles: [
    { id: "tr-conv-a", type: "conveyor", x: 490, y: 655, w: 430, h: 110, dirX: 0.4, dirY: -1, speed: 70, warning: "Practice Conveyor" },
    { id: "tr-bar-a", type: "rotatingBar", x: 490, y: 330, length: 230, width: 26, radius: 110, speed: 1, warning: "Practice Luggage Bar" },
  ],
});

export const RUNWAY_COURSES = [
  CLOUDWAY_SPRINT,
  BAGGAGE_BELT_BLITZ,
  TURBULENCE_TERMINAL,
  WING_WALK_WOBBLE,
  CARGO_CHAOS,
  SKY_CROWN_FINAL,
];

export const ROUND_ONE_COURSES = ["cloudway-sprint", "baggage-belt-blitz", "turbulence-terminal"];
export const ROUND_TWO_COURSES = ["wing-walk-wobble", "cargo-chaos", "turbulence-terminal"];

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getRunwayCourse(courseId) {
  const course = RUNWAY_COURSES.find((item) => item.id === courseId);
  return clone(course || RUNWAY_COURSES[0]);
}

export function getTutorialCourse() {
  return clone(TUTORIAL_RUNWAY);
}

export function getCourseTitle(courseId) {
  return RUNWAY_COURSES.find((course) => course.id === courseId)?.title || "Runway Course";
}

export function chooseCompetitionCourses(random = Math.random) {
  const first = ROUND_ONE_COURSES[Math.floor(random() * ROUND_ONE_COURSES.length)];
  const roundTwoPool = ROUND_TWO_COURSES.filter((id) => id !== first);
  const second = roundTwoPool[Math.floor(random() * roundTwoPool.length)] || "cargo-chaos";
  return [first, second, "sky-crown-final"];
}

export function allObstacleTypes() {
  return [...new Set(RUNWAY_COURSES.flatMap((course) => course.obstacles.map((obstacle) => obstacle.type)))];
}
