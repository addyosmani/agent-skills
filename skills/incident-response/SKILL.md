---
name: incident-response
description: Runs a security or production incident end to end, from declaration to blameless postmortem. Use when a breach, outage, data leak, ransomware alert, or suspicious activity is suspected or confirmed. Use when you need to triage an alert, contain a compromised system, or decide whether to observe an attacker or cut them off. Use when coordinating a response across engineers, support, and leadership, or when writing a postmortem after an incident is over.
---

# Incident Response

## Overview

An incident is any event that threatens the confidentiality, integrity, or availability of a system or its data: a breach, a data leak, ransomware, a compromised credential, a serious outage. Incident response is handling that event in a controlled way instead of improvising under pressure.

The goal is not to be heroic. It is to be boring: detect fast, scope accurately, contain deliberately, remove the real cause, recover safely, and learn in public.

This skill follows the NIST SP 800-61 Rev. 3 lifecycle and the SANS PICERL model (Preparation, Identification, Containment, Eradication, Recovery, Lessons Learned). Same shape, different vocabulary; use whichever your team already uses.

Three rules govern everything below:

1. **Preserve evidence before you fix anything.** A wiped host is a destroyed crime scene. Snapshot first, remediate second.
2. **One incident commander, one channel, one timeline.** Parallel conversations in five places are how scope gets lost and customers get contradictory messages.
3. **Keep what you know, what you suspect, and what you do not know in separate columns.** Guesses presented as facts are the most common way an incident response goes wrong in public.

## When to Use

- An alert, report, or anomaly suggests a breach, intrusion, or data exposure
- Ransomware, a defaced page, or an unexpected ransom note appears
- A credential, API key, or token is suspected leaked or stolen
- Customer data is found somewhere it should not be (a public bucket, a paste site, a log file)
- A host, account, or service behaves in a way no one can explain — unexpected outbound traffic, new admin users, changed configs
- A serious production outage needs coordinated response, not just a fix
- A third party (a vendor, a researcher, a regulator, a customer) reports a security problem in your system
- An incident is over and a postmortem is due

Do not use this skill for an ordinary bug with no security or availability impact — that is debugging, not incident response. If you are unsure whether something is an incident, treat it as one until triage proves otherwise.

## Process

Work the phases in order. Do not skip ahead to fixing before you have scoped, and do not declare the incident over before recovery criteria are met.

### Step 1: Declare and organise (first 15 minutes)

1. **Declare the incident.** Anyone who spots a credible signal can declare — a declaration is reversible, a lost hour is not.
2. **Assign an incident commander (IC).** One person owns coordination, decisions, and the clock — not the technical work. If the IC is also the investigator, the incident has no commander.
3. **Assign a communications lead.** One person owns all internal and external messages; nobody else talks to customers, the press, or other teams about the incident without going through them.
4. **Open one incident channel** (chat, call bridge, or ticket — pick one and put everything there). Every other channel gets a pointer to it, not a parallel discussion.
5. **Start the timeline immediately.** A shared document with UTC timestamps recording what happened, what was observed, and what action was taken — every entry with a time, an author, and a source. The timeline is evidence and the raw material for the postmortem.
6. **Assign a severity** (see Severity Definitions below). Reassess as facts change — severity is a live value, not a one-time label.

### Step 2: Triage and scope (detection and analysis)

Triage answers three questions: is this real, how bad is it, and what is affected?

1. **Validate the signal.** Corroborate from a second, independent source (another log, host, or tool). A single alert from a single noisy source is a lead, not a finding.
2. **Ask the triage questions:** what was observed, and when did it first appear? Which systems, accounts, and data are involved — and which are not? Is the activity still happening? Is customer or sensitive data involved, whose, and how much? What is the suspected entry point?
3. **Scope aggressively and write the scope down.** List affected systems, users, and data, and the blast radius if the worst case is true. Also list what you checked and found clean — negative results are scope too.
4. **Preserve evidence before touching anything.** Snapshot disk and memory of affected hosts before rebooting, patching, or wiping them — a reboot destroys volatile evidence (running processes, memory-resident malware, open connections). Export and freeze the relevant logs (authentication, network, application, cloud audit) somewhere the attacker cannot reach or alter. Hash everything you collect. Do not log in to the compromised host with a privileged account from your normal workstation — assume the host is hostile.
5. **Decide: contain now, or observe briefly?** See Containment below. The default is to contain. Observation is the exception and needs an explicit decision, a time limit, and a named owner.
6. **Escalate if the scope crosses a line:** regulated data involved, a customer-facing system down, a credible report of data exfiltration, or any sign of ransomware. Escalation is not failure; it is the process working.

