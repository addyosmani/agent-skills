import type { Action, Rule, RuleContext, RuleResult } from '@nizos/probity'

import { buildMatcher } from './scoping.js'

/**
 * One layer of an ordered architecture: atomic design levels, or
 * presentation over domain over data.
 */
export type ImportLayer = {
  name: string
  /**
   * Kotlin package prefixes (`com.x.design.atoms`) or Swift module
   * names (`Atoms`). A reference belongs to the layer whose prefix
   * matches the most segments. A `*` segment matches any one segment
   * and makes each package it matches a sibling of the others:
   * `com.x.feature.*` puts `feature.home` and `feature.settings` at one
   * rank, unable to reference each other.
   */
  packages: readonly string[]
  /**
   * Globs that place a file in this layer when its source names no
   * package (Swift). A Kotlin file is placed by its `package` line.
   */
  paths?: readonly string[]
}

type Placement = { rank: number; unit: string; label: string }

/** Blanks comments and string literals so only code is scanned. */
function codeOnly(source: string): string {
  let out = ''
  let i = 0
  while (i < source.length) {
    const rest = source.slice(i, i + 3)
    if (rest.startsWith('//')) {
      const end = source.indexOf('\n', i)
      i = end === -1 ? source.length : end
    } else if (rest.startsWith('/*')) {
      const end = source.indexOf('*/', i + 2)
      i = end === -1 ? source.length : end + 2
      out += ' '
    } else if (rest === '"""') {
      const end = source.indexOf('"""', i + 3)
      i = end === -1 ? source.length : end + 3
      out += '""'
    } else if (source[i] === '"' || source[i] === "'") {
      const quote = source[i]
      let j = i + 1
      while (j < source.length && source[j] !== quote && source[j] !== '\n') {
        j += source[j] === '\\' ? 2 : 1
      }
      i = j + 1
      out += '""'
    } else {
      out += source[i]
      i += 1
    }
  }
  return out
}

const KOTLIN_PACKAGE = /^\s*package\s+([\w.]+)/m
const QUALIFIED_NAME = /(?<![\w.])[A-Za-z_]\w*(?:\.(?:[A-Za-z_]\w*|\*))+/g
const SWIFT_IMPORT =
  /^\s*(?:@\w+(?:\([^)]*\))?\s+)*import\s+(?:(?:typealias|struct|class|enum|protocol|let|var|func)\s+)?([\w.]+)/gm

/** Dotted names the code references: every qualified name in Kotlin, import paths in Swift. */
function references(path: string, content: string): string[] {
  const code = codeOnly(content)
  if (path.endsWith('.swift')) return [...code.matchAll(SWIFT_IMPORT)].map((m) => m[1]!)
  return [...code.replace(KOTLIN_PACKAGE, '').matchAll(QUALIFIED_NAME)].map((m) => m[0])
}

/**
 * Ordered-layer import rule (issue #154): each layer may reference
 * only the layers below it. Blocks a write that adds a reference from
 * a layer to one above it, or to a sibling at the same rank. Kotlin
 * files are judged on `import` lines and fully-qualified references
 * in code; Swift files on `import` lines (module names). Comments and
 * string literals are ignored.
 *
 * Delta-based, like the other import screens: only references the
 * write adds beyond what the file on disk already has block, so an
 * existing upward import doesn't freeze its file. No AI call.
 *
 * Applies to: write actions. Scope it to the source files of the
 * layered code (leave tests out if they may reach across layers).
 *
 * @param options.layers — lowest first. A nested array is a group of
 *   layers at one rank: each may reference lower ranks but not the
 *   others in its group.
 * @param options.strict — a layer may reference only the rank directly
 *   below it (strict layering), not every lower one.
 * @param options.hint — appended to the block message, e.g. where the
 *   layering is decided ("see ADR 0012").
 *
 * @example
 * { files: ['ui/design/src/**\/*.kt', '!**\/test/**'], rules: [enforceLayeredImports({
 *   layers: [
 *     { name: 'tokens', packages: ['com.x.design.tokens'] },
 *     { name: 'atoms', packages: ['com.x.design.atoms'] },
 *     { name: 'molecules', packages: ['com.x.design.molecules'] },
 *   ],
 * })] }
 */
