
"use client";

import { usePurchase } from '@/app/(store)/PurchaseContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CheckCircle, PartyPopper, ShoppingCart, Home, ShoppingBag } from 'lucide-react';
import { formatPriceIDR } from '@/lib/utils';

const SuccessClient = () => {
  const router = useRouter();
  const { selectedGame, selectedPackage, accountDetails, resetPurchase } = usePurchase();

  useEffect(() => {
    // Tidak ada tindakan khusus saat mount untuk halaman sukses ini
  }, []);

  const handleGoHome = () => {
    resetPurchase();
    router.push('/');
  };

  const handleBeliLagi = () => {
    if (selectedGame) {
      const gameSlug = selectedGame.slug;
      resetPurchase(); // Reset purchase state before navigating
      router.push(`/games/\${gameSlug}`);
    } else {
      handleGoHome(); // Fallback if selectedGame is somehow null
    }
  };
  

  if (!selectedGame || !selectedPackage) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
            <PartyPopper className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 text-green-500 mb-4 sm:mb-6" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3">Pembelian Berhasil!</h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8">
                Pesanan Anda telah diproses. Terima kasih telah berbelanja di Sanrize Shop!
            </p>
            <Button onClick={handleGoHome} size="lg" className="bg-primary hover:bg-primary/80 text-primary-foreground text-sm sm:text-base">
                <ShoppingBag className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Belanja Lagi
            </Button>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <PartyPopper className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 text-green-500 mb-4 sm:mb-6 animate-bounce" />
        <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3">Terima Kasih! Pembelian Selesai!</h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-xl">
            Diamonds Anda untuk <span className="font-semibold text-accent">{selectedGame.name}</span> telah berhasil diproses dan akan segera masuk ke akun Anda.
        </p>

        <Card className="w-full max-w-md shadow-xl mb-6 sm:mb-8 bg-card">
            <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl md:text-2xl text-primary flex items-center justify-center">
                    <CheckCircle className="mr-2 h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:h-7"/> Ringkasan Pesanan
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 text-left text-xs sm:text-sm md:text-base p-4 sm:p-6 pt-0">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Game:</span>
                    <span className="font-medium text-foreground">{selectedGame.name}</span>
                </div>
                <div className="flex justify-between items-start">
                    <span className="text-muted-foreground pt-0.5">Paket:</span>
                    <div className="text-right">
                        <span className="font-medium text-foreground block">{selectedPackage.name}</span>
                        {selectedPackage.bonus && String(selectedPackage.bonus).trim() !== "" && (
                            <span className="text-xs text-accent block">Bonus: {String(selectedPackage.bonus)}</span>
                        )}
                    </div>
                </div>
                {accountDetails && Object.entries(accountDetails).map(([key, value]) => {
                     let fieldLabel = key;
                     if (key.toLowerCase() === 'username') { // Ensure 'username' is handled correctly
                       fieldLabel = "Nickname";
                     } else {
                       // Fallback for other keys if not found in accountIdFields, or if accountIdFields is empty
                       const fieldConfig = selectedGame.accountIdFields.find(f => f.name === key);
                       fieldLabel = fieldConfig?.label || key.charAt(0).toUpperCase() + key.slice(1);
                     }
                     return (
                        <div className="flex justify-between" key={key}>
                            <span className="text-muted-foreground">{fieldLabel}:</span>
                            <span className="font-medium text-foreground">{String(value)}</span>
                        </div>
                     );
                })}
                <div className="flex justify-between border-t border-border pt-2 sm:pt-3 mt-2 sm:mt-3">
                    <span className="text-muted-foreground text-sm sm:text-base md:text-lg">Total Bayar:</span>
                    <span className="font-bold text-accent text-sm sm:text-base md:text-lg">{formatPriceIDR(selectedPackage.price)}</span>
                </div>
            </CardContent>
        </Card>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-4 w-full max-w-md sm:max-w-none sm:justify-center">
            <Button
              onClick={handleBeliLagi}
              size="lg"
              variant="outline"
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              <ShoppingCart className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Beli Lagi?
            </Button>
            <Button
              onClick={handleGoHome}
              size="lg"
              className="w-full sm:w-auto bg-primary hover:bg-primary/80 text-primary-foreground text-sm sm:text-base"
            >
              <Home className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Ke Menu Utama
            </Button>
        </div>
    </div>
  );
};

export default SuccessClient;
