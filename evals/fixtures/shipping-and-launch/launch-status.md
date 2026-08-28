# Checkout launch status — tomorrow

- Unit tests: green.
- End-to-end checkout test: failing on payment confirmation timeout.
- Staging smoke test: not run since the last payment-provider change.
- Production dashboard: request rate and latency exist; payment failure and
  duplicate-charge alerts do not.
- Feature flag: checkout v2 can be disabled without deployment.
- Rollback owner and commands: not documented.
- Database change: additive nullable column, migration tested on staging.
- Support and on-call have not received the launch runbook.
