import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import Bouncer from '@/components/Bouncer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Nabjo - Scam-Proof Marketplace & Free AI Seller Tools',
  description: 'The safest place to buy and sell online. Features a free in-browser AI background remover, live video verification, and QR-code safe handoffs. No scams, no fees.',
  keywords: ['marketplace', 'buy and sell', 'AI background remover', 'scam proof', 'OLX alternative', 'Facebook marketplace alternative', 'free AI tools for sellers', 'Nabjo', 'safe marketplace', 'QR handoff', 'live video verification'],
  
  openGraph: {
    title: 'Nabjo - Scam-Proof Marketplace & Free AI Tools',
    description: 'Stop getting scammed on marketplaces. Use Nabjo for safe QR handoffs, live video verification, and free AI listing tools.',
    url: 'https://listpro-ochre.vercel.app',
    siteName: 'Nabjo',
    type: 'website',
    locale: 'en_US',
  },
  
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