# Agent Skills

Agent Skills are modular capabilities that extend AI assistants with specific functionalities. Each skill follows a standardized structure to ensure consistency and ease of integration.

## What are Skills?

Skills are self-contained modules that provide specific capabilities to AI agents. They enable assistants to perform tasks like file operations, web searches, code generation, and more.

## Creating New Skills

1. Create a new directory in the skills folder with your skill name
2. Add a `SKILL.md` file describing the skill's purpose and usage
3. Implement the skill logic in the appropriate language/framework
4. Follow the existing directory structure conventions

## Directory Structure

```
skills/
├── skill-name/
│   ├── SKILL.md
│   └── implementation files
└── README.md
```

## Required Files

Each skill must include a `SKILL.md` file containing:
- Skill description
- Usage examples
- Parameters and return values
- Integration notes

## Integration

Skills work with various AI assistants including Claude, Gemini, and Copilot through standardized interfaces. Each assistant may require specific adaptations documented in their respective integration guides.

## Examples

See existing skills in this directory for reference implementations of common patterns and best practices.