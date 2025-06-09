
"use client";

import { usePurchase } from '@/app/(store)/PurchaseContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import FeedbackStateCard, { type FeedbackMessage } from './FeedbackStateCard';
import type { Order, OrderItemStatusCode, Game, DiamondPackage, AccountDetails as ContextAccountDetails } from '@/lib/data'; // Assuming Order type is defined

interface OrderDetailClientProps {
  refId: string;
  apiUrl?: string;
  xApiToken?: string;
}

const OrderDetailClient = ({ refId, apiUrl, xApiToken }: OrderDetailClientProps) => {
  const router = useRouter();
  const { selectedGame: contextGame, selectedPackage: contextPackage, accountDetails: contextAccountDetails, resetPurchase } = usePurchase();
  
  const [orderData, setOrderData] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(true); // Initially true as we will fetch status
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);

  // Refs for stable callbacks and avoiding stale closures
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(isProcessing);
  
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  const clearPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (initialCheckTimeoutRef.current) {
      clearTimeout(initialCheckTimeoutRef.current);
      initialCheckTimeoutRef.current = null;
    }
  }, []);

  const checkOrderStatusAndSetupInterval = useCallback(async (isInitialDelayedCheck: boolean = false) => {
    if (!apiUrl) {
      clearPolling();
      setFeedbackMessage(prev => (!prev || (prev.type !== 'success' && prev.type !== 'error')) ? { type: 'error', text: "Konfigurasi API bermasalah untuk polling.", transactionId: refId } : prev);
      setIsProcessing(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/order/${refId}`, { // GET request to /order/:refId
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
          detailedErrorMessage = `Transaksi dengan ID ${refId} tidak ditemukan.`;
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
            setFeedbackMessage(prev => (!prev || (prev.type !== 'success' && prev.type !== 'error')) ? { type: 'error', text: detailedErrorMessage, transactionId: refId } : prev);
        }
        clearPolling();
        setIsProcessing(false);
        return;
      }

      const currentOrderInstance: Order = await response.json();
      setOrderData(currentOrderInstance); // Store fetched order data

      if (!currentOrderInstance || !currentOrderInstance.id_status || !currentOrderInstance.id_status.name) {
        if (isInitialDelayedCheck || pollingIntervalRef.current != null) {
             setFeedbackMessage(prev => (prev === null || prev.type === 'info') ? { type: 'info', text: "Memeriksa status pembayaran...", transactionId: refId } : prev);
        }
        if (isInitialDelayedCheck && isProcessingRef.current && !pollingIntervalRef.current) {
            pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000);
        }
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
        if (isInitialDelayedCheck && isProcessingRef.current && !pollingIntervalRef.current) {
          pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000);
        }
      } else { 
        setFeedbackMessage({ type: 'info', text: `Status: ${currentOrderInstance.id_status.name}. Menunggu update...`, transactionId: orderOriginalRefId });
         if (isInitialDelayedCheck && isProcessingRef.current && !pollingIntervalRef.current) {
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
      
      if (isInitialDelayedCheck && isProcessingRef.current && !pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000);
      }
      return;
    }
  }, [apiUrl, xApiToken, refId, clearPolling]);


  const startInitialPolling = useCallback(() => {
    clearPolling(); 
    initialCheckTimeoutRef.current = setTimeout(() => {
      checkOrderStatusAndSetupInterval(true);
    }, 15000); // Initial check after 15 seconds
  }, [clearPolling, checkOrderStatusAndSetupInterval]);


  useEffect(() => {
    // Start polling when the component mounts with a valid refId
    if (refId) {
      setIsProcessing(true); // Ensure processing is true when polling starts
      setFeedbackMessage(null); // Clear any previous messages
      startInitialPolling();
    }
    return () => {
      clearPolling(); // Cleanup on unmount
    };
  }, [refId, startInitialPolling, clearPolling]);

  // Fallback details if context is missing, constructed from orderData
  const getFallbackGame = (): Game | null => {
    if (!orderData || !orderData.id_service) return null;
    // This is a very basic fallback. Ideally, you'd fetch category details.
    return {
      id: String(orderData.id_service.id_category), // This is category ID, not game slug
      categoryId: orderData.id_service.id_category,
      name: `Game (ID: ${orderData.id_service.id_category})`, // Placeholder name
      slug: String(orderData.id_service.id_category),
      imageUrl: orderData.id_service.img || "https://placehold.co/150x150.png",
      dataAiHint: "game icon",
      description: `Detail untuk layanan ${orderData.id_service.name}`,
      packages: [], // Not available here
      accountIdFields: [] // Not available here, but TransactionSummary can handle missing fields
    };
  };

  const getFallbackPackage = (): DiamondPackage | null => {
    if (!orderData || !orderData.id_service) return null;
    return {
      id: String(orderData.id_service.id), // This is service originalId
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
    if (orderData.user_id) details.userId = orderData.user_id; // Assuming 'userId' is a common key
    if (orderData.zone_id) details.zoneId = orderData.zone_id; // Assuming 'zoneId' is a common key
    // Add other common fields if present in orderData
    return details;
  };

  const displayGame = contextGame || getFallbackGame();
  const displayPackage = contextPackage || getFallbackPackage();
  const displayAccountDetails = contextAccountDetails || getFallbackAccountDetails();


  if (!displayGame || !displayPackage || !displayAccountDetails) {
    // If context is missing AND orderData hasn't loaded yet to provide fallbacks
    if (!orderData) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
          <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-primary animate-spin mb-4" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">Memuat detail transaksi...</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Harap tunggu sebentar.</p>
        </div>
      );
    }
    // If orderData loaded but somehow still couldn't form display details (should be rare)
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
  
  const handleGoBack = () => { // "Kembali" for error state, might go to previous game or home
    clearPolling();
    const gameSlug = displayGame?.slug;
    if (gameSlug && gameSlug !== String(displayGame?.categoryId)) { // Avoid using categoryId as slug for fallback
       if(typeof window !== 'undefined') window.location.href = `/games/${gameSlug}`;
    } else {
       if(typeof window !== 'undefined') window.location.href = '/';
    }
  };

  const handleShopAgain = () => { // "Beli Lagi?" for success state
    clearPolling();
    const gameSlug = displayGame?.slug;
    resetPurchase(); 
    if (gameSlug && gameSlug !== String(displayGame?.categoryId)) {
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
  
  // Retry payment isn't applicable here as this page *shows* status, doesn't initiate.
  // The /confirm page is for initiating/retrying.
  // If an error occurs here that needs retry, it's likely a navigation to /confirm.
  // For now, on error, we only offer "Kembali" or "Ke Menu Utama".

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
      onRetryPayment={() => { /* Not directly applicable, could redirect to /confirm if needed */ 
          clearPolling(); 
          router.push('/confirm'); 
      }}
      onGoBack={handleGoBack}
      onShopAgain={handleShopAgain}
      onGoToHome={handleGoToHome}
    />
  );
};

export default OrderDetailClient;
