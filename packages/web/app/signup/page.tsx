'use client'

import { authClient } from '@/lib/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const result = await authClient.signUp.email({
      email,
      password,
      name,
      callbackURL: '/',
    })

    setLoading(false)

    if (result.error) {
      setError(result.error.message ?? 'Sign up failed')
      return
    }

    router.push('/')
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-8">
        <h1 className="mb-6 text-2xl font-semibold">Create a Geolyt account</h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm text-[var(--color-muted-foreground)]"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm text-[var(--color-muted-foreground)]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm text-[var(--color-muted-foreground)]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-muted-foreground)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--color-primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
