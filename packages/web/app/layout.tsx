import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Geolyt — GEO Audit Dashboard',
  description: 'Generative Engine Optimization audits and reports',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
