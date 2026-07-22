export const TOTAL_LAPS = 3;
export const RACER_COUNT = 6;

export const DIFFICULTY = {
  easy: {
    label: "Easy",
    aiSpeed: 0.82,
    aiBrake: 1.22,
    aiMistake: 0.22,
    obstacleSpeed: 0.72,
    boundaryAssist: 1.25,
    steeringAssist: 0.24,
    unlockText: "Slower rivals, earlier braking, slower obstacles, and strong steering help.",
  },
  normal: {
    label: "Normal",
    aiSpeed: 0.94,
    aiBrake: 1,
    aiMistake: 0.11,
    obstacleSpeed: 1,
    boundaryAssist: 1,
    steeringAssist: 0.13,
    unlockText: "Balanced rival pace, normal obstacles, and moderate steering help.",
  },
  hard: {
    label: "Hard",
    aiSpeed: 1.05,
    aiBrake: 0.86,
    aiMistake: 0.055,
    obstacleSpeed: 1.22,
    boundaryAssist: 0.86,
    steeringAssist: 0.05,
    unlockText: "Faster fair rivals, stronger cornering, faster obstacles, and less assist.",
  },
};

export const COMPUTER_NAMES = ["Skybolt", "Turbo Wing", "Runway Ruby", "Jetstream", "Cloud Rider"];

const LEVELS = [
  {
    id: 1,
    name: "Runway Starter",
    environment: "Training apron",
    description: "A wide beginner circuit with long straights, a big circular turn, and gentle checkpoints.",
    roadWidth: 132,
    sky: "#a8e8ff",
    ground: "#e7f6d8",
    unlockRequirement: "Finish 4th or better",
    unlockPosition: 4,
    bonusObjective: "Finish without a checkpoint reset",
    checkpoints: 4,
    points: [
      [300, 540],
      [760, 540],
      [980, 485],
      [1075, 310],
      [1015, 145],
      [770, 80],
      [430, 92],
      [230, 190],
      [190, 390],
    ],
    obstacles: [
      { type: "cargo-box", progress: 0.18, offset: -48, radius: 20 },
      { type: "cargo-box", progress: 0.62, offset: 48, radius: 20 },
      { type: "luggage-cart", progress: 0.36, offset: 0, radius: 22, amplitude: 56, period: 5.8 },
      { type: "speed-bump", progress: 0.78, offset: 0, w: 110, h: 18 },
    ],
    surfaces: [
      { type: "concrete", from: 0.02, to: 0.18 },
      { type: "boost", from: 0.2, to: 0.25 },
      { type: "cloud-gravel", from: 0.66, to: 0.72, side: 1 },
    ],
  },
  {
    id: 2,
    name: "Cloudside Curves",
    environment: "Cloudside terminal",
    description: "Wide curves, a circular loop, an S-road, and the first real speed-pad choices.",
    roadWidth: 118,
    sky: "#b7f0ff",
    ground: "#eaf7ff",
    unlockRequirement: "Finish 4th or better",
    unlockPosition: 4,
    bonusObjective: "Set the fastest lap",
    checkpoints: 5,
    points: [
      [260, 560],
      [650, 570],
      [950, 515],
      [1080, 370],
      [1040, 205],
      [870, 110],
      [670, 150],
      [610, 320],
      [720, 430],
      [530, 480],
      [290, 410],
      [180, 260],
      [205, 120],
      [430, 95],
    ],
    obstacles: [
      { type: "luggage-cart", progress: 0.22, offset: 0, radius: 22, amplitude: 58, period: 4.8 },
      { type: "sign-arm", progress: 0.42, offset: 0, radius: 28, period: 5.2 },
      { type: "road-barrier", progress: 0.58, offset: -38, w: 70, h: 18 },
      { type: "luggage-cart", progress: 0.76, offset: 0, radius: 22, amplitude: 44, period: 5.5 },
    ],
    surfaces: [
      { type: "boost", from: 0.1, to: 0.15 },
      { type: "cloud-gravel", from: 0.5, to: 0.57, side: -1 },
      { type: "wet", from: 0.68, to: 0.75 },
    ],
  },
  {
    id: 3,
    name: "Cargo Corners",
    environment: "Cargo yard",
    description: "Tighter cargo lanes, sharp corners, oil patches, moving crates, and closing gates.",
    roadWidth: 104,
    sky: "#c6f2ff",
    ground: "#f2e8d7",
    unlockRequirement: "Finish 3rd or better",
    unlockPosition: 3,
    bonusObjective: "Perform three clean overtakes",
    checkpoints: 6,
    points: [
      [265, 555],
      [570, 555],
      [760, 490],
      [785, 335],
      [670, 255],
      [810, 135],
      [1030, 190],
      [1080, 400],
      [930, 540],
      [690, 565],
      [520, 455],
      [420, 300],
      [255, 285],
      [185, 410],
    ],
    obstacles: [
      { type: "moving-crate", progress: 0.14, offset: 0, radius: 22, amplitude: 52, period: 4.6 },
      { type: "oil", progress: 0.3, offset: 24, radius: 32 },
      { type: "closing-gate", progress: 0.48, offset: 0, w: 120, h: 18, period: 5.8 },
      { type: "forklift", progress: 0.66, offset: -28, radius: 24, amplitude: 42, period: 6.1 },
      { type: "tyre-barrier", progress: 0.82, offset: 42, radius: 24 },
    ],
    surfaces: [
      { type: "wet", from: 0.22, to: 0.3 },
      { type: "oil", from: 0.31, to: 0.35 },
      { type: "boost", from: 0.7, to: 0.75 },
    ],
  },
  {
    id: 4,
    name: "Sky Ring Rally",
    environment: "Elevated sky ring",
    description: "Large circular sky-road sections, floating bridges, high-speed straights, and wind turbines.",
    roadWidth: 98,
    sky: "#9ee7ff",
    ground: "#dbf6f0",
    unlockRequirement: "Finish 2nd or better",
    unlockPosition: 2,
    bonusObjective: "Use no checkpoint reset",
    checkpoints: 7,
    points: [
      [250, 560],
      [610, 575],
      [965, 545],
      [1110, 385],
      [1025, 205],
      [780, 155],
      [660, 275],
      [790, 405],
      [605, 500],
      [360, 455],
      [210, 320],
      [210, 145],
      [430, 80],
      [630, 130],
    ],
    obstacles: [
      { type: "wind-turbine", progress: 0.18, offset: 0, radius: 34, period: 4.2 },
      { type: "rotating-arm", progress: 0.38, offset: 0, radius: 34, period: 4.7 },
      { type: "moving-barrier", progress: 0.53, offset: 0, w: 90, h: 18, amplitude: 44, period: 4.9 },
      { type: "narrow-bridge", progress: 0.7, offset: 0, radius: 12 },
      { type: "wind-turbine", progress: 0.84, offset: 0, radius: 34, period: 5.2 },
    ],
    surfaces: [
      { type: "boost", from: 0.12, to: 0.17 },
      { type: "wind", from: 0.18, to: 0.25, strength: 70 },
      { type: "boost", from: 0.34, to: 0.38 },
      { type: "wet", from: 0.54, to: 0.6 },
    ],
  },
  {
    id: 5,
    name: "Grand Airport Circuit",
    environment: "Grand airport",
    description: "The full championship circuit with runway straights, a round section, S-turns, tunnel, cargo yard, and bridge.",
    roadWidth: 96,
    sky: "#bdefff",
    ground: "#eef1dc",
    unlockRequirement: "Finish 1st",
    unlockPosition: 1,
    bonusObjective: "Finish first with no major collision",
    checkpoints: 8,
    points: [
      [245, 585],
      [620, 588],
      [1040, 558],
      [1155, 405],
      [1100, 250],
      [905, 205],
      [815, 315],
      [910, 440],
      [710, 520],
      [520, 460],
      [455, 310],
      [565, 205],
      [460, 105],
      [255, 145],
      [150, 290],
      [175, 470],
    ],
    obstacles: [
      { type: "moving-crate", progress: 0.1, offset: 0, radius: 22, amplitude: 54, period: 4.4 },
      { type: "closing-gate", progress: 0.24, offset: 0, w: 118, h: 18, period: 5.2 },
      { type: "rotating-arm", progress: 0.36, offset: 0, radius: 36, period: 4.1 },
      { type: "oil", progress: 0.48, offset: -20, radius: 32 },
      { type: "wind-turbine", progress: 0.58, offset: 0, radius: 34, period: 4.6 },
      { type: "rolling-luggage", progress: 0.72, offset: 0, radius: 20, amplitude: 56, period: 4.8 },
      { type: "moving-bridge", progress: 0.85, offset: 0, radius: 22, amplitude: 34, period: 5.8 },
    ],
    surfaces: [
      { type: "concrete", from: 0.02, to: 0.16 },
      { type: "boost", from: 0.17, to: 0.21 },
      { type: "wet", from: 0.44, to: 0.5 },
      { type: "oil", from: 0.5, to: 0.54 },
      { type: "wind", from: 0.58, to: 0.64, strength: -82 },
      { type: "cloud-gravel", from: 0.76, to: 0.82 },
    ],
  },
];

