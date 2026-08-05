/**
 * Human-gate integrity primitives (coordinator ruling Q6, focus AC8):
 * `approve` requires BOTH an interactive TTY (`process.stdin.isTTY`) AND a
 * matching typed confirmation phrase - the exact `<slug>` being approved
 * (coordinator ruling F2). No flag, no environment variable, no non-interactive
 * invocation can substitute for either check. The comparison itself is a
 * linear-time exact-string check (`===`) - no regex, no backtracking risk
 * (lesson #19).
 */
import { createInterface } from 'node:readline/promises'

export function isInteractiveTty(stdin: NodeJS.ReadStream = process.stdin): boolean {
  return stdin.isTTY === true
}

/** Linear-time exact-string confirmation match. */
export function confirmationMatches(typed: string, expectedSlug: string): boolean {
  return typed === expectedSlug
}

/** Prompt the human to type the slug being approved, on the given streams. */
export async function promptForConfirmation(
  slug: string,
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
): Promise<string> {
  const rl = createInterface({ input, output })
  try {
    return await rl.question(`Type the slug to confirm approval ('${slug}'): `)
  } finally {
    rl.close()
  }
}
