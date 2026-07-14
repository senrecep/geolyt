import type { Finding } from '@geolyt/shared'

export type ScorerOutput = {
  score: number
  findings: Finding[]
}
