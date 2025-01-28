'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { ConvexClientProvider } from '@/components/providers/convex-client-provider'
import { BrowserCompatibilityProvider } from '@/components/providers/browser-compatibility-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { useEffect, useState } from 'react'

export default function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <ClerkProvider>
      <ConvexClientProvider>
        <BrowserCompatibilityProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </BrowserCompatibilityProvider>
      </ConvexClientProvider>
    </ClerkProvider>
  )
} 