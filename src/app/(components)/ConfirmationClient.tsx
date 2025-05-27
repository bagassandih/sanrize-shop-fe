
"use client";

import { usePurchase } from '@/app/(store)/PurchaseContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Gem } from 'lucide-react';
import Image from 'next/image';

const ConfirmationClient = () => {
  const router = useRouter();
  const { selectedGame, selectedPackage, accountDetails, resetPurchase } = usePurchase();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!selectedGame || !selectedPackage || !accountDetails) {
      router.replace('/');
    }
  }, [selectedGame, selectedPackage, accountDetails, router]);

  const handleConfirmPurchase = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000)); 
    setIsProcessing(false);
    router.push('/success');
  };
  
  const formatPriceIDR = (price: number) => {
    if (price === undefined || price === null) return "Rp 0";
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  };

  if (!selectedGame || !selectedPackage || !accountDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mb-4" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-destructive mb-2">Informasi Tidak Lengkap</h1>
        <p className="text-muted-foreground mb-6 text-xs sm:text-sm md:text-base">
          Kami tidak dapat menemukan detail pembelian Anda. Silakan mulai dari awal.
        </p>
        <Button onClick={() => router.push('/')} variant="outline" size="sm" className="text-xs sm:text-sm">
          Kembali ke Beranda
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 p-2">
      <div className="text-center">
         <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-primary mx-auto mb-3 sm:mb-4" />
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1 sm:mb-2">Konfirmasi Pembelian Anda</h1>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
          Harap tinjau detail pesanan Anda di bawah ini sebelum menyelesaikan pembelian.
        </p>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl md:text-2xl text-accent flex items-center">
            <Image 
              src={selectedGame.imageUrl} 
              alt={selectedGame.name} 
              width={32} 
              height={32} 
              className="rounded-md mr-2 sm:mr-3 border border-border sm:w-10 sm:h-10"
              data-ai-hint={selectedGame.dataAiHint}
            />
            {selectedGame.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
          <div>
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-primary mb-1">Paket Terpilih:</h3>
            <div className="flex items-center space-x-2 sm:space-x-3 p-3 bg-muted/30 rounded-md">
              {selectedPackage.iconName === "Gem" && <Gem className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-accent" />}
              <div>
                <p className="font-medium text-foreground text-xs sm:text-sm md:text-base">{selectedPackage.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {selectedPackage.diamonds.toLocaleString('id-ID')} Diamonds
                  {selectedPackage.bonus && ` (${selectedPackage.bonus})`}
                </p>
              </div>
              <p className="ml-auto font-semibold text-foreground text-xs sm:text-sm md:text-base">{formatPriceIDR(selectedPackage.price)}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-primary mb-1">Detail Akun:</h3>
            <ul className="list-disc list-inside space-y-1 pl-2 bg-muted/30 p-3 rounded-md text-xs sm:text-sm md:text-base">
              {Object.entries(accountDetails).map(([key, value]) => {
                  const fieldLabel = selectedGame.accountIdFields.find(f => f.name === key)?.label || key;
                  return (
                    <li key={key} className="text-foreground">
                      <span className="font-medium text-muted-foreground">{fieldLabel}: </span>{String(value)}
                    </li>
                  );
              })}
            </ul>
          </div>

          <div className="text-right mt-3 sm:mt-4">
            <p className="text-base sm:text-lg md:text-xl font-bold text-foreground">
              Total: <span className="text-accent">{formatPriceIDR(selectedPackage.price)}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={handleConfirmPurchase} 
        disabled={isProcessing}
        size="lg"
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            Memproses Pembayaran...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Konfirmasi & Bayar
          </>
        )}
      </Button>
    </div>
  );
};

export default ConfirmationClient;
