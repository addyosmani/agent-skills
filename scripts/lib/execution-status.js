'use strict';

// Process exit zero alone does not establish that a stream-json run finished.
function executionFailure(trace) {
  let events;
  try {
    events = trace.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line));
  } catch { return 'invalid execution JSON'; }
  if (events.some((event) => !event || typeof event !== 'object' || Array.isArray(event))) {
    return 'invalid execution event';
  }
  const turns = events.filter((event) => ['assistant', 'user', 'result'].includes(event.type));
  const final = turns.at(-1);
  if (final?.type !== 'result' || final.subtype !== 'success' || final.is_error !== false) {
    return 'missing successful terminal result';
  }
  if (final.permission_denials !== undefined && !Array.isArray(final.permission_denials)) return 'invalid permission denials';
  if (final.permission_denials?.length) return 'permission denied';
  const pending = new Set();
  const seen = new Set();
  for (const event of turns) {
    if (event.type === 'result') continue;
    const message = event.message;
    if (!message || typeof message !== 'object' || Array.isArray(message)) return 'invalid message';
    const content = message.content;
    if (event.type === 'user' && typeof content === 'string') continue;
    if (!Array.isArray(content)) return 'invalid message content';
    for (const block of content) {
      if (!block || typeof block !== 'object' || Array.isArray(block)) return 'invalid message content';
      if (event.type === 'assistant' && block.type === 'tool_use') {
        if (typeof block.id !== 'string' || !block.id || seen.has(block.id)) return 'invalid tool call id';
        seen.add(block.id);
        pending.add(block.id);
      }
      if (event.type === 'user' && block.type === 'tool_result' && !pending.delete(block.tool_use_id)) {
        return 'unmatched tool result';
      }
    }
  }
  // A returned error may be an intentional RED probe; the grader judges recovery.
  return pending.size ? 'missing tool result' : null;
}

module.exports = { executionFailure };
