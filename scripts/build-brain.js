#!/usr/bin/env node
/**
 * build-brain.js
 *
 * Assembles the brain named in manifest.json into build/: the selected skills
 * and personas, the root files from project/ (AGENTS.md rendered with what is installed), the conventions, the shared references,
 * the document templates, and the /brain commands. Copy build/ (or point your
 * tool's plugin or skills directory at it) into a project.
 *
 *   node scripts/build-brain.js [--out <dir>]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT = path.resolve(outIdx === -1 ? path.join(ROOT, 'build') : args[outIdx + 1]);

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true, filter: p => !/(^|\/)(\.DS_Store|mcp\.json)$/.test(p) });
}

fs.rmSync(OUT, { recursive: true, force: true });

let missing = 0;
for (const s of manifest.skills || []) {
  const from = path.join(ROOT, 'skills', s);
  if (!fs.existsSync(from)) { console.error(`  missing skill: ${s}`); missing++; continue; }
  copy(from, path.join(OUT, 'skills', s));
}
for (const p of manifest.personas || []) {
  const from = path.join(ROOT, 'agents', `${p}.md`);
  if (!fs.existsSync(from)) { console.error(`  missing persona: ${p}`); missing++; continue; }
  copy(from, path.join(OUT, 'agents', `${p}.md`));
}
if (missing) process.exit(1);

for (const f of ['references', 'templates']) copy(path.join(ROOT, f), path.join(OUT, f));
// project/ holds the files that go to a project's root as they are; AGENTS.md additionally gets the installed personas and skills written in, with their paths.
copy(path.join(ROOT, 'project', 'SOUL.md'), path.join(OUT, 'SOUL.md'));
const skillList = (manifest.skills || []).map(s => `- \`skills/${s}/SKILL.md\``).join('\n');
const org = fs.readFileSync(path.join(ROOT, 'project', 'AGENTS.md'), 'utf8')
  .replace(/^<!-- brain:skills.*$/m, skillList);
fs.writeFileSync(path.join(OUT, 'AGENTS.md'), org);
// The /brain commands in every harness format the repository ships.
for (const dir of ['.claude/commands', '.gemini/commands', 'commands', '.pi/prompts', '.codex/prompts']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir)).filter(f => f.startsWith('brain'))) {
    copy(path.join(ROOT, dir, f), path.join(OUT, dir, f));
  }
}
copy(path.join(ROOT, 'docs', 'persona-anatomy.md'), path.join(OUT, 'docs', 'persona-anatomy.md'));
copy(path.join(ROOT, 'docs', 'skill-anatomy.md'), path.join(OUT, 'docs', 'skill-anatomy.md'));

fs.writeFileSync(path.join(OUT, 'README.md'), `# Brain

Built from manifest.json: ${(manifest.skills || []).length} skills, ${(manifest.personas || []).length} personas.

Install into a project:

1. Copy \`AGENTS.md\` and \`SOUL.md\` to the project root (or paste \`AGENTS.md\` into \`CLAUDE.md\`).
2. Copy \`skills/\` and \`agents/\` to where your tool reads them (Claude Code: \`.claude/skills/\`, \`.claude/agents/\`; Codex: \`.agents/skills/\`; OpenCode: \`.opencode/skills/\`). Pi reads that same \`.agents/skills/\`; do not copy skills into \`.pi/skills/\`.
3. Copy the \`/brain\` commands for your tool: \`.claude/commands/brain*.md\` to \`.claude/commands/\`, \`.gemini/commands/brain*.toml\` to \`.gemini/commands/\`, \`.pi/prompts/brain*.md\` to \`.pi/prompts/\`, or \`.codex/prompts/brain*.md\` to \`~/.codex/prompts/\` (Codex reads prompts from the home directory only; invoke as \`/prompts:brain\`).
4. Copy \`references/\` and \`templates/\` to the project root; create \`docs/\` from \`templates/\`.
5. Start a session with \`/brain\`.
`);

console.log(`built ${OUT}: ${(manifest.skills || []).length} skills, ${(manifest.personas || []).length} personas`);
