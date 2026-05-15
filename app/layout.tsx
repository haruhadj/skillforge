import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/app/contexts/ThemeContext'
import { AuthProvider } from '@/app/contexts/AuthContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'SkillForge - Your Learning Playground',
  description: 'Master new skills through interactive games and challenges',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: {
                  borderRadius: '12px',
                  fontSize: '14px',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
