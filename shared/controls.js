import { DEFAULT_CONTROLS } from "./storage.js";

const KEY_LABELS = {
  Space: "Space",
  Enter: "Enter",
  Escape: "Esc",
  ShiftLeft: "Shift",
  ShiftRight: "Shift",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
};

export function keyLabel(code) {
  if (KEY_LABELS[code]) return KEY_LABELS[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code.replace("Numpad", "Num ");
}

export function labelsFor(codes) {
  return [...new Set(codes.map(keyLabel))].join(" / ");
}

export function getControls(settings, gameId) {
  return settings?.controls?.[gameId] || DEFAULT_CONTROLS[gameId];
}

export function matchesControl(event, codes) {
  return codes.includes(event.code);
}

export function shouldPreventScroll(event, controls) {
  const groups = Object.values(controls || {}).flat();
  return groups.includes(event.code);
}

export function bindKeyRecorder(button, currentCode, onChange) {
  button.textContent = keyLabel(currentCode);
  button.addEventListener("click", () => {
    button.textContent = "Press key";
    button.classList.add("is-recording");
    const record = (event) => {
      event.preventDefault();
      button.classList.remove("is-recording");
      button.textContent = keyLabel(event.code);
      window.removeEventListener("keydown", record, true);
      onChange(event.code);
    };
    window.addEventListener("keydown", record, true);
  });
}

export function describeGameControls(settings, gameId) {
  const controls = getControls(settings, gameId);
  if (gameId === "memory") {
    return [
      `Move: ${labelsFor([
        controls.up[0],
        controls.down[0],
        controls.left[0],
        controls.right[0],
      ])}`,
      `Reveal: ${labelsFor(controls.select)}`,
      `Pause: ${labelsFor(controls.pause)}`,
    ];
  }
  if (gameId === "sumo") {
    return [
      `Player 1 move: ${labelsFor([controls.p1Up[0], controls.p1Left[0], controls.p1Down[0], controls.p1Right[0]])}`,
      `Player 1 push: ${labelsFor(controls.p1Push)}`,
      `Player 2 move: ${labelsFor([controls.p2Up[0], controls.p2Left[0], controls.p2Down[0], controls.p2Right[0]])}`,
      `Player 2 push: ${labelsFor(controls.p2Push)}`,
      `Pause: ${labelsFor(controls.pause)}`,
    ];
  }
  if (gameId === "archery") {
    return [
      "Mouse: move to aim, click to shoot",
      `Keyboard aim: ${labelsFor([controls.up[0], controls.left[0], controls.down[0], controls.right[0]])}`,
      `Shoot: ${labelsFor(controls.shoot)}`,
      `Pause: ${labelsFor(controls.pause)}`,
    ];
  }
  if (gameId === "cake-maker") {
    return [
      "Mouse: choose options and drag toppings or candles",
      `Undo: ${labelsFor(controls.undo)}`,
      `Save: ${labelsFor(controls.save)}`,
      `Party Mode: ${labelsFor(controls.party)}`,
      `Pause: ${labelsFor(controls.pause)}`,
    ];
  }
  if (gameId === "cloud-crew-clash") {
    return [
      "Mouse: move to aim, hold to launch",
      `Aim: ${labelsFor([controls.left[0], controls.right[0]])}`,
      `Launch: ${labelsFor(controls.launch)}`,
      `Abilities: ${labelsFor(controls.ability1)}, ${labelsFor(controls.ability2)}, ${labelsFor(controls.ability3)}`,
      `Pause: ${labelsFor(controls.pause)}`,
    ];
  }
  if (gameId === "runway-rumble") {
    return [
      `Move: ${labelsFor([controls.up[0], controls.left[0], controls.down[0], controls.right[0]])}`,
      `Jump: ${labelsFor(controls.jump)}`,
      `Dive or slide: ${labelsFor(controls.dive)}`,
      `Camera: ${labelsFor([controls.cameraLeft[0], controls.cameraRight[0], controls.cameraReset[0]])}`,
      `Pause: ${labelsFor(controls.pause)}`,
    ];
  }
  if (gameId === "cloud-ridge-rally") {
    return [
      `Accelerate: ${labelsFor(controls.accelerate)}`,
      `Brake / reverse: ${labelsFor(controls.brake)}`,
      `Air balance: ${labelsFor([controls.tiltBack[0], controls.tiltForward[0]])}`,
      `Ability: ${labelsFor(controls.ability)}`,
      `Restart: ${labelsFor(controls.restart)}`,
      `Pause: ${labelsFor(controls.pause)}`,
    ];
  }
  return [
    `Player 1: ${labelsFor(controls.p1Action)}`,
    `Player 2: ${labelsFor(controls.p2Action)}`,
    `Pause: ${labelsFor(controls.pause)}`,
  ];
}
