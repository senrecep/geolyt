import '../../../test-setup'

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { ScoreBadge } from '../../../app/_components/score-badge'

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  cleanup()
})

describe('ScoreBadge', () => {
  it('renders the score and label', () => {
    const { getByText } = render(<ScoreBadge score={75} label="Composite" />)
    expect(getByText('75')).toBeDefined()
    expect(getByText('Composite')).toBeDefined()
  })

  it('defaults to zero when score is undefined', () => {
    const { getByText } = render(<ScoreBadge score={undefined} label="Brand" />)
    expect(getByText('0')).toBeDefined()
  })

  it('uses red color for low scores', () => {
    const { getByText } = render(<ScoreBadge score={30} label="Technical" />)
    const value = getByText('30')
    expect(value.className).toContain('red')
  })
})
