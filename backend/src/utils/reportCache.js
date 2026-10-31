'use strict';

/**
 * In-memory TTL cache for high-traffic analytical reports (/reports/summary, /reports/subscriptions).
 *
 * Rules:
 * - TTL: 30 seconds
 * - Header: X-Cache: HIT or MISS
 * - ?refresh=true forces a fresh database query and refreshes the cache
 * - Disabled in NODE_ENV === 'test' by default, can be toggled via setEnabledInTest
 * - Reports are strictly admin/staff only; never caches customer-specific private sessions
 */

if (!global.__brightloop_report_cache) {
  global.__brightloop_report_cache = {
    cache: new Map(),
    enabledInTest: false,
  };
}

const state = global.__brightloop_report_cache;
const DEFAULT_TTL_MS = 30 * 1000; // 30 seconds

function isCacheEnabled() {
  if (process.env.NODE_ENV === 'test') {
    return Boolean(state.enabledInTest);
  }
  return true;
}

function setEnabledInTest(val) {
  state.enabledInTest = Boolean(val);
}

function normalizeKey(prefix, params = {}) {
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== 'refresh' && params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort();
  const pairs = sortedKeys.map((k) => `${k}=${String(params[k]).trim()}`);
  return `${prefix}:${pairs.join('&')}`;
}

function get(key) {
  if (!isCacheEnabled()) return null;
  const entry = state.cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    state.cache.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value, ttl = DEFAULT_TTL_MS) {
  if (!isCacheEnabled()) return;
  state.cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  });
}

function clear() {
  state.cache.clear();
}

module.exports = {
  isCacheEnabled,
  setEnabledInTest,
  normalizeKey,
  get,
  set,
  clear,
};