### Step 3: Contain

**Short-term containment — stop the damage now:** isolate the affected host from the network (quarantine VLAN, disable the interface, or pull it from the load balancer) without powering it off; disable compromised accounts and revoke their sessions and tokens; revoke and rotate leaked API keys, secrets, and certificates; block malicious IPs, domains, and file hashes at the firewall, proxy, and email gateway; freeze suspicious changes (lock the repo, freeze deploys).

**Long-term containment — stop it coming back while you work:** segment the network so the affected system cannot reach anything it does not need; rotate credentials for every system the attacker could have touched — assume lateral movement until you prove otherwise; temporarily require MFA re-authentication and restrict admin access to a jump host; increase logging and monitoring on the affected systems and their neighbours.

**Containment vs. observation:** containing immediately is safer and usually right — it limits damage and is defensible to customers and regulators. But it tips off the attacker, who may delete evidence or move to a backup foothold you have not found. Observing briefly is justified only when the attacker is not actively destroying or exfiltrating data, you have a clear question observation will answer, you have a hard time limit (hours, not days), and a named person owns the decision and can pull the plug instantly. Observation without a time limit is avoidance. Record the decision, the reason, and the deadline either way.

### Step 4: Eradicate

1. **Identify the root cause, not just the symptom.** Deleting the malware binary is not eradication if the vulnerability that let it in is still open and the stolen credential is still valid. The entry point, the persistence mechanism, and the stolen access all have to go.
2. **Remove the attacker's footholds:** malware and backdoors, unauthorised accounts and SSH keys, scheduled tasks and cron jobs, web shells, rogue firewall rules, poisoned dependencies.
3. **Close the entry point:** patch the vulnerability, fix the misconfiguration (public bucket, open port, default credential), remove the vulnerable component, or disable the abused feature.
4. **Rotate everything the attacker could have seen:** credentials, keys, certificates, session tokens, and secrets in scope. Assume credentials on a compromised host are compromised.
5. **Prove the entry point is closed.** Re-run the attack path yourself: attempt the exploit against the patched system, log in with the old credential, reach the closed port. A fix you have not tested is a hope, not a fix. Then scan the wider environment for the same weakness — if one bucket was public, check all buckets; the same root cause rarely appears exactly once.

### Step 5: Recover

1. **Restore from known-good backups.** Verify the backup predates the compromise and verify its integrity first — a backup taken after the attacker arrived may contain their foothold. Test the restore in isolation where possible.
2. **Rebuild compromised hosts from a clean image** rather than cleaning them in place. Cleaning a rooted host is guesswork; rebuilding is certainty. Keep the snapshot of the compromised host for evidence.
3. **Return to service in stages:** internal users first, then a subset of customers, then everyone. Watch each stage before proceeding.
4. **Run enhanced monitoring for a defined period** (at least 30 days is a common baseline, longer for serious incidents): alert on the attacker's indicators, the affected accounts, and the restored systems. The attacker often returns to a known target.
5. **Declare "all clear" only against written criteria:** the entry point is proven closed, all footholds are removed, systems are restored from clean sources, monitoring is in place, and the IC and technical lead both agree. "It looks quiet" is not a criterion. Record who declared it and when.

### Step 6: Post-incident activity (the postmortem)

The postmortem happens within a week of the all-clear, while memories are fresh. It is blameless by design: the question is always what about the system allowed this to happen, never who to punish. The timeline is the spine of the document.

1. **Reconstruct the timeline** from the incident log, filling gaps from logs and chat history.
2. **Find the root cause with the 5 Whys.** Ask "why?" five times, following the chain past the proximate cause to the systemic cause — e.g. database deleted → attacker had admin credentials → credential was in a public repository → no secret scanning in the pipeline → nobody owned that check. The fix for the last answer (assign an owner, add the check) prevents the next incident; the fix for the first answer (restore the database) only repairs this one.
3. **Write what went well and what went badly**, honestly and specifically. "Communication was good" is useless; "the status page was updated within 20 minutes of declaration, but support learned about the incident from a customer tweet" is useful.
4. **Create action items with an owner and a date for each.** An action item without an owner is a wish. Track them like any other work and review them until they are done.
5. **Share the lessons and update the plan.** Distribute the postmortem to the teams that need it, and a sanitised version more widely. Every incident should change something: a new runbook, a new detection rule, a fixed gap in the contact list. If the postmortem changes nothing, it was theatre.