export function enforceLayeredImports(options: {
  layers: readonly (ImportLayer | readonly ImportLayer[])[]
  strict?: boolean
  hint?: string
}): Rule {
  // Array.isArray doesn't narrow a readonly array, hence the cast.
  const ranks: (readonly ImportLayer[])[] = options.layers.map((entry) =>
    Array.isArray(entry) ? (entry as readonly ImportLayer[]) : [entry as ImportLayer],
  )
  const ranked = ranks.flatMap((layers, rank) =>
    layers.map((layer) => ({
      rank,
      layer,
      inPaths: layer.paths?.length ? buildMatcher(layer.paths) : () => false,
    })),
  )
  const order = ranks
    .map((layers) =>
      layers.length > 1 ? `{${layers.map((layer) => layer.name).join(' | ')}}` : layers[0]!.name,
    )
    .join(' → ')

  function place(name: string): Placement | null {
    const segments = name.split('.')
    let best: (Placement & { length: number }) | null = null
    for (const { rank, layer } of ranked) {
      for (const prefix of layer.packages) {
        const parts = prefix.split('.')
        if (parts.length > segments.length) continue
        if (!parts.every((part, i) => part === '*' || part === segments[i])) continue
        if (best && best.length >= parts.length) continue
        const captured = parts.flatMap((part, i) => (part === '*' ? [segments[i]!] : []))
        const tag = captured.join('.')
        best = {
          rank,
          length: parts.length,
          unit: `${layer.name}|${tag}`,
          label: tag ? `${layer.name} ${tag}` : layer.name,
        }
      }
    }
    return best && { rank: best.rank, unit: best.unit, label: best.label }
  }

  function placeFile(path: string, content: string): Placement | null {
    const pkg = path.endsWith('.swift') ? null : codeOnly(content).match(KOTLIN_PACKAGE)?.[1]
    const byPackage = pkg ? place(pkg) : null
    if (byPackage) return byPackage
    const hit = ranked.find(({ inPaths }) => inPaths(path))
    return hit ? { rank: hit.rank, unit: `${hit.layer.name}|`, label: hit.layer.name } : null
  }

  /** Why `to` may not be referenced from `from`, or null when it may. */
  function breach(from: Placement, to: Placement): string | null {
    if (to.unit === from.unit) return null
    if (to.rank > from.rank) return 'upward'
    if (to.rank === from.rank) return 'sibling'
    if (options.strict && to.rank < from.rank - 1) return 'skip'
    return null
  }

  function breaches(path: string, content: string, from: Placement): Map<string, number> {
    const counts = new Map<string, number>()
    for (const ref of references(path, content)) {
      const to = place(ref)
      if (to && breach(from, to)) counts.set(ref, (counts.get(ref) ?? 0) + 1)
    }
    return counts
  }

  return async function enforceLayeredImports(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write') return { kind: 'pass' }
    const from = placeFile(action.path, action.content)
    if (!from) return { kind: 'pass' }
    const after = breaches(action.path, action.content, from)
    if (after.size === 0) return { kind: 'pass' }
    const disk = await ctx?.readFile?.(action.path)
    const before = breaches(action.path, disk?.kind === 'present' ? disk.content : '', from)
    const edges = new Map<string, { kinds: Set<string>; refs: string[] }>()
    for (const [ref, count] of after) {
      if (count <= (before.get(ref) ?? 0)) continue
      const to = place(ref)!
      const edge = `${from.label} → ${to.label}`
      const entry = edges.get(edge) ?? { kinds: new Set<string>(), refs: [] }
      entry.kinds.add(breach(from, to)!)
      entry.refs.push(ref)
      edges.set(edge, entry)
    }
    if (edges.size === 0) return { kind: 'pass' }
    const kinds = new Set([...edges.values()].flatMap((e) => [...e.kinds]))
    const why = [
      kinds.has('upward') && 'a layer may reference only layers below it',
      kinds.has('sibling') && 'siblings at one rank may not reference each other',
      kinds.has('skip') && 'with strict layering, only the layer directly below',
    ].filter(Boolean)
    const listed = [...edges].map(([edge, { refs }]) => `${edge} (${refs.join(', ')})`)
    const hint = options.hint ? ` ${options.hint}.` : ''
    return {
      kind: 'violation',
      reason:
        `This write adds a reference against the layer order: ${listed.join('; ')}. ` +
        `Layers, lowest first: ${order}; ${why.join('; ')}. ` +
        'Move what both need down into a lower layer, or move this code up ' +
        `to the layer that may use it.${hint} Existing references in the file ` +
        'are untouched by this rule — only new ones are blocked.',
    }
  }
}
