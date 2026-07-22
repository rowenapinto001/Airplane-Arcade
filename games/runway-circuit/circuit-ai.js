import { angleDifference, nearestTrackInfo, obstacleShape } from "./circuit-physics.js";
import { sampleTrack, trackPointWithOffset } from "./circuit-levels.js";

export function createAiInputMap(race, difficulty, dt) {
  const inputs = new Map();
  for (const car of race.racers) {
    if (car.isPlayer || car.finishTime !== null) continue;
    inputs.set(car.id, updateComputerAI(race, car, difficulty, dt));
  }
  return inputs;
}

export function updateComputerAI(race, car, difficulty, dt) {
  const track = race.level;
  car.ai.mistakeTimer = Math.max(0, car.ai.mistakeTimer - dt);
  if (car.ai.mistakeTimer <= 0 && Math.random() < difficulty.aiMistake * dt * 0.35) {
    car.ai.mistakeTimer = 0.45 + Math.random() * 0.7;
    car.ai.mistakeSteer = (Math.random() - 0.5) * 0.75;
  }

  const info = nearestTrackInfo(track, car.x, car.y);
  const lookAheadDistance = 85 + Math.max(0, car.speed) * 0.55;
  const progressAhead = (info.routeDistance + lookAheadDistance) / track.length;
  let targetOffset = car.ai.targetOffset || 0;
  const nextOpponent = nearestOpponentAhead(race, car);
  if (nextOpponent && nextOpponent.distance < 170 && Math.abs(nextOpponent.side) < 40) {
    targetOffset += nextOpponent.side <= 0 ? 34 : -34;
  }
  targetOffset += obstacleAvoidanceOffset(race, car, progressAhead);
  targetOffset = Math.max(-track.roadWidth * 0.32, Math.min(track.roadWidth * 0.32, targetOffset));
  targetOffset = targetOffset * 0.8 + (car.ai.targetOffset || 0) * 0.2;
  car.ai.targetOffset = targetOffset;

  const target = trackPointWithOffset(track, progressAhead, targetOffset);
  const desiredAngle = Math.atan2(target.y - car.y, target.x - car.x);
  let steerError = angleDifference(desiredAngle, car.angle);
  if (car.ai.mistakeTimer > 0) steerError += car.ai.mistakeSteer;

  const curve = upcomingCurve(track, info.routeDistance, 110);
  const curveBrake = Math.min(1, Math.abs(curve) * 1.7);
  const targetSpeed = car.stats.speed * difficulty.aiSpeed * (1 - curveBrake * 0.38);
  const offCenterBrake = Math.min(0.3, Math.abs(info.distanceFromCenter) / track.roadWidth);
  const obstacleBrake = obstacleAhead(race, car) ? 0.28 : 0;
  const brakeNeed = car.speed > targetSpeed * (1.02 - obstacleBrake - offCenterBrake);

  return {
    accelerate: !brakeNeed,
    brake: brakeNeed,
    left: steerError < -0.04,
    right: steerError > 0.04,
    handbrake: Math.abs(steerError) > 0.56 && car.speed > 125,
    boost: car.boost > car.stats.boostCapacity * 0.45 && Math.abs(curve) < 0.22 && Math.abs(steerError) < 0.18,
    steeringAssist: Math.max(-0.25, Math.min(0.25, steerError * 0.28)),
  };
}

function upcomingCurve(track, routeDistance, distance) {
  const a = sampleTrack(track, routeDistance / track.length);
  const b = sampleTrack(track, (routeDistance + distance) / track.length);
  return angleDifference(b.angle, a.angle);
}

function nearestOpponentAhead(race, car) {
  let best = null;
  for (const other of race.racers) {
    if (other === car || other.finishTime !== null) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const forward = Math.cos(car.angle) * dx + Math.sin(car.angle) * dy;
    if (forward <= 0) continue;
    const side = Math.cos(car.angle + Math.PI / 2) * dx + Math.sin(car.angle + Math.PI / 2) * dy;
    if (!best || forward < best.distance) best = { distance: forward, side };
  }
  return best;
}

function obstacleAvoidanceOffset(race, car, progressAhead) {
  let offset = 0;
  for (const obstacle of race.obstacles) {
    const progressGap = forwardProgressGap(car.progress, obstacle.progress);
    if (progressGap <= 0 || progressGap > 0.09) continue;
    const shape = obstacleShape(race, obstacle);
    if (!shape.active) continue;
    const target = sampleTrack(race.level, progressAhead);
    const side = Math.cos(target.angle + Math.PI / 2) * (shape.x - target.x) + Math.sin(target.angle + Math.PI / 2) * (shape.y - target.y);
    offset += side > 0 ? -34 : 34;
  }
  return offset;
}

function obstacleAhead(race, car) {
  return race.obstacles.some((obstacle) => {
    const gap = forwardProgressGap(car.progress, obstacle.progress);
    if (gap <= 0 || gap > 0.055) return false;
    const shape = obstacleShape(race, obstacle);
    if (!shape.active) return false;
    const dx = shape.x - car.x;
    const dy = shape.y - car.y;
    const forward = Math.cos(car.angle) * dx + Math.sin(car.angle) * dy;
    const side = Math.abs(Math.cos(car.angle + Math.PI / 2) * dx + Math.sin(car.angle + Math.PI / 2) * dy);
    return forward > 0 && forward < 150 && side < shape.radius + 28;
  });
}

function forwardProgressGap(from, to) {
  let gap = to - from;
  if (gap < 0) gap += 1;
  return gap;
}
