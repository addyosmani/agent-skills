/**
 * Typed error class for the `integration` package (W4-P1), mirroring
 * `DispatchError`'s shape (`dispatch/src/approval-cli/index.ts:42-60`).
 */
export class IntegrationError extends Error {
  readonly code:
    | 'PRIOR_CORRELATION_MISSING'
    | 'RECEIPT_WRITE_FAILED'
    | 'PLAN_INVALID'
    | 'POSTURE_INVALID'

  constructor(code: IntegrationError['code'], message: string) {
    super(message)
    this.name = 'IntegrationError'
    this.code = code
  }
}
