import { ThemeProvider } from '@/components/providers/theme-provider';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
} 