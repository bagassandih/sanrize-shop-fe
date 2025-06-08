
"use client";

import { usePurchase } from '@/app/(store)/PurchaseContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Gem, RefreshCw, ShieldCheck, ArrowLeft, ShoppingCart, Loader2, Home } from 'lucide-react';
import Image from 'next/image';
import { formatPriceIDR } from '@/lib/utils';
import FeedbackStateCard, { type FeedbackMessage } from './FeedbackStateCard';
import type { Order, OrderItemStatusName } from '@/lib/data'; // Assuming Order types will be in data.ts

interface ConfirmationClientProps {
  apiUrl?: string;
  xApiToken?: string;
}

declare global {
  interface Window {
    loadJokulCheckout?: (paymentUrl: string) => void;
  }
}

const SESSION_ACTIVE_REF_ID_KEY = 'sanrize_active_ref_id';
const SESSION_PAYMENT_IN_PROGRESS_KEY = 'sanrize_payment_in_progress';

const ConfirmationClient = ({ apiUrl, xApiToken }: ConfirmationClientProps) => {
  const router = useRouter();
  const { selectedGame, selectedPackage, accountDetails, resetPurchase } = usePurchase();
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentRefId = useRef<string | null>(null);

  const clearPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const startOrderPolling = useCallback(async (refIdToCheck: string) => {
    clearPolling();
    currentRefId.current = refIdToCheck; // Ensure currentRefId is set for the polling logic

    const checkOrderStatus = async (isInitialCheck = false) => {
      if (!currentRefId.current || !apiUrl) {
        clearPolling();
        if (!feedbackMessage || (feedbackMessage.type !== 'success' && feedbackMessage.type !== 'error')) {
          setFeedbackMessage({ type: 'error', text: "Konfigurasi API bermasalah atau Ref ID hilang untuk polling.", transactionId: currentRefId.current ?? undefined });
        }
        setIsProcessing(false);
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Token': xApiToken || '',
          },
          body: JSON.stringify({ refId: currentRefId.current }),
        });

        if (!response.ok) {
          const errorResponseText = await response.text();
          let detailedErrorMessage = `Gagal mengambil status pesanan (HTTP ${response.status}).`;
          if (errorResponseText) {
            try {
                const errorJson = JSON.parse(errorResponseText);
                detailedErrorMessage += ` Pesan: ${errorJson.message || errorJson.error || 'Tidak ada detail tambahan.'}`;
            } catch (e) {
                detailedErrorMessage += ` Respon: ${errorResponseText.substring(0,100)}`;
            }
          }

          if (!navigator.onLine) {
             clearPolling();
             if (!feedbackMessage || feedbackMessage.type !== 'success') {
               setFeedbackMessage({ type: 'error', text: "Waduh, koneksi internetnya putus. Cek jaringanmu dulu ya.", transactionId: currentRefId.current ?? undefined});
             }
          } else {
            if (!feedbackMessage || (feedbackMessage.type !== 'success' && feedbackMessage.type !== 'error')) {
                setFeedbackMessage({ type: 'error', text: detailedErrorMessage, transactionId: currentRefId.current ?? undefined });
            }
          }
          clearPolling();
          setIsProcessing(false);
          return;
        }

        const orders: Order[] = await response.json();
        const currentOrder = orders.find(order => order.ref_id === currentRefId.current);

        if (!currentOrder || !currentOrder.id_status || !currentOrder.id_status.name) {
          if (isInitialCheck && (!feedbackMessage || feedbackMessage.type === 'info')) {
             setFeedbackMessage({ type: 'info', text: "Memeriksa status pembayaran...", transactionId: currentRefId.current });
          }
          // If order not found but no critical error, keep polling as it might be propagating
          return;
        }

        const statusName = String(currentOrder.id_status.name).toUpperCase() as OrderItemStatusName;
        const orderOriginalRefId = currentOrder.ref_id || currentRefId.current;

        if (statusName.includes('SUCCESS')) {
          clearPolling();
          setFeedbackMessage({ type: 'success', text: `Asiiik, pembayaran berhasil! Item akan segera dikirim ke akunmu. (${currentOrder.id_status.name})`, transactionId: orderOriginalRefId });
          setIsProcessing(false);
        } else if (statusName.includes('FAILED') || statusName.includes('EXPIRED') || statusName.includes('CANCELLED') || statusName.includes('FAILURE')) {
          clearPolling();
          let statusText = currentOrder.id_status.name || "bermasalah";
          setFeedbackMessage({ type: 'error', text: `Yah, pembayaran kamu ${statusText}.`, transactionId: orderOriginalRefId });
          setIsProcessing(false);
        } else if (statusName.includes('PENDING') || statusName.includes('PROCESS')) {
          setFeedbackMessage({ type: 'info', text: `Status: ${currentOrder.id_status.name}. Menunggu konfirmasi...`, transactionId: orderOriginalRefId });
          if (!pollingIntervalRef.current && !isInitialCheck) { // Ensure interval is running if still pending
             pollingIntervalRef.current = setInterval(() => checkOrderStatus(false), 30000);
          }
        } else { // Unknown or other statuses
          setFeedbackMessage({ type: 'info', text: `Status: ${currentOrder.id_status.name}. Menunggu update...`, transactionId: orderOriginalRefId });
           if (!pollingIntervalRef.current && !isInitialCheck) {
             pollingIntervalRef.current = setInterval(() => checkOrderStatus(false), 30000);
          }
        }
      } catch (error: any) {
        clearPolling();
        if (!navigator.onLine) {
           if (!feedbackMessage || feedbackMessage.type !== 'success') {
             setFeedbackMessage({ type: 'error', text: "Koneksi internet terputus saat memeriksa status.", transactionId: currentRefId.current ?? undefined});
           }
        } else {
          if (!feedbackMessage || (feedbackMessage.type !== 'success' && feedbackMessage.type !== 'error')) {
             setFeedbackMessage({ type: 'error', text: "Kesalahan saat memeriksa status pembayaran.", transactionId: currentRefId.current ?? undefined });
          }
        }
        setIsProcessing(false);
      }
    };

    await checkOrderStatus(true); // Initial check

    // If still processing (meaning not success/failure yet) and no interval running, set it.
    // isProcessing might be true, feedbackMessage might be 'info'.
    if (isProcessing && !pollingIntervalRef.current && (!feedbackMessage || feedbackMessage.type === 'info')) {
        pollingIntervalRef.current = setInterval(() => checkOrderStatus(false), 30000);
    }
  }, [apiUrl, xApiToken, feedbackMessage, isProcessing]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
        const storedRefId = sessionStorage.getItem(SESSION_ACTIVE_REF_ID_KEY);
        const storedProcessing = sessionStorage.getItem(SESSION_PAYMENT_IN_PROGRESS_KEY);

        if (storedRefId && storedProcessing === 'true' && selectedGame && selectedPackage && accountDetails) {
            console.log('Attempting to recover order polling state for refId:', storedRefId);
            currentRefId.current = storedRefId;
            setIsProcessing(true);
            setFeedbackMessage(null); 
            startOrderPolling(storedRefId);
        }
    }
    // Explicitly return cleanup for this effect if needed, but startOrderPolling handles its own interval.
    // Adding dependencies for startOrderPolling if its definition changes based on them.
  }, [selectedGame, selectedPackage, accountDetails, startOrderPolling]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isProcessing && currentRefId.current) { // Only if payment is truly in progress
        const message = 'Yakin ingin keluar? Proses topup sedang berlangsung lho.';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    if (isProcessing && currentRefId.current) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      sessionStorage.setItem(SESSION_PAYMENT_IN_PROGRESS_KEY, 'true');
      if (currentRefId.current) {
        sessionStorage.setItem(SESSION_ACTIVE_REF_ID_KEY, currentRefId.current);
      }
    } else {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      sessionStorage.removeItem(SESSION_PAYMENT_IN_PROGRESS_KEY);
      sessionStorage.removeItem(SESSION_ACTIVE_REF_ID_KEY);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearPolling(); // Clear polling on unmount
      // currentRefId.current = null; // Cleared by specific actions or on new purchase
    };
  }, [isProcessing]);


  const handleConfirmPurchase = async () => {
    clearPolling();
    currentRefId.current = null;

    if (!selectedGame || !selectedPackage || !accountDetails || !apiUrl) {
      setFeedbackMessage({ type: 'error', text: "Waduh, info pembeliannya kurang lengkap atau API-nya lagi ngambek nih." });
      return;
    }

    setFeedbackMessage(null); // Clear previous feedback
    setIsProcessing(true); // This will set session storage items via useEffect

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
        currentRefId.current = ref_id; // Set ref_id for polling
        sessionStorage.setItem(SESSION_ACTIVE_REF_ID_KEY, ref_id); // Persist for recovery
        sessionStorage.setItem(SESSION_PAYMENT_IN_PROGRESS_KEY, 'true'); // Persist for recovery

        // setIsProcessing is already true
        // Set an initial info message before DOKU modal appears or polling starts
        setFeedbackMessage({ type: 'info', text: "Mengarahkan ke halaman pembayaran...", transactionId: ref_id });


        if (typeof window.loadJokulCheckout === 'function') {
          window.loadJokulCheckout(payment_url);
          // Start polling after DOKU modal is invoked.
          // isProcessing is true, feedbackMessage is 'info'. startOrderPolling will handle from here.
          startOrderPolling(ref_id);
        } else {
          setFeedbackMessage({ type: 'error', text: "Gagal memuat popup pembayaran. Fungsi tidak ditemukan.", transactionId: ref_id });
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
    clearPolling();
    currentRefId.current = null;
    setFeedbackMessage(null);
    setIsProcessing(false);
    setTimeout(() => {
        handleConfirmPurchase();
    }, 0);
  };

  const handleGoBack = () => {
    clearPolling();
    currentRefId.current = null;
    setFeedbackMessage(null);
    setIsProcessing(false);
    router.back(); // No hard reload here
  };

  const handleShopAgain = () => {
    clearPolling();
    currentRefId.current = null;
    setFeedbackMessage(null);
    setIsProcessing(false);
    resetPurchase();
    if (selectedGame && typeof window !== 'undefined') {
      window.location.href = `/games/${selectedGame.slug}`;
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const handleGoToHome = () => {
    clearPolling();
    currentRefId.current = null;
    setFeedbackMessage(null);
    setIsProcessing(false);
    resetPurchase();
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


  // Render logic:
  // 1. Final feedback (success/error)
  if (feedbackMessage && (feedbackMessage.type === 'success' || feedbackMessage.type === 'error')) {
    return (
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
    );
  }

  // 2. Processing payment (polling /order, DOKU modal might have been shown)
  //    OR initial info message set right after /process-order before first poll result
  if ((isProcessing && currentRefId.current) || (feedbackMessage && feedbackMessage.type === 'info')) {
    // If feedbackMessage is null here but (isProcessing && currentRefId.current) is true,
    // it's the brief moment after /process-order but before the first poll updates feedbackMessage.
    // Provide a default 'info' message.
    const displayMessage = feedbackMessage || { type: 'info', text: "Memulai proses pembayaran...", transactionId: currentRefId.current! };
    return (
      <FeedbackStateCard
        feedbackMessage={displayMessage}
        selectedGame={selectedGame}
        selectedPackage={selectedPackage}
        accountDetails={accountDetails}
        onRetryPayment={handleRetryPayment} // Actions might be hidden by FeedbackStateCard for 'info'
        onGoBack={handleGoBack}
        onShopAgain={handleShopAgain}
        onGoToHome={handleGoToHome}
      />
    );
  }

  // 3. Initial confirmation view (before "Konfirmasi & Bayar" is clicked)
  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 p-2">
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
          disabled={isProcessing} // Button disabled when isProcessing is true
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base mt-6"
        >
          {isProcessing ? ( // This check is mostly for the brief moment /process-order is running
            <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          )}
          {isProcessing ? "Memproses..." : "Konfirmasi & Bayar"}
        </Button>
    </div>
  );
};

export default ConfirmationClient;

