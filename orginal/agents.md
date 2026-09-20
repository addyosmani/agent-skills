Org structuring: 

There will be agents (perosnas), like:
-  backend agent, 
-  web agent
-  mobile agent (React native)
-  PM agent
-  scout agent 
-  reviwers agents (testing, security, perf, code) (Highly specialized adversarial agents)
- etc.


agents like Backend agent, web agent, mobile agent 
    will be development agents. 
    They will write the code. Along with that , they can do the planning, create sprint and stories, write docs, do testing, build and deploy. 
    but they cannot do reviews 
Reviewing work will be given to specialized agents with specialized skills. Reviewing work will be very specific work.To get the best out of review

There will be skills (some will be general, some will be speclialized according to the domain), like: 
- code writing skills 
- testing skills 
- debugging skills 
- QA skills 
- review skills 
- etc.
Ex:
    Code writing skills: while it will have some general principles. It is also specific to how the code is written in frontend, backend, Android, etc. 
    Similarly, debugging skills for software and mobile are different from backend...It might include, let's say, starting a mobile emulator, then automating the UI, etc. 

There will be mcp tools
- linear
- grafana
- playright
- github
- etc.

Depending upon the task scope, an agent can have a view of 
    the whole project 
    or can have a local scope.

Depending on the agent persoan and work requirement, the agent will have access to 
    skills 
    tools. 

An agent can work with any model, thinking effort or harness

Let's say
	• While solving a bug in backend the agent will have bug debugging skills and  Grafana MCP tool
	• While writing code the agent will have LLD skills.
	• While doing scouting of a particular service, the agent will be doing read-only work of the specific service. 
    - While doing Planning: agent will have the planning skill, writing doc skill, etc. 
    - APM agent, or let's say a scouting agent, does not need to load the GitHub skill.
    - While discussing an idea, let's say I want a PM agent, so the PM agent will invoke, let's say, the interview me skill or the idea skill. And while discussing a design or tech decision, I can invoke a backend agent, and then the agent will invoke the same interview me skill and idea skill..But it won't invoke the code review skill or GitHub tool until required in that scenario.
    - In case of a big feature, It will create a plan and then create the storyboard, sprint, tasks in linear. For Small features like the respective agent can just directly create the ticket and start working on it.

There will be no staff, principal, EM role.
Merge the agent and remove duplicates.

root agent: 
    the one who will be talking to the user in a session
    a generalist agent
        will have very high-level view of how things work in the repo and how org works. Very very high level idea
    but as soon as it gets a task, it will load that specialized persona, required skills, required tools
        can only have one personality
    user should get the option in the CLI to select the persona of sub agent in that session
    needs to declare what role it is taking up and what skills it will use, what tools it will use, its model, harness and thinking effort (If it adds more skills and tools at runtime during work, those should also be included as well.)
    It will act as a task classifier and will figure out which agents need to be spawned to get the task done.
    it will call the subagents to distribute work
    can assing any persona to subagent (even its own person..in case it needs duplicate hands to parallize)
    will not dicatate the skills and tools of subagents
    to display the personas, skills, tools, model, harness, thinking effor of itself and its subagents . On demand. Create a command for it.
    Root agent's model, thinking effort, and harness will be decided by the user
    if a root agent is spawning sub-agents, it will have to explicitly ask the user to define sub-agents model, harness, and thinking effort.
    Basically, for any long-running work, the root agent will spawn a sub-agent. The idea is that the root agent should be free to take requests from the user, While specialized sub-agents will do the work

subagents: 
    agents called by root agent
    persona will be given by root agent
    depending on persona, it will load required skills, required tools, (If it adds more skills and tools at runtime during work, those should also be included as well.)
    needs to declare to root agent, on demand, what role ,skills , tools,  model, harness and thinking effort
    Sub-agents will be of two types (Defined by root agent):
        - Fire and forget
        - Fire and summarize 
            In fire and forget, the sub-agent will not return its result to the root agent, 
            but in fire and summarize, the sub-agent can summarize its work and send it to the root agent.
            For example, if I am discussing a feature with a PM agent and it fires frontend and backend agents, when they are done, it can just tell me, "Hey, the feature is completed," instead of summarizing their work.


Always keep the role and responsibilities of every agent very narrow and focused.
- So, let's say a feature requires changes across multiple backend services. The entry agent can take the role of a coding agent, but it can spawn subagents. It can take the role of planning and designing. It can create designs and things like that. Once it is approved, it can spawn subagents who are also backend engineers, but their scope is defined to their service only.
- "make a change which spans both frontend and backend." That agent has to choose one personality, let's say a backend personality, to be preferable, and then it will spawn another sub-agent with the frontend personality
- Let's say it has to write code, so it will take the response role of a backend engineer who can write code. It cannot take responsibility for code reviewing as well, so that role needs to be spawned as a sub-agent. 
- The agent will not do the work for which it does not have the skill. It has to deny the work. So a frontend agent cannot be asked to write backend code
