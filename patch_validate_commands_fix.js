const fs = require('fs');
let content = fs.readFileSync('scripts/validate-commands-test.js', 'utf8');
content = content.replace(
  /afterEach\(cleanupSandboxes\);\n  \}\n\}\);/,
  "afterEach(cleanupSandboxes);"
);
fs.writeFileSync('scripts/validate-commands-test.js', content);
