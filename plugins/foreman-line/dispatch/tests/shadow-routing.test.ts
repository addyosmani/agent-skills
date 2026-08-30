import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  executeShadowRoute,
  hashShadowPublicInput,
  type ShadowInvocationRequest,
  type ShadowRoutingDependencies,
  ShadowRoutingError,
  type ShadowRoutingInput,
} from '../src/index.js'

const REAL_POLICY_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'routing-policy',
  'routing-policy.yaml',
)

const PUBLIC_INPUT = {
  specRef: 'docs/specs/active/example.md',
  excerpt: 'Public specification text authorized for linting.',
}

const AUTHORITATIVE_AUTHORIZATION = {
  parcelId: 'PARCEL-CEREBRAS-001',
  dataClassification: 'public',
  allowedTaskTypes: ['spec_lint'],
  publicInputSha256: hashShadowPublicInput(PUBLIC_INPUT),
}

interface MutableShadowRoutingInput {
  workflowId: string
  routeName: string
  taskType: string
  publicInput: unknown
  parcelAuthorization: {
    parcelId: string
    authorizationRef: string
    dataClassification: string
    allowedTaskTypes: string[]
    publicInputSha256: string
  }
  independentReviewerId: string
}

function makeTempRepoRoot(): string {
  const repoRoot = mkdtempSync(join(tmpdir(), 'shadow-routing-test-'))
  const policyDir = join(repoRoot, 'plugins', 'foreman-line', 'routing-policy')
  mkdirSync(policyDir, { recursive: true })
  writeFileSync(join(policyDir, 'routing-policy.yaml'), readFileSync(REAL_POLICY_PATH, 'utf8'))
  return repoRoot
}

function makeInput(overrides: Partial<ShadowRoutingInput> = {}): ShadowRoutingInput {
  return {
    workflowId: 'shadow-workflow-001',
    routeName: 'cerebras-shadow',
    taskType: 'spec_lint',
    publicInput: PUBLIC_INPUT,
    parcelAuthorization: {
      parcelId: 'PARCEL-CEREBRAS-001',
      authorizationRef: 'docs/specs/active/example.md#shadow-inputs',
      dataClassification: 'public',
      allowedTaskTypes: ['spec_lint'],
      publicInputSha256: hashShadowPublicInput(PUBLIC_INPUT),
    },
    independentReviewerId: 'independent-reviewer-001',
    ...overrides,
  }
}

function makeDependencies(
  discovery: unknown,
  output: unknown = { candidate: 'No structural violations.', evidence_refs: ['example.md:1'] },
  authorization: unknown = AUTHORITATIVE_AUTHORIZATION,
): {
  dependencies: ShadowRoutingDependencies
  authorizationCalls: () => number
  discoveryCalls: () => number
  invocationCalls: () => number
  invocationRequest: () => ShadowInvocationRequest | undefined
} {
  let authorizations = 0
  let discoveries = 0
  let invocations = 0
  let request: ShadowInvocationRequest | undefined

  return {
    dependencies: {
      resolveParcelAuthorization: async () => {
        authorizations += 1
        return authorization
      },
      discoverAdapter: async () => {
        discoveries += 1
        return discovery
      },
      invokeAdapter: async (value) => {
        invocations += 1
        request = value
        return output
      },
    },
    authorizationCalls: () => authorizations,
    discoveryCalls: () => discoveries,
    invocationCalls: () => invocations,
    invocationRequest: () => request,
  }
}

