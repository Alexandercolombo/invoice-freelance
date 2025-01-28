import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { ThemeProvider } from '@/components/providers/theme-provider';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        elements: {
          card: "bg-white dark:bg-gray-800",
          formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
          formFieldLabel: "text-gray-700 dark:text-gray-300",
          formFieldInput: "dark:bg-gray-700 dark:text-white dark:border-gray-600",
          footerActionLink: "text-blue-600 hover:text-blue-700 dark:text-blue-400",
        },
      }}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </ClerkProvider>
  );
} 