Docs
1. Architecture.md: really high level view. Connecting to service level docs 
2 web arch.md
3 backend arch.md
    - infra.md
    - other relevant sections
4 mobile arch.md

2. development.md
4. Debugging.md

3. Deployment.md

5. PRD.md 
    at project level 
    at each service level (wherever it makes sense)
6. HLD and LLD (at project level and at each service level)
7. Rca (Whenever required, at service level). Remove the current RCA doc template. I will give you the new template later.
8. Conventions.md 
9. domain design doc. prodcut, business and tech will refer. Always
10. changelog.md (Maintained at global level.) (For web, mobile, and backend)

No other agent report or doc is required.


Artifact anatomy
1. HLD: 
    The current HLD doc looks good with some improvements.
    Remove the block that it is owned by EM. Since we are getting away from the role of these roles, HLD is basically not owned by anyone. Anyone can edit HLD If the agent has the skill
    In API, do API names, interaction with services, Some basic request response that is not expected. Actual contract, we will decide in LLD.
    Remove the light LLD section.
    Remove purpose, responsibility, non-responsibility.
    Remove context and boundaries. I think it will be covered in the API interface only.
    Add scale estimations. (Initially, scale will be low.)
2. LLD: 
    Current LLD doc looks good with some improvements. 
    remove this same EM section.
    create a UML diagram. Instead of sequence diagram
    Remove observability, as it is covered in HLD.
3. PRD: 
    Remove ownership line from PRD.
    Product flows, 
    edge cases, 
    success criteria, 
    scope of the PRD
    Feature requirements in terms of priority
4. Linear ticket
    Source of truth for everything
    Every agent will work on a task. Tasks can range from as big as creating a PRD, HLD, and LLD, or can be as short as "fix this small bug."
    But every task will have a goal. 
        Goal's anatomy is described below.
         ticket should reflect the goal for the agent, Apart from other ticket-specific things. 
5. Commit message
	1. summary (tight. in pointers)
	2. Deployment order (if applicable)
	3. Testing/Verfiicatio plan (what you did to do testing)
    4. Blast radius/Risk analysis
    5. rollback plan
    Important: Don't duplicate sections or details which are already in the linear ticket.
6. ARCHITECTURE.md 
    Remove the ownership line.
    Do not write contract in the doc. user should be able to use the SDK to get the contract type.
    Remove where change belongs.
    Remove cross-cutting decisions.
    it will have sections
        1. Project structure
        2. Tech stack
        3. Features (some details. But link to PRD)
        4. Api reference (link to swagger docs)
        5. Will link to web, backend, and mobile docs
        6. other relevant sections
2. development.md
	1. Local setup
	2. Dev commands
    3. run commands 
    3. testing
    - other relevant sections


goal anatomy
    • Outcome: what should be true when the work is done.
	• Verification surface: the test, benchmark, report, artifact, command output, or source material that proves it.
	• Constraints: what must not regress while agent works.
	• Boundaries: which files, tools, data, repositories, or resources agent may use.
	• Iteration policy: how agent should decide what to try next after each attempt.
    - Blocked stop condition: when agent should stop and report that no defensible path remains under the current limits.


For all the anatomies above, While these sections are guidelines, 
- feel free to add a new section if a radical demands it. And then we can see if we want to include that section globally or not.
- it is not mandatory to fill everything, use your discretion.
- In cases such as linear ticket, commit messages ... anatomy also depends on the work type, whether it's a bug, feature, or chore. In that case, the anatomy will change.

