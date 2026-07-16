import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { fetchClientByDomain } from './lib/api'

const DEFAULT_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function getHostname(request: NextRequest): string {
  const host = request.headers.get('host') ?? ''
  return host.split(':')[0] ?? ''
}

function isDefaultHost(hostname: string): boolean {
  return hostname.length === 0 || DEFAULT_HOSTS.has(hostname)
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const hostname = getHostname(request)
  if (isDefaultHost(hostname)) {
    return NextResponse.next()
  }

  if (request.cookies.get('x-geolyt-white-label')) {
    return NextResponse.next()
  }

  const client = await fetchClientByDomain(hostname).catch(() => null)
  if (!client?.white_label_config) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  response.cookies.set('x-geolyt-white-label', JSON.stringify(client.white_label_config), {
    httpOnly: false,
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
  })
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
