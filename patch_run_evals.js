const fs = require('fs');

let content = fs.readFileSync('scripts/run-evals-test.js', 'utf8');

content = content.replace(
  /const test = require\('node:test'\);/,
  "const { afterEach, test } = require('node:test');\nconst { makeSandbox, cleanupSandboxes, writeFile } = require('./lib/test-utils');"
);

content = content.replace(
  /function makeSandbox\(\) {[\s\S]*?return root;\n}/,
  `function setupSandbox() {
  const root = makeSandbox('run-evals');
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(root, 'evals', 'cases'), { recursive: true });
  fs.mkdirSync(path.join(root, 'evals', 'fixtures', 'project'), { recursive: true });
  fs.copyFileSync(RUNNER, path.join(root, 'scripts', 'run-evals.js'));
  writeFile(root, path.join('evals', 'fixtures', 'project', 'context.txt'), 'fixture\\n');
  return root;
}`
);

// We need to add afterEach(cleanupSandboxes); before the first test block
content = content.replace(
  /test\('accepts a complete and consistent grader result'/,
  "afterEach(cleanupSandboxes);\n\ntest('accepts a complete and consistent grader result'"
);

content = content.replace(/makeSandbox\(\)/g, 'setupSandbox()');

fs.writeFileSync('scripts/run-evals-test.js', content);
