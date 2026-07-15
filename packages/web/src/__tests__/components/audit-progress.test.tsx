import '../../../test-setup'

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { render, waitFor } from '@testing-library/react'
import { AuditProgress } from '../../../app/_components/audit-progress'

class MockEventSource {
  url: string
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null

  constructor(url: string) {
    this.url = url
  }

  close() {}
}

describe('AuditProgress', () => {
  let lastSource: MockEventSource | null = null

  beforeEach(() => {
    lastSource = null
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url)
        lastSource = this
      }
    } as unknown as typeof EventSource
  })

  afterEach(() => {
    lastSource = null
  })

  it('renders the initial status', () => {
    const { getByText } = render(<AuditProgress auditId="a1b2c3d4" initialStatus="pending" />)
    expect(getByText('pending')).toBeTruthy()
  })

  it('updates the status when an SSE event arrives', async () => {
    const { getByText } = render(<AuditProgress auditId="a1b2c3d4" initialStatus="collecting" />)

    lastSource?.onmessage?.(
      new MessageEvent('message', { data: JSON.stringify({ status: 'scoring', progress: 50 }) }),
    )

    await waitFor(() => {
      expect(getByText('scoring')).toBeTruthy()
    })
  })

  it('shows a report link when the audit completes', async () => {
    const { getByText } = render(<AuditProgress auditId="a1b2c3d4" initialStatus="reporting" />)

    lastSource?.onmessage?.(
      new MessageEvent('message', { data: JSON.stringify({ status: 'completed', progress: 100 }) }),
    )

    await waitFor(() => {
      expect(getByText('View report →')).toBeTruthy()
    })
  })
})
