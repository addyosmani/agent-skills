export interface CoordinatorIdentity {
  readonly login: string
  readonly nodeId: string
}

export class CoordinatorIdentityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CoordinatorIdentityError'
  }
}

/**
 * Collapse untrusted text onto a single line and bound its length before it is
 * interpolated into an error message — no newline / control-character injection
 * into whatever log or receipt the message lands in.
 */
function sanitizeForMessage(value: unknown): string {
  let text: string
  try {
    text = value instanceof Error ? value.message : String(value)
  } catch {
    text = '<unprintable>'
  }
  let out = ''
  for (const ch of text.slice(0, 200)) {
    const code = ch.codePointAt(0) ?? 0
    out += code < 0x20 || code === 0x7f ? ' ' : ch
  }
  return out
}

/**
 * Read a property EXACTLY ONCE, converting a throwing accessor (getter or Proxy
 * trap) into a `CoordinatorIdentityError` so AC3's "throws
 * `CoordinatorIdentityError` on any shape failure" holds for hostile inputs too.
 */
function readOnce(obj: Record<string, unknown>, key: string): unknown {
  try {
    return obj[key]
  } catch (cause) {
    throw new CoordinatorIdentityError(
      `actor.${key} could not be read: ${sanitizeForMessage(cause)}`,
    )
  }
}

export function parseCoordinatorIdentity(raw: unknown): CoordinatorIdentity {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new CoordinatorIdentityError('actor must be a non-null object')
  }
  const obj = raw as Record<string, unknown>
  // Single read per property: validate the local, return the local. A getter
  // that yields a different value on a second read cannot slip an unvalidated
  // value into the result (validate-then-reread TOCTOU).
  const login = readOnce(obj, 'login')
  const nodeId = readOnce(obj, 'node_id')
  if (typeof login !== 'string' || login.length === 0) {
    throw new CoordinatorIdentityError('actor.login must be a non-empty string')
  }
  if (typeof nodeId !== 'string' || nodeId.length === 0) {
    throw new CoordinatorIdentityError('actor.node_id must be a non-empty string')
  }
  // Make the interface's `readonly` fields real at runtime.
  return Object.freeze({ login, nodeId })
}
