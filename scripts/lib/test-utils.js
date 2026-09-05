const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const sandboxes = [];

function makeSandbox(testName) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `agent-skills-${testName}-test-`));
  sandboxes.push(root);
  return root;
}

function cleanupSandboxes() {
  for (const root of sandboxes.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function writeFile(root, relativePath, content) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

module.exports = {
  makeSandbox,
  cleanupSandboxes,
  writeFile,
};
