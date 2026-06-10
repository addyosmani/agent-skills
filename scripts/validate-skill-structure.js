const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const REQUIRED_SECTIONS = ['## Overview', '## When to Use', '## Verification'];
let hasErrors = false;

function validateSkill(skillPath, skillName) {
    const mdPath = path.join(skillPath, 'SKILL.md');
    if (!fs.existsSync(mdPath)) return; // Skip if no SKILL.md

    const content = fs.readFileSync(mdPath, 'utf8');
    const errors = [];

    // 1. Check YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
        errors.push("Missing YAML frontmatter.");
    } else {
        const yaml = frontmatterMatch[1];
        if (!yaml.match(/^name:\s*.+/m)) errors.push("Missing 'name' in frontmatter.");
        if (!yaml.match(/^description:\s*.+/m)) errors.push("Missing 'description' in frontmatter.");
        
        const nameMatch = yaml.match(/^name:\s*(.+)/m);
        if (nameMatch && nameMatch[1].trim() !== skillName) {
            errors.push(`Frontmatter name '${nameMatch[1].trim()}' does not match directory name '${skillName}'.`);
        }
    }

    // 2. Check required sections
    REQUIRED_SECTIONS.forEach(section => {
        if (!content.includes(section)) {
            errors.push(`Missing required section: '${section}'.`);
        }
    });

    if (errors.length > 0) {
        console.error(`❌ Error(s) in skills/${skillName}/SKILL.md:`);
        errors.forEach(err => console.error(`   - ${err}`));
        hasErrors = true;
    } else {
        console.log(`✅ Valid: skills/${skillName}/SKILL.md`);
    }
}

fs.readdirSync(SKILLS_DIR).forEach(skillName => {
    const skillPath = path.join(SKILLS_DIR, skillName);
    if (fs.statSync(skillPath).isDirectory()) {
        validateSkill(skillPath, skillName);
    }
});

if (hasErrors) {
    process.exit(1);
}
