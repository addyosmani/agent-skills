/**
 * Loads `export const review` (and the default config) from a project's
 * probity.config.{ts,mts,js,mjs} via jiti, the TypeScript loader Probity
 * itself uses. Shared by probity-review-record and probity-review-route.
 */
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { createJiti } from 'jiti'

import type { Config } from '@nizos/probity'

import type { ReviewConfig } from '../rules/review-config.js'

const jiti = createJiti(import.meta.url)

export const CONFIG_NAMES = ['probity.config.ts', 'probity.config.mts', 'probity.config.js', 'probity.config.mjs']

export type LoadedReview = { path: string; review: ReviewConfig; config?: Config }

/** Throws an Error whose message is fit to print as a usage error. */
export async function loadReview(root: string, configPath?: string): Promise<LoadedReview> {
  const path = configPath ? resolve(configPath) : CONFIG_NAMES.map((name) => join(root, name)).find(existsSync)
  if (!path) throw new Error(`No probity.config.{ts,mts,js,mjs} in ${root}`)
  const module = await jiti.import<{ review?: ReviewConfig; default?: Config }>(path)
  if (!module.review) {
    throw new Error(`${path} has no review settings. Add: export const review = reviewConfig({ … })`)
  }
  return { path, review: module.review, config: module.default }
}
