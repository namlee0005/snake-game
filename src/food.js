/**
 * food.js — Food spawning logic
 *
 * Food is a plain {x, y} object in grid coordinates.
 * spawnFood() guarantees the food cell is never inside the snake's body.
 */

/**
 * Spawns food at a random grid cell not occupied by the snake.
 * Uses a Set of "snake key strings" for O(1) occupied-cell lookup.
 *
 * Falls back to brute-force scanning all free cells if the snake
 * nearly fills the grid (avoids infinite loop when free cells are scarce).
 *
 * @param {{ body: {x: number, y: number}[] }} snake
 * @param {number} cols - Grid width
 * @param {number} rows - Grid height
 * @returns {{ x: number, y: number }}
 */
export function spawnFood(snake, cols, rows) {
  const occupied = new Set(snake.body.map(({ x, y }) => `${x},${y}`));

  const totalCells = cols * rows;
  const freeCells = totalCells - occupied.size;

  if (freeCells === 0) {
    // Grid is completely full — pathological edge case, return null-island at origin
    // In practice: game should already be in 'over' state before this is reached
    return { x: 0, y: 0 };
  }

  // If the grid is sparse (>50% free), use random sampling — fast in the common case
  if (freeCells > totalCells / 2) {
    let x, y;
    do {
      x = Math.floor(Math.random() * cols);
      y = Math.floor(Math.random() * rows);
    } while (occupied.has(`${x},${y}`));
    return { x, y };
  }

  // Grid is dense (snake is large) — collect all free cells and pick one uniformly
  const free = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!occupied.has(`${col},${row}`)) {
        free.push({ x: col, y: row });
      }
    }
  }
  const idx = Math.floor(Math.random() * free.length);
  return free[idx];
}