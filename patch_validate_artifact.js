const fs = require('fs');

let content = fs.readFileSync('scripts/validate-artifact-paths-test.js', 'utf8');

// The replacement was a bit sloppy and left `  }\n});`
content = content.replace(
  /afterEach\(cleanupSandboxes\);\n  }\n\}\);/,
  "afterEach(cleanupSandboxes);"
);

fs.writeFileSync('scripts/validate-artifact-paths-test.js', content);
