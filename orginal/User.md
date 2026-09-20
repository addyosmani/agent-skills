This doc overrides any other previous instruction if it runs contrary to it.

I will be making a lot of changes in our working style. 

First of all, I would want to revert this repo back to its original shape.
When I say revert back, I mean
anything we have deleted, we have to revert it back. 
Anything we have updated, we will keep the updated file, and I will check that diff to see whether the update is good or not 
delete any duplicates. Ex, In the skills, there are some skills called "original" and "not", so just delete that and combine everything into one.

On top of this repo, I will add 
    my own skills (copied from git or my novel skills)
    edit the existing skills, 
    add my own agents 
    and org brain 
    etc., 
I am using this repo as a base repo to build my own brain.

I will dump all the skills here, and then there should be a JSON where I can just put the names of skills that I want to include in my brain. 
The brain will have agents, skills, agent-skill mapping, My coding conventions, 

as the repo has some structure for skills. If I am copying a skill from somewhere, we will put that skill as something to be refactored into the current structure, which we will do after eval. it will be an exception. 
but If you or I are creating a skill, that skill should follow that structure. 

-------



Project management
	0. Always create a plan, storyboard, and tasks for a large requirement.
    1. always create a ticket, subticket etc before working. (file it under appropriate head)
	2. Ticket must always contain the user prompt verbatim, If a ticket is created in a direct response to a user request
    3. if a feature request comes, we should make it our top most priority that feature is delivered continuously to the user. The feature requirement should be broken down into stories and sprints in such a way that this remains true. Always. 

product
1. Avoid scope creep
	1. To be solved by phased PRDs and milesotning stories
2. gather Requirements 
3. For any requirement, no matter how big, cut its scope such that a MVP can be shiped at the earliest. After shipping MVP you can continue to work on the original scope. (Overlaps with continuous delivery.)
4. PM' should have success targets  for each feature


working loop:
    1. spec
    2. plan (PRD, then HLD, then LLD)
    3. code + testing
    5. PR
    6. code review 
    7. QA
    8. merged
    9. Build
    10 deploy
this loop is not required to be followed always. 
Given a requirement, an agent, can decide, "I'll just directly write the code, Without writing a design doc" That decision should be captured in the ticket: why the agent is skipping that feature, that step.
A human can also ask us to short-circuit the loop. Ex:  write code and deploy.


----




