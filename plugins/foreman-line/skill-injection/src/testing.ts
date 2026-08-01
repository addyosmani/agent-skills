/**
 * Canonical sample values, typed against `types.ts`, used by the parity test
 * to prove each schema actually accepts values of the shape its type
 * describes. Content mirrors plan §5a's illustrative example — the same
 * content the shipped `skill-injection.yaml` reproduces (AC5).
 */
import type {
  CoordinatorSkills,
  IntegrationSkills,
  RoleSkillMap,
  SkillInjectionMatrix,
} from './types.js'

export const sampleRoleSkillMap: RoleSkillMap = {
  '*': ['test-coverage'],
  'ui/*': ['kds-figma'],
}

export const sampleCoordinatorSkills: CoordinatorSkills = {
  rework_first: ['build-fix-loop'],
}

export const sampleIntegrationSkills: IntegrationSkills = {
  jira: ['jira-workflow'],
}

export const sampleSkillInjectionMatrix: SkillInjectionMatrix = {
  builder: {
    '*': ['test-coverage'],
    'ui/*': ['kds-figma'],
  },
  verifier_harness: {
    '*': ['test-coverage.check'],
    'ui/*': ['kds-sweep'],
    'tenancy/*': ['tenant-isolation'],
  },
  adversarial_reviewer: {
    '*': ['code-review'],
  },
  coordinator: {
    rework_first: ['build-fix-loop'],
  },
  integration: {
    jira: ['jira-workflow'],
  },
}
