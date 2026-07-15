import '../../../test-setup'

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { AuditList } from '../../../app/_components/audit-list'

const mockAudit = {
  audit_id: 'a1b2c3d4',
  url: 'https://example.com',
  status: 'completed',
  created_at: '2026-07-14T12:00:00Z',
  completed_at: '2026-07-14T12:05:00Z',
  result: {
    scores: {
      composite: 72,
      aiCitability: 65,
      brandAuthority: 80,
      contentQuality: 70,
      technicalFoundation: 75,
      structuredData: 60,
      platformOptimization: 85,
    },
  },
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  cleanup()
})

describe('AuditList', () => {
  it('shows an empty message when no audits are provided', () => {
    const { getByText } = render(<AuditList audits={[]} />)
    expect(getByText(/No audits yet/)).toBeDefined()
  })

  it('renders audit URL and status', () => {
    const { getByText } = render(<AuditList audits={[mockAudit]} />)
    expect(getByText('https://example.com')).toBeDefined()
    expect(getByText('completed')).toBeDefined()
  })

  it('renders all score badges', () => {
    const { getAllByText } = render(<AuditList audits={[mockAudit]} />)
    expect(getAllByText('72')).toHaveLength(1)
    expect(getAllByText('Composite')).toHaveLength(1)
    expect(getAllByText('80')).toHaveLength(1)
    expect(getAllByText('Brand')).toHaveLength(1)
  })
})
