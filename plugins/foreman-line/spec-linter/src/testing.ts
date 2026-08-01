/**
 * Canonical sample values, typed against `types.ts`, used by the parity test to
 * prove the schema actually accepts values of the shape its type describes.
 */
import type { SpecFrontmatter } from './types.js'

export const sampleSpecFrontmatter: SpecFrontmatter = {
  ticket: 'KONE-1234',
  title: 'Example parcel',
  status: 'active',
  owner: 'clinton.morgan',
  created: '2026-07-15',
  updated: '2026-07-15',
  supersedes: null,
  superseded_by: null,
  risk: 'standard',
  surfaces: ['docs/SPEC-CONVENTION.md'],
  routing_class: 'standard-feature',
  permission_profile: 'builder-standard',
  data_classification: 'internal',
}