## Preparation: Before Anything Happens

An incident response capability is built in calm weather. If you are building it during an incident, you are already late. Keep it short: a 10-page plan people have read beats a 100-page plan nobody has opened.

- **Write an IR plan.** It needs: how to declare, who the IC is, how to reach people, severity definitions, communication templates, and where the evidence goes.
- **Define the roles in advance:** **Incident commander (IC)** — coordination, decisions, the timeline, severity, and the all-clear. **Technical lead** — the investigation and the fix; reports facts to the IC. **Communications lead** — every message in and out; the only voice to customers and the outside world. **Scribe** — keeps the timeline current. **Executive sponsor** — the calls the IC cannot make (external help, a shutdown, a disclosure).
- **Keep a contact list that works at 3 a.m.** Names, phone numbers, and backups for the IR team, executives, legal counsel, the cloud provider's support, and law enforcement. Test it twice a year.
- **Make sure responders can reach the evidence.** Pre-provisioned access to logs, cloud consoles, backups, and snapshot tools — access granted mid-incident is slow.
- **Write runbooks for the five most likely incidents** — typically: compromised credential, ransomware, data exposure, a DDoS or availability attack, and a lost or stolen device. One page each: how to recognise it, the first three containment actions, who to call, and what evidence to preserve.
- **Run tabletop exercises.** Twice a year, walk the team through a scenario ("a customer reports their data is on a paste site") for an hour. The exercise finds the gaps — the missing contact, the access nobody has — while they are still cheap to fix.
- **Keep backups you have actually restored from.** A backup never test-restored is a rumour. Test restores on a schedule and record the result.

## Severity Definitions

Define severity before an incident, in terms of impact — not how stressed everyone feels. Without a definition, everything is a SEV-1, and if everything is a SEV-1, nothing is.

- **SEV-1 — Critical:** data breach, or a customer-facing service down with no workaround (confirmed exfiltration, active ransomware, production down). All hands, IC immediately, executives notified, status page updated.
- **SEV-2 — Major:** significant impact, a workaround exists, or sensitive data at risk (service degraded for many customers; privileged credential leaked with no evidence of use). IR team engaged, IC assigned, leadership informed within the hour.
- **SEV-3 — Minor:** limited impact, one system or a small group (one non-privileged account compromised; suspicious alert, no confirmed impact). Assigned owner, handled in working hours unless it escalates.
- **SEV-4 — Low:** no impact, or a near miss worth recording (phishing email reported and blocked; vulnerability found before exploitation). Logged, fixed in normal work, used as a lesson.

Rules for severity:

- **Severity follows impact, not cause.** A bug and an attack that both take production down are both SEV-1.
- **Reassess as facts change.** A SEV-3 that turns out to involve customer data becomes a SEV-1 the moment that fact is known.
- **When in doubt, declare one level higher.** Downgrading later is easy; under-declaring costs the response time you needed. The IC sets severity from the facts — it is not a negotiation.

## Communications

Communication is a response action, not an afterthought. Bad communication during an incident does damage of its own.

**Internal communication:** tell the people who need to act first (IR team, owners of affected systems, leadership), then the people who need to know (support, sales, anyone who will hear about it from a customer first). Keep facts and decisions in the incident channel; send a separate short status update every 30–60 minutes during a SEV-1. Every update has the same shape: what happened, what is affected, what we are doing, what we know and do not know yet, and when the next update comes. Never promise a time for a fix you do not have.

**External communication:**

- Customers get told when they are affected, or likely to be. Hiding an incident customers can see is worse than the incident.
- Regulators get told when the law requires it — see Legal below. Do not wait for perfect facts; notify on what you know and update as you learn more. Law enforcement is involved when a crime has occurred (theft, extortion, fraud) or when counsel advises it; report promptly.
- The status page is updated on a schedule, even if the update is "we are still investigating." Silence during an outage is itself a message, and never a good one.

**What not to say:** no speculation (say what you know, what you are still checking, and stop there); no blame of people, vendors, or customers (it poisons the postmortem and creates legal exposure); no unverified claims (never say "no data was accessed" until you have evidence — that sentence, said too early, gets quoted back later); and no details that help the next attacker.

## Legal and Compliance Notes

This section is orientation, not legal advice. When any of it applies, involve counsel early — before you need them, not after you have said something public.

