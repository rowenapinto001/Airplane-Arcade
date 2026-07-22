export function rollFairDice() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(1);
    do {
      crypto.getRandomValues(bytes);
    } while (bytes[0] >= 252);
    return (bytes[0] % 6) + 1;
  }
  return Math.floor(Math.random() * 6) + 1;
}

export function diceFaceDots(value) {
  const dots = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return dots[value] || dots[1];
}
