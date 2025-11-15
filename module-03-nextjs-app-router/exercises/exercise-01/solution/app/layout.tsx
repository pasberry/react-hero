import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analytics Dashboard',
  description: 'Real-time analytics dashboard with streaming data',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
