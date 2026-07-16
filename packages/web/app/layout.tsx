import { fetchClient } from '@/lib/api'
import { WhiteLabelConfig } from '@geolyt/shared'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Header } from './_components/header'
import './globals.css'

export const metadata: Metadata = {
  title: 'Geolyt — GEO Audit Dashboard',
  description: 'Generative Engine Optimization audits and reports',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get('x-geolyt-white-label')?.value
  const parsedCookie = cookieValue ? WhiteLabelConfig.safeParse(JSON.parse(cookieValue)).data : null
  const client = parsedCookie ? null : await fetchClient(cookieStore.toString()).catch(() => null)
  const config = parsedCookie ?? client?.white_label_config

  return (
    <html lang="en">
      <head>
        {config?.primaryColor && (
          <style>{`:root { --color-primary: ${config.primaryColor}; --color-primary-foreground: #ffffff; }`}</style>
        )}
        {config?.faviconUrl && <link rel="icon" href={config.faviconUrl} />}
      </head>
      <body className="min-h-screen antialiased">
        <Header logoUrl={config?.logoUrl} companyName={config?.companyName} />
        {children}
      </body>
    </html>
  )
}
