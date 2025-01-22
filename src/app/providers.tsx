'use client'

import { ClerkProvider, useAuth } from '@clerk/nextjs'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'
import { ThemeProvider } from 'next-themes'
import { useMemo } from 'react'

// Initialize Convex Client with proper error handling
function initializeConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) {
    throw new Error(
      'NEXT_PUBLIC_CONVEX_URL is not set. Please add it to your environment variables.'
    )
  }
  return new ConvexReactClient(convexUrl)
}

function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  // Create the Convex client inside the component using useMemo
  const convex = useMemo(() => initializeConvexClient(), [])
  const auth = useAuth()

  return (
    <ConvexProviderWithClerk client={convex} useAuth={() => auth}>
      {children}
    </ConvexProviderWithClerk>
  )
}

export default function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <ClerkProvider
        appearance={{
          baseTheme: undefined,
          variables: {
            colorPrimary: '#2563eb',
            colorBackground: '#ffffff',
            colorInputBackground: '#ffffff',
            colorText: '#111827',
          },
          elements: {
            card: "bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700",
            headerTitle: "text-xl font-semibold text-gray-900 dark:text-white",
            headerSubtitle: "text-sm text-gray-600 dark:text-gray-400",
            socialButtonsBlockButton: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
            formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
            footerActionLink: "text-blue-600 hover:text-blue-700 dark:text-blue-400",
            formFieldLabel: "text-gray-700 dark:text-gray-300",
            formFieldInput: "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700",
            dividerLine: "bg-gray-200 dark:bg-gray-700",
            dividerText: "text-gray-500 dark:text-gray-400",
          }
        }}
      >
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </ClerkProvider>
    </ThemeProvider>
  )
} 