
"use client";

import { usePurchase } from '@/app/(store)/PurchaseContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Gem, ArrowLeft, Info, PartyPopper } from 'lucide-react';
import Image from 'next/image';

interface ConfirmationClientProps {
  apiUrl?: string;
}

interface FeedbackMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

const ConfirmationClient = ({ apiUrl }: ConfirmationClientProps) => {
  const router = useRouter();
  const { selectedGame, selectedPackage, accountDetails, resetPurchase } = usePurchase();
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);
  const [showSuccessRedirectMessage, setShowSuccessRedirectMessage] = useState(false);

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
      // It's generally better not to close the DOKU window on unmount
      // if the user might still be interacting with it.
      // if (paymentWindowRef.current && !paymentWindowRef.current.closed) {
      //   paymentWindowRef.current.close();
      // }
    };
  }, [selectedGame, selectedPackage, accountDetails, router]);


  const startPolling = useCallback((refIdToCheck: string, openedWindow: Window | null) => {
    if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
    }

    const checkStatus = async () => {
        if (!openedWindow) {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setFeedbackMessage({ type: 'error', text: "Referensi jendela pembayaran hilang."});
            setIsProcessing(false);
            return;
        }

        if (!apiUrl) {
            console.error("API URL not configured for polling.");
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setFeedbackMessage({ type: 'error', text: "Konfigurasi API bermasalah untuk memeriksa status."});
            setIsProcessing(false);
            return;
        }

        if (openedWindow.closed) {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            // Only set error if no success/definitive failure message is already shown
            if (!feedbackMessage || !['SUCCESS', 'EXPIRED', 'FAILED', 'CANCELLED'].some(s => (feedbackMessage.text).toLowerCase().includes(s.toLowerCase()))) {
                setFeedbackMessage({ type: 'info', text: "Jendela pembayaran ditutup. Status transaksi mungkin belum final atau dibatalkan."});
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

            if (openedWindow.closed) {
                let isSuccessStatus = false;
                 if(response.ok) {
                    try {
                        const tempData = await response.clone().json();
                        if (tempData.transaction && tempData.transaction.status === 'SUCCESS') {
                            isSuccessStatus = true;
                        }
                    } catch (e) { /* ignore clone/json parse error here */ }
                 }

                if (!isSuccessStatus) {
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    if (!feedbackMessage || !['SUCCESS', 'EXPIRED', 'FAILED', 'CANCELLED'].some(s => (feedbackMessage.text).toLowerCase().includes(s.toLowerCase()))) {
                        setFeedbackMessage({ type: 'error', text: "Jendela pembayaran ditutup sebelum transaksi selesai atau saat terjadi masalah."});
                    }
                    setIsProcessing(false);
                    return;
                }
            }

            if (!response.ok) {
                const errorResponseText = await response.text();
                let detailedErrorMessage = `Gagal memeriksa status pembayaran (HTTP ${response.status}).`;
                try {
                    const errorJson = JSON.parse(errorResponseText);
                    const serverMsg = errorJson.message || errorJson.error;
                    if (serverMsg) {
                        detailedErrorMessage += ` Pesan: ${serverMsg}`;
                    } else if (errorResponseText.trim() !== '{}' && errorResponseText.trim() !== '') {
                        detailedErrorMessage += ` Respon server: ${errorResponseText.substring(0, 150)}`;
                    }
                } catch (e) {
                    if (errorResponseText.trim() !== '') {
                       detailedErrorMessage += ` Respon server (non-JSON): ${errorResponseText.substring(0, 150)}`;
                    }
                }
                
                if (!openedWindow.closed) { 
                    console.warn(`HTTP ${response.status} error during /check-transaction, DOKU window open. Error: ${detailedErrorMessage}. Polling continues.`);
                } else { 
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                     if (!feedbackMessage || !['SUCCESS', 'EXPIRED', 'FAILED', 'CANCELLED'].some(s => (feedbackMessage.text).toLowerCase().includes(s.toLowerCase()))) {
                        setFeedbackMessage({ type: 'error', text: detailedErrorMessage});
                    }
                    setIsProcessing(false);
                }
                return;
            }
            
            const data = await response.json();

            if (!data.transaction || !data.transaction.status) {
                console.warn("Format respons /check-transaction tidak valid. 'transaction.status' tidak ditemukan. Respons:", data);
                if (!openedWindow.closed) {
                    // Keep polling if window is open and format is unknown
                } else {
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    setFeedbackMessage({ type: 'error', text: "Format respons status transaksi tidak dikenal."});
                    setIsProcessing(false);
                }
                return;
            }

            const transactionStatus = data.transaction.status;

            if (transactionStatus === 'SUCCESS') { 
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                if (openedWindow && !openedWindow.closed) openedWindow.close();
                setFeedbackMessage({ type: 'success', text: `Pembayaran berhasil! ID Transaksi: ${data.transaction.original_request_id || refIdToCheck}. Anda akan diarahkan...`});
                setIsProcessing(false);
                setShowSuccessRedirectMessage(true);
                setTimeout(() => {
                  router.push('/success');
                }, 4000);
            } else if (['EXPIRED', 'FAILED', 'CANCELLED'].includes(transactionStatus)) { 
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                if (openedWindow && !openedWindow.closed) openedWindow.close();
                setFeedbackMessage({ type: 'error', text: `Pembayaran ${transactionStatus.toLowerCase()}. ID Transaksi: ${data.transaction.original_request_id || refIdToCheck}. Silakan coba lagi atau hubungi dukungan.`});
                setIsProcessing(false);
            } else if (transactionStatus === 'PENDING') {
                console.log('Payment pending, continuing to poll...');
            } else { 
                console.warn("Unknown transaction status from API:", transactionStatus, " - Full Response:", data);
                 if (openedWindow && openedWindow.closed) {
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    setFeedbackMessage({ type: 'info', text: "Status transaksi tidak diketahui dan jendela pembayaran telah ditutup."});
                    setIsProcessing(false);
                 }
            }
        } catch (error: any) { 
            console.error("Error during polling (checkStatus catch block):", error);
            
            if (openedWindow && openedWindow.closed) {
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                if (!feedbackMessage || !['SUCCESS', 'EXPIRED', 'FAILED', 'CANCELLED'].some(s => (feedbackMessage.text).toLowerCase().includes(s.toLowerCase()))) {
                    setFeedbackMessage({ type: 'error', text: "Jendela pembayaran ditutup atau terjadi masalah jaringan saat pemeriksaan status."});
                }
                setIsProcessing(false);
            } else if (!navigator.onLine) {
                 if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                 setFeedbackMessage({ type: 'error', text: "Tidak ada koneksi internet. Periksa jaringan Anda."});
                 setIsProcessing(false);
            } else {
              console.warn(`Network or other technical issue during polling, DOKU window open. Error: ${error.message || 'Error tidak diketahui'}. Polling continues.`);
            }
        }
    };

    pollingIntervalRef.current = setInterval(checkStatus, 3000);
    setTimeout(checkStatus, 1000); // Initial check sooner
  }, [apiUrl, router, setIsProcessing, setFeedbackMessage, feedbackMessage]);


  const handleConfirmPurchase = async () => {
    if (!selectedGame || !selectedPackage || !accountDetails || !apiUrl) {
      setFeedbackMessage({ type: 'error', text: "Informasi pembelian tidak lengkap atau URL API tidak tersedia."});
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    setFeedbackMessage(null);
    setShowSuccessRedirectMessage(false);

    const primaryAccountIdField = selectedGame.accountIdFields[0]?.name;
    const idGameValue = primaryAccountIdField ? accountDetails[primaryAccountIdField] : undefined;

    if (!idGameValue) {
      setFeedbackMessage({ type: 'error', text: "Detail ID Game utama tidak ditemukan dalam data akun."});
      setIsProcessing(false);
      return;
    }
    
    if (selectedPackage.originalId === undefined) { 
      setFeedbackMessage({ type: 'error', text: "ID Layanan (originalId) tidak ditemukan untuk paket yang dipilih."});
      setIsProcessing(false);
      return;
    }
    
    if (!accountDetails.username) {
      setFeedbackMessage({ type: 'error', text: "Nickname tidak ditemukan. Pastikan akun sudah dicek."});
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
        setFeedbackMessage({ type: 'error', text: result.error || result.message || `Gagal memproses pesanan (Error: ${response.status})`});
        setIsProcessing(false);
        return;
      }

      if (result.error || (result.message && response.status !== 200 && response.status !== 201 && !result.payment_url)) {
        setFeedbackMessage({ type: 'error', text: result.error || result.message });
        setIsProcessing(false);
      } else if (result.payment_url && result.ref_id) {
        const { payment_url, ref_id } = result;
        
        if (paymentWindowRef.current && !paymentWindowRef.current.closed) {
            setFeedbackMessage({ type: 'info', text: "Jendela pembayaran sebelumnya masih terbuka. Harap selesaikan atau tutup terlebih dahulu."});
            setIsProcessing(false); 
            return;
        }
        
        const newWindowWidth = 800;
        const newWindowHeight = 700;
        const newWindow: Window | null = window.open(payment_url, "_blank", `width=${newWindowWidth},height=${newWindowHeight},scrollbars=yes,resizable=yes,left=${(screen.width - newWindowWidth) / 2},top=${(screen.height - newWindowHeight) / 2}`);
        
        if (newWindow) {
          paymentWindowRef.current = newWindow;
          newWindow.focus(); 
          startPolling(ref_id, newWindow);
        } else {
          setFeedbackMessage({ type: 'error', text: "Gagal membuka jendela pembayaran. Pastikan popup tidak diblokir dan coba lagi."});
          setIsProcessing(false);
        }
      } else {
        setFeedbackMessage({ type: 'error', text: "Format respons tidak dikenal dari server setelah memproses pesanan."});
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error saat memproses pesanan:", error);
      setFeedbackMessage({ type: 'error', text: "Tidak dapat terhubung ke server untuk memproses pesanan. Coba lagi nanti."});
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
        <Button variant="outline" onClick={() => { if (!isProcessing && !showSuccessRedirectMessage) router.back(); }} size="sm" className="text-xs sm:text-sm" disabled={isProcessing || showSuccessRedirectMessage}>
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

      {feedbackMessage && (
        <div 
          className={`p-3 border rounded-md text-center text-sm
            ${feedbackMessage.type === 'success' ? 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-400' : ''}
            ${feedbackMessage.type === 'error' ? 'bg-destructive/20 border-destructive text-destructive' : ''}
            ${feedbackMessage.type === 'info' ? 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-400' : ''}
          `}
        >
          {feedbackMessage.type === 'success' && <PartyPopper className="inline-block mr-2 h-4 w-4" />}
          {feedbackMessage.type === 'error' && <Info className="inline-block mr-2 h-4 w-4" />}
          {feedbackMessage.type === 'info' && <Info className="inline-block mr-2 h-4 w-4" />}
          {feedbackMessage.text}
        </div>
      )}

      <Button 
        onClick={handleConfirmPurchase} 
        disabled={isProcessing || showSuccessRedirectMessage}
        size="lg"
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            Menunggu Pembayaran...
          </>
        ) : showSuccessRedirectMessage ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Pembayaran Sukses, Mengarahkan...
          </>
        )
        : (
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
    

    