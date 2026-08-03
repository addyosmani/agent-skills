---
ticket: KONE-TEST
title: Test spec fixture — permission_profile explicit null
status: active
owner: clinton.morgan
created: 2026-07-15
updated: 2026-07-15
supersedes: null
superseded_by: null
risk: standard
surfaces: [docs/SPEC-CONVENTION.md]
routing_class: standard-feature
permission_profile: null
---

# Test spec

Warning-test case (c): permission_profile is present but explicitly null (a
YAML null literal, distinct from key-absent). The schema types this field as
`string` only, so `null` fails structural validation — exit 1, not an advisory
warning.
