
"use client";

import { usePurchase } from '@/app/(store)/PurchaseContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Gem, ArrowLeft, Info, PartyPopper } from 'lucide-react';
import Image from 'next/image';
import { cn } from "@/lib/utils";

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
  const [showSuccessRedirectMessage, setShowSuccessRedirectMessage] = useState(false); // Kept for button state logic

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const paymentWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    // Initial check for context data
    if (!selectedGame || !selectedPackage || !accountDetails) {
      // Context might be lost if navigating directly or after a reset
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (paymentWindowRef.current && !paymentWindowRef.current.closed) {
        paymentWindowRef.current.close();
        paymentWindowRef.current = null;
      }
    };
  }, []); // Removed dependencies to avoid re-triggering on context changes after initial setup

  const startPolling = useCallback((refIdToCheck: string, openedWindow: Window | null) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    const checkStatus = async () => {
      if (!openedWindow) {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        // Only set error if not already showing success/final error
        if (!feedbackMessage || (feedbackMessage.type !== 'success' && !feedbackMessage.text.toLowerCase().includes('berhasil'))) {
          setFeedbackMessage({ type: 'error', text: "Jendela pembayaran tidak ditemukan atau sudah ditutup." });
        }
        setIsProcessing(false);
        return;
      }

      if (!apiUrl) {
        console.error("API URL not configured for polling.");
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        if (!feedbackMessage || feedbackMessage.type !== 'success') {
          setFeedbackMessage({ type: 'error', text: "Konfigurasi API untuk pemeriksaan status bermasalah." });
        }
        setIsProcessing(false);
        return;
      }

      if (openedWindow.closed) {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        const isFinalStatusProcessed = feedbackMessage && (feedbackMessage.text.toLowerCase().includes('berhasil') || feedbackMessage.text.toLowerCase().includes('kedaluwarsa') || feedbackMessage.text.toLowerCase().includes('gagal') || feedbackMessage.text.toLowerCase().includes('dibatalkan'));
        if (!isFinalStatusProcessed) {
          setFeedbackMessage({ type: 'info', text: "Jendela pembayaran ditutup. Status transaksi mungkin belum final atau dibatalkan oleh Anda." });
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
                  const tempData = await response.clone().json(); // clone to read multiple times
                  if (tempData.transaction && tempData.transaction.status === 'SUCCESS') {
                      isSuccessStatus = true;
                  }
              } catch (e) { /* ignore parsing error if not json */ }
          }

          if (!isSuccessStatus) { // if window closed AND not a success status from a potentially OK response
              if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
              const isFinalStatusProcessed = feedbackMessage && (feedbackMessage.text.toLowerCase().includes('berhasil') || feedbackMessage.text.toLowerCase().includes('kedaluwarsa') || feedbackMessage.text.toLowerCase().includes('gagal') || feedbackMessage.text.toLowerCase().includes('dibatalkan'));
              if (!isFinalStatusProcessed) {
                  setFeedbackMessage({ type: 'error', text: "Jendela pembayaran ditutup sebelum transaksi selesai atau saat terjadi masalah internal." });
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
                  detailedErrorMessage += ` Respon server: ${errorResponseText.substring(0,150)}`;
              }
          } catch (e) {
              if (errorResponseText.trim() !== '') {
                 detailedErrorMessage += ` Respon server (non-JSON): ${errorResponseText.substring(0,150)}`;
              }
          }
          console.warn(`HTTP ${response.status} error from /check-transaction. Response: ${detailedErrorMessage}. Window open: ${!openedWindow.closed}. Polling continues if window open.`);
          // Don't set feedback message or stop processing if window is still open, to allow user interaction or DOKU to initialize
          if (openedWindow.closed) {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            const isFinalStatusProcessed = feedbackMessage && (feedbackMessage.text.toLowerCase().includes('berhasil') || feedbackMessage.text.toLowerCase().includes('kedaluwarsa') || feedbackMessage.text.toLowerCase().includes('gagal') || feedbackMessage.text.toLowerCase().includes('dibatalkan'));
            if (!isFinalStatusProcessed) {
              setFeedbackMessage({ type: 'error', text: detailedErrorMessage});
            }
            setIsProcessing(false);
          }
          return;
        }

        const data = await response.json();

        if (!data.transaction || !data.transaction.status) {
          console.warn("Format respons /check-transaction tidak valid. 'transaction.status' tidak ditemukan. Respons:", data);
          if (openedWindow.closed) {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setFeedbackMessage({ type: 'error', text: "Format respons status transaksi tidak dikenal."});
            setIsProcessing(false);
          }
          // Continue polling if window is open and format is weird
          return;
        }

        const transactionStatus = data.transaction.status;
        const originalReqId = data.transaction.original_request_id || refIdToCheck;

        if (transactionStatus === 'SUCCESS') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          if (openedWindow && !openedWindow.closed) openedWindow.close();
          setFeedbackMessage({ type: 'success', text: `Asiiik, pembayaran berhasil! ID Transaksi: ${originalReqId}. Item akan segera dikirim ke akunmu.` });
          setShowSuccessRedirectMessage(true); // Used to change button state
          setIsProcessing(false);
          // resetPurchase(); // Consider when to reset, maybe on navigating away or new purchase
        } else if (['EXPIRED', 'FAILED', 'CANCELLED'].includes(transactionStatus)) {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          if (openedWindow && !openedWindow.closed) openedWindow.close();
          let statusText = transactionStatus.toLowerCase();
          if (statusText === 'failed') statusText = 'gagal';
          if (statusText === 'expired') statusText = 'kedaluwarsa';
          if (statusText === 'cancelled') statusText = 'dibatalkan';
          setFeedbackMessage({ type: 'error', text: `Yah, pembayaran kamu ${statusText}. ID Transaksi: ${originalReqId}. Mau coba lagi atau kontak support aja?` });
          setIsProcessing(false);
        } else if (transactionStatus === 'PENDING') {
          console.log('Payment pending, continuing to poll...');
          // Feedback already shown by isProcessing && !feedbackMessage state
        } else {
          console.warn("Unknown transaction status from API:", transactionStatus, " - Full Response:", data);
          if (openedWindow.closed) {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setFeedbackMessage({ type: 'info', text: "Status transaksi tidak diketahui dan jendela pembayaran telah ditutup."});
            setIsProcessing(false);
          }
          // Continue polling if window open and unknown status
        }
      } catch (error: any) {
        console.error("Error during polling (checkStatus catch block):", error);
        if (openedWindow && openedWindow.closed) {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          const isFinalStatusProcessed = feedbackMessage && (feedbackMessage.text.toLowerCase().includes('berhasil') || feedbackMessage.text.toLowerCase().includes('kedaluwarsa') || feedbackMessage.text.toLowerCase().includes('gagal') || feedbackMessage.text.toLowerCase().includes('dibatalkan'));
            if (!isFinalStatusProcessed) {
              setFeedbackMessage({ type: 'error', text: "Jendela pembayaran ditutup atau terjadi masalah jaringan saat pemeriksaan status." });
            }
          setIsProcessing(false);
        } else if (!navigator.onLine) {
           if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
           setFeedbackMessage({ type: 'error', text: "Waduh, koneksi internetnya putus. Cek jaringanmu dulu ya."});
           setIsProcessing(false);
        } else {
          console.warn(`Network or other technical issue during polling, DOKU window open. Error: ${error.message || 'Error tidak diketahui'}. Polling continues.`);
          // Don't stop polling or set error if DOKU window is still open and it's a network hiccup
        }
      }
    };

    pollingIntervalRef.current = setInterval(checkStatus, 3000);
    // Initial check slightly delayed to allow DOKU window to fully load and transaction to potentially register
    setTimeout(checkStatus, 1500); 

  }, [apiUrl, router, feedbackMessage, resetPurchase]); // Added feedbackMessage to dependencies to manage re-renders carefully

  const handleConfirmPurchase = async () => {
    if (!selectedGame || !selectedPackage || !accountDetails || !apiUrl) {
      setFeedbackMessage({ type: 'error', text: "Waduh, info pembeliannya kurang lengkap atau API-nya lagi ngambek nih." });
      return;
    }

    setIsProcessing(true);
    setFeedbackMessage(null); // Clear previous feedback
    setShowSuccessRedirectMessage(false);

    const primaryAccountIdField = selectedGame.accountIdFields[0]?.name;
    const idGameValue = primaryAccountIdField ? accountDetails[primaryAccountIdField] : undefined;

    if (!idGameValue) {
      setFeedbackMessage({ type: 'error', text: "ID Game utama kamu nggak ketemu nih di data akun." });
      setIsProcessing(false);
      return;
    }
    if (selectedPackage.originalId === undefined) {
      setFeedbackMessage({ type: 'error', text: "ID Layanan (originalId) buat paket ini kok nggak ada ya." });
      setIsProcessing(false);
      return;
    }
    if (!accountDetails.username) {
      setFeedbackMessage({ type: 'error', text: "Nickname kamu belum ada. Dicek dulu gih akunnya." });
      setIsProcessing(false);
      return;
    }

    const payload: { idGame: string; idService: number; nickname: string; idZone?: string; } = {
      idGame: String(idGameValue),
      idService: selectedPackage.originalId,
      nickname: accountDetails.username,
    };

    let identifiedZoneValue: string | undefined = undefined;
    const mainIdFieldNameFromGameConfig = selectedGame.accountIdFields[0]?.name;
    if (accountDetails) {
      for (const fieldInConfig of selectedGame.accountIdFields) {
        if (mainIdFieldNameFromGameConfig && fieldInConfig.name === mainIdFieldNameFromGameConfig) continue;
        if (fieldInConfig.name.toLowerCase() === 'username') continue;
        const fieldNameFromConfigLower = fieldInConfig.name.toLowerCase();
        const fieldLabelFromConfigLower = fieldInConfig.label.toLowerCase();
        if (fieldNameFromConfigLower.includes('zone') || fieldNameFromConfigLower.includes('server') || fieldLabelFromConfigLower.includes('zone') || fieldLabelFromConfigLower.includes('server')) {
          const valueFromAccountDetails = accountDetails[fieldInConfig.name];
          if (valueFromAccountDetails && String(valueFromAccountDetails).trim() !== "") {
            identifiedZoneValue = String(valueFromAccountDetails);
            break;
          }
        }
      }
    }
    if (identifiedZoneValue) payload.idZone = identifiedZoneValue;

    try {
      const response = await fetch(`${apiUrl}/process-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        setFeedbackMessage({ type: 'error', text: result.error || result.message || `Gagal proses pesanan (Error: ${response.status})` });
        setIsProcessing(false);
        return;
      }

      if (result.error || (result.message && response.status !== 200 && response.status !== 201 && !result.payment_url)) {
        setFeedbackMessage({ type: 'error', text: result.error || result.message });
        setIsProcessing(false);
      } else if (result.payment_url && result.ref_id) {
        const { payment_url, ref_id } = result;
        if (paymentWindowRef.current && !paymentWindowRef.current.closed) {
          setFeedbackMessage({ type: 'info', text: "Jendela pembayaran sebelumnya masih terbuka. Silakan selesaikan atau tutup terlebih dahulu." });
          // Don't set isProcessing to false here, as the old process might still be active
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
          setFeedbackMessage({ type: 'error', text: "Gagal membuka jendela pembayaran. Cek pengaturan popup blocker Anda, lalu coba lagi." });
          setIsProcessing(false);
        }
      } else {
        setFeedbackMessage({ type: 'error', text: "Respons tidak valid dari server setelah memproses pesanan." });
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error saat memproses pesanan:", error);
      setFeedbackMessage({ type: 'error', text: "Tidak dapat terhubung ke server untuk memproses pesanan. Silakan coba lagi nanti." });
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
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-destructive mb-2">Waduh, Infonya Nggak Lengkap</h1>
        <p className="text-muted-foreground mb-6 text-xs sm:text-sm md:text-base">
          Detail pembelianmu nggak ketemu nih. Coba mulai dari awal lagi ya.
        </p>
        <Button onClick={() => router.push('/')} variant="outline" size="sm" className="text-xs sm:text-sm">
          Balik ke Beranda
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 p-2">
      <div className="mb-4">
        <Button variant="outline" onClick={() => { if (!isProcessing) router.back(); }} size="sm" className="text-xs sm:text-sm" disabled={isProcessing && !feedbackMessage}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
      </div>
      <div className="text-center">
        <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-primary mx-auto mb-3 sm:mb-4" />
        <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1 sm:mb-2">Konfirmasi Pembelian Kamu</h1>
        <p className="text-xs sm:text-base md:text-lg text-muted-foreground">
          Cek lagi detail pesananmu di bawah ini sebelum bayar ya.
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
            <h3 className="text-xs sm:text-base md:text-lg font-semibold text-primary mb-1">Paket Pilihan:</h3>
            <div className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 bg-muted/30 rounded-md">
              {selectedPackage.imageUrl ? (
                <Image src={selectedPackage.imageUrl} alt={selectedPackage.name} width={32} height={32} className="h-8 w-8 md:h-10 md:w-10 rounded-sm object-contain" data-ai-hint="package icon" />
              ) : selectedPackage.iconName === "Gem" ? (
                <Gem className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-accent mt-1" />
              ) : <div className="w-5 h-5 sm:w-7 sm:w-7 md:w-8 md:h-8"></div>}
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

      {/* Enhanced Feedback Section */}
      {isProcessing && !feedbackMessage && (
        <Card className="my-6 border-blue-500 bg-blue-500/10 shadow-lg">
          <CardHeader className="flex flex-row items-center space-x-3 p-4 sm:p-6">
            <Loader2 className="h-8 w-8 sm:h-10 sm:h-10 text-blue-500 animate-spin" />
            <CardTitle className="text-lg sm:text-xl md:text-2xl text-blue-700 dark:text-blue-400">
              Sedang Memproses...
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <p className="text-sm sm:text-base text-blue-600 dark:text-blue-300">
              Sabar ya, status pembayaranmu lagi dicek nih. Mohon jangan refresh atau tutup halaman ini. Jendela pembayaran akan muncul atau status akan diperbarui.
            </p>
          </CardContent>
        </Card>
      )}

      {feedbackMessage && (
        <Card className={cn(
          "my-6 shadow-lg",
          feedbackMessage.type === 'success' && "border-green-500 bg-green-500/10",
          feedbackMessage.type === 'error' && "border-destructive bg-destructive/10",
          feedbackMessage.type === 'info' && "border-sky-500 bg-sky-500/10"
        )}>
          <CardHeader className="flex flex-row items-center space-x-3 p-4 sm:p-6">
            {feedbackMessage.type === 'success' && <PartyPopper className="h-8 w-8 sm:h-10 sm:h-10 text-green-500" />}
            {feedbackMessage.type === 'error' && <AlertTriangle className="h-8 w-8 sm:h-10 sm:h-10 text-destructive" />}
            {feedbackMessage.type === 'info' && <Info className="h-8 w-8 sm:h-10 sm:h-10 text-sky-500" />}
            <CardTitle className={cn(
              "text-lg sm:text-xl md:text-2xl",
              feedbackMessage.type === 'success' && "text-green-700 dark:text-green-400",
              feedbackMessage.type === 'error' && "text-destructive",
              feedbackMessage.type === 'info' && "text-sky-700 dark:text-sky-400"
            )}>
              {feedbackMessage.type === 'success' ? "Pembayaran Berhasil!" : feedbackMessage.type === 'error' ? "Waduh, Ada Masalah Nih!" : "Informasi Penting"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <p className={cn(
              "text-sm sm:text-base",
              feedbackMessage.type === 'success' && "text-green-600 dark:text-green-300",
              feedbackMessage.type === 'error' && "text-destructive/90",
              feedbackMessage.type === 'info' && "text-sky-600 dark:text-sky-300"
            )}>
              {feedbackMessage.text}
            </p>
            {feedbackMessage.type === 'success' && (
                 <Button onClick={() => router.push('/success')} className="mt-4 w-full sm:w-auto" size="sm">
                    Lihat Detail Pesanan
                </Button>
            )}
            {feedbackMessage.type === 'error' && (
                 <Button onClick={() => {setIsProcessing(false); setFeedbackMessage(null);}} variant="outline" className="mt-4 w-full sm:w-auto" size="sm">
                    Coba Lagi
                </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Button
        onClick={handleConfirmPurchase}
        disabled={isProcessing || showSuccessRedirectMessage}
        size="lg"
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base"
      >
        {isProcessing && !feedbackMessage ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            Menunggu Pembayaran...
          </>
        ) : showSuccessRedirectMessage ? ( // This state means success feedback is shown
          <>
            <CheckCircle2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Pembayaran Berhasil!
          </>
        ) : feedbackMessage && feedbackMessage.type === 'error' ? (
          <>
            <AlertTriangle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Pembayaran Gagal, Coba Lagi?
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

    