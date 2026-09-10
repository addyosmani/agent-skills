import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capitalize } from './capitalize.js';

test('capitalizes first letter', () => {
  assert.equal(capitalize('hello world'), 'Hello world');
});

test('empty string is safe', () => {
  assert.equal(capitalize(''), '');
});
