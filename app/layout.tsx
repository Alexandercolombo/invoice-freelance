import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { metadata } from './metadata';
import { viewport } from './viewport';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'] });

export { metadata, viewport };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
} 