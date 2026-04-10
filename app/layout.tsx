import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OPENVIEW — Filmmaker\'s Viewfinder',
  description: 'Professional digital viewfinder for filmmakers. Part of the OPENSLATE suite.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'OPENVIEW' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#090909',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}
