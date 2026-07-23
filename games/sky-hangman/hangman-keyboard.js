export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function createLetterKeyboard({ guessed = [], correct = [], incorrect = [], disabled = false, onGuess }) {
  const board = document.createElement("div");
  board.className = "hangman-keyboard";
  board.setAttribute("role", "group");
  board.setAttribute("aria-label", "Letter keyboard");
  for (const letter of LETTERS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = letter;
    button.dataset.letter = letter;
    button.setAttribute("aria-label", `Guess letter ${letter}`);
    const used = guessed.includes(letter);
    const isCorrect = correct.includes(letter);
    const isIncorrect = incorrect.includes(letter);
    button.className = [
      "hangman-letter",
      isCorrect ? "is-correct" : "",
      isIncorrect ? "is-incorrect" : "",
      used ? "is-used" : "",
    ].filter(Boolean).join(" ");
    if (isCorrect) button.setAttribute("aria-label", `${letter}, correct`);
    if (isIncorrect) button.setAttribute("aria-label", `${letter}, incorrect`);
    button.disabled = disabled || used;
    button.addEventListener("click", () => onGuess?.(letter));
    board.append(button);
  }
  return board;
}

export function updateLetterKeyboard(board, round, disabled = false) {
  if (!board) return;
  for (const button of board.querySelectorAll("[data-letter]")) {
    const letter = button.dataset.letter;
    const isCorrect = round.correctLetters.includes(letter) || round.revealedLetters.includes(letter);
    const isIncorrect = round.incorrectLetters.includes(letter);
    const used = round.guessed.includes(letter);
    button.classList.toggle("is-correct", isCorrect);
    button.classList.toggle("is-incorrect", isIncorrect);
    button.classList.toggle("is-used", used);
    button.disabled = disabled || used || round.finished;
    button.setAttribute("aria-label", isCorrect ? `${letter}, correct` : isIncorrect ? `${letter}, incorrect` : `Guess letter ${letter}`);
  }
}
