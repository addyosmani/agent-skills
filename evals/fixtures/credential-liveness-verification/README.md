# Integration credentials fixture

Three scheduled integrations share one credential file and one nightly health check.

- `crm-sync` holds a JWT and has a future expiry.
- `billing-sync` declares `token_type: jwt` but the stored value is an opaque string.
- `warehouse-export` holds an opaque token whose expiry passed on 2026-10-21.

`check_health.py` reports on the presence and age of the credential file. It makes no authenticated call, so all three report healthy.

The sync jobs have been failing for a week while this check reports green.
