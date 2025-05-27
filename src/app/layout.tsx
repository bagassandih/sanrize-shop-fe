import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { PurchaseProvider } from '@/app/(store)/PurchaseContext';
import Header from '@/app/(components)/Header';
import { Toaster } from "@/components/ui/toaster";


const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Sanrize Shop - Game Top Ups',
  description: 'Top up your favorite games like Mobile Legends and Free Fire easily and quickly at Sanrize Shop.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark"> {/* Apply dark class to html for dark theme by default */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <PurchaseProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <footer className="py-6 text-center text-muted-foreground">
              © {new Date().getFullYear()} Sanrize Shop. All rights reserved.
            </footer>
          </div>
          <Toaster />
        </PurchaseProvider>
      </body>
    </html>
  );
}
