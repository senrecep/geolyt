import '../../../test-setup'

import { describe, expect, it, mock } from 'bun:test'
import { render } from '@testing-library/react'
import { Header } from '../../../app/_components/header'

mock.module('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined }),
}))

describe('Header', () => {
  it('renders the default Geolyt brand', () => {
    const { getByText } = render(<Header />)
    expect(getByText('Geolyt')).toBeDefined()
  })

  it('renders the white-label company name when provided', () => {
    const { getByText } = render(<Header companyName="Agency Inc" />)
    expect(getByText('Agency Inc')).toBeDefined()
  })

  it('renders the white-label logo when provided', () => {
    const { getByAltText } = render(
      <Header logoUrl="https://agency.example/logo.png" companyName="Agency Inc" />,
    )
    const img = getByAltText('Agency Inc') as HTMLImageElement
    expect(img.src).toBe('https://agency.example/logo.png')
  })
})
