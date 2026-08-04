'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { slugify } = require('../src/slug');

test('slugifies a title', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
});
