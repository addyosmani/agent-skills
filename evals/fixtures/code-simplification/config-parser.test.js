'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { parseConfig } = require('./config-parser');

test('parses sections, values, comments, and defaults', () => {
  assert.deepEqual(parseConfig([
    'owner = "Ada"', '# ignored', '[server]', 'port = 8080',
    'enabled = true', 'note = hello',
  ]), {
    default: { owner: 'Ada' },
    server: { port: 8080, enabled: true, note: 'hello' },
  });
});
