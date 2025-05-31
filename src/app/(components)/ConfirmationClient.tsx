
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
      // Ensure DOKU window is closed if component unmounts while it's open
      if (paymentWindowRef.current && !paymentWindowRef.current.closed) {
        paymentWindowRef.current.close();
        paymentWindowRef.current = null;
      }
    };
  }, [selectedGame, selectedPackage, accountDetails, router]);


  const startPolling = useCallback((refIdToCheck: string, openedWindow: Window | null) => {
    if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
    }

    const checkStatus = async () => {
        if (!openedWindow) {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setPaymentError("Referensi jendela pembayaran hilang.");
            setIsProcessing(false);
            return;
        }

        if (!apiUrl) {
            console.error("API URL not configured for polling.");
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setPaymentError("Konfigurasi API bermasalah untuk memeriksa status.");
            setIsProcessing(false);
            return;
        }

        // Important: Check if window is closed *before* API call
        if (openedWindow.closed) {
            const currentError = paymentError; 
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            if (!currentError || !['PAID', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED'].some(s => (currentError||"").includes(s))) {
                 setPaymentError("Jendela pembayaran ditutup. Status transaksi mungkin belum final atau dibatalkan.");
            }
            setIsProcessing(false);
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/check-transaction`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refId: refIdToCheck }),
            });

            // Check if window was closed *during or immediately after* the API call
            if (openedWindow.closed) {
                 let isSuccessStatus = false;
                 if(response.ok) {
                    try {
                        const tempData = await response.clone().json();
                        if (tempData.status === 'PAID' || tempData.status === 'SUCCESS') {
                            isSuccessStatus = true;
                        }
                    } catch (e) { /* ignore clone/json parse error here */ }
                 }

                if (!isSuccessStatus) { // If not success and window closed
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    const currentError = paymentError;
                    if (!currentError || !['PAID', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED'].some(s => (currentError||"").includes(s))) {
                        setPaymentError("Jendela pembayaran ditutup sebelum transaksi selesai atau saat terjadi masalah.");
                    }
                    setIsProcessing(false);
                    return;
                }
                // If it was a success status and window got closed, proceed to process data below
            }


            if (!response.ok) {
                const errorResponseText = await response.text();
                let detailedErrorMessage = `Gagal memeriksa status pembayaran (HTTP ${response.status}).`;
                
                if (errorResponseText) {
                    try {
                        const errorJson = JSON.parse(errorResponseText);
                        const serverMsg = errorJson.message || errorJson.error;
                        if (serverMsg) {
                            detailedErrorMessage += ` Pesan: ${serverMsg}`;
                        } else if (errorResponseText.trim() !== '{}' && errorResponseText.trim() !== '') {
                            detailedErrorMessage += ` Respon server: ${errorResponseText.substring(0, 150)}`;
                        }
                    } catch (e) {
                        detailedErrorMessage += ` Respon server (non-JSON): ${errorResponseText.substring(0, 150)}`;
                    }
                }
                console.error(`Error checking transaction status (HTTP ${response.status}): ${detailedErrorMessage}`, "Full Text:", errorResponseText);
                
                // If DOKU window is already closed, any API error is terminal for this attempt.
                if (openedWindow && openedWindow.closed) { // Double check, though covered by earlier check
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    const currentError = paymentError;
                     if (!currentError || !['PAID', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED'].some(s => (currentError||"").includes(s))) {
                        setPaymentError("Jendela pembayaran ditutup atau terjadi masalah saat pemeriksaan status.");
                     }
                    setIsProcessing(false);
                } else if (response.status === 404) { 
                    // 404 and window is open: continue polling silently.
                    console.log('Transaction not found (404) - continuing poll as payment window is open.');
                } else {
                    // Any OTHER error (e.g., 500 from backend) and DOKU window is STILL OPEN:
                    // Log it, but continue polling. Don't show error to user yet.
                    console.warn(`HTTP ${response.status} during /check-transaction, but DOKU window is open. Continuing poll. Full error: ${detailedErrorMessage}`);
                }
                return; // Continue to next poll iteration or stop if interval cleared by window closed logic
            }
            
            const data = await response.json();

            if (data.status === 'PAID' || data.status === 'SUCCESS') { 
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                if (openedWindow && !openedWindow.closed) openedWindow.close();
                router.push('/success');
            } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(data.status)) { 
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                if (openedWindow && !openedWindow.closed) openedWindow.close();
                setPaymentError(data.message || `Pembayaran ${data.status.toLowerCase()}.`);
                setIsProcessing(false);
            } else if (data.status === 'PENDING') {
                console.log('Payment pending, continuing to poll...');
                // If pending and window gets closed by user - this is handled by the check at the top of function,
                // or immediately after the fetch call.
            } else {
                console.warn("Unknown transaction status from API:", data.status, " - Message:", data.message);
                // If status is unknown and window gets closed - also handled by window closed checks.
            }
        } catch (error: any) { 
            console.error("Error during polling (checkStatus catch block):", error);
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); // Stop polling on any catch
            
            if (openedWindow && openedWindow.closed) {
                setPaymentError("Jendela pembayaran ditutup atau terjadi masalah jaringan saat pemeriksaan status.");
            } else if (!navigator.onLine) {
                 setPaymentError("Tidak ada koneksi internet. Periksa jaringan Anda.");
            } else {
              setPaymentError(`Masalah jaringan atau teknis saat memeriksa status: ${error.message || 'Error tidak diketahui'}`);
            }
            setIsProcessing(false);
            // Don't close openedWindow here for caught errors
        }
    };

    pollingIntervalRef.current = setInterval(checkStatus, 3000);
    // Initial check with a slight delay to give DOKU window time to load/initialize if needed
    setTimeout(checkStatus, 1000); 
  }, [apiUrl, router, setIsProcessing, setPaymentError, paymentError]); // Dependencies for useCallback


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
        setPaymentError(result.error || result.message || `Gagal memproses pesanan (Error: ${response.status})`);
        setIsProcessing(false);
        return;
      }

      if (result.error || (result.message && response.status !== 200 && response.status !== 201 && !result.payment_url)) {
        setPaymentError(result.error || result.message);
        setIsProcessing(false);
      } else if (result.payment_url && result.ref_id) {
        const { payment_url, ref_id } = result;
        
        if (paymentWindowRef.current && !paymentWindowRef.current.closed) {
            setPaymentError("Jendela pembayaran sebelumnya masih terbuka. Harap selesaikan atau tutup terlebih dahulu.");
            setIsProcessing(false); 
            return;
        }
        
        const newWindow: Window | null = window.open(payment_url, "_blank", "width=800,height=700,scrollbars=yes,resizable=yes");
        
        if (newWindow) {
          paymentWindowRef.current = newWindow;
          newWindow.focus(); 
          startPolling(ref_id, newWindow);
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
              ) : <div className="w-5 h-5 sm:w-7 sm:w-7 md:w-8 md:h-8"></div> }
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
    
