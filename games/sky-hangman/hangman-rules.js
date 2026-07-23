export const DIFFICULTY_RULES = {
  easy: {
    id: "easy",
    label: "Easy",
    maxMistakes: 8,
    baseScore: 100,
    freeMeaningHints: 1,
    hintPenalty: 0,
    revealPenalty: 18,
    hardRevealCostsMistake: false,
  },
  normal: {
    id: "normal",
    label: "Normal",
    maxMistakes: 6,
    baseScore: 200,
    freeMeaningHints: 0,
    hintPenalty: 35,
    revealPenalty: 55,
    hardRevealCostsMistake: false,
  },
  hard: {
    id: "hard",
    label: "Hard",
    maxMistakes: 5,
    baseScore: 350,
    freeMeaningHints: 0,
    hintPenalty: 70,
    revealPenalty: 95,
    hardRevealCostsMistake: true,
  },
};

export const VARIATIONS = {
  classic: {
    id: "classic",
    label: "Classic",
    description: "Guess one word with the standard mistake limit.",
  },
  quick: {
    id: "quick",
    label: "Quick Word",
    description: "Shorter words and only four mistakes.",
  },
  phrase: {
    id: "phrase",
    label: "Phrase Mode",
    description: "Travel-friendly phrases with spaces and punctuation revealed.",
  },
  category: {
    id: "category",
    label: "Category Challenge",
    description: "Complete five words from one category and save the total.",
  },
  survival: {
    id: "survival",
    label: "Survival Mode",
    description: "Keep solving words with one shared mistake pool.",
  },
};

export function rulesFor(difficulty = "normal", variation = "classic") {
  const base = DIFFICULTY_RULES[difficulty] || DIFFICULTY_RULES.normal;
  if (variation === "quick") return { ...base, maxMistakes: 4, baseScore: Math.round(base.baseScore * 0.7) };
  if (variation === "survival") return { ...base, maxMistakes: base.maxMistakes + 4 };
  return { ...base };
}

