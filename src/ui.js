/**
 * ui.js — Score HUD and game overlay management
 *
 * Manages two UI surfaces:
 *   1. Score HUD — live score + high score updated each tick
 *   2. Overlay — fullscreen message panel (idle, paused, game-over states)
 *
 * Relies on DOM elements created by index.html. Throws early with a clear
 * error if required elements are missing (fail-fast over silent breakage).
 */

/** @typedef {'idle'|'running'|'paused'|'over'} Phase */

const OVERLAY_CONTENT = {
  idle: {
    title: 'Snake',
    body: 'Press <kbd>Enter</kbd> or tap <strong>Start</strong> to play',
    action: 'Start Game',
    actionAriaLabel: 'Start game',
  },
  paused: {
    title: 'Paused',
    body: 'Press <kbd>Enter</kbd> or <kbd>Escape</kbd> to resume',
    action: 'Resume',
    actionAriaLabel: 'Resume game',
  },
  over: {
    title: 'Game Over',
    body: '',  // Populated dynamically with final score
    action: 'Play Again',
    actionAriaLabel: 'Play again',
  },
};

/** @type {HTMLElement} */
let _scoreEl;
/** @type {HTMLElement} */
let _highScoreEl;
/** @type {HTMLElement} */
let _overlayEl;
/** @type {HTMLElement} */
let _overlayTitle;
/** @type {HTMLElement} */
let _overlayBody;
/** @type {HTMLButtonElement} */
let _overlayBtn;

/**
 * Initialises UI module. Must be called once after DOM is ready.
 * Throws if any required element is absent.
 *
 * @param {{
 *   scoreEl: HTMLElement,
 *   highScoreEl: HTMLElement,
 *   overlayEl: HTMLElement,
 *   overlayTitle: HTMLElement,
 *   overlayBody: HTMLElement,
 *   overlayBtn: HTMLButtonElement,
 * }} elements
 */
export function initUI({ scoreEl, highScoreEl, overlayEl, overlayTitle, overlayBody, overlayBtn }) {
  const required = { scoreEl, highScoreEl, overlayEl, overlayTitle, overlayBody, overlayBtn };
  for (const [name, el] of Object.entries(required)) {
    if (!el) throw new Error(`ui.js: missing required element "${name}"`);
  }
  _scoreEl     = scoreEl;
  _highScoreEl = highScoreEl;
  _overlayEl   = overlayEl;
  _overlayTitle = overlayTitle;
  _overlayBody  = overlayBody;
  _overlayBtn   = overlayBtn;
}

/**
 * Updates the live score display.
 *
 * @param {number} score
 */
export function updateScore(score) {
  _scoreEl.textContent = String(score);
  // Announce score changes to screen readers every 5 points (not every tick)
  if (score > 0 && score % 5 === 0) {
    _scoreEl.setAttribute('aria-label', `Score: ${score}`);
  }
}

/**
 * Updates the high score display.
 *
 * @param {number} highScore
 */
export function updateHighScore(highScore) {
  _highScoreEl.textContent = String(highScore);
}

/**
 * Shows the overlay for the given game phase.
 * For 'over', pass the final score to populate the body text.
 *
 * CSS transition: the overlay uses `opacity` + `pointer-events` for smooth
 * fade-in/out — set `.overlay { transition: opacity 200ms ease }` in style.css.
 *
 * @param {Phase} phase
 * @param {{ finalScore?: number, highScore?: number }} [data]
 * @param {() => void} [onAction] - Callback for the overlay action button
 */
export function showOverlay(phase, data = {}, onAction) {
  if (phase === 'running') {
    hideOverlay();
    return;
  }

  const content = OVERLAY_CONTENT[phase];
  if (!content) return;

  _overlayTitle.textContent = content.title;
  _overlayBody.innerHTML = content.body;

  if (phase === 'over' && data.finalScore !== undefined) {
    const newBest = data.finalScore === data.highScore && data.highScore > 0;
    _overlayBody.innerHTML =
      `Final score: <strong>${data.finalScore}</strong>` +
      (newBest ? ' — <em>New high score!</em>' : '');
  }

  _overlayBtn.textContent = content.action;
  _overlayBtn.setAttribute('aria-label', content.actionAriaLabel);

  // Replace listener to avoid stacking callbacks across game sessions
  const fresh = _overlayBtn.cloneNode(true);
  _overlayBtn.replaceWith(fresh);
  _overlayBtn = /** @type {HTMLButtonElement} */ (fresh);
  if (onAction) _overlayBtn.addEventListener('click', onAction, { once: true });

  _overlayEl.classList.remove('hidden');
  _overlayEl.setAttribute('aria-hidden', 'false');
  // Move focus to the action button so keyboard users don't have to tab to it
  _overlayBtn.focus();
}

/**
 * Hides the overlay (game is running).
 */
export function hideOverlay() {
  _overlayEl.classList.add('hidden');
  _overlayEl.setAttribute('aria-hidden', 'true');
}