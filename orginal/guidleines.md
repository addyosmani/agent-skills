


PR review guidelines
1. changes not related to the feature / task
2. changes not feature flag gated, wherever applicable
3. if change risks regression. 
4. Observability missinng or redundant. (metrics, logs)
5. Mising or redundant comments. Commmets shouls be very spraingly used
6. domain conventions not followed
7. use of strings
3. always raise the PR, Don't directly merge.  (Review can be made optional)
4. Don't hold PR for security audit. Security audit can be taken up later as a next requirements

Reviwers 
    - So, the existing agent will take the role of these reviewers by importing the relevant skill.
    - they can be code reviwer, QA reviewer, perf reviewer, security reviewer etc
    - They will create an issue on linear
    - will comment on PR (if PR is open)
    - optional

PR merge
1. delete remote and local PR
2. use regular merge commit rather than squash. That also keeps the commit ids quoted in the review threads findable


commit
1. Commit should contain model, thinking effor and harness
3. Keep committing small and working changes 
7. Best effort: Every commit should be a usable feature, Or should not break the app. That is, if your commit is pushed to production, it should not cause any issue. This might not be true in all the cases. In some cases, we would want to push the whole thing, but wherever it is possible, even if we are not pushing every commit to production, at least in spirit, we should follow it.


Continous delivery
- use semver
- progressively Usable product instead of creating everything in one shot (this is not being followed) (localhost stops working) (to check if it is not feasible)
b. for example: 
	1. if you get a very large scope, so instead of making changes all over the place and as a result making the product unusable is not acceptable. Rather, say create 1 api, test it and commit it. 
a. Always make sure that any change you make should work. Basically at every point the app should be working. Break tasks in such a way
While the above could not be possible for some technical things, like, database migration but if a feature request comes, we should make it our top most priority that feature is delivered continuously to the user.
use techniques like
	•  feature flag
	• Submit code without entry point
    - etc.

The above can be overridden when speed is required, so a human can ask you to do the whole dev in one shot, do one pass of testing, and then commit.

development parallism 
1. Api contract first, So that the frontend and backend can work independently
2. While working with APIs, not created yet, frontend can mock api according to the code contract
3. BE can return mock data for integration testing if code not complete
6. After deciding DB model, and api contract, backend services can work concurrently (For service-to-service communication)
7. Development: Each agent must Create their own environments 
	1. Git worktree
        should always be created at project root and not in the harness root (like in herdr root or claude root)
        cleanup after dev
	2. ephemeral environments
		a. Localstack  to mock aws
		b. Can take snapshot of db or seed script
		c. Own observability, metrics and logs (Optional to debug and things like that)
        d. docker container
8. There should be no confusion about what the dependency shape or type is if you are dependent on another service. it needs to be resolved first before doing anything.

testing
1. E2e testing..like how users of product will use the product.
5. Canvas testing automation (For frontend agent. to be figured out)
6. Concurrency and race conditions testing
7. Perf testing (deferred now)

Observability
• • Strucutred logging
• •  be judicious with logging. Don’t create noise. 
• tech metrics (decided by backend agent)
• prodcut and business metrics (to be decided by PM)
• alerts and runbooks (deferred)
• traces (deferred)

Architecture rules
1. Vertical slice architecture
2. The above goes hand in had with service first folder strucutre
3. Every service will be a collection of features
4. Service will represent the domain with well defined bounded context
• Keep the folder structure as flat as possible unless necessary. Avoid nesting.
7. Services as modular monolith (means Should be easy to host them as separate service but for now everything is serverd as a single binary)
5. Hexagonal architecure
6. monorepo
• Backend driven UI fo froentend (web and mobile)
• Mesaure and fix. Don’t fix for hypothetical scenarios
• Do not solve for scale unless it is established that scale is the bottleneck
• security only for securioty sensitive featuers like auth
• Instead of getting stuck or assuming, ask for clarity on ambiguities or some complex technical choices. 
- Be delibereate whle planning for 
    1. db models
    2. LLD like main classes, interfaces, composition and inheritence
    3. programming patterns like functional patterns (compose, ), oops patters (factory,registry )


Coding principals
1. No strings, 
2. no opaque objects. 
3. Everything should be typed 
4. generated backend typed client
5. client sdk should be outside of backend service folder..at the root
6. Client sdk can be required in multiple languages. So a generator might be required (Don't create beforehand, if it is not required.)
7. each service will maintain its client sdk. And any dependent service needs to call the sdk
7. external inputs need to be typed at the edges
8. Models separation in backend(api model, domain model, db model)
9. pay cost at compile time instead of run time
10. Treat errors as first class citizens in the domain. 
15. Typescript for FE
16. Don’t favor high cyclometry complexity
17. use swagger for apis
• Fail loudly. Don’t swallow errors. 
- If touching an existing code be backward compatible
• No silent Creep of tech decisions like automatic retries, queues, or elaborate coordination…unless we have the data and the case is strong that we need these things. Basically, only introduce complexity when it demands
- Avoid unnecessary misdirection. Code should read as flat as possible.
- Avoid defensive coding as possible in the business logic. Defensive coding is fine at edges.
- use Linter for backend and frotned
- Static type checker
- https://json-schema.org/
• Don't modify generated/vendor files
- Use domain-driven design.

Domain-Driven Design
- Don't use raw IDs. Wrap them in domain IDs.
- Define entities, value objects, bounded context, Domain events, Aggregates, etc.
- 



database rules
1. fail-on-conflict approach, not build for hypothetical high concurrency.
2. Connection pooling
3. migration
4. postgres
5. schema should live separately 


Documentation rules
• Be very economical with words.
• They should reflect high level ideas.
- Some documents might require some depth, such as RCA or design docs
- shouldnt copy the code in the code. For that person can always go to the code
• Not Every feature needs an HLD, LLD or doc update. 
• Create document index for Progressive disovery
• Keep doc current
• compact it regularly by extracting it into skills so that it's not bloated. 
- dont create cloud atrifacts. All docs should live in the repo
-  docs will be generated in two types
        as a md file which other agents can read (with diagrams as code)
        and as an interactive HTML which humans will use (as of now i will use lavish skill)
- avoid big docs because 
    You've already significantly reduced the audience (ain't nobody got time to read all that)
    you've increased the likelihood that information in it is outdated the moment implementation starts
- The older and longer the document, the less accurate, useful, and likely to be read and understood.
- In the doc for designs, use design-as-code, draw.io, Mermaid, drawdb.
- Every HLD, LLD, or PRD doc needs to be reviewed by me.
- While creating a doc think about how you can be succinct without losing the information. 
- Not everything needs to be documented. Some things are obvious. 
- linear ticket and commit message will proxy for majority of the docs, so focus on creating good tickets and good commit messages.
- Docs should live at the root of the original project or in the corresponding services. They should not live in the agent brain, which is the current implementation as of now.
- These dogs will live in their folder because, for a particular service, there can be multiple Cheldee dogs. In a service, there should be a Cheldee folder.


For large scale deprecation/migration
1.  Create new prallel features
2. Marke old code and flow as deprecate
3. Don’t allow addding anything new in old flow
4. Test new flow
5. Swithc to new flow
6. Delete old flow
7. Migrate old data
8. Don’t edit old flow in place
9. Old flow should be kept working as you make new changes
A human can override the above migration plan


