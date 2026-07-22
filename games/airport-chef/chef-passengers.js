const PASSENGERS = [
  {
    id: "business",
    name: "Boarding Boss",
    patience: 42,
    tip: 1.18,
    color: "#315e9e",
    accent: "#ffd35a",
    line: "Quick boarding snack, please.",
  },
  {
    id: "family",
    name: "Holiday Family",
    patience: 58,
    tip: 0.94,
    color: "#ef6da8",
    accent: "#ffe6a7",
    line: "Something cheerful before takeoff.",
  },
  {
    id: "pilot",
    name: "Captain Crew",
    patience: 48,
    tip: 1.08,
    color: "#26354f",
    accent: "#80d9f2",
    line: "Crew meal, steady hands.",
  },
  {
    id: "student",
    name: "Backpack Flyer",
    patience: 50,
    tip: 1,
    color: "#4aa75c",
    accent: "#f1c84b",
    line: "I saved up for this order.",
  },
  {
    id: "tourist",
    name: "Camera Tourist",
    patience: 54,
    tip: 1.02,
    color: "#f47b43",
    accent: "#43acd8",
    line: "Make it photo-worthy.",
  },
  {
    id: "moon",
    name: "Moon Traveler",
    patience: 45,
    tip: 1.22,
    color: "#7a65d8",
    accent: "#d7ecff",
    line: "Low gravity appetite.",
  },
];

let passengerSeed = 0;

export function resetPassengerSeed() {
  passengerSeed = 0;
}

export function passengerTypesForLevel(level) {
  const count = Math.min(PASSENGERS.length, 2 + Math.floor(level / 4));
  return PASSENGERS.slice(0, count);
}

export function createPassenger(level, difficultyConfig, index = 0) {
  const options = passengerTypesForLevel(level);
  const type = options[(passengerSeed + index) % options.length];
  passengerSeed += 1;
  const patience = Math.round(type.patience * difficultyConfig.patienceMultiplier);
  return {
    ...type,
    id: `${type.id}-${Date.now().toString(36)}-${passengerSeed}`,
    typeId: type.id,
    patienceMax: patience,
    patience,
    waiting: 0,
    mood: "happy",
  };
}

export function updatePassengerMood(order) {
  const ratio = order.passenger.patience / order.passenger.patienceMax;
  if (ratio < 0.22) order.passenger.mood = "worried";
  else if (ratio < 0.52) order.passenger.mood = "waiting";
  else order.passenger.mood = "happy";
  return order.passenger.mood;
}
