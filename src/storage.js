/**
 * storage.js — LocalStorage persistence with graceful fallback
 *
 * All reads and writes are wrapped in try/catch.
 * Private browsing mode, storage quota exceeded, or SecurityErrors
 * will silently no-op — the game continues without persistence.
 *
 * High score is stored as a plain integer string under key 'snakeHighScore'.
 */

const KEY = 'snakeHighScore';

/**
 * Returns the stored high score, or 0 if unavailable.
 *
 * @returns {number}
 */
export function getHighScore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return 0;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

/**
 * Saves the score as the new high score only if it exceeds the current one.
 * No-ops silently on storage failure.
 *
 * @param {number} score
 * @returns {boolean} true if the new high score was saved, false otherwise
 */
export function maybeSaveHighScore(score) {
  if (score <= getHighScore()) return false;
  try {
    localStorage.setItem(KEY, String(score));
    return true;
  } catch {
    return false;
  }
}

/**
 * Resets the high score to 0. Useful for a "clear scores" UI action.
 * No-ops silently on storage failure.
 */
export function clearHighScore() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable — nothing to clear
  }
}