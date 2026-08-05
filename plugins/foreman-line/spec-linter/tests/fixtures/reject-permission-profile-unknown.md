---
ticket: KONE-TEST
title: Test spec fixture — well-formed but unregistered permission_profile
status: active
owner: clinton.morgan
created: 2026-07-15
updated: 2026-07-15
supersedes: null
superseded_by: null
risk: standard
surfaces: [docs/SPEC-CONVENTION.md]
routing_class: standard-feature
permission_profile: not-a-real-profile
---

# Test spec

AC6 rejecting fixture: permission_profile is a well-formed, non-whitespace
string that does not match any name in the P1 registry's PROFILE_NAMES enum.
