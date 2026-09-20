# Bug

An issue with the `bug` label, related to the issue it affects. Labels: `bug:<type>` and `severity:<level>` as below.

```markdown
Summary: <one sentence, observable>
Bug type: functional | regression | performance | security | data | ux | flaky-test | environment
Severity: blocker | high | medium | low
Discovered by: <persona or user> via <QA | end-to-end test | user report | monitoring | review>
Discovered on: <date> at <commit or environment>
Affects: <issue ids>, service <name>
Reproduction:
1. <step>
Expected: <behavior>
Actual: <behavior>
Evidence: <log, screenshot, test output>
Prove-It test: <path, fails on current code: yes | not yet>
Suspected cause: <or unknown>
RCA required: yes | no
```
