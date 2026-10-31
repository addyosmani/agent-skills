'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function stageSkillResources(root, skillName) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skillName)) throw new Error('invalid skill name');
  root = fs.realpathSync(root);
  const staged = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-skill-resources-'));
  const skillDir = path.join(staged, 'skills', skillName);
  const sourceEntry = (file) => {
    const entry = fs.lstatSync(file);
    if (entry.isSymbolicLink()) throw new Error(`symbolic link in skill resources: ${file}`);
    return entry;
  };
  const copy = (source, destination) => fs.cpSync(source, destination,
    { recursive: true, filter: (file) => Boolean(sourceEntry(file)) });
  try {
    // Retain the repository layout: both local and ../../references/ links work.
    fs.mkdirSync(path.dirname(skillDir), { recursive: true });
    sourceEntry(path.join(root, 'skills'));
    copy(path.join(root, 'skills', skillName), skillDir);
    const shared = path.join(root, 'references');
    let sharedEntry;
    try { sharedEntry = sourceEntry(shared); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (sharedEntry) copy(shared, path.join(staged, 'references'));
    return { root: staged, skillDir };
  } catch (error) {
    fs.rmSync(staged, { recursive: true, force: true });
    throw error;
  }
}

module.exports = { stageSkillResources };
