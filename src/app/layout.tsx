import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Providers from './providers';
import { Toaster } from "@/components/toaster"

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Freelance Invoice Manager',
  description: 'Manage your freelance work and invoices',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased`}>
        <Providers>
          <div className="min-h-screen bg-white dark:bg-gray-900">
            {children}
          </div>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
} 