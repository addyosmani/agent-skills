# Hermes Agent Setup Guide

This guide provides comprehensive instructions for setting up agent-skills with Hermes Agent, including how to load SKILL.md files as tools within the Hermes framework.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Hermes Agent installed and configured

## Installation Steps

### 1. Install Agent Skills

```bash
npm install agent-skills
```

### 2. Configure Hermes Integration

Create a `hermes.config.js` file in your project root:

```javascript
module.exports = {
  skills: {
    directory: './skills',
    autoLoad: true
  },
  agent: {
    name: 'MyAgent',
    model: 'gpt-4'
  }
};
```

### 3. Loading SKILL.md Files

Place your SKILL.md files in the designated skills directory. Each file should follow this structure:

```markdown
# Skill Name

Description of what this skill does.

## Usage

Instructions for using this skill.

## Parameters

- param1: description
- param2: description
```

### 4. Register Skills with Hermes

In your main application file:

```javascript
const { loadSkills } = require('agent-skills');
const hermes = require('hermes-agent');

// Load all skills from directory
const skills = loadSkills('./skills');

// Register with Hermes
skills.forEach(skill => {
  hermes.registerTool(skill.name, skill.handler);
});
```

## Configuration Options

### Skill Directory Structure

```
project/
├── skills/
│   ├── web-search.md
│   ├── file-processing.md
│   └── data-analysis.md
├── hermes.config.js
└── index.js
```

### Environment Variables

Set these environment variables for proper configuration:

```bash
HERMES_API_KEY=your_api_key_here
SKILLS_DIRECTORY=./skills
AUTO_RELOAD=true
```

## Troubleshooting

### Common Issues

1. **Skills not loading**: Ensure SKILL.md files are in the correct directory and follow the naming convention
2. **Permission errors**: Check file permissions on skill files
3. **API connection failures**: Verify Hermes API credentials

### Debug Mode

Enable debug mode to see detailed logs:

```bash
DEBUG=hermes-agent node index.js
```

## Advanced Configuration

### Custom Skill Handlers

Create custom handlers for specific skill types:

```javascript
const customHandler = async (skill, params) => {
  // Custom logic here
  return result;
};

hermes.registerTool('custom-skill', customHandler);
```

### Skill Metadata

Add metadata to your SKILL.md files:

```markdown
---
tags: [web, search, research]
category: information-retrieval
version: 1.0.0
---
# Web Search Skill
...
```

## Testing Your Setup

Run this test script to verify everything is working:

```javascript
const hermes = require('hermes-agent');

async function testSetup() {
  try {
    const result = await hermes.execute('test-skill', { input: 'test' });
    console.log('Setup successful:', result);
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

testSetup();
```

## Next Steps

- Review individual skill documentation
- Configure skill permissions
- Set up monitoring and logging
- Explore advanced Hermes features