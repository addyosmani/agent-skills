const fs = require('fs');

let content = fs.readFileSync('scripts/validate-reference-links-test.js', 'utf8');

content = content.replace(
  /const { afterEach, test } = require\('node:test'\);/,
  "const { afterEach, test } = require('node:test');\nconst { makeSandbox, cleanupSandboxes, writeFile } = require('./lib/test-utils');"
);

content = content.replace(
  /const sandboxes = \[\];[\s\S]*?function makeSandbox\(\) {[\s\S]*?return root;\n}\n\nfunction writeFile\(root, relativePath, content\) {[\s\S]*?fs\.writeFileSync\(file, content\);\n}/,
  `function setupSandbox() {
  const root = makeSandbox('validate-reference-links');
  const scriptsDir = path.join(root, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(VALIDATOR, path.join(scriptsDir, 'validate-reference-links.js'));
  return root;
}`
);

content = content.replace(
  /afterEach\(\(\) => {[\s\S]*?}\);/,
  "afterEach(cleanupSandboxes);"
);

content = content.replace(/makeSandbox\(\)/g, 'setupSandbox()');

fs.writeFileSync('scripts/validate-reference-links-test.js', content);
