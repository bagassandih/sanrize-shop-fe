
"use client";

import { usePurchase } from '@/app/(store)/PurchaseContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Gem, ArrowLeft, Info } from 'lucide-react';
import Image from 'next/image';

interface ConfirmationClientProps {
  apiUrl?: string;
}

const ConfirmationClient = ({ apiUrl }: ConfirmationClientProps) => {
  const router = useRouter();
  const { selectedGame, selectedPackage, accountDetails, resetPurchase } = usePurchase();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const paymentWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    if (!selectedGame || !selectedPackage || !accountDetails) {
      router.replace('/');
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (isProcessing && paymentWindowRef.current && !paymentWindowRef.current.closed) {
        // Only close if unmounting while actively processing and window wasn't closed by success/fail logic.
        // This is a fallback.
        // paymentWindowRef.current.close(); 
        // paymentWindowRef.current = null;
        // Let's be less aggressive here; success/fail paths should handle closure.
        // If user navigates away, OS handles orphaned window.
      }
    };
  }, [selectedGame, selectedPackage, accountDetails, router, isProcessing]);


  const startPolling = useCallback((refIdToCheck: string, openedWindow: Window | null) => {
    if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
    }

    const checkStatus = async () => {
        if (!openedWindow) { // Should not happen if startPolling is called correctly
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setIsProcessing(false);
            setPaymentError("Referensi jendela pembayaran hilang.");
            return;
        }

        if (openedWindow.closed) {
            console.log("Payment window closed by user.");
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setPaymentError("Jendela pembayaran ditutup sebelum transaksi selesai.");
            setIsProcessing(false);
            return;
        }

        if (!apiUrl) {
            console.error("API URL not configured for polling.");
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setIsProcessing(false);
            setPaymentError("Konfigurasi API bermasalah untuk memeriksa status.");
            // Don't close openedWindow here
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/check-transaction`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refId: refIdToCheck }),
            });

            if (openedWindow.closed) { // Check again after fetch, user might have closed it.
                console.log("Payment window closed by user during API call.");
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                setPaymentError("Jendela pembayaran ditutup.");
                setIsProcessing(false);
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Gagal membaca respons error dari server." }));
                console.error(`Error checking transaction status: ${response.status}`, errorData);
                
                if (response.status === 404) { 
                    // Keep polling if window open and 404 (could mean not found yet)
                    // User closing the window will be caught at the start of the next checkStatus call.
                } else {
                    // For other server errors (500, 400, etc.)
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    setPaymentError(errorData.message || `Gagal memeriksa status pembayaran (${response.status}). Silakan coba lagi atau hubungi dukungan jika masalah berlanjut.`);
                    setIsProcessing(false);
                    // DO NOT close openedWindow here. Let the user decide.
                }
                return;
            }
            const data = await response.json();

            if (data.status === 'PAID' || data.status === 'SUCCESS') { 
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                if (openedWindow && !openedWindow.closed) openedWindow.close();
                router.push('/success');
                // setIsProcessing(false); // router.push will unmount or re-trigger useEffect
                // setPaymentError(null);
            } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(data.status)) { 
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                if (openedWindow && !openedWindow.closed) openedWindow.close();
                setPaymentError(data.message || "Pembayaran gagal, dibatalkan, atau kedaluwarsa.");
                setIsProcessing(false);
            } else if (data.status === 'PENDING') {
                console.log('Payment pending, continuing to poll...');
                // If window closed by user, it's caught at the start of the next checkStatus.
            } else {
                console.warn("Unknown transaction status:", data.status, " - Message:", data.message);
                // For unknown status, keep polling if window is open. User might close it.
            }
        } catch (error) {
            console.error("Error during polling checkTransactionStatus (catch block):", error);
            if (openedWindow.closed) { // Check if user closed it during the error condition
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                setPaymentError("Jendela pembayaran ditutup atau terjadi masalah jaringan.");
                setIsProcessing(false);
                return;
            }
            
            if (!navigator.onLine) {
                 if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                 setPaymentError("Tidak ada koneksi internet. Periksa jaringan Anda.");
                 setIsProcessing(false);
                 // DO NOT close openedWindow here. Let the user manage it.
            }
            // For other transient network errors, allow polling to continue.
            // If error is persistent, user will likely close the window, which will stop polling.
        }
    };

    pollingIntervalRef.current = setInterval(checkStatus, 3000);
    checkStatus(); // Initial check
  }, [apiUrl, router, setIsProcessing, setPaymentError]); // Removed selectedGame, etc. as they are not directly used by polling logic after init


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
    
    if (selectedPackage.originalId === undefined) { 
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
        headers: { 'Content-Type': 'application/json', },
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
      } else if (result.payment_url && result.ref_id) {
        const { payment_url, ref_id } = result;
        
        const newWindow = window.open(payment_url, "_blank", "width=800,height=700,scrollbars=yes,resizable=yes");
        
        if (newWindow) {
          paymentWindowRef.current = newWindow;
          newWindow.focus(); 
          startPolling(ref_id, newWindow);
          // isProcessing remains true while polling
        } else {
          setPaymentError("Gagal membuka jendela pembayaran. Pastikan popup tidak diblokir dan coba lagi.");
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
        <Button variant="outline" onClick={() => { if (!isProcessing) router.back(); }} size="sm" className="text-xs sm:text-sm" disabled={isProcessing}>
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
            Menunggu Pembayaran...
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
    
