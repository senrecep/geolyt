import '../../../test-setup'

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { MarkdownReport } from '../../../app/_components/markdown-report'

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  cleanup()
})

describe('MarkdownReport', () => {
  it('renders headings, bold text and list items from markdown', () => {
    const content = [
      '# GEO Audit Report',
      '',
      '**GEO Score:** 82/100',
      '',
      '## Findings',
      '- **Missing schema** (high): No structured data found.',
    ].join('\n')

    const { container, getByText } = render(<MarkdownReport content={content} />)

    expect(getByText('GEO Audit Report').tagName).toBe('H1')
    expect(getByText('Findings').tagName).toBe('H2')
    expect(container.querySelector('li')).not.toBeNull()
    expect(container.querySelector('strong')?.textContent).toBe('GEO Score:')
  })

  it('escapes raw HTML embedded in the markdown source instead of rendering it', () => {
    const content =
      'Findings\n\n<script>window.__pwned = true</script>\n\n<img src=x onerror=alert(1)>'

    const { container } = render(<MarkdownReport content={content} />)

    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.innerHTML).toContain('&lt;script&gt;')
  })
})
