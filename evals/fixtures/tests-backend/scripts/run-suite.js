'use strict';

const suites = {
  unit: { passed: 4, failed: 0, label: 'checkout validation unit tests' },
  api: { passed: 3, failed: 0, label: 'POST /checkout API tests' },
  contract: { passed: 2, failed: 0, label: 'checkout consumer/provider contract tests' },
  e2e: { passed: 1, failed: 0, label: 'checkout browser journey' },
  empty: { passed: 0, failed: 0, label: 'empty selection' },
  failure: { passed: 2, failed: 1, label: 'failing checkout API selection' },
  lint: { passed: 1, failed: 0, label: 'non-test lint gate' },
  build: { passed: 1, failed: 0, label: 'non-test build gate' },
};

const name = process.argv[2];
const suite = suites[name];

if (!suite) {
  console.error(`Unknown suite: ${name || '<missing>'}`);
  process.exit(2);
}

console.log(`Suite: ${suite.label}`);
if (name === 'failure') {
  const fakeToken = ['fixture', 'access', 'token'].join('-');
  const fakePassword = ['fixture', 'database', 'password'].join('-');
  console.error('AssertionError: expected checkout status 400 but received 200');
  console.error(`Authorization: Bearer ${fakeToken}`);
  console.error(`DATABASE_URL=postgres://fixture:${fakePassword}@localhost/test`);
}

const total = suite.passed + suite.failed;
console.log(`Tests: ${suite.passed} passed, ${suite.failed} failed, ${total} total`);
process.exit(suite.failed ? 1 : 0);
