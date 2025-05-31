
"use client";

import { usePurchase } from '@/app/(store)/PurchaseContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Gem, ArrowLeft, Info } from 'lucide-react';
import Image from 'next/image';

// Declare DOKU's global function for TypeScript
declare global {
  interface Window {
    loadJokulCheckout: (paymentUrl: string, options?: JokulCheckoutOptions) => void;
  }
}

interface JokulCheckoutOptions {
  cancelRedirectUrl?: string;
  continueRedirectUrl?: string;
  failedRedirectUrl?: string;
  onClose?: () => void;
  onLoad?: () => void;
  onCancel?: () => void;
  onContinueSuccess?: () => void;
  onContinueFailed?: () => void;
  onError?: (data: any) => void;
}

interface ConfirmationClientProps {
  apiUrl?: string;
}

const ConfirmationClient = ({ apiUrl }: ConfirmationClientProps) => {
  const router = useRouter();
  const { selectedGame, selectedPackage, accountDetails, resetPurchase } = usePurchase();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedGame || !selectedPackage || !accountDetails) {
      router.replace('/');
    }
  }, [selectedGame, selectedPackage, accountDetails, router]);

  const handleConfirmPurchase = async () => {
    if (!selectedGame || !selectedPackage || !accountDetails || !apiUrl) {
      setPaymentError("Informasi pembelian tidak lengkap atau URL API tidak tersedia.");
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    const primaryAccountIdField = selectedGame.accountIdFields[0]?.name;
    const idGameValue = primaryAccountIdField ? accountDetails[primaryAccountIdField] : undefined;

    if (!idGameValue) {
      setPaymentError("Detail ID Game utama tidak ditemukan dalam data akun.");
      setIsProcessing(false);
      return;
    }
    
    if (!selectedPackage.originalId) {
      setPaymentError("ID Layanan (originalId) tidak ditemukan untuk paket yang dipilih.");
      setIsProcessing(false);
      return;
    }
    
    if (!accountDetails.username) {
      setPaymentError("Nickname tidak ditemukan. Pastikan akun sudah dicek.");
      setIsProcessing(false);
      return;
    }

    const payload = {
      idGame: String(idGameValue),
      idService: selectedPackage.originalId,
      nickname: accountDetails.username,
    };

    try {
      const response = await fetch(`${apiUrl}/process-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setPaymentError(result.error || `Gagal memproses pesanan (Error: ${response.status})`);
        setIsProcessing(false);
        return;
      }

      if (result.error) {
        setPaymentError(result.error);
        setIsProcessing(false);
      } else if (result.payment_url) {
        if (typeof window.loadJokulCheckout === 'function') {
          window.loadJokulCheckout(result.payment_url, {
            onContinueSuccess: () => {
              // Navigate to success page only when DOKU confirms success and user clicks continue
              router.push('/success');
            },
            onCancel: () => {
              setPaymentError("Pembayaran dibatalkan oleh pengguna.");
              setIsProcessing(false);
            },
            onClose: () => {
              // User closed the DOKU popup without completing or explicitly cancelling
              // Decide if an error message is needed or just reset processing state
              setPaymentError("Jendela pembayaran ditutup.");
              setIsProcessing(false);
            },
            onError: (dokuError: any) => {
              console.error("DOKU Checkout Error:", dokuError);
              setPaymentError("Terjadi kesalahan pada proses pembayaran DOKU. Silakan coba lagi.");
              setIsProcessing(false);
            },
            onLoad: () => {
              // DOKU Checkout page has loaded, isProcessing should remain true
            }
          });
          // No automatic navigation here, DOKU callbacks will handle it.
          // isProcessing remains true while DOKU popup is active.
        } else {
          setPaymentError("Fungsi pembayaran DOKU tidak ditemukan. Pastikan skrip telah dimuat.");
          setIsProcessing(false);
        }
      } else {
        setPaymentError("Format respons tidak dikenal dari server setelah memproses pesanan.");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error saat memproses pesanan:", error);
      setPaymentError("Tidak dapat terhubung ke server untuk memproses pesanan. Coba lagi nanti.");
      setIsProcessing(false);
    }
    // No finally block to set isProcessing to false if DOKU is launched, as DOKU callbacks manage it.
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
      <div className="mb-4">
        <Button variant="outline" onClick={() => router.back()} size="sm" className="text-xs sm:text-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </div>
      <div className="text-center">
         <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-primary mx-auto mb-3 sm:mb-4" />
        <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1 sm:mb-2">Konfirmasi Pembelian Anda</h1>
        <p className="text-xs sm:text-base md:text-lg text-muted-foreground">
          Harap tinjau detail pesanan Anda di bawah ini sebelum menyelesaikan pembelian.
        </p>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-xl md:text-2xl text-accent flex items-center">
            <Image 
              src={selectedGame.imageUrl} 
              alt={selectedGame.name} 
              width={28} 
              height={28} 
              className="rounded-md mr-2 sm:mr-3 border border-border w-7 h-7 sm:w-10 sm:h-10"
              data-ai-hint={selectedGame.dataAiHint}
            />
            {selectedGame.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-6 p-4 sm:p-6 pt-0">
          <div>
            <h3 className="text-xs sm:text-base md:text-lg font-semibold text-primary mb-1">Paket Terpilih:</h3>
            <div className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 bg-muted/30 rounded-md">
              {selectedPackage.imageUrl ? (
                  <Image src={selectedPackage.imageUrl} alt={selectedPackage.name} width={32} height={32} className="h-8 w-8 md:h-10 md:w-10 rounded-sm object-contain" data-ai-hint="package icon"/>
              ) : selectedPackage.iconName === "Gem" ? (
                  <Gem className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-accent mt-1" />
              ) : <div className="w-5 h-5 sm:w-7 sm:w-7 md:w-8 md:h-8"></div> /* Placeholder */}
              <div>
                <p className="font-medium text-foreground text-xs sm:text-sm md:text-base">{selectedPackage.name}</p>
                {selectedPackage.bonus && String(selectedPackage.bonus).trim() !== "" && (
                  <p className="text-xs sm:text-sm text-accent">Bonus: {String(selectedPackage.bonus)}</p>
                )}
              </div>
              <p className="ml-auto font-semibold text-foreground text-xs sm:text-sm md:text-base">{formatPriceIDR(selectedPackage.price)}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-xs sm:text-base md:text-lg font-semibold text-primary mb-1">Detail Akun:</h3>
            <ul className="list-disc list-inside space-y-1 pl-2 bg-muted/30 p-2 sm:p-3 rounded-md text-xs sm:text-sm md:text-base">
              {Object.entries(accountDetails).map(([key, value]) => {
                  let fieldLabel = key;
                  if (key.toLowerCase() === 'username') {
                    fieldLabel = "Nickname";
                  } else {
                    fieldLabel = selectedGame.accountIdFields.find(f => f.name === key)?.label || key.charAt(0).toUpperCase() + key.slice(1);
                  }
                  return (
                    <li key={key} className="text-foreground">
                      <span className="font-medium text-muted-foreground">{fieldLabel}: </span>{String(value)}
                    </li>
                  );
              })}
            </ul>
          </div>

          <div className="text-right mt-3 sm:mt-4">
            <p className="text-sm sm:text-lg md:text-xl font-bold text-foreground">
              Total: <span className="text-accent">{formatPriceIDR(selectedPackage.price)}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {paymentError && (
        <div className="p-3 bg-destructive/20 border border-destructive text-destructive rounded-md text-center text-sm">
          <Info className="inline-block mr-2 h-4 w-4" /> {paymentError}
        </div>
      )}

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
    