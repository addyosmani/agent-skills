/**
 * Public surface of the Foreman Line pipeline stage contracts (W0-P1).
 * Consumers get the TypeScript types (for the compiler), the ajv `SchemaObject`
 * schemas (for runtime validation), and the schema registry from one import.
 * Test fixtures and helpers live on the separate `./testing` export.
 */
export * from './correlation.js'
export * from './envelope.js'
export * from './registry.js'
export * from './stages/a-intake.js'
export * from './stages/b-registration.js'
export * from './stages/c-dispatch.js'
export * from './stages/d-verification.js'
export * from './stages/e-integration.js'
export * from './stages/f-closure.js'
