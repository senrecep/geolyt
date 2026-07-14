import { GeoErr } from '@geolyt/shared'
import { Result } from 'tsentials/result'

const PRIVATE_IPV4_BLOCKS = [
  { start: 10, mask: 8 },
  { start: 172, secondStart: 16, secondEnd: 31, mask: 12 },
  { start: 192, secondStart: 168, mask: 16 },
  { start: 127, mask: 8 },
  { start: 169, secondStart: 254, mask: 16 },
  { start: 0, mask: 8 },
]

export function isPrivateIpAddress(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return false
  }

  const [a, b] = parts

  for (const block of PRIVATE_IPV4_BLOCKS) {
    if (a !== block.start) continue
    if (block.secondStart !== undefined && block.secondEnd !== undefined) {
      if (b === undefined || b < block.secondStart || b > block.secondEnd) continue
    }
    return true
  }

  return false
}

export function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname

    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1') {
      return true
    }

    if (isPrivateIpAddress(hostname)) {
      return true
    }

    return false
  } catch {
    return true
  }
}

export function validateTargetUrl(url: string): Result<string> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return Result.failure(GeoErr.invalidUrl(url))
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return Result.failure(GeoErr.invalidUrl(url))
  }

  if (isPrivateUrl(url)) {
    return Result.failure(GeoErr.crawlerBlocked(url))
  }

  return Result.success(url)
}
