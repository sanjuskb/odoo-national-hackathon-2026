'use strict';

/**
 * Splits an array into sub-arrays of at most `size` items.
 * Prevents URL-length and query parameter overflows in database filters.
 *
 * @template T
 * @param {T[]} array
 * @param {number} [size=100]
 * @returns {T[][]}
 */
function chunkArray(array, size = 100) {
  if (!Array.isArray(array) || array.length === 0) return [];
  const safeSize = Math.max(1, parseInt(size, 10) || 100);
  const chunks = [];
  for (let i = 0; i < array.length; i += safeSize) {
    chunks.push(array.slice(i, i + safeSize));
  }
  return chunks;
}

/**
 * Executes an async mapper function over items with bounded concurrency.
 * Prevents unbounded Promise.all and thread/connection exhaustion.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} [concurrency=5] Maximum active concurrent tasks
 * @param {(item: T, index: number) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
async function mapConcurrent(items, concurrency = 5, fn) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const limit = Math.max(1, parseInt(concurrency, 10) || 5);
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await fn(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(limit, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

module.exports = {
  chunkArray,
  mapConcurrent,
};
