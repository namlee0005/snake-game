/**
 * snake.js — Snake entity logic
 *
 * Exports pure functions that operate on a plain Snake object.
 * No DOM, no canvas — fully testable in isolation.
 *
 * Snake shape:
 *   {
 *     body: [{x, y}, ...],  // body[0] = head, body[n-1] = tail
 *     dir: 'UP'|'DOWN'|'LEFT'|'RIGHT',
 *     nextDir: string,       // buffered input — applied on next tick
 *     pendingGrow: boolean   // true = skip tail removal this tick
 *   }
 */

const OPPOSITES = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };

const DIR_DELTA = {
  UP:    { dx:  0, dy: -1 },
  DOWN:  { dx:  0, dy:  1 },
  LEFT:  { dx: -1, dy:  0 },
  RIGHT: { dx:  1, dy:  0 },
};

/**
 * Creates a new Snake starting at (startX, startY), facing RIGHT.
 * Initial body is 3 cells long.
 *
 * @param {number} startX - Head column (grid units)
 * @param {number} startY - Head row (grid units)
 * @returns {{ body: {x: number, y: number}[], dir: string, nextDir: string, pendingGrow: boolean }}
 */
export function createSnake(startX, startY) {
  return {
    body: [
      { x: startX,     y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ],
    dir: 'RIGHT',
    nextDir: 'RIGHT',
    pendingGrow: false,
  };
}

/**
 * Queues a direction change. Silently ignores 180° reversals (would cause instant self-collision).
 *
 * @param {{ dir: string, nextDir: string }} snake
 * @param {'UP'|'DOWN'|'LEFT'|'RIGHT'} newDir
 */
export function changeDirection(snake, newDir) {
  if (OPPOSITES[snake.dir] !== newDir) {
    snake.nextDir = newDir;
  }
}

/**
 * Advances the snake one step in nextDir.
 * Commits nextDir → dir, moves head, removes tail (unless pendingGrow).
 * Does NOT perform collision detection — caller is responsible.
 *
 * @param {{ body: {x, y}[], dir: string, nextDir: string, pendingGrow: boolean }} snake
 */
export function moveSnake(snake) {
  snake.dir = snake.nextDir;

  const head = snake.body[0];
  const { dx, dy } = DIR_DELTA[snake.dir];
  const newHead = { x: head.x + dx, y: head.y + dy };

  snake.body.unshift(newHead);

  if (snake.pendingGrow) {
    snake.pendingGrow = false;
  } else {
    snake.body.pop();
  }
}

/**
 * Marks the snake to grow by one cell on its next move.
 *
 * @param {{ pendingGrow: boolean }} snake
 */
export function grow(snake) {
  snake.pendingGrow = true;
}

/**
 * Returns true if the snake head overlaps any body segment.
 * Called after moveSnake() — head is already at new position.
 *
 * @param {{ body: {x, y}[] }} snake
 * @returns {boolean}
 */
export function collidesWithSelf(snake) {
  const head = snake.body[0];
  // Skip index 0 (the head itself)
  for (let i = 1; i < snake.body.length; i++) {
    if (snake.body[i].x === head.x && snake.body[i].y === head.y) return true;
  }
  return false;
}

/**
 * Returns true if the snake head is outside the grid bounds.
 *
 * @param {{ body: {x, y}[] }} snake
 * @param {number} cols - Grid width
 * @param {number} rows - Grid height
 * @returns {boolean}
 */
export function collidesWithWall(snake, cols, rows) {
  const { x, y } = snake.body[0];
  return x < 0 || x >= cols || y < 0 || y >= rows;
}