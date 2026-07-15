'use client'

import { authClient } from '@/lib/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  logoUrl?: string | undefined
  companyName?: string | undefined
}

export function Header({ logoUrl, companyName }: HeaderProps) {
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/login')
  }

  const brandName = companyName ?? 'Geolyt'

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="h-8 w-auto object-contain" />
          ) : (
            brandName
          )}
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            Audits
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  )
}
