PS C:\Repos\kaseya-one-productivity-tools> cd C:\Repos\foreman-line-w0-p1                                                                                                                        
PS C:\Repos\foreman-line-w0-p1> node -v                                   # MUST say v22.x — fix nvm first if not                                                                                
v24.11.1                                                                                                                                                                                         
PS C:\Repos\foreman-line-w0-p1> git status --short                        # blast radius check: everything should be under                                                                       
?? plugins/foreman-line/                                                                                                                                                                         
PS C:\Repos\foreman-line-w0-p1>                                           # plugins/foreman-line/contracts/ (untracked), nothing else                                                            
PS C:\Repos\foreman-line-w0-p1> cd plugins\foreman-line\contracts                                                                                                                                
PS C:\Repos\foreman-line-w0-p1\plugins\foreman-line\contracts> npx tsc --noEmit                                                                                                                  
PS C:\Repos\foreman-line-w0-p1\plugins\foreman-line\contracts> npx tsx --test tests/*.test.ts            # expect 63/63
✔ no drift: correlation-context.schema.json matches typed source (2.7282ms)
✔ canonical sample validates: correlation-context (31.7095ms)
✔ no drift: receipt-ref.schema.json matches typed source (1.4948ms)
✔ canonical sample validates: receipt-ref (1.4188ms)
✔ no drift: rework-signal.schema.json matches typed source (1.4475ms)
✔ canonical sample validates: rework-signal (3.136ms)
✔ no drift: shaping-result.schema.json matches typed source (2.024ms)
✔ canonical sample validates: shaping-result (2.9199ms)
✔ no drift: registration-result.schema.json matches typed source (1.7601ms)
✔ canonical sample validates: registration-result (5.0948ms)
✔ no drift: dispatch-order.schema.json matches typed source (2.2661ms)
✔ canonical sample validates: dispatch-order (3.0076ms)
✔ no drift: build-result.schema.json matches typed source (1.5214ms)
✔ canonical sample validates: build-result (2.8269ms)
✔ no drift: verification-verdict.schema.json matches typed source (1.5396ms)
✔ canonical sample validates: verification-verdict (5.0183ms)
✔ no drift: integration-result.schema.json matches typed source (1.5766ms)
✔ canonical sample validates: integration-result (2.91ms)
✔ no drift: closure-record.schema.json matches typed source (1.5878ms)
✔ canonical sample validates: closure-record (3.036ms)
✔ no drift: stage-envelope.shaping-result.schema.json matches typed source (1.1373ms)
✔ canonical sample validates: stage-envelope.shaping-result (4.8963ms)
✔ no drift: stage-envelope.registration-result.schema.json matches typed source (1.553ms)
✔ canonical sample validates: stage-envelope.registration-result (7.1708ms)
✔ no drift: stage-envelope.dispatch-order.schema.json matches typed source (1.6022ms)
✔ canonical sample validates: stage-envelope.dispatch-order (4.0813ms)
✔ no drift: stage-envelope.build-result.schema.json matches typed source (0.9283ms)
✔ canonical sample validates: stage-envelope.build-result (4.5421ms)
✔ no drift: stage-envelope.verification-verdict.schema.json matches typed source (1.4669ms)
✔ canonical sample validates: stage-envelope.verification-verdict (9.807ms)
✔ no drift: stage-envelope.integration-result.schema.json matches typed source (1.4628ms)
✔ canonical sample validates: stage-envelope.integration-result (6.1896ms)
✔ no drift: stage-envelope.closure-record.schema.json matches typed source (1.2235ms)
✔ canonical sample validates: stage-envelope.closure-record (7.2612ms)
✔ input/output typed literals agree: stage-envelope.shaping-result (0.2054ms)
✔ input/output typed literals agree: stage-envelope.registration-result (0.16ms)
✔ input/output typed literals agree: stage-envelope.dispatch-order (0.0913ms)
✔ input/output typed literals agree: stage-envelope.build-result (0.0676ms)
✔ input/output typed literals agree: stage-envelope.verification-verdict (0.079ms)
✔ input/output typed literals agree: stage-envelope.integration-result (0.0634ms)
✔ input/output typed literals agree: stage-envelope.closure-record (0.0634ms)
✔ every exported contract type has a committed schema file (0.0794ms)
✔ chain is 7 hops across 6 stages (C emits two) (1.9026ms)
✔ correlation identity is reference-identical through every hop (0.1355ms)
✔ correlation identity is deep-equal and unmutated through every hop (0.1633ms)
✔ every hop validates against its composed boundary schema (60.2629ms)
✔ workflowId is stable across the D -> C -> D rework loop (0.9946ms)
✔ end-to-end correlationId and sessionId are stable across the loop (0.187ms)
✔ runId is unique per execution attempt (rework retry gets a fresh runId) (0.1892ms)
✔ the D verdict requesting rework targets Stage C from Stage D (0.1465ms)
✔ rework-loop envelopes validate against their composed schemas (47.6182ms)
✔ accepts a fully valid envelope (positive control) (3.1086ms)
✔ rejects envelope with missing correlation.correlationId (0.5109ms)
✔ rejects envelope with missing correlation.sessionId (0.248ms)
✔ rejects envelope with missing correlation.workflowId (0.2236ms)
✔ rejects envelope with missing correlation.runId (0.2171ms)
✔ rejects a correlation value that is not a UUID-format string (0.2717ms)
✔ rejects a UUID-shaped-but-wrong-length correlation value (0.2059ms)
✔ rejects an unknown top-level envelope field (strict mode) (0.1826ms)
✔ rejects an unknown field nested inside correlation (strict mode) (0.3486ms)
✔ rejects a ReceiptRef missing hash (0.5733ms)
✔ rejects a ReceiptRef missing locator (0.2144ms)
✔ accepts a ReceiptRef with both hash and locator (0.1195ms)
ℹ tests 63
ℹ suites 0
ℹ pass 63
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2398.9469
PS C:\Repos\foreman-line-w0-p1\plugins\foreman-line\contracts> npx biome check .
Checked 16 files in 22ms. No fixes applied.
PS C:\Repos\foreman-line-w0-p1\plugins\foreman-line\contracts> npm run generate; git status --short      # after regen: tree still clean = AC2 parity is real

> @foreman-line/contracts@0.0.0 generate
> tsx src/generate.ts

generated 17 schema files in C:\Repos\foreman-line-w0-p1\plugins\foreman-line\contracts\schemas
?? ../