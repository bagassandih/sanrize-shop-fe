
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
  title: 'Sanrize Shop - Top Up Game',
  description: 'Top up game favorit Anda seperti Mobile Legends dan Free Fire dengan mudah dan cepat di Sanrize Shop.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Apply dark class to html for dark theme by default
    // Ensure no leading/trailing whitespace around <html> or <body> tags
    <html lang="id" className="dark">
      <head>
        {/* DOKU Checkout Script - For Sandbox */}
        <script src="https://sandbox.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js" async></script>
        {/* Next.js automatically populates head based on metadata and font imports.
            This explicit <head> tag helps ensure proper structure and avoid hydration errors. */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <PurchaseProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <footer className="py-6 text-center text-muted-foreground text-sm">
              © {new Date().getFullYear()} Sanrize Shop. Hak cipta dilindungi undang-undang.
            </footer>
          </div>
          <Toaster />
        </PurchaseProvider>
      </body>
    </html>
  );
}