export const CIRCUIT_LEVELS = LEVELS.map(prepareTrack);

export function getCircuitLevel(levelId = 1) {
  return CIRCUIT_LEVELS.find((level) => level.id === Number(levelId)) || CIRCUIT_LEVELS[0];
}

export function difficultyConfig(id = "normal") {
  return DIFFICULTY[id] || DIFFICULTY.normal;
}

function prepareTrack(level) {
  const points = level.points.map(([x, y]) => ({ x, y }));
  const segments = [];
  let length = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const segmentLength = Math.hypot(b.x - a.x, b.y - a.y);
    segments.push({ a, b, length: segmentLength, start: length });
    length += segmentLength;
  }
  const checkpoints = Array.from({ length: level.checkpoints }, (_, index) => {
    const progress = (index + 1) / (level.checkpoints + 1);
    return { id: index, progress, distance: progress * length, state: "upcoming" };
  });
  const start = sampleTrack({ points, segments, length }, 0);
  return {
    ...level,
    points,
    segments,
    length,
    checkpoints,
    start,
  };
}

export function sampleTrack(track, progress) {
  const distance = normalizedProgress(progress) * track.length;
  const segment = track.segments.find((item) => distance >= item.start && distance <= item.start + item.length) || track.segments[0];
  const t = segment.length ? (distance - segment.start) / segment.length : 0;
  const x = segment.a.x + (segment.b.x - segment.a.x) * t;
  const y = segment.a.y + (segment.b.y - segment.a.y) * t;
  const angle = Math.atan2(segment.b.y - segment.a.y, segment.b.x - segment.a.x);
  return { x, y, angle, segment };
}

export function trackPointWithOffset(track, progress, offset = 0) {
  const point = sampleTrack(track, progress);
  const normal = point.angle + Math.PI / 2;
  return {
    ...point,
    x: point.x + Math.cos(normal) * offset,
    y: point.y + Math.sin(normal) * offset,
  };
}

export function normalizedProgress(progress) {
  return ((progress % 1) + 1) % 1;
}
