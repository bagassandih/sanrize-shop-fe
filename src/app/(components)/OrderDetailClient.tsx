
"use client";

import { usePurchase } from '@/app/(store)/PurchaseContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import FeedbackStateCard, { type FeedbackMessage } from './FeedbackStateCard';
import type { Order, OrderItemStatusCode, Game, DiamondPackage, AccountDetails as ContextAccountDetails } from '@/lib/data';

interface OrderDetailClientProps {
  refId: string;
  apiUrl?: string;
  xApiToken?: string;
}

const OrderDetailClient = ({ refId, apiUrl, xApiToken }: OrderDetailClientProps) => {
  const router = useRouter();
  const { selectedGame: contextGame, selectedPackage: contextPackage, accountDetails: contextAccountDetails, resetPurchase } = usePurchase();
  
  const [orderData, setOrderData] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(isProcessing);
  
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  const clearPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const checkOrderStatusAndSetupInterval = useCallback(async (isInitialDirectFetch: boolean = false) => {
    if (!apiUrl) {
      clearPolling();
      setFeedbackMessage(prev => (!prev || (prev.type !== 'success' && prev.type !== 'error')) ? { type: 'error', text: "Konfigurasi API bermasalah untuk polling.", transactionId: refId } : prev);
      setIsProcessing(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/order/${refId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Token': xApiToken || '',
        },
      });

      if (!response.ok) {
        const errorResponseText = await response.text();
        let detailedErrorMessage = `Gagal mengambil status pesanan (HTTP ${response.status}).`;
         if (response.status === 404) {
          detailedErrorMessage = `Transaksi dengan ID ${refId} tidak ditemukan. Mungkin perlu waktu beberapa saat hingga transaksi muncul setelah pembayaran.`;
        } else if (errorResponseText) {
            try {
                const errorJson = JSON.parse(errorResponseText);
                detailedErrorMessage += ` Pesan: ${errorJson.message || errorJson.error || 'Tidak ada detail tambahan.'}`;
            } catch (e) {
                detailedErrorMessage += ` Respon: ${errorResponseText.substring(0,100)}`;
            }
        }
        
        if (typeof window !== 'undefined' && !navigator.onLine) {
            setFeedbackMessage(prev => (!prev || prev.type !== 'success') ? { type: 'error', text: "Waduh, koneksi internetnya putus. Cek jaringanmu dulu ya.", transactionId: refId} : prev);
        } else {
          // For initial fetch error, especially 404, treat it as a potentially recoverable info state if order is very new.
          if (isInitialDirectFetch && response.status === 404) {
             setFeedbackMessage({ type: 'info', text: detailedErrorMessage + " Akan dicoba lagi...", transactionId: refId });
             if (!pollingIntervalRef.current && isProcessingRef.current) { // isProcessingRef to ensure we don't set interval if already finalized by other means
                pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000);
             }
             return; // Don't clear polling or set processing false yet
          } else {
            setFeedbackMessage(prev => (!prev || (prev.type !== 'success' && prev.type !== 'error')) ? { type: 'error', text: detailedErrorMessage, transactionId: refId } : prev);
          }
        }
        clearPolling(); // Clear polling on definitive non-404 errors during initial or subsequent fetches
        setIsProcessing(false);
        return;
      }

      const currentOrderInstance: Order = await response.json();
      setOrderData(currentOrderInstance);

      if (!currentOrderInstance || !currentOrderInstance.id_status || !currentOrderInstance.id_status.name) {
        setFeedbackMessage(prev => (prev === null || prev.type === 'info') ? { type: 'error', text: "Data pesanan tidak valid dari server.", transactionId: refId } : prev);
        clearPolling();
        setIsProcessing(false);
        return;
      }

      const statusCode = String(currentOrderInstance.id_status.code).toUpperCase() as OrderItemStatusCode;
      const orderOriginalRefId = currentOrderInstance.ref_id || refId;

      if (statusCode.includes('SCCR') || statusCode.includes('SCCD')) {
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
        if (!pollingIntervalRef.current && isProcessingRef.current) { // Only set interval if not already running and processing
          pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000);
        }
      } else { 
        setFeedbackMessage({ type: 'info', text: `Status: ${currentOrderInstance.id_status.name}. Menunggu update...`, transactionId: orderOriginalRefId });
         if (!pollingIntervalRef.current && isProcessingRef.current) {
           pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000);
        }
      }
    } catch (error: any) {
      let tempErrorMessage = "Terjadi masalah saat memeriksa status. Akan dicoba lagi.";
      if (typeof window !== 'undefined' && !navigator.onLine) {
         tempErrorMessage = "Koneksi internet terputus. Pemeriksaan status akan dilanjutkan.";
      }
      
      setFeedbackMessage(prev => {
        if (prev && (prev.type === 'success' || prev.type === 'error')) return prev; 
        return { type: 'info', text: tempErrorMessage, transactionId: refId };
      });
      
      if (!pollingIntervalRef.current && isProcessingRef.current) { // If an error occurs and we are still processing and no interval, set one
        pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000);
      }
      // Do not setIsProcessing(false) here for general catch, let interval retry
      return;
    }
  }, [apiUrl, xApiToken, refId, clearPolling]);


  useEffect(() => {
    if (refId) {
      setIsProcessing(true);
      setFeedbackMessage(null);
      checkOrderStatusAndSetupInterval(true); // true indicates it's the initial direct fetch
    }
    return () => {
      clearPolling();
    };
  }, [refId, checkOrderStatusAndSetupInterval, clearPolling]); // checkOrderStatusAndSetupInterval & clearPolling are stable due to useCallback

  // Fallback details if context is missing, constructed from orderData
  const getFallbackGame = (): Game | null => {
    if (!orderData || !orderData.id_service) return null;
    return {
      id: String(orderData.id_service.id_category),
      categoryId: orderData.id_service.id_category,
      name: `Game (Kategori: ${orderData.id_service.id_category})`,
      slug: String(orderData.id_service.id_category),
      imageUrl: orderData.id_service.img || "https://placehold.co/150x150.png",
      dataAiHint: "game icon",
      description: `Detail untuk layanan ${orderData.id_service.name}`,
      packages: [], 
      accountIdFields: [] 
    };
  };

  const getFallbackPackage = (): DiamondPackage | null => {
    if (!orderData || !orderData.id_service) return null;
    return {
      id: String(orderData.id_service.id), 
      originalId: orderData.id_service.id,
      name: orderData.id_service.name,
      price: orderData.id_service.markup_price !== undefined ? orderData.id_service.markup_price : orderData.id_service.price,
      bonus: orderData.id_service.bonus,
      imageUrl: orderData.id_service.img
    };
  };
  
  const getFallbackAccountDetails = (): ContextAccountDetails | null => {
    if (!orderData) return null;
    const details: ContextAccountDetails = { username: orderData.nickname || "N/A" };
    if (orderData.user_id) details.userId = orderData.user_id;
    if (orderData.zone_id) details.zoneId = orderData.zone_id;
    // Attempt to reconstruct other accountIdFields if possible, though typically not present directly in Order
    // This part remains basic as Order schema might not have all original form fields.
    return details;
  };

  const displayGame = contextGame || getFallbackGame();
  const displayPackage = contextPackage || getFallbackPackage();
  const displayAccountDetails = contextAccountDetails || getFallbackAccountDetails();


  if (!displayGame || !displayPackage || !displayAccountDetails) {
    if (isProcessing || !orderData) { // Show loader if processing or orderData (for fallback) isn't loaded yet
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
          <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-primary animate-spin mb-4" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">Memuat detail transaksi...</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Harap tunggu sebentar.</p>
        </div>
      );
    }
    // If not processing and still no display details, implies an issue even with fallbacks
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mb-4" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-destructive mb-2">Informasi Transaksi Tidak Lengkap</h1>
        <p className="text-muted-foreground mb-6 text-xs sm:text-sm md:text-base">
          Tidak dapat memuat semua detail yang diperlukan untuk transaksi ini.
        </p>
        <button onClick={() => { resetPurchase(); if (typeof window !== 'undefined') window.location.href = '/'; }} className="text-xs sm:text-sm p-2 border rounded">
          Kembali ke Beranda
        </button>
      </div>
    );
  }
  
  const handleGoBack = () => { 
    clearPolling();
    const gameSlug = displayGame?.slug;
    // Check if slug is just a category ID (fallback scenario)
    const isFallbackSlug = gameSlug === String(displayGame?.categoryId);
    if (gameSlug && !isFallbackSlug) {
       if(typeof window !== 'undefined') window.location.href = `/games/${gameSlug}`;
    } else {
       if(typeof window !== 'undefined') window.location.href = '/';
    }
  };

  const handleShopAgain = () => { 
    clearPolling();
    const gameSlug = displayGame?.slug;
    const isFallbackSlug = gameSlug === String(displayGame?.categoryId);
    resetPurchase(); 
    if (gameSlug && !isFallbackSlug) {
      if(typeof window !== 'undefined') window.location.href = `/games/${gameSlug}`;
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };
  
  const handleGoToHome = () => {
    clearPolling();
    resetPurchase(); 
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };
  
  const currentFeedback = feedbackMessage || 
                          (isProcessing ? 
                            { type: 'info', text: "Memeriksa status pembayaran...", transactionId: refId } :
                            { type: 'info', text: "Tidak ada informasi status terbaru.", transactionId: refId });


  return (
    <FeedbackStateCard
      feedbackMessage={currentFeedback}
      selectedGame={displayGame}
      selectedPackage={displayPackage}
      accountDetails={displayAccountDetails}
      onRetryPayment={() => {  
          clearPolling(); 
          if (orderData?.payment_url) { // Assuming Order might have payment_url for retry
            if (typeof window.loadJokulCheckout === 'function') {
                window.loadJokulCheckout(orderData.payment_url);
                // Re-initiate polling for this refId after retry attempt
                setIsProcessing(true);
                setFeedbackMessage({ type: 'info', text: "Memeriksa status pembayaran setelah mencoba lagi...", transactionId: refId });
                checkOrderStatusAndSetupInterval(true);
            } else {
                 setFeedbackMessage({ type: 'error', text: "Gagal memuat popup pembayaran. Fungsi tidak ditemukan.", transactionId: refId });
            }
          } else {
            // If no payment_url, perhaps redirect to confirm or show error
            setFeedbackMessage({ type: 'error', text: "Tidak ada informasi untuk mencoba ulang pembayaran.", transactionId: refId });
            // router.push('/confirm'); // Or simply disable retry
          }
      }}
      onGoBack={handleGoBack}
      onShopAgain={handleShopAgain}
      onGoToHome={handleGoToHome}
    />
  );
};

export default OrderDetailClient;

    