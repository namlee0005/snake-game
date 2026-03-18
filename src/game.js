/**
 * game.js — Game loop, renderer, and state machine
 *
 * Owns the canonical GameState and wires all modules together.
 * Game loop: requestAnimationFrame + timestamp accumulator (delta-time gated ticks).
 * Renderer: full canvas clear each tick — correct and sufficient for a 20×20 grid.
 *
 * State machine: idle → running → paused → over → running (restart)
 */

import { createSnake, changeDirection, moveSnake, grow, collidesWithSelf, collidesWithWall } from './snake.js';
import { spawnFood } from './food.js';
import { getHighScore, maybeSaveHighScore } from './storage.js';
import { bindKeyboard, unbindKeyboard, bindDpad } from './input.js';
import { initUI, updateScore, updateHighScore, showOverlay, hideOverlay } from './ui.js';

// ─── Config (expose as URL params during dev: ?speed=150&inc=10) ───────────────
const params     = new URLSearchParams(location.search);
const COLS       = 20;
const ROWS       = 20;
const CELL       = 20;                                          // px per grid cell
const BASE_SPEED = parseInt(params.get('speed') ?? '150', 10); // ms per tick
const SPEED_INC  = parseInt(params.get('inc')   ?? '10',  10); // ms reduction per food
const MIN_SPEED  = 60;                                          // ms floor (~16fps)

// ─── Canvas setup ─────────────────────────────────────────────────────────────
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game-canvas'));
const ctx    = canvas.getContext('2d');
canvas.width  = COLS * CELL; // 400px
canvas.height = ROWS * CELL; // 400px

// ─── Colours (CSS custom properties → JS for canvas draw calls) ───────────────
const style      = getComputedStyle(document.documentElement);
const C_BG       = () => style.getPropertyValue('--color-board-bg').trim()    || '#1a1a2e';
const C_GRID     = () => style.getPropertyValue('--color-grid').trim()         || '#16213e';
const C_SNAKE_H  = () => style.getPropertyValue('--color-snake-head').trim()   || '#4ecca3';
const C_SNAKE_B  = () => style.getPropertyValue('--color-snake-body').trim()   || '#45b393';
const C_FOOD     = () => style.getPropertyValue('--color-food').trim()         || '#e94560';

// ─── State ────────────────────────────────────────────────────────────────────
/** @typedef {'idle'|'running'|'paused'|'over'} Phase */

/** @type {{ snake: ReturnType<typeof createSnake>, food: {x:number,y:number}, score: number, speed: number, phase: Phase }} */
let state;

let rafId       = null;
let lastTick    = 0;
let elapsed     = 0;

function initState() {
  const snake = createSnake(4, 10);
  return {
    snake,
    food:  spawnFood(snake, COLS, ROWS),
    score: 0,
    speed: BASE_SPEED,
    phase: 'idle',
  };
}

// ─── Game loop ─────────────────────────────────────────────────────────────────
/**
 * rAF loop fires ~60fps. Tick logic only runs when accumulated delta >= state.speed.
 * This decouples render cadence from game speed — no setInterval drift.
 *
 * @param {DOMHighResTimeStamp} now
 */
function loop(now) {
  const delta = now - lastTick;
  lastTick = now;

  // Cap delta to 200ms — prevents spiral of death after tab was backgrounded
  elapsed += Math.min(delta, 200);

  while (elapsed >= state.speed) {
    tick();
    elapsed -= state.speed;
    if (state.phase === 'over') return; // stop accumulating after death
  }

  render();
  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  if (rafId !== null) cancelAnimationFrame(rafId);
  elapsed  = 0;
  lastTick = performance.now();
  rafId    = requestAnimationFrame(loop);
}

function stopLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// ─── Tick (game logic) ─────────────────────────────────────────────────────────
function tick() {
  const { snake } = state;
  moveSnake(snake);

  if (collidesWithWall(snake, COLS, ROWS) || collidesWithSelf(snake)) {
    gameOver();
    return;
  }

  const head = snake.body[0];
  if (head.x === state.food.x && head.y === state.food.y) {
    grow(snake);
    state.score++;
    state.speed = Math.max(MIN_SPEED, BASE_SPEED - Math.floor(state.score / 5) * SPEED_INC);
    state.food  = spawnFood(snake, COLS, ROWS);

    const hi = getHighScore();
    if (state.score > hi) updateHighScore(state.score);
    updateScore(state.score);
  }
}

// ─── Renderer ─────────────────────────────────────────────────────────────────
function render() {
  const { snake, food } = state;

  // Background
  ctx.fillStyle = C_BG();
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = C_GRID();
  ctx.lineWidth   = 0.5;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL, 0);
    ctx.lineTo(c * CELL, canvas.height);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(canvas.width, r * CELL);
    ctx.stroke();
  }

  // Food — filled circle centred in cell
  ctx.fillStyle = C_FOOD();
  ctx.beginPath();
  ctx.arc(
    food.x * CELL + CELL / 2,
    food.y * CELL + CELL / 2,
    CELL / 2 - 2,
    0, Math.PI * 2
  );
  ctx.fill();

  // Snake body (tail → neck, draw first so head renders on top)
  ctx.fillStyle = C_SNAKE_B();
  for (let i = 1; i < snake.body.length; i++) {
    const seg = snake.body[i];
    ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
  }

  // Snake head
  ctx.fillStyle = C_SNAKE_H();
  const head = snake.body[0];
  ctx.fillRect(head.x * CELL + 1, head.y * CELL + 1, CELL - 2, CELL - 2);
}

// ─── State transitions ─────────────────────────────────────────────────────────
function startGame() {
  state = initState();
  state.phase = 'running';
  updateScore(0);
  updateHighScore(getHighScore());
  hideOverlay();
  bindKeyboard((dir) => changeDirection(state.snake, dir));
  startLoop();
}

function pauseGame() {
  if (state.phase !== 'running') return;
  state.phase = 'paused';
  stopLoop();
  showOverlay('paused', {}, resumeGame);
}

function resumeGame() {
  if (state.phase !== 'paused') return;
  state.phase = 'running';
  hideOverlay();
  startLoop();
}

function gameOver() {
  state.phase = 'over';
  stopLoop();
  unbindKeyboard();
  const hi = maybeSaveHighScore(state.score) ? state.score : getHighScore();
  updateHighScore(hi);
  showOverlay('over', { finalScore: state.score, highScore: hi }, startGame);
}

// ─── Pause on tab blur ─────────────────────────────────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state?.phase === 'running') pauseGame();
});

// ─── Keyboard: Escape/Enter for pause/resume/start ────────────────────────────
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Enter') {
    if (state?.phase === 'running')       pauseGame();
    else if (state?.phase === 'paused')   resumeGame();
    else if (state?.phase === 'idle' || state?.phase === 'over') startGame();
  }
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
initUI({
  scoreEl:      document.getElementById('score-value'),
  highScoreEl:  document.getElementById('high-score-value'),
  overlayEl:    document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayBody:  document.getElementById('overlay-body'),
  overlayBtn:   document.getElementById('overlay-btn'),
});

bindDpad(document.getElementById('dpad'), (dir) => {
  if (state?.phase === 'running') changeDirection(state.snake, dir);
});

state = initState();
updateHighScore(getHighScore());
showOverlay('idle', {}, startGame);