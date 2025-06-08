
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
import type { Order, OrderItemStatusCode } from '@/lib/data';

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
  const { selectedGame, selectedPackage, accountDetails, resetPurchase, setSelectedGame, setSelectedPackage, setAccountDetails: setContextAccountDetails } = usePurchase();
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRefId = useRef<string | null>(null);

  const isProcessingRef = useRef(isProcessing);
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  const clearPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log("Polling interval cleared.");
    }
    if (initialCheckTimeoutRef.current) {
      clearTimeout(initialCheckTimeoutRef.current);
      initialCheckTimeoutRef.current = null;
      console.log("Initial check timeout cleared.");
    }
  }, []);

  const checkOrderStatusAndSetupInterval = useCallback(async (refIdForCheck: string, isInitialDelayedCheck: boolean = false) => {
    if (!currentRefId.current || currentRefId.current !== refIdForCheck) {
        console.log(`Ref ID for polling (${refIdForCheck}) does not match current transaction ref ID (${currentRefId.current}). Aborting check for ${refIdForCheck}.`);
        // This specific check instance is aborted. If a polling interval was set for refIdForCheck,
        // it might continue if not cleared by a new polling initiation for currentRefId.current.
        // clearPolling() here might be too aggressive if another process *just* started polling for currentRefId.current.
        // The new poller for currentRefId.current is responsible for calling clearPolling().
        return;
    }

    if (!apiUrl) {
      clearPolling();
      setFeedbackMessage(prev => (!prev || (prev.type !== 'success' && prev.type !== 'error')) ? { type: 'error', text: "Konfigurasi API bermasalah untuk polling.", transactionId: refIdForCheck } : prev);
      setIsProcessing(false);
      return;
    }

    console.log(`Checking order status for refId: ${refIdForCheck}. InitialDelayedCheck: ${isInitialDelayedCheck}. Current isProcessing: ${isProcessingRef.current}`);

    try {
      const response = await fetch(`${apiUrl}/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Token': xApiToken || '',
        },
        body: JSON.stringify({ refId: refIdForCheck }),
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
            setFeedbackMessage(prev => (!prev || prev.type !== 'success') ? { type: 'error', text: "Waduh, koneksi internetnya putus. Cek jaringanmu dulu ya.", transactionId: refIdForCheck} : prev);
        } else {
            setFeedbackMessage(prev => (!prev || (prev.type !== 'success' && prev.type !== 'error')) ? { type: 'error', text: detailedErrorMessage, transactionId: refIdForCheck } : prev);
        }
        clearPolling();
        setIsProcessing(false);
        return;
      }

      const orders: Order[] = await response.json();
      const currentOrderInstance = orders.find(order => order.ref_id === refIdForCheck);

      if (!currentOrderInstance || !currentOrderInstance.id_status || !currentOrderInstance.id_status.name) {
        if (isInitialDelayedCheck || pollingIntervalRef.current != null) {
             setFeedbackMessage(prev => (prev === null || prev.type === 'info') ? { type: 'info', text: "Memeriksa status pembayaran...", transactionId: refIdForCheck } : prev);
        }
        if (isInitialDelayedCheck && isProcessingRef.current && !pollingIntervalRef.current) {
            console.log(`Order for ${refIdForCheck} not found or status missing after initial check. Setting up 30s polling interval.`);
            pollingIntervalRef.current = setInterval(() => {
                if (currentRefId.current === refIdForCheck) { // Ensure still polling for the same refId
                    checkOrderStatusAndSetupInterval(refIdForCheck, false);
                } else {
                    console.log(`Polling for ${refIdForCheck} aborted as currentRefId changed to ${currentRefId.current}`);
                    clearPolling(); // Clear this specific interval
                }
            }, 30000);
        }
        return;
      }

      const statusCode = String(currentOrderInstance.id_status.code).toUpperCase() as OrderItemStatusCode;
      const orderOriginalRefId = currentOrderInstance.ref_id || refIdForCheck;
      console.log(`Order status for ${orderOriginalRefId}: ${statusCode}`);

      if (statusCode.includes('SCCR')) {
        clearPolling();
        setFeedbackMessage({ type: 'success', text: `Asiiik, pembayaran berhasil! Item akan segera dikirim ke akunmu. (${currentOrderInstance.id_status.name})`, transactionId: orderOriginalRefId });
        setIsProcessing(false);
      } else if (statusCode.includes('FAILD') || statusCode.includes('FAILR')) {
        clearPolling();
        let statusText = currentOrderInstance.id_status.name || "bermasalah";
        setFeedbackMessage({ type: 'error', text: `Yah, pembayaran kamu ${statusText}.`, transactionId: orderOriginalRefId });
        setIsProcessing(false);
      } else if (statusCode.includes('PNDD') || statusCode.includes('PNDR')) {
        setFeedbackMessage({ type: 'info', text: `Status: ${currentOrderInstance.id_status.name}. Menunggu konfirmasi...`, transactionId: orderOriginalRefId });
        if (isInitialDelayedCheck && isProcessingRef.current && !pollingIntervalRef.current) {
          console.log(`Order for ${orderOriginalRefId} is ${statusCode} after initial check. Setting up 30s polling interval.`);
          pollingIntervalRef.current = setInterval(() => {
            if (currentRefId.current === orderOriginalRefId) { // Ensure still polling for the same refId
                checkOrderStatusAndSetupInterval(orderOriginalRefId, false);
            } else {
                console.log(`Polling for ${orderOriginalRefId} aborted as currentRefId changed to ${currentRefId.current}`);
                clearPolling(); // Clear this specific interval
            }
          }, 30000);
        }
      } else { 
        setFeedbackMessage({ type: 'info', text: `Status: ${currentOrderInstance.id_status.name}. Menunggu update...`, transactionId: orderOriginalRefId });
         if (isInitialDelayedCheck && isProcessingRef.current && !pollingIntervalRef.current) {
           console.log(`Order for ${orderOriginalRefId} has status ${statusCode} after initial check. Setting up 30s polling interval for updates.`);
           pollingIntervalRef.current = setInterval(() => {
             if (currentRefId.current === orderOriginalRefId) { // Ensure still polling for the same refId
                checkOrderStatusAndSetupInterval(orderOriginalRefId, false);
             } else {
                console.log(`Polling for ${orderOriginalRefId} aborted as currentRefId changed to ${currentRefId.current}`);
                clearPolling(); // Clear this specific interval
             }
           }, 30000);
        }
      }
    } catch (error: any) {
      clearPolling();
      if (!navigator.onLine) {
         setFeedbackMessage(prev => (!prev || prev.type !== 'success') ? { type: 'error', text: "Koneksi internet terputus saat memeriksa status.", transactionId: refIdForCheck} : prev);
      } else {
        setFeedbackMessage(prev => (!prev || (prev.type !== 'success' && prev.type !== 'error')) ? { type: 'error', text: "Kesalahan saat memeriksa status pembayaran.", transactionId: refIdForCheck } : prev);
      }
      setIsProcessing(false);
    }
  }, [apiUrl, xApiToken, setIsProcessing, setFeedbackMessage, clearPolling]);


  const startOrderPolling = useCallback((refIdToPoll: string) => {
    // Check if polling for THIS refId is already effectively active via currentRefId match and existing timers.
    // This is a guard against redundant starts for the exact same transaction.
    if (currentRefId.current === refIdToPoll && (initialCheckTimeoutRef.current || pollingIntervalRef.current)) {
        console.log(`Polling for ${refIdToPoll} is already initiated or active via timers. Skipping new start.`);
        return;
    }
    
    clearPolling(); 
    currentRefId.current = refIdToPoll; 
    
    console.log(`Scheduling initial order status check in 15s for refId: ${refIdToPoll}`);
    initialCheckTimeoutRef.current = setTimeout(() => {
      if (currentRefId.current === refIdToPoll) {
        console.log(`Executing initial (15s delayed) order status check for refId: ${refIdToPoll}`);
        checkOrderStatusAndSetupInterval(refIdToPoll, true);
      } else {
         console.log(`RefId changed from ${refIdToPoll} to ${currentRefId.current} before 15s check. Aborting initial check for ${refIdToPoll}.`);
      }
    }, 15000);
  }, [clearPolling, checkOrderStatusAndSetupInterval]);

  const startOrderPollingRef = useRef(startOrderPolling);
  useEffect(() => {
    startOrderPollingRef.current = startOrderPolling;
  }, [startOrderPolling]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
        const storedRefId = sessionStorage.getItem(SESSION_ACTIVE_REF_ID_KEY);
        const storedProcessing = sessionStorage.getItem(SESSION_PAYMENT_IN_PROGRESS_KEY);
        
        if (storedRefId && storedProcessing === 'true') {
            // Check if we are already processing this specific refId due to component lifecycle (not full refresh)
            if (currentRefId.current === storedRefId && isProcessingRef.current) {
                console.log(`Session recovery: Polling for ${storedRefId} seems to be already in progress. No new polling initiated from session.`);
                return;
            }

            console.log('Session recovery: Attempting to recover order polling state for refId:', storedRefId);
            const gameFromSession = sessionStorage.getItem('sanrize_selectedGame');
            const packageFromSession = sessionStorage.getItem('sanrize_selectedPackage');
            const accountFromSession = sessionStorage.getItem('sanrize_accountDetails');

            if (gameFromSession && packageFromSession && accountFromSession) {
                if (!selectedGame) setSelectedGame(JSON.parse(gameFromSession));
                if (!selectedPackage) setSelectedPackage(JSON.parse(packageFromSession));
                if (!accountDetails) setContextAccountDetails(JSON.parse(accountFromSession));

                currentRefId.current = storedRefId;
                setIsProcessing(true); 
                setFeedbackMessage(null); 
                startOrderPollingRef.current(storedRefId); 
            } else {
                 console.warn("Session recovery for polling aborted: missing game/package/account details from session storage.");
                 setIsProcessing(false); // Can't process without details
                 sessionStorage.removeItem(SESSION_PAYMENT_IN_PROGRESS_KEY); // Clear the in-progress flag
                 sessionStorage.removeItem(SESSION_ACTIVE_REF_ID_KEY);
            }
        }
    }
    // This effect should run on mount and when context setters change (which are stable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSelectedGame, setSelectedPackage, setContextAccountDetails]);


  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isProcessingRef.current && currentRefId.current) { // Use ref here
        const message = 'Yakin ingin keluar? Proses topup sedang berlangsung lho.';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    if (isProcessingRef.current && currentRefId.current) { // Use ref here
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
      if (!isProcessingRef.current) { // Use ref here for cleanup condition
        clearPolling();
      }
    };
  }, [clearPolling]); // isProcessing is not a direct dependency; its effect is through isProcessingRef


  const handleConfirmPurchase = async () => {
    clearPolling(); 
    currentRefId.current = null; 

    if (!selectedGame || !selectedPackage || !accountDetails || !apiUrl) {
      setFeedbackMessage({ type: 'error', text: "Waduh, info pembeliannya kurang lengkap atau API-nya lagi ngambek nih." });
      return;
    }

    setFeedbackMessage(null);
    setIsProcessing(true); 

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
        currentRefId.current = ref_id; 
        sessionStorage.setItem(SESSION_ACTIVE_REF_ID_KEY, ref_id);
        // isProcessing is already true, session for payment_in_progress will be set by useEffect

        setFeedbackMessage({ type: 'info', text: "Mengarahkan ke halaman pembayaran...", transactionId: ref_id });

        if (typeof window.loadJokulCheckout === 'function') {
          window.loadJokulCheckout(payment_url);
          startOrderPollingRef.current(ref_id); 
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
    sessionStorage.removeItem(SESSION_PAYMENT_IN_PROGRESS_KEY);
    sessionStorage.removeItem(SESSION_ACTIVE_REF_ID_KEY);
    setTimeout(() => {
        handleConfirmPurchase();
    }, 100); 
  };

  const handleGoBack = () => {
    clearPolling();
    currentRefId.current = null;
    setFeedbackMessage(null);
    setIsProcessing(false);
    // No resetPurchase() here as user might want to adjust account details on previous page
    router.back(); 
  };

  const handleShopAgain = () => {
    clearPolling();
    currentRefId.current = null;
    setFeedbackMessage(null);
    setIsProcessing(false);
    const gameSlug = selectedGame?.slug;
    resetPurchase(); 
    if (gameSlug && typeof window !== 'undefined') {
      window.location.href = `/games/${gameSlug}`;
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
    const wasInProgress = typeof window !== 'undefined' && sessionStorage.getItem(SESSION_PAYMENT_IN_PROGRESS_KEY) === 'true';
    if (wasInProgress && (!selectedGame || !selectedPackage || !accountDetails)) {
        return (
             <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
                <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-primary animate-spin mb-4" />
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">Memulihkan sesi...</h1>
            </div>
        );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mb-4" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-destructive mb-2">Waduh, Infonya Nggak Lengkap</h1>
        <p className="text-muted-foreground mb-6 text-xs sm:text-sm md:text-base">
          Detail pembelianmu nggak ketemu nih. Coba mulai dari awal lagi ya.
        </p>
        <Button onClick={() => { resetPurchase(); if (typeof window !== 'undefined') window.location.href = '/'; }} variant="outline" size="sm" className="text-xs sm:text-sm">
          Balik ke Beranda
        </Button>
      </div>
    );
  }

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

  if ((isProcessing && currentRefId.current) || (feedbackMessage && feedbackMessage.type === 'info')) {
    const displayMessage = feedbackMessage || { type: 'info', text: "Memulai proses pembayaran...", transactionId: currentRefId.current! };
    return (
      <FeedbackStateCard
        feedbackMessage={displayMessage}
        selectedGame={selectedGame}
        selectedPackage={selectedPackage}
        accountDetails={accountDetails}
        onRetryPayment={handleRetryPayment} // Will only be shown if feedback type becomes 'error'
        onGoBack={handleGoBack}
        onShopAgain={handleShopAgain} // Will only be shown if feedback type becomes 'success'
        onGoToHome={handleGoToHome}   // Will only be shown if feedback type becomes 'success'
      />
    );
  }

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
          disabled={isProcessing && (!feedbackMessage || feedbackMessage.type !== 'error')}
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base mt-6"
        >
          {(isProcessing && (!feedbackMessage || feedbackMessage.type !== 'error')) ? (
            <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          )}
          {(isProcessing && (!feedbackMessage || feedbackMessage.type !== 'error')) ? "Memproses..." : "Konfirmasi & Bayar"}
        </Button>
    </div>
  );
};

export default ConfirmationClient;
    
