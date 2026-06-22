import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/app/contexts/ThemeContext'
import { AuthProvider } from '@/app/contexts/AuthContext'
import Footer from '@/app/components/Footer'
import './globals.css'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'SkillForge - Your Learning Playground',
  description: 'Master new skills through interactive games and challenges',
  icons: {
    icon: '/game logo.jpeg',
    apple: '/game logo.jpeg',
  },
}

// Mobile-first viewport. `viewportFit: 'cover'` is required for the
// env(safe-area-inset-*) padding used by the admin/teacher mobile tab bars
// to resolve to non-zero values on notched devices.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f6f7' },
    { media: '(prefers-color-scheme: dark)', color: '#111114' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className="flex flex-col min-h-screen">
        <ThemeProvider>
          <AuthProvider>
            <div className="flex-1">
              {children}
            </div>
            <Footer />
            <Toaster
              position="top-right"
              containerStyle={{
                top: 'calc(env(safe-area-inset-top) + 1rem)',
                right: 'calc(env(safe-area-inset-right) + 1rem)',
              }}
              toastOptions={{
                duration: 3500,
                style: {
                  borderRadius: '12px',
                  fontSize: '14px',
                  maxWidth: 'calc(100vw - 2rem)',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
