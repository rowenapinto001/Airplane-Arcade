import { getData, updateData } from "../../shared/storage.js";
import { DEFAULT_RULES, cloneState } from "./ludo-rules.js";

export function serializeGameState(state) {
  const copy = cloneState(state);
  copy.lastSavedAt = Date.now();
  copy.phase = copy.phase === "gameOver" ? "gameOver" : copy.phase;
  return copy;
}

export function validateSavedGame(saved) {
  if (!saved || saved.gameId !== "sky-ludo") return null;
  if (!Array.isArray(saved.players) || !saved.players.length) return null;
  if (!saved.players.every((player) => Array.isArray(player.tokens))) return null;
  return {
    ...saved,
    rules: { ...DEFAULT_RULES, ...(saved.rules || {}) },
    validMoves: [],
    diceRolling: false,
  };
}

export async function saveGameState(state) {
  const serialized = serializeGameState(state);
  return updateData((draft) => {
    const record = draft.progress.skyLudoRecords;
    record.savedGameState = serialized;
    record.selectedMode = state.mode;
    record.selectedDifficulty = state.difficulty;
    record.preferredRules = { ...record.preferredRules, ...state.rules };
    return draft;
  });
}

export async function clearSavedGame() {
  return updateData((draft) => {
    draft.progress.skyLudoRecords.savedGameState = null;
    return draft;
  });
}

export async function loadSkyLudoRecords() {
  const data = await getData();
  const record = data.progress.skyLudoRecords;
  return {
    data,
    record,
    savedGame: validateSavedGame(record.savedGameState),
  };
}
