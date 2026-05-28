import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Twinity Admin',
    template: '%s · Twinity Admin',
  },
  description: 'Twinity Admin Panel — manage celebrities, video jobs, leads and platform settings.',
  icons: {
    icon: [
      { url: '/logo/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/logo/icon-white.png',
    shortcut: '/logo/icon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
