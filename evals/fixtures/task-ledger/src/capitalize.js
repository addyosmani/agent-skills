// String utilities for the notes desktop app.

/**
 * Capitalize the first letter of a string.
 *
 * @param {string} s
 * @param {{ trim?: boolean }} [opts] - trim surrounding whitespace before
 *   capitalizing. Default false (current behavior preserved).
 */
export function capitalize(s, opts = {}) {
  const { trim = false } = opts;
  const input = trim ? String(s).trim() : s;
  if (input.length === 0) return input;
  return input[0].toUpperCase() + input.slice(1);
}

/**
 * Legacy word-wise capitalization. Scheduled for deprecation (T-004).
 */
export function capitalizeWords(s) {
  return String(s)
    .split(' ')
    .map((w) => capitalize(w))
    .join(' ');
}
