# Mobile architecture

React Native. Backend-driven UI. No business rules in the app.

## App structure

```text
<feature-first layout>
```

## Pluggable modules

Built once, extractable into any app: auth (OTP and OAuth login), notifications, force update, analytics. Where each lives and its boundary.

## Data layer

The generated client SDK, client state, offline and slow-network handling.

## Platform

iOS and Android differences that matter; release and force-update flow.
