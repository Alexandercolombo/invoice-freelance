'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { ConvexClientProvider } from '@/components/providers/convex-client-provider'
import { BrowserCompatibilityProvider } from '@/components/providers/browser-compatibility-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { useEffect, useState } from 'react'

if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key')
}

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        baseTheme: dark,
        elements: {
          card: "bg-white dark:bg-gray-800",
          formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm text-white",
          formFieldInput: "rounded-md border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600",
          formFieldLabel: "text-gray-700 dark:text-gray-300",
          footerActionLink: "text-blue-600 hover:text-blue-700 dark:text-blue-400",
        },
      }}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/onboarding"
    >
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