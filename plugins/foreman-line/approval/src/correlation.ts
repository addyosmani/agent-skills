/**
 * Correlation generation (coordinator ruling Q5): the projected artifact and
 * `ShapingResult` carry no correlation, and the receipt chain key
 * (`correlation.workflowId`) must be stable P3 -> P4. This CLI generates a
 * fresh `CorrelationContext` at approval time using `node:crypto`
 * `randomUUID()` for each field, and persists it in the approval record so
 * W1-P4 can rejoin the same chain by reading `workflowId`.
 */
import { randomUUID } from 'node:crypto'
import type {
  CorrelationContext,
  CorrelationId,
  RunId,
  SessionId,
  WorkflowId,
} from '../../contracts/src/index.js'

export function generateCorrelationContext(): CorrelationContext {
  return {
    correlationId: randomUUID() as CorrelationId,
    sessionId: randomUUID() as SessionId,
    workflowId: randomUUID() as WorkflowId,
    runId: randomUUID() as RunId,
  }
}
