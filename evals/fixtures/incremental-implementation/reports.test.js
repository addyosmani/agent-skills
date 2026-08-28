'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { visibleReports } = require('./reports');

test('hides archived reports', () => {
  assert.deepEqual(visibleReports([
    { id: 1, archived: false },
    { id: 2, archived: true },
  ]), [{ id: 1, archived: false }]);
});