export function normalizeSecret(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function validateSecretWord(value, hint = "") {
  const word = normalizeSecret(value);
  const cleanHint = String(hint || "").trim();
  if (!word) return { ok: false, message: "Enter a secret word or short phrase." };
  if (word.length > 28) return { ok: false, message: "Keep the phrase at 28 characters or less." };
  if ((word.match(/[A-Z]/g) || []).length < 3) return { ok: false, message: "Use at least three letters." };
  if ((word.match(/[A-Z]/g) || []).length > 18) return { ok: false, message: "Use 18 letters or fewer." };
  if (!/^[A-Z\s'-]+$/.test(word)) return { ok: false, message: "Use only letters, spaces, hyphens, and apostrophes." };
  if (/<|>|script|https?:|www\./i.test(value)) return { ok: false, message: "Links and code are not allowed." };
  if (cleanHint.length > 80) return { ok: false, message: "Keep the hint at 80 characters or less." };
  return { ok: true, word, hint: cleanHint };
}

export function createRoundState(entry, setup) {
  const rules = rulesFor(setup.difficulty, setup.variation);
  const word = normalizeSecret(entry.word);
  return {
    entry: {
      ...entry,
      word,
      hint: entry.hint || "Think about the category.",
      definition: entry.definition || entry.hint || "A friendly word clue.",
    },
    setup: { ...setup },
    rules,
    guessed: [],
    correctLetters: [],
    incorrectLetters: [],
    revealedLetters: [],
    mistakes: 0,
    maxMistakes: rules.maxMistakes,
    hints: {
      category: false,
      meaning: false,
      reveal: 0,
    },
    status: "Guess a letter to help the airplane depart.",
    finished: false,
    won: false,
    score: 0,
  };
}

export function visibleWord(round) {
  return [...round.entry.word].map((char) => {
    if (!/[A-Z]/.test(char)) return char;
    return round.correctLetters.includes(char) || round.revealedLetters.includes(char) ? char : "_";
  });
}

export function visibleWordString(round) {
  return visibleWord(round).join(" ");
}

export function unrevealedLetters(round) {
  const letters = [...new Set(round.entry.word.match(/[A-Z]/g) || [])];
  return letters.filter((letter) => !round.correctLetters.includes(letter) && !round.revealedLetters.includes(letter));
}

export function isComplete(round) {
  return unrevealedLetters(round).length === 0;
}

export function processGuess(round, rawLetter) {
  if (round.finished) return { type: "ignored", message: "Round already ended." };
  const letter = String(rawLetter || "").toUpperCase();
  if (!/^[A-Z]$/.test(letter)) return { type: "ignored", message: "Choose A through Z." };
  if (round.guessed.includes(letter)) return { type: "duplicate", message: `${letter} was already guessed.` };
  round.guessed.push(letter);
  if (round.entry.word.includes(letter)) {
    round.correctLetters.push(letter);
    round.status = `${letter} is in the word.`;
    if (isComplete(round)) finishRound(round, true);
    return { type: "correct", letter, message: round.status };
  }
  round.incorrectLetters.push(letter);
  round.mistakes += 1;
  round.status = `${letter} is not in the word.`;
  if (round.mistakes >= round.maxMistakes) finishRound(round, false);
  return { type: "incorrect", letter, message: round.status };
}

export function useHint(round, type) {
  if (round.finished) return { ok: false, message: "Hints are disabled after the round." };
  if (type === "category") {
    round.hints.category = true;
    round.status = `Category: ${round.entry.category}`;
    return { ok: true, message: round.status };
  }
  if (type === "meaning") {
    if (round.hints.meaning && round.setup.difficulty !== "easy") return { ok: false, message: "Meaning hint already used." };
    round.hints.meaning = true;
    round.status = round.entry.hint || round.entry.definition;
    return { ok: true, message: round.status };
  }
  if (type === "reveal") {
    const hidden = unrevealedLetters(round);
    if (hidden.length <= 1) return { ok: false, message: "Reveal Letter is disabled for the last hidden letter." };
    const letter = hidden[Math.floor(Math.random() * hidden.length)];
    round.revealedLetters.push(letter);
    if (!round.guessed.includes(letter)) round.guessed.push(letter);
    round.hints.reveal += 1;
    if (round.rules.hardRevealCostsMistake) round.mistakes = Math.min(round.maxMistakes, round.mistakes + 1);
    round.status = `Hint revealed ${letter}.`;
    if (isComplete(round)) finishRound(round, true);
    if (round.mistakes >= round.maxMistakes) finishRound(round, false);
    return { ok: true, letter, message: round.status };
  }
  return { ok: false, message: "Unknown hint." };
}

export function finishRound(round, won) {
  round.finished = true;
  round.won = Boolean(won);
  round.score = calculateScore(round);
  round.status = won ? "Word Cleared!" : "Flight Delayed - Word Not Found";
  return round;
}

export function calculateScore(round, streak = 0) {
  if (!round.won) return 0;
  const rules = round.rules;
  const length = (round.entry.word.match(/[A-Z]/g) || []).length;
  const noMissBonus = round.mistakes === 0 ? Math.round(rules.baseScore * 0.25) : 0;
  const noHintBonus = round.hints.meaning || round.hints.reveal ? 0 : Math.round(rules.baseScore * 0.18);
  const longBonus = Math.max(0, length - 6) * 12;
  const streakBonus = Math.min(180, streak * 20);
  const mistakePenalty = round.mistakes * Math.round(rules.baseScore * 0.09);
  const meaningPenalty = round.hints.meaning ? Math.max(0, rules.hintPenalty - rules.freeMeaningHints * rules.hintPenalty) : 0;
  const revealPenalty = round.hints.reveal * rules.revealPenalty;
  return Math.max(0, rules.baseScore + noMissBonus + noHintBonus + longBonus + streakBonus - mistakePenalty - meaningPenalty - revealPenalty);
}

export function roundSummary(round) {
  return {
    word: round.entry.word,
    category: round.entry.category,
    difficulty: round.setup.difficulty,
    variation: round.setup.variation,
    won: round.won,
    score: round.score,
    mistakes: round.mistakes,
    remainingLives: Math.max(0, round.maxMistakes - round.mistakes),
    hintsUsed: Number(round.hints.category) + Number(round.hints.meaning) + round.hints.reveal,
    incorrectLetters: [...round.incorrectLetters],
  };
}
