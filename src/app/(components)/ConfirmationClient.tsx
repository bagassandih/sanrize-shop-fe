
"use client";

import { usePurchase } from '@/app/(store)/PurchaseContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Gem, RefreshCw, ShieldCheck, ArrowLeft, ShoppingCart, Loader2, Home } from 'lucide-react';
import Image from 'next/image';
import { formatPriceIDR } from '@/lib/utils';
import ProcessingStateCard from './ProcessingStateCard';
import FeedbackStateCard, { type FeedbackMessage } from './FeedbackStateCard';

interface ConfirmationClientProps {
  apiUrl?: string;
  xApiToken?: string;
}

declare global {
  interface Window {
    loadJokulCheckout?: (paymentUrl: string) => void;
  }
}

const ConfirmationClient = ({ apiUrl, xApiToken }: ConfirmationClientProps) => {
  const router = useRouter();
  const { selectedGame, selectedPackage, accountDetails, resetPurchase } = usePurchase();
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentRefId = useRef<string | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isProcessing) {
        const message = 'Yakin ingin keluar? Proses topup sedang berlangsung lho.';
        event.preventDefault(); 
        event.returnValue = message; 
        return message; 
      }
    };

    if (isProcessing) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    } else {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      currentRefId.current = null; 
    };
  }, [isProcessing]);


  const startPolling = useCallback((refIdToCheck: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    currentRefId.current = refIdToCheck;

    const checkStatus = async () => {
      if (!currentRefId.current) {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        return;
      }
      if (!apiUrl) {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        if (!feedbackMessage || feedbackMessage.type !== 'success') {
          setFeedbackMessage({ type: 'error', text: "Konfigurasi API untuk pemeriksaan status bermasalah." });
        }
        setIsProcessing(false);
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/check-transaction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Token': xApiToken || '',
          },
          body: JSON.stringify({ refId: currentRefId.current }),
        });

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

          if (!navigator.onLine) {
             if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
             currentRefId.current = null;
             if (!feedbackMessage || feedbackMessage.type !== 'success') {
               setFeedbackMessage({ type: 'error', text: "Waduh, koneksi internetnya putus. Cek jaringanmu dulu ya."});
             }
             setIsProcessing(false);
          }
          return;
        }

        const data = await response.json();

        if (!data.transaction || typeof data.transaction.status === 'undefined') {
          return;
        }

        const transactionStatus = String(data.transaction.status).toUpperCase();
        const originalReqId = currentRefId.current || data.transaction.original_request_id;

        if (transactionStatus === 'SUCCESS') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          currentRefId.current = null;
          setFeedbackMessage({ type: 'success', text: `Asiiik, pembayaran berhasil! Item akan segera dikirim ke akunmu.`, transactionId: originalReqId });
          setIsProcessing(false);
        } else if (['EXPIRED', 'FAILED', 'CANCELLED'].includes(transactionStatus)) {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          currentRefId.current = null;
          let statusText = transactionStatus.toLowerCase();
          if (statusText === 'failed') statusText = 'gagal';
          if (statusText === 'expired') statusText = 'kedaluwarsa';
          if (statusText === 'cancelled') statusText = 'dibatalkan';
          setFeedbackMessage({ type: 'error', text: `Yah, pembayaran kamu ${statusText}.`, transactionId: originalReqId });
          setIsProcessing(false);
        } else if (transactionStatus === 'PENDING') {
          // Keep polling
        } else {
          // Keep polling for unknown status
        }
      } catch (error: any) {
        if (!navigator.onLine) {
           if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
           currentRefId.current = null;
           if (!feedbackMessage || feedbackMessage.type !== 'success') {
             setFeedbackMessage({ type: 'error', text: "Waduh, koneksi internetnya putus. Cek jaringanmu dulu ya."});
           }
           setIsProcessing(false);
        }
      }
    };
    setTimeout(() => {
      checkStatus(); // Initial check
      pollingIntervalRef.current = setInterval(checkStatus, 30000); // Subsequent checks
    }, 15000); // Delay initial check slightly
  }, [apiUrl, xApiToken, feedbackMessage, setFeedbackMessage, setIsProcessing]);


  const handleConfirmPurchase = async () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    currentRefId.current = null;

    if (!selectedGame || !selectedPackage || !accountDetails || !apiUrl) {
      setFeedbackMessage({ type: 'error', text: "Waduh, info pembeliannya kurang lengkap atau API-nya lagi ngambek nih." });
      return;
    }

    setIsProcessing(true);
    setFeedbackMessage(null);

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

        if (fieldNameFromConfigLower.includes('zone') || fieldNameFromConfigLower.includes('server') ||
            fieldLabelFromConfigLower.includes('zone') || fieldLabelFromConfigLower.includes('server')) {

          const valueFromAccountDetails = accountDetails[fieldInConfig.name];
          if (valueFromAccountDetails && String(valueFromAccountDetails).trim() !== "") {
            identifiedZoneValue = String(valueFromAccountDetails);
            break;
          }
        }
      }
    }

    if (identifiedZoneValue) {
      payload.idZone = identifiedZoneValue;
    }

    try {
      const response = await fetch(`${apiUrl}/process-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Token': xApiToken || '',
        },
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
        if (typeof window.loadJokulCheckout === 'function') {
          window.loadJokulCheckout(payment_url);
          startPolling(ref_id);
        } else {
          setFeedbackMessage({ type: 'error', text: "Gagal memuat popup pembayaran. Fungsi tidak ditemukan." });
          setIsProcessing(false);
        }
      } else {
        setFeedbackMessage({ type: 'error', text: "Respons tidak valid dari server setelah memproses pesanan." });
        setIsProcessing(false);
      }
    } catch (error) {
      setFeedbackMessage({ type: 'error', text: "Tidak dapat terhubung ke server untuk memproses pesanan. Silakan coba lagi nanti." });
      setIsProcessing(false);
    }
  };

  const handleRetryPayment = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    currentRefId.current = null;
    setFeedbackMessage(null); 
    setIsProcessing(false); 
    setTimeout(() => {
        handleConfirmPurchase();
    }, 0);
  };

  const handleGoBack = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = null;
    currentRefId.current = null;
    setFeedbackMessage(null);
    setIsProcessing(false);
    router.back();
  };

  const handleShopAgain = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    currentRefId.current = null;
    setFeedbackMessage(null);
    setIsProcessing(false);
    
    resetPurchase(); // Clear application state first

    if (selectedGame && typeof window !== 'undefined') {
      window.location.href = `/games/${selectedGame.slug}`;
    } else if (typeof window !== 'undefined') {
      window.location.href = '/'; 
    }
  };

  const handleGoToHome = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    currentRefId.current = null;
    setFeedbackMessage(null);
    setIsProcessing(false);

    resetPurchase(); // Clear application state first
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
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

      {!feedbackMessage && !isProcessing && (
        <>
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
                      const fieldConfig = selectedGame.accountIdFields.find(f => f.name === key);
                      fieldLabel = fieldConfig?.label || key.charAt(0).toUpperCase() + key.slice(1);
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
           <Button
              onClick={handleConfirmPurchase}
              disabled={isProcessing}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base mt-6"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              )}
              {isProcessing ? "Memproses..." : "Konfirmasi & Bayar"}
            </Button>
        </>
      )}

      {isProcessing && !feedbackMessage && (
         <ProcessingStateCard />
      )}

      {feedbackMessage && selectedGame && selectedPackage && accountDetails && (
         <FeedbackStateCard
            feedbackMessage={feedbackMessage}
            selectedGame={selectedGame}
            selectedPackage={selectedPackage}
            accountDetails={accountDetails}
            onRetryPayment={handleRetryPayment}
            onGoBack={handleGoBack}
            onShopAgain={handleShopAgain}
            onGoToHome={handleGoToHome}
          />
      )}
    </div>
  );
};

export default ConfirmationClient;
