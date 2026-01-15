import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/lib/toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AthleteConnect - Connect Athletes with College Coaches',
  description: 'A platform connecting high school athletes with college coaches',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
