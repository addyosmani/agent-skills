### name: skill-routerdescription: Dynamically selects and loads the right skill based on user intent to save context window space. Use when starting a task and unsure which skill to load.

### Skill Router

### Overview
Routes user intent to the correct skill. Prevents context bloat and decision paralysis by loading only the required skill, rather than all skills at once.

### When to Use
At the start of a new task or conversation.
When unsure which specific skill applies.
Do NOT use if the required skill is already in context.

### Core Process
Analyze Intent: Determine the engineering phase (Planning, Building, Testing, Debugging, etc.).
Match Skill: Identify the correct skill using the routing logic or scripts/skill-index.json.
Dynamic Load: Read only the selected SKILL.md into context.
Execute: Follow the loaded skill's process.
Re-evaluate: If the task changes phase, return to step 1.

### Routing Logic
Defining what to build -> spec-driven-development
Planning tasks -> planning-and-task-breakdown
Writing code -> incremental-implementation
Writing tests -> test-driven-development
Fixing bugs/errors -> debugging-and-error-recovery
Ensuring edge-case safety -> agent-resilience-and-fuzzing
Reviewing code -> code-review-and-quality
Common Rationalizations
Rationalization	Reality
“I'll load all skills to be safe.”	Bloats context, wastes tokens, and degrades accuracy.
“I can guess the skill without checking.”	Guessing leads to applying the wrong workflow.

### Red Flags
Agent executes a task without loading a specific skill.
Agent loads more than 2 skills simultaneously for a single task.
Verification
 User intent was categorized correctly.
 Only the necessary skill was loaded.
 The loaded skill is being actively followed.
