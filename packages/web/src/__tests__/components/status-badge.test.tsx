import '../../../test-setup'

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { StatusBadge } from '../../../app/_components/status-badge'

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  cleanup()
})

describe('StatusBadge', () => {
  it('renders a completed status in green', () => {
    const { getByText } = render(<StatusBadge status="completed" />)
    const badge = getByText('completed')
    expect(badge.className).toContain('green')
  })

  it('renders a failed status in red', () => {
    const { getByText } = render(<StatusBadge status="failed" />)
    const badge = getByText('failed')
    expect(badge.className).toContain('red')
  })

  it('renders an in-progress status in yellow', () => {
    const { getByText } = render(<StatusBadge status="scoring" />)
    const badge = getByText('scoring')
    expect(badge.className).toContain('yellow')
  })
})
