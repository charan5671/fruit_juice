import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fresh Juice Chain | Enterprise Management Platform',
  description: 'Enterprise-grade management platform for multi-outlet fresh juice retail chains. POS, Inventory, Procurement, Workforce, Payroll, and Analytics.',
  keywords: ['juice', 'POS', 'enterprise', 'management', 'inventory'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