- **Preserve evidence and chain of custody.** Record for every item: what it is, where it came from, who collected it, when, and where it is stored. Evidence without a chain of custody is weak evidence. Store originals read-only; work on copies.
- **Breach notification is time-bound.** Under GDPR, a personal-data breach must be reported to the supervisory authority within 72 hours of becoming aware of it, and affected individuals told without undue delay when the risk to them is high. Other regimes have their own clocks — US state breach laws (typically 30–60 days), sector rules, and customer contracts that may be stricter than the law. Know which apply before an incident, and start the clock from awareness, not from complete facts.
- **Do not destroy, alter, or "tidy up" evidence** once a legal hold or a regulatory notification is in play; suspend log rotation and cleanup for the affected systems until counsel says otherwise.
- **Involve counsel before external statements** describing what happened, who is responsible, or what data was involved. Counsel also decides on law enforcement and on any ransom demand — paying one may be illegal in some jurisdictions and is never the technical team's decision.
- **Regulated industries have extra duties.** Finance, health, and critical infrastructure have sector-specific reporting obligations with their own deadlines; the IR plan must name the regulator and the deadline.

## Common Rationalizations

| Rationalization | Why it is wrong |
|---|---|
| "We don't need an IR plan — we'll figure it out when it happens" | Under pressure, without a plan, people improvise, duplicate work, and miss steps. The plan exists so decisions are made calmly, in advance. |
| "It's probably nothing, let's wait and see" | Waiting is how a small incident becomes a breach. Triage fast, declare early, downgrade later if the evidence says so. |
| "Rebooting the host fixed it" | A reboot clears evidence and often leaves the entry point open. The attacker comes back through the same hole. |
| "We contained it, so the postmortem can wait" | Memory fades in days. The postmortem written a month later is a guess. Write it while the timeline is fresh. |
| "The postmortem should name who caused it" | Blame makes the next person hide the next incident. Fix the system that let a human make the mistake. |
| "We can't tell customers yet — we don't have all the facts" | You never have all the facts on day one. Say what you know, what you don't know, and when you will update them. Silence is also a message. |

## Red Flags

- An incident is discussed in several channels at once, with no single timeline or commander
- The first action taken is wiping or rebooting a compromised host
- Hours pass with no severity assigned and no one told outside the people who found it
- The response team cannot reach the logs, the backups, or the cloud console
- Someone declares "all clear" because things look quiet, with no written criteria met
- The postmortem names a person as the cause instead of a system weakness
- Action items from the last postmortem are still open when the next incident happens
- External messages contain speculation, blame, or claims the evidence does not support

## Checklist

Use this as the close-out check before the incident is declared finished. Every box must be ticked or explicitly marked not applicable, with a reason.

- [ ] Incident declared; IC and comms lead assigned; single channel open
- [ ] Timeline maintained throughout, timestamps in UTC
- [ ] Severity assigned and reassessed as facts changed
- [ ] Evidence preserved: snapshots, memory, logs frozen and hashed; chain of custody recorded
- [ ] Scope written down: affected systems, users, data — and what was checked and found clean; containment actions recorded with the contain-vs-observe decision and its reason
- [ ] Root cause identified, not just the symptom; entry point proven closed (attack path re-tested)
- [ ] All footholds removed; credentials, keys, and tokens in scope rotated; systems restored from known-good sources or rebuilt from clean images
- [ ] Return to service staged; enhanced monitoring running for a defined period; all-clear declared against written criteria, by name, with a timestamp
- [ ] Internal and external communications sent; status page closed out; legal and notification obligations checked with counsel, deadlines met
- [ ] Postmortem scheduled within a week — blameless, timeline-based; action items have an owner and a date
- [ ] IR plan and runbooks updated from what the incident taught

## Verification

Before the incident is closed, confirm all of the following:

- The attack path has been re-tested against the fixed system and fails.
- Every credential, key, and token that could have been exposed has been rotated — and you can list them.
- No unauthorised account, key, scheduled task, or configuration remains in the affected scope. Check, do not assume.
- Restored systems came from a source that predates the compromise, or were rebuilt from a clean image.
- Enhanced monitoring is running on the affected systems with the attacker's indicators loaded into detection.
- The postmortem is written, action items have owners and dates, the IR plan is updated, and any notification obligations were checked with counsel and met on time.

If any item fails, the incident is not over. Say so plainly, keep the channel open, and keep working.