test('rejects non-public Parcel input before discovery', async () => {
  const repoRoot = makeTempRepoRoot()
  const fake = makeDependencies({ status: 'verified_available' })
  try {
    const input = makeInput({
      parcelAuthorization: {
        ...makeInput().parcelAuthorization,
        dataClassification: 'internal',
      },
    })

    await assert.rejects(
      executeShadowRoute(input, fake.dependencies, { repoRoot }),
      (error: unknown) => {
        assert.ok(error instanceof ShadowRoutingError)
        assert.equal(error.code, 'NON_PUBLIC_INPUT')
        return true
      },
    )
    assert.equal(fake.discoveryCalls(), 0)
    assert.equal(fake.invocationCalls(), 0)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('rejects a policy-unsupported task before discovery', async () => {
  const repoRoot = makeTempRepoRoot()
  const fake = makeDependencies({ status: 'verified_available' }, undefined, {
    ...AUTHORITATIVE_AUTHORIZATION,
    allowedTaskTypes: ['code_generation'],
  })
  try {
    const input = makeInput({
      taskType: 'code_generation',
      parcelAuthorization: {
        ...makeInput().parcelAuthorization,
        allowedTaskTypes: ['code_generation'],
      },
    })

    await assert.rejects(
      executeShadowRoute(input, fake.dependencies, { repoRoot }),
      (error: unknown) => {
        assert.ok(error instanceof ShadowRoutingError)
        assert.equal(error.code, 'UNSUPPORTED_TASK')
        return true
      },
    )
    assert.equal(fake.discoveryCalls(), 0)
    assert.equal(fake.invocationCalls(), 0)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('rejects forged caller self-authorization before discovery', async () => {
  const repoRoot = makeTempRepoRoot()
  const forgedInput = { ...PUBLIC_INPUT, excerpt: 'Caller-selected arbitrary content.' }
  const fake = makeDependencies({ status: 'verified_available' })
  try {
    await assert.rejects(
      executeShadowRoute(
        makeInput({
          publicInput: forgedInput,
          parcelAuthorization: {
            ...makeInput().parcelAuthorization,
            publicInputSha256: hashShadowPublicInput(forgedInput),
          },
        }),
        fake.dependencies,
        { repoRoot },
      ),
      (error: unknown) => {
        assert.ok(error instanceof ShadowRoutingError)
        assert.equal(error.code, 'AUTHORIZATION_MISMATCH')
        return true
      },
    )
    assert.equal(fake.authorizationCalls(), 1)
    assert.equal(fake.discoveryCalls(), 0)
    assert.equal(fake.invocationCalls(), 0)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('invokes with the authorized pre-await snapshot when caller input mutates during dependencies', async () => {
  const repoRoot = makeTempRepoRoot()
  const mutableInput = {
    specRef: 'docs/specs/active/mutable.md',
    nested: { text: 'authorized' },
    evidence: ['authorized-ref'],
  }
  const authorizedSnapshot = {
    specRef: 'docs/specs/active/mutable.md',
    nested: { text: 'authorized' },
    evidence: ['authorized-ref'],
  }
  const authorizedDigest = hashShadowPublicInput(authorizedSnapshot)
  let invocationRequest: ShadowInvocationRequest | undefined
  const dependencies: ShadowRoutingDependencies = {
    resolveParcelAuthorization: async () => {
      mutableInput.nested.text = 'mutated-during-authorization'
      mutableInput.evidence.push('forged-ref')
      return {
        parcelId: 'PARCEL-CEREBRAS-001',
        dataClassification: 'public',
        allowedTaskTypes: ['spec_lint'],
        publicInputSha256: authorizedDigest,
      }
    },
    discoverAdapter: async () => {
      mutableInput.specRef = 'mutated-during-discovery.md'
      return { status: 'verified_available' }
    },
    invokeAdapter: async (request) => {
      invocationRequest = request
      return { candidate: 'Snapshot retained.', evidence_refs: ['mutable.md:1'] }
    },
  }
  try {
    const result = await executeShadowRoute(
      makeInput({
        publicInput: mutableInput,
        parcelAuthorization: {
          ...makeInput().parcelAuthorization,
          publicInputSha256: authorizedDigest,
        },
      }),
      dependencies,
      { repoRoot },
    )

    assert.equal(result.status, 'candidate')
    assert.ok(invocationRequest !== undefined)
    assert.deepEqual(invocationRequest.publicInput, authorizedSnapshot)
    assert.equal(hashShadowPublicInput(invocationRequest.publicInput), authorizedDigest)
    assert.notEqual(invocationRequest.publicInput, mutableInput)
    const receipt = JSON.parse(readFileSync(join(repoRoot, result.receiptRef), 'utf8')) as {
      publicInputSha256: string
    }
    assert.equal(receipt.publicInputSha256, authorizedDigest)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('snapshots all request metadata and dependency functions before authorization awaits', async () => {
  const repoRoot = makeTempRepoRoot()
  const mutableInput = structuredClone(makeInput()) as MutableShadowRoutingInput
  let resolvedAuthorizationRef: string | undefined
  let originalDiscoveryCalls = 0
  let replacementDiscoveryCalls = 0
  let invocationRequest: ShadowInvocationRequest | undefined
  const dependencies = {
    resolveParcelAuthorization: async (authorizationRef: string) => {
      resolvedAuthorizationRef = authorizationRef
      mutableInput.workflowId = 'mutated-workflow'
      mutableInput.routeName = 'mutated-route'
      mutableInput.taskType = 'code_generation'
      mutableInput.parcelAuthorization.parcelId = 'FORGED-PARCEL'
      mutableInput.parcelAuthorization.authorizationRef = 'forged-authorization-ref'
      mutableInput.parcelAuthorization.dataClassification = 'internal'
      mutableInput.parcelAuthorization.allowedTaskTypes.splice(0, 1, 'code_generation')
      mutableInput.parcelAuthorization.publicInputSha256 = '0'.repeat(64)
      mutableInput.independentReviewerId = 'cerebras-shadow'
      dependencies.discoverAdapter = async () => {
        replacementDiscoveryCalls += 1
        return { status: 'verified_available' }
      }
      return AUTHORITATIVE_AUTHORIZATION
    },
    discoverAdapter: async () => {
      originalDiscoveryCalls += 1
      return { status: 'verified_available' }
    },
    invokeAdapter: async (request: ShadowInvocationRequest) => {
      invocationRequest = request
      return { candidate: 'Metadata snapshot retained.', evidence_refs: ['example.md:1'] }
    },
  }
  try {
    const result = await executeShadowRoute(
      mutableInput as unknown as ShadowRoutingInput,
      dependencies,
      { repoRoot },
    )

    assert.equal(result.status, 'candidate')
    assert.equal(resolvedAuthorizationRef, 'docs/specs/active/example.md#shadow-inputs')
    assert.equal(originalDiscoveryCalls, 1)
    assert.equal(replacementDiscoveryCalls, 0)
    assert.ok(invocationRequest !== undefined)
    assert.equal(invocationRequest.taskType, 'spec_lint')
    assert.equal(invocationRequest.parcelId, 'PARCEL-CEREBRAS-001')
    assert.equal(invocationRequest.authorizationRef, 'docs/specs/active/example.md#shadow-inputs')
    assert.equal(result.independentReview.reviewerId, 'independent-reviewer-001')
    assert.equal(
      result.receiptRef,
      'docs/receipts/shadow-workflow-001/shadow-routing-cerebras-shadow.json',
    )

    const receipt = JSON.parse(readFileSync(join(repoRoot, result.receiptRef), 'utf8')) as {
      workflowId: string
      routeName: string
      taskType: string
      parcelId: string
      authorizationRef: string
      independentReview: { reviewerId: string }
    }
    assert.equal(receipt.workflowId, 'shadow-workflow-001')
    assert.equal(receipt.routeName, 'cerebras-shadow')
    assert.equal(receipt.taskType, 'spec_lint')
    assert.equal(receipt.parcelId, 'PARCEL-CEREBRAS-001')
    assert.equal(receipt.authorizationRef, 'docs/specs/active/example.md#shadow-inputs')
    assert.equal(receipt.independentReview.reviewerId, 'independent-reviewer-001')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('discovery-time caller mutation cannot change the authorized task or review binding', async () => {
  const repoRoot = makeTempRepoRoot()
  const mutableInput = structuredClone(makeInput()) as MutableShadowRoutingInput
  let invocationRequest: ShadowInvocationRequest | undefined
  let originalInvocationCalls = 0
  let replacementInvocationCalls = 0
  const dependencies = {
    resolveParcelAuthorization: async () => AUTHORITATIVE_AUTHORIZATION,
    discoverAdapter: async () => {
      mutableInput.workflowId = 'mutated-workflow'
      mutableInput.routeName = 'mutated-route'
      mutableInput.taskType = 'code_generation'
      mutableInput.parcelAuthorization.parcelId = 'FORGED-PARCEL'
      mutableInput.parcelAuthorization.authorizationRef = 'forged-authorization-ref'
      mutableInput.parcelAuthorization.allowedTaskTypes.splice(0, 1, 'code_generation')
      mutableInput.independentReviewerId = 'cerebras-shadow'
      dependencies.invokeAdapter = async () => {
        replacementInvocationCalls += 1
        return { candidate: 'Replacement must not run.', evidence_refs: [] }
      }
      return { status: 'verified_available' }
    },
    invokeAdapter: async (request: ShadowInvocationRequest) => {
      originalInvocationCalls += 1
      invocationRequest = request
      return { candidate: 'Original task retained.', evidence_refs: ['example.md:2'] }
    },
  }
  try {
    const result = await executeShadowRoute(
      mutableInput as unknown as ShadowRoutingInput,
      dependencies,
      { repoRoot },
    )

    assert.equal(result.status, 'candidate')
    assert.equal(originalInvocationCalls, 1)
    assert.equal(replacementInvocationCalls, 0)
    assert.ok(invocationRequest !== undefined)
    assert.equal(invocationRequest.taskType, 'spec_lint')
    assert.equal(invocationRequest.parcelId, 'PARCEL-CEREBRAS-001')
    assert.equal(invocationRequest.authorizationRef, 'docs/specs/active/example.md#shadow-inputs')
    assert.equal(result.independentReview.reviewerId, 'independent-reviewer-001')

    const receipt = JSON.parse(readFileSync(join(repoRoot, result.receiptRef), 'utf8')) as {
      workflowId: string
      routeName: string
      taskType: string
      parcelId: string
      authorizationRef: string
      independentReview: { reviewerId: string }
    }
    assert.equal(receipt.workflowId, 'shadow-workflow-001')
    assert.equal(receipt.routeName, 'cerebras-shadow')
    assert.equal(receipt.taskType, 'spec_lint')
    assert.equal(receipt.parcelId, 'PARCEL-CEREBRAS-001')
    assert.equal(receipt.authorizationRef, 'docs/specs/active/example.md#shadow-inputs')
    assert.equal(receipt.independentReview.reviewerId, 'independent-reviewer-001')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('rejects malformed trusted authorization without persisting verifier details', async () => {
  const repoRoot = makeTempRepoRoot()
  const fake = makeDependencies({ status: 'verified_available' }, undefined, {
    ...AUTHORITATIVE_AUTHORIZATION,
    verifierDetail: 'must not persist',
  })
  try {
    await assert.rejects(
      executeShadowRoute(makeInput(), fake.dependencies, { repoRoot }),
      (error: unknown) => {
        assert.ok(error instanceof ShadowRoutingError)
        assert.equal(error.code, 'INVALID_AUTHORIZATION_RECORD')
        assert.doesNotMatch(error.message, /verifierDetail|must not persist/)
        return true
      },
    )
    assert.equal(fake.discoveryCalls(), 0)
    assert.equal(fake.invocationCalls(), 0)
    assert.equal(
      existsSync(
        join(
          repoRoot,
          'docs',
          'receipts',
          'shadow-workflow-001',
          'shadow-routing-cerebras-shadow.json',
        ),
      ),
      false,
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('normalizes a hostile trusted-authorization object before discovery', async () => {
  const repoRoot = makeTempRepoRoot()
  const hostileAuthorization = new Proxy(
    {},
    {
      ownKeys: () => {
        throw new Error('resolver proxy detail must not escape')
      },
    },
  )
  const fake = makeDependencies({ status: 'verified_available' }, undefined, hostileAuthorization)
  try {
    await assert.rejects(
      executeShadowRoute(makeInput(), fake.dependencies, { repoRoot }),
      (error: unknown) => {
        assert.ok(error instanceof ShadowRoutingError)
        assert.equal(error.code, 'INVALID_AUTHORIZATION_RECORD')
        assert.doesNotMatch(error.message, /resolver proxy detail/)
        return true
      },
    )
    assert.equal(fake.discoveryCalls(), 0)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('normalizes a throwing trusted authorization resolver and fails before discovery', async () => {
  const repoRoot = makeTempRepoRoot()
  let discoveries = 0
  let invocations = 0
  const dependencies: ShadowRoutingDependencies = {
    resolveParcelAuthorization: async () => {
      throw new Error('trusted-store detail must not escape')
    },
    discoverAdapter: async () => {
      discoveries += 1
      return { status: 'verified_available' }
    },
    invokeAdapter: async () => {
      invocations += 1
      return { candidate: 'must not run', evidence_refs: [] }
    },
  }
  try {
    await assert.rejects(
      executeShadowRoute(makeInput(), dependencies, { repoRoot }),
      (error: unknown) => {
        assert.ok(error instanceof ShadowRoutingError)
        assert.equal(error.code, 'AUTHORIZATION_VERIFICATION_FAILED')
        assert.doesNotMatch(error.message, /trusted-store detail/)
        return true
      },
    )
    assert.equal(discoveries, 0)
    assert.equal(invocations, 0)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('requires the trusted authorization resolver before discovery', async () => {
  const repoRoot = makeTempRepoRoot()
  let discoveries = 0
  const dependencies = {
    discoverAdapter: async () => {
      discoveries += 1
      return { status: 'verified_available' }
    },
    invokeAdapter: async () => ({ candidate: 'must not run', evidence_refs: [] }),
  } as unknown as ShadowRoutingDependencies
  try {
    await assert.rejects(
      executeShadowRoute(makeInput(), dependencies, { repoRoot }),
      (error: unknown) => {
        assert.ok(error instanceof ShadowRoutingError)
        assert.equal(error.code, 'AUTHORIZATION_VERIFICATION_FAILED')
        return true
      },
    )
    assert.equal(discoveries, 0)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('rejects a non-public trusted authorization record before discovery', async () => {
  const repoRoot = makeTempRepoRoot()
  const fake = makeDependencies({ status: 'verified_available' }, undefined, {
    ...AUTHORITATIVE_AUTHORIZATION,
    dataClassification: 'internal',
  })
  try {
    await assert.rejects(
      executeShadowRoute(makeInput(), fake.dependencies, { repoRoot }),
      (error: unknown) => {
        assert.ok(error instanceof ShadowRoutingError)
        assert.equal(error.code, 'AUTHORIZATION_NOT_PUBLIC')
        return true
      },
    )
    assert.equal(fake.discoveryCalls(), 0)
    assert.equal(fake.invocationCalls(), 0)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('rejects a task omitted from the Parcel authorization before discovery', async () => {
  const repoRoot = makeTempRepoRoot()
  const fake = makeDependencies({ status: 'verified_available' })
  try {
    await assert.rejects(
      executeShadowRoute(
        makeInput({
          taskType: 'review_triage',
          parcelAuthorization: {
            ...makeInput().parcelAuthorization,
            allowedTaskTypes: ['spec_lint'],
          },
        }),
        fake.dependencies,
        { repoRoot },
      ),
      (error: unknown) => {
        assert.ok(error instanceof ShadowRoutingError)
        assert.equal(error.code, 'PARCEL_TASK_NOT_AUTHORIZED')
        return true
      },
    )
    assert.equal(fake.discoveryCalls(), 0)
    assert.equal(fake.invocationCalls(), 0)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('rejects an input that does not match its Parcel authorization digest before discovery', async () => {
  const repoRoot = makeTempRepoRoot()
  const fake = makeDependencies({ status: 'verified_available' })
  try {
    await assert.rejects(
      executeShadowRoute(
        makeInput({ publicInput: { ...PUBLIC_INPUT, excerpt: 'Different public text.' } }),
        fake.dependencies,
        { repoRoot },
      ),
      (error: unknown) => {
        assert.ok(error instanceof ShadowRoutingError)
        assert.equal(error.code, 'PARCEL_AUTHORIZATION_MISMATCH')
        return true
      },
    )
    assert.equal(fake.discoveryCalls(), 0)
    assert.equal(fake.invocationCalls(), 0)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('rejects sparse arrays and oversized canonical public input before authorization resolution', async () => {
  const sparseInput = new Array<unknown>(2)
  sparseInput[1] = 'present'
  assert.throws(
    () => hashShadowPublicInput(sparseInput),
    (error: unknown) => {
      assert.ok(error instanceof ShadowRoutingError)
      assert.equal(error.code, 'INVALID_PUBLIC_INPUT')
      return true
    },
  )

  const repoRoot = makeTempRepoRoot()
  const fake = makeDependencies({ status: 'verified_available' })
  try {
    await assert.rejects(
      executeShadowRoute(
        makeInput({
          publicInput: { text: 'x'.repeat(65_537) },
          parcelAuthorization: {
            ...makeInput().parcelAuthorization,
            publicInputSha256: '0'.repeat(64),
          },
        }),
        fake.dependencies,
        { repoRoot },
      ),
      (error: unknown) => {
        assert.ok(error instanceof ShadowRoutingError)
        assert.equal(error.code, 'PUBLIC_INPUT_TOO_LARGE')
        return true
      },
    )
    assert.equal(fake.authorizationCalls(), 0)
    assert.equal(fake.discoveryCalls(), 0)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('rejects non-JSON canonical input forms', () => {
  const nonJsonValues: readonly unknown[] = [
    undefined,
    { value: undefined },
    { value: Number.NaN },
    new Date('2026-08-30T00:00:00.000Z'),
  ]

  for (const value of nonJsonValues) {
    assert.throws(
      () => hashShadowPublicInput(value),
      (error: unknown) => {
        assert.ok(error instanceof ShadowRoutingError)
        assert.equal(error.code, 'INVALID_PUBLIC_INPUT')
        return true
      },
    )
  }
})

const IDENTIFIER_LIMIT_CASES: readonly {
  readonly name: string
  readonly overrides: Partial<ShadowRoutingInput>
}[] = [
  {
    name: 'authorization reference over 512 bytes',
    overrides: {
      parcelAuthorization: {
        ...makeInput().parcelAuthorization,
        authorizationRef: 'a'.repeat(513),
      },
    },
  },
  {
    name: 'reviewer identity over 256 bytes',
    overrides: { independentReviewerId: 'r'.repeat(257) },
  },
]

for (const testCase of IDENTIFIER_LIMIT_CASES) {
  test(`rejects ${testCase.name} before authorization resolution`, async () => {
    const repoRoot = makeTempRepoRoot()
    const fake = makeDependencies({ status: 'verified_available' })
    try {
      await assert.rejects(
        executeShadowRoute(makeInput(testCase.overrides), fake.dependencies, { repoRoot }),
        (error: unknown) => {
          assert.ok(error instanceof ShadowRoutingError)
          assert.equal(error.code, 'INVALID_INPUT')
          return true
        },
      )
      assert.equal(fake.authorizationCalls(), 0)
      assert.equal(fake.discoveryCalls(), 0)
    } finally {
      rmSync(repoRoot, { recursive: true, force: true })
    }
  })
}

test('unavailable live discovery skips cleanly without provider execution', async () => {
  const repoRoot = makeTempRepoRoot()
  const fake = makeDependencies({ status: 'unavailable', providerDetail: 'must not persist' })
  try {
    const result = await executeShadowRoute(makeInput(), fake.dependencies, {
      repoRoot,
      now: () => '2026-08-30T12:00:00.000Z',
    })

    assert.equal(result.status, 'skipped')
    assert.equal(result.reason, 'adapter_not_verified_available')
    assert.equal(Object.isFrozen(result), true)
    assert.equal(Object.isFrozen(result.toolsGranted), true)
    assert.throws(() => (result.toolsGranted as unknown as string[]).push('forged-tool'), TypeError)
    assert.equal(fake.discoveryCalls(), 1)
    assert.equal(fake.invocationCalls(), 0)

    const receipt = readFileSync(join(repoRoot, result.receiptRef), 'utf8')
    assert.doesNotMatch(receipt, /providerDetail|must not persist/)
    assert.match(receipt, /"status": "skipped"/)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('malformed discovery is not verified availability and skips without execution', async () => {
  const repoRoot = makeTempRepoRoot()
  const fake = makeDependencies({ status: 'verified_available', unexpected: true })
  try {
    const result = await executeShadowRoute(makeInput(), fake.dependencies, { repoRoot })

    assert.equal(result.status, 'skipped')
    assert.equal(fake.discoveryCalls(), 1)
    assert.equal(fake.invocationCalls(), 0)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('hostile discovery data is normalized to a skip without execution', async () => {
  const repoRoot = makeTempRepoRoot()
  const hostileDiscovery = new Proxy(
    {},
    {
      ownKeys: () => {
        throw new Error('discovery proxy detail must not escape')
      },
    },
  )
  const fake = makeDependencies(hostileDiscovery)
  try {
    const result = await executeShadowRoute(makeInput(), fake.dependencies, { repoRoot })

    assert.equal(result.status, 'skipped')
    assert.equal(fake.invocationCalls(), 0)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('discovery failure is normalized to a skip without provider execution', async () => {
  const repoRoot = makeTempRepoRoot()
  let invocationCalls = 0
  const dependencies: ShadowRoutingDependencies = {
    resolveParcelAuthorization: async () => AUTHORITATIVE_AUTHORIZATION,
    discoverAdapter: async () => {
      throw new Error('provider-local detail must not escape')
    },
    invokeAdapter: async () => {
      invocationCalls += 1
      return { candidate: 'must not run', evidence_refs: [] }
    },
  }
  try {
    const result = await executeShadowRoute(makeInput(), dependencies, { repoRoot })

    assert.equal(result.status, 'skipped')
    assert.equal(invocationCalls, 0)
    const receipt = readFileSync(join(repoRoot, result.receiptRef), 'utf8')
    assert.doesNotMatch(receipt, /provider-local detail/)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('verified adapter returns a constrained candidate bound to pending independent review', async () => {
  const repoRoot = makeTempRepoRoot()
  const fake = makeDependencies(
    { status: 'verified_available' },
    { candidate: 'Heading is missing an owner.', evidence_refs: ['example.md:7'] },
  )
  try {
    const result = await executeShadowRoute(makeInput(), fake.dependencies, {
      repoRoot,
      now: () => '2026-08-30T12:00:00.000Z',
    })

    assert.equal(result.status, 'candidate')
    assert.equal(result.authority, 'none')
    assert.equal(result.candidateOnly, true)
    assert.equal(result.gateImpact, 'none')
    assert.equal(result.approvalImpact, 'none')
    assert.equal(result.reviewImpact, 'pending_independent_review')
    assert.deepEqual(result.toolsGranted, [])
    assert.equal(result.effectCapability, 'none')
    assert.equal(result.independentReview.required, true)
    assert.equal(result.independentReview.status, 'pending')
    assert.equal(result.independentReview.reviewerId, 'independent-reviewer-001')
    assert.equal(result.independentReview.candidateSha256, result.candidateSha256)
    assert.equal('gateCleared' in result, false)

    assert.equal(fake.discoveryCalls(), 1)
    assert.equal(fake.invocationCalls(), 1)
    assert.deepEqual(fake.invocationRequest(), {
      adapterId: 'cerebras-shadow',
      taskType: 'spec_lint',
      publicInput: PUBLIC_INPUT,
      parcelId: 'PARCEL-CEREBRAS-001',
      authorizationRef: 'docs/specs/active/example.md#shadow-inputs',
      candidateOnly: true,
      authority: 'none',
      toolsGranted: [],
      effectCapability: 'none',
    })

    const receipt = JSON.parse(readFileSync(join(repoRoot, result.receiptRef), 'utf8')) as Record<
      string,
      unknown
    >
    assert.equal(receipt.status, 'candidate')
    assert.equal(receipt.candidateSha256, result.candidateSha256)
    assert.equal(JSON.stringify(receipt).includes(result.candidate), false)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('runtime-freezes invocation containment and defensively freezes returned evidence', async () => {
  const repoRoot = makeTempRepoRoot()
  const providerEvidence = ['example.md:7']
  let requestToolsMutationBlocked = false
  let requestInputMutationBlocked = false
  let invocationRequest: ShadowInvocationRequest | undefined
  const dependencies: ShadowRoutingDependencies = {
    resolveParcelAuthorization: async () => AUTHORITATIVE_AUTHORIZATION,
    discoverAdapter: async () => ({ status: 'verified_available' }),
    invokeAdapter: async (request) => {
      invocationRequest = request
      try {
        ;(request.toolsGranted as unknown as string[]).push('forged-tool')
      } catch (error) {
        requestToolsMutationBlocked = error instanceof TypeError
      }
      try {
        ;(request.publicInput as { excerpt: string }).excerpt = 'mutated-provider-input'
      } catch (error) {
        requestInputMutationBlocked = error instanceof TypeError
      }
      return { candidate: 'Bounded.', evidence_refs: providerEvidence }
    },
  }
  try {
    const result = await executeShadowRoute(makeInput(), dependencies, { repoRoot })
    assert.equal(result.status, 'candidate')
    assert.ok(invocationRequest !== undefined)
    assert.equal(Object.isFrozen(invocationRequest), true)
    assert.equal(Object.isFrozen(invocationRequest.toolsGranted), true)
    assert.equal(Object.isFrozen(invocationRequest.publicInput), true)
    assert.equal(requestToolsMutationBlocked, true)
    assert.equal(requestInputMutationBlocked, true)

    providerEvidence.push('late-provider-mutation')
    assert.deepEqual(result.evidenceRefs, ['example.md:7'])
    assert.equal(Object.isFrozen(result), true)
    assert.equal(Object.isFrozen(result.toolsGranted), true)
    assert.equal(Object.isFrozen(result.evidenceRefs), true)
    assert.throws(() => (result.toolsGranted as unknown as string[]).push('forged-tool'), TypeError)
    assert.throws(() => (result.evidenceRefs as unknown as string[]).push('forged-ref'), TypeError)

    const receipt = JSON.parse(readFileSync(join(repoRoot, result.receiptRef), 'utf8')) as {
      evidenceRefs: string[]
    }
    assert.deepEqual(receipt.evidenceRefs, ['example.md:7'])
  } finally {
    PUBLIC_INPUT.excerpt = 'Public specification text authorized for linting.'
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('rejects malformed or authority-claiming untrusted adapter output', async () => {
  const repoRoot = makeTempRepoRoot()
  const fake = makeDependencies(
    { status: 'verified_available' },
    {
      candidate: 'Approved.',
      evidence_refs: [],
      authority: 'verifier',
      gateCleared: true,
    },
  )
  try {
    await assert.rejects(
      executeShadowRoute(makeInput(), fake.dependencies, { repoRoot }),
      (error: unknown) => {
        assert.ok(error instanceof ShadowRoutingError)
        assert.equal(error.code, 'INVALID_ADAPTER_OUTPUT')
        return true
      },
    )
    assert.equal(fake.discoveryCalls(), 1)
    assert.equal(fake.invocationCalls(), 1)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('normalizes hostile adapter output without creating a receipt', async () => {
  const repoRoot = makeTempRepoRoot()
  const hostileOutput = new Proxy(
    {},
    {
      ownKeys: () => {
        throw new Error('adapter proxy detail must not escape')
      },
    },
  )
  const fake = makeDependencies({ status: 'verified_available' }, hostileOutput)
  try {
    await assert.rejects(
      executeShadowRoute(makeInput(), fake.dependencies, { repoRoot }),
      (error: unknown) => {
        assert.ok(error instanceof ShadowRoutingError)
        assert.equal(error.code, 'INVALID_ADAPTER_OUTPUT')
        assert.doesNotMatch(error.message, /adapter proxy detail/)
        return true
      },
    )
    assert.equal(
      existsSync(
        join(
          repoRoot,
          'docs',
          'receipts',
          'shadow-workflow-001',
          'shadow-routing-cerebras-shadow.json',
        ),
      ),
      false,
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

for (const testCase of [
  {
    name: 'oversized candidate text',
    output: { candidate: 'x'.repeat(32_769), evidence_refs: [] },
  },
  {
    name: 'too many evidence references',
    output: {
      candidate: 'bounded',
      evidence_refs: Array.from({ length: 65 }, (_, i) => `ref-${i}`),
    },
  },
  {
    name: 'oversized evidence reference',
    output: { candidate: 'bounded', evidence_refs: ['x'.repeat(2_049)] },
  },
]) {
  test(`rejects ${testCase.name} before receipt creation`, async () => {
    const repoRoot = makeTempRepoRoot()
    const fake = makeDependencies({ status: 'verified_available' }, testCase.output)
    try {
      await assert.rejects(
        executeShadowRoute(makeInput(), fake.dependencies, { repoRoot }),
        (error: unknown) => {
          assert.ok(error instanceof ShadowRoutingError)
          assert.equal(error.code, 'INVALID_ADAPTER_OUTPUT')
          return true
        },
      )
      assert.equal(
        existsSync(
          join(
            repoRoot,
            'docs',
            'receipts',
            'shadow-workflow-001',
            'shadow-routing-cerebras-shadow.json',
          ),
        ),
        false,
      )
    } finally {
      rmSync(repoRoot, { recursive: true, force: true })
    }
  })
}

test('requires an independent reviewer distinct from the shadow adapter before discovery', async () => {
  const repoRoot = makeTempRepoRoot()
  const fake = makeDependencies({ status: 'verified_available' })
  try {
    await assert.rejects(
      executeShadowRoute(
        makeInput({ independentReviewerId: 'cerebras-shadow' }),
        fake.dependencies,
        { repoRoot },
      ),
      (error: unknown) => {
        assert.ok(error instanceof ShadowRoutingError)
        assert.equal(error.code, 'INVALID_REVIEW_BINDING')
        return true
      },
    )
    assert.equal(fake.discoveryCalls(), 0)
    assert.equal(fake.invocationCalls(), 0)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})
