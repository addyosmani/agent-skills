#!/usr/bin/env node
/**
 * validate-agents.js
 *
 * Validates every persona in agents/ against docs/persona-anatomy.md, and
 * manifest.json against agents/ and skills/.
 *
 * Errors (exit 1):
 *   - frontmatter with name and description ("Use when"); a persona that lists skills also lists tools
 *   - name equals the file name; file name is kebab-case
 *   - no model or effort in frontmatter: the user sets those per run
 *   - every listed skill exists in skills/ and, for a selected persona, in manifest.json
 *   - sections Role, Guidelines, Never are present on a persona that lists skills (upstream base personas are exempt)
 *   - every persona and skill named in manifest.json exists
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./lib/skill-lint');

const ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, 'agents');
const SKILLS_DIR = path.join(ROOT, 'skills');
const MANIFEST = path.join(ROOT, 'manifest.json');

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TRIGGER = /\buse (this )?(when|for|before|after|during)\b/i;
const REQUIRED_SECTIONS = ['## Role', '## Guidelines', '## Never'];
const FORBIDDEN_KEYS = ['model', 'effort', 'allowed', 'allowed-models', 'allowed-efforts'];

const splitList = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);
const stripFences = s => s.replace(/^(`{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '');

function main() {
  const errors = [];
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const selectedSkills = new Set(manifest.skills || []);
  const selectedPersonas = new Set(manifest.personas || []);
  const knownSkills = new Set(fs.readdirSync(SKILLS_DIR).filter(d => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory()));
  const personaFiles = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md')).sort();
  const knownPersonas = new Set(personaFiles.map(f => f.replace(/\.md$/, '')));

  for (const s of selectedSkills) if (!knownSkills.has(s)) errors.push(`manifest.json: skill "${s}" is not in skills/`);
  for (const p of selectedPersonas) if (!knownPersonas.has(p)) errors.push(`manifest.json: persona "${p}" is not in agents/`);
  if (!selectedPersonas.size) errors.push('manifest.json: `personas` is empty');

  for (const file of personaFiles) {
    const name = file.replace(/\.md$/, '');
    const where = `agents/${file}`;
    const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm) { errors.push(`${where}: missing frontmatter`); continue; }
    if (!KEBAB.test(name)) errors.push(`${where}: file name is not kebab-case`);
    if (fm.name !== name) errors.push(`${where}: frontmatter name "${fm.name}" != file name "${name}"`);
    if (!fm.description) errors.push(`${where}: missing description`);
    else if (!TRIGGER.test(fm.description)) errors.push(`${where}: description has no "Use when" trigger`);
    // An upstream base persona carries only name and description. A persona that lists skills follows the thin anatomy.
    const thin = fm.skills !== undefined;
    if (thin && !fm.tools) errors.push(`${where}: missing \`tools\``);
    for (const key of FORBIDDEN_KEYS) if (fm[key] !== undefined) errors.push(`${where}: must not set \`${key}\`; the user sets model and effort per run`);
    for (const s of splitList(fm.skills)) {
      if (!knownSkills.has(s)) errors.push(`${where}: skill "${s}" does not exist in skills/`);
      else if (selectedPersonas.has(name) && !selectedSkills.has(s)) errors.push(`${where}: skill "${s}" is not selected in manifest.json`);
    }
    const prose = stripFences(content);
    for (const h of thin ? REQUIRED_SECTIONS : []) {
      if (!new RegExp(`^${h}\\s*$`, 'm').test(prose)) errors.push(`${where}: missing section ${h}`);
    }
    // A plain scalar with ": " is read as a nested mapping by strict YAML parsers; quote it.
    const raw = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
    for (const [i, line] of raw.split(/\r?\n/).entries()) {
      const kv = /^([A-Za-z0-9_-]+):[ \t]+(.*)$/.exec(line);
      if (kv && !/^["'|>[]/.test(kv[2]) && kv[2].includes(': ')) errors.push(`${where}: frontmatter line ${i + 2} (\`${kv[1]}\`) contains ": " and must be quoted`);
    }
    console.log(`  ${errors.some(e => e.startsWith(where)) ? '✗' : '✓'}  ${name}`);
  }

  for (const e of errors) console.log(`       ERROR: ${e}`);
  console.log(`\n${personaFiles.length} personas checked, ${selectedPersonas.size} selected — ${errors.length} error(s) — ${errors.length ? 'FAILED' : 'PASSED'}`);
  if (errors.length) process.exit(1);
}

main();
