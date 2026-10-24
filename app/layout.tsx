import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import Bouncer from '@/components/Bouncer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Nabjo - The Global Marketplace for Everything',
  description: 'Buy, sell, and trade anything, anywhere. Nabjo is the global marketplace connecting people worldwide.',
  
  // 🛡️ GOOGLE SEARCH CONSOLE VERIFICATION
  verification: {
    google: 'C9-b6l7fK_-byzHo_0_bCmIio0lStlwoiwZ2cahTqtQ',
  },
  // 👆 END OF VERIFICATION 👆
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 🛡️ THE BOUNCER: Wraps the whole app to kick out banned users instantly */}
        <Bouncer>
          {children}
        </Bouncer>
        
        <Toaster 
          position="top-center" 
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#fff',
              border: '1px solid #374151',
            },
          }}
        />
      </body>
    </html>
  )
}