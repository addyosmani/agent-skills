# Threat Model

## The lethal trifecta

An agent becomes genuinely dangerous only when three conditions hold at the same time — a pattern widely known in agent-security writing as the "lethal trifecta":

1. **It can read untrusted content** (a web page, email, repo file, tool output authored by someone other than the user)
2. **It can access private or sensitive data** (the user's files, credentials, message history, internal systems)
3. **It can communicate externally** (make network requests, send messages, write to a location an attacker can later read)

Remove any one leg and most attack chains collapse even if the other two remain: an agent that reads untrusted content and holds secrets but can't reach the network can't exfiltrate anything; one that can reach the network and read untrusted content but never touches private data has nothing worth stealing. When scoping what an agent is allowed to do in a given session, the highest-leverage single change is usually cutting one leg of this triangle, not adding more prompt-level caution.

## Why this skill is a soft limit

This skill changes what the agent *chooses* to do. It cannot change what the agent is *capable* of doing. A sufficiently clever piece of injected content can still talk a model into ignoring guidance written in natural language — that is a known, unsolved property of LLMs, not a bug in any one skill's wording. Real safety comes from the layers underneath:

```
Security Skill      -- judgment: classify, route, decide when to ask
       |             (defeated by a good enough injection)
Tool policy          -- which tools/actions exist at all
       |             (defeated by an over-broad toolset)
Permission Gate      -- which actions still need a human yes
       |             (defeated by over-approval / approval fatigue)
Network policy       -- which destinations traffic can reach
       |             (defeated by an open egress allowlist)
Sandbox              -- what the process can touch on disk/OS
       |             (defeated by running as the real user/root)
OS / VM boundary     -- last resort if everything above fails
```

Each layer is there to catch what the layer above misses. Design or evaluate an agent deployment from the bottom up: sandbox and OS boundary first (can a compromise actually reach anything that matters?), then network policy, then permission gates, then tool policy — the skill only matters once those are in place, because it's the one layer that can be argued with.

## Applying this in practice

- If you're the agent operating inside someone else's environment, you usually don't control the lower layers — so lean harder on Step 4 of `SKILL.md` (least privilege, explicit confirmation, quote-don't-paraphrase) precisely because you can't verify what's underneath you.
- If you're helping configure an agent's deployment (choosing which MCP servers to connect, which shell/network access to grant, what needs approval), push for cutting a leg of the trifecta rather than only writing better instructions — a sandboxed, network-restricted agent with no security skill is safer than an unrestricted one with an excellent one.
- Priority ordering elsewhere in this skill (MCP poisoning first, approval confusion last) reflects blast radius and how early in a session each vector typically fires — not a claim that later categories matter less.
