const fs = require('fs');
let content = fs.readFileSync('scripts/run-evals-test.js', 'utf8');

content = content.replace(
  /function writeJson\(file, value\) \{\n  fs\.mkdirSync\(path\.dirname\(file\), \{ recursive: true \}\);\n  fs\.writeFileSync\(file, `\$\{JSON\.stringify\(value, null, 2\)\}\\n`\);\n\}/,
  `function writeJson(root, relativePath, value) {
  writeFile(root, relativePath, \`\${JSON.stringify(value, null, 2)}\\n\`);
}`
);

content = content.replace(
  /function writeSkill\(root, name, description\) \{\n  const dir = path\.join\(root, 'skills', name\);\n  fs\.mkdirSync\(dir, \{ recursive: true \}\);\n  fs\.writeFileSync\(\n    path\.join\(dir, 'SKILL\.md'\),\n    `---\\nname: \$\{name\}\\ndescription: \$\{description\}\\n---\\n\\n# \$\{name\}\\n`,\n  \);\n\}/,
  `function writeSkill(root, name, description) {
  writeFile(
    root,
    path.join('skills', name, 'SKILL.md'),
    \`---\\nname: \${name}\\ndescription: \${description}\\n---\\n\\n# \${name}\\n\`,
  );
}`
);

// We need to update all calls to writeJson from path.join(root, ...) to use root, relativePath
content = content.replace(/writeJson\(path\.join\(root, 'evals', 'cases', 'alpha-skill\.json'\),/g, "writeJson(root, path.join('evals', 'cases', 'alpha-skill.json'),");
content = content.replace(/writeJson\(\s*path\.join\(root, 'evals', 'cases', 'alpha-skill\.json'\),/g, "writeJson(root, path.join('evals', 'cases', 'alpha-skill.json'),");
content = content.replace(/writeJson\(\s*path\.join\(root, 'evals', 'cases', 'beta-skill\.json'\),/g, "writeJson(root, path.join('evals', 'cases', 'beta-skill.json'),");

fs.writeFileSync('scripts/run-evals-test.js', content);
