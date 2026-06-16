import type { Metadata } from 'next'
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
