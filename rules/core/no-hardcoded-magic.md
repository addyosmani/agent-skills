---
title: No hardcoded magic values
applies-to: ["python", "typescript"]
last-reviewed: 2026-05-04
# §A.6: derivation of global ~/.claude/CLAUDE.md "engineering invariants" (universal);
# direct evidence: multi-bank financial pipeline (sessions 2026-05-02, 2026-05-03)
# where 10-12 hardcoded literals caused pipeline failures when new banks were added.
---

# No hardcoded magic values

In multi-tenant or multi-client systems, a value that varies by client, by time period, or
by external schema belongs in configuration — not embedded as a literal in logic. Hardcoded
magic values create silent coupling: the code works for the original context and silently
breaks for every other context. This rule enforces the boundary between "code that
orchestrates" and "config that parameterizes."

## Inviolable rules

1. Every value that varies by client, tenant, environment, or external schema MUST be declared
   as a named constant in a dedicated config module or loaded from an environment variable or
   config file. Inline literals for such values are prohibited in business logic.

2. Every string or numeric literal that appears more than once in the codebase MUST be extracted
   to a named constant. The constant name MUST make the domain meaning explicit (e.g.
   `ACCOUNT_CODE_CHECKING` not `CODE_11100501`).

3. Tests MUST exercise at least N≥2 distinct input configurations before a change is merged.
   A test suite that only runs against the original client's config does not verify the
   abstraction — it verifies the hardcode.

4. Any pattern (regex, column header list, sheet index range, routing code) that is derived from
   an external template, protocol, or client-supplied schema MUST be loaded from config, not
   written as a literal in the source. When the external schema changes, only the config
   changes — not the logic.

## Allowed patterns

```python
# Good — account codes loaded from config, not inlined
# Config module: config/accounts.py
from dataclasses import dataclass

@dataclass(frozen=True)
class AccountCodes:
    checking: str
    savings: str
    wire_out: str

# Instantiated per-client in config/clients/<slug>.py
BBVA_ACCOUNTS = AccountCodes(
    checking="11100501",
    savings="21000301",
    wire_out="51100101",
)
```

```python
# Good — sheet layout parameterized, not hardcoded
def read_bank_sheets(workbook, layout: list[str]) -> dict:
    """
    Read sheets by name from layout config, not by index range.

    Args:
        workbook: openpyxl Workbook object.
        layout: Ordered list of sheet names for this client's template.

    Returns:
        Dict mapping sheet name to DataFrame.
    """
    return {name: workbook[name] for name in layout}

# Called with client-specific layout from config
read_bank_sheets(wb, config.sheet_layout)  # e.g. ["Cuenta", "Saldo", "Movimientos"]
```

```python
# Good — parametrized test covering two client configs
import pytest
from config.clients.bbva import BBVA_CONFIG
from config.clients.bancolombia import BANCOLOMBIA_CONFIG

@pytest.mark.parametrize("client_config", [BBVA_CONFIG, BANCOLOMBIA_CONFIG])
def test_pipeline_produces_output(client_config):
    result = run_pipeline(client_config)
    assert result.row_count > 0
```

```typescript
// Good — routing codes from config, not inlined in switch
// config/payrollCodes.ts
export const PAYROLL_CODES = {
  nomina_ordinaria: process.env.PAYROLL_CODE_ORDINARIA ?? (() => { throw new Error("PAYROLL_CODE_ORDINARIA not set"); })(),
  nomina_prima:     process.env.PAYROLL_CODE_PRIMA     ?? (() => { throw new Error("PAYROLL_CODE_PRIMA not set"); })(),
} as const;

// logic/router.ts
import { PAYROLL_CODES } from "../config/payrollCodes";

function routePayroll(code: string): PayrollType {
  if (code === PAYROLL_CODES.nomina_ordinaria) return "ordinary";
  if (code === PAYROLL_CODES.nomina_prima)     return "prima";
  throw new Error(`Unknown payroll code: ${code}`);
}
```

## Anti-patterns

The following are real failure patterns documented in a multi-bank financial pipeline.
Each caused a regression when a second bank was onboarded.

```python
# Bad — violates rule 1 (account code literal embedded in AH branch logic)
# When a new bank uses a different AH code, this silently processes wrong accounts.
if transaction.account_code == "11100501":
    classify_as_checking(transaction)
```

```python
# Bad — violates rule 1 and rule 4 (Excel layout hardcoded to original bank's 9-sheet format)
# Fails silently when a new bank delivers 5 or 12 sheets.
for sheet_index in range(9):
    process_sheet(workbook.worksheets[sheet_index])
```

```python
# Bad — violates rule 4 (column headers literal when they come from client's template)
# Bold's template uses ["Empresa", "Cuenta_num", "NIT_empresa"] — this crashes on column lookup.
EXPECTED_HEADERS = ["empresa", "cuenta", "NIT"]
validate_headers(df.columns, EXPECTED_HEADERS)
```

```python
# Bad — violates rule 4 (date-window regex fixed to February; breaks every other month)
# The filter was written during February testing and was never parameterized.
import re
DATE_FILTER = re.compile(r"^FEB.*")
filtered = [row for row in rows if DATE_FILTER.match(row["period"])]
```

```python
# Bad — violates rule 1 and rule 2 (routing code literal with no named constant)
# When the payroll authority changes the code, a grep is needed to find every occurrence.
if transaction.codigo_nomina == "250501":
    route_to_payroll_ledger(transaction)
```

## Documented exceptions

- **Universal constants defined by external specifications**: HTTP status codes (`200`, `404`, `500`),
  ISO 4217 currency codes (`"COP"`, `"USD"`), days of the week in non-localized scheduling logic.
  These do not vary by client or environment — they are defined by an external standard that
  changes on a decade scale, not a sprint scale.

- **Buffer and packet sizes fixed by protocol**: TLS record size, MTU (`1500`), SMTP line length
  limit. Embed as a named constant with a comment citing the RFC or specification, not as a
  bare literal — but they do not need to be loaded from config.

- **Test fixture literals**: values inside `tests/fixtures/` or `conftest.py` that represent
  synthetic client data for schema validation. These are permitted as literals because they
  exist to test the schema, not to drive business logic. They MUST NOT be reused outside
  the test boundary.
