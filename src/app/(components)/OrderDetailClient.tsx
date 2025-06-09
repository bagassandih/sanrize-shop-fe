
"use client";

import { usePurchase } from '@/app/(store)/PurchaseContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import FeedbackStateCard, { type FeedbackMessage } from './FeedbackStateCard';
import type { Order, Game, DiamondPackage, AccountDetails as ContextAccountDetails } from '@/lib/data';

interface OrderDetailClientProps {
  refId: string;
  apiUrl?: string;
  xApiToken?: string;
}

const OrderDetailClient = ({ refId, apiUrl, xApiToken }: OrderDetailClientProps) => {
  const router = useRouter();
  const { selectedGame: contextGame, selectedPackage: contextPackage, accountDetails: contextAccountDetails, resetPurchase } = usePurchase();
  
  const [orderData, setOrderData] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(true); // Initially true until first fetch determines status
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

  const checkOrderStatusAndSetupInterval = useCallback(async (isInitialFetch: boolean = false) => {
    const refIdForCheck = refId; // Capture refId at the time of function definition/call
    if (!apiUrl || !refIdForCheck) {
      clearPolling();
      // Prevent overwriting a final success/error message with this config error
      setFeedbackMessage(prev => (prev && (prev.type === 'success' || prev.type === 'error')) ? prev : { type: 'error', text: "Konfigurasi API atau ID Referensi bermasalah.", transactionId: refIdForCheck });
      setIsProcessing(false);
      return;
    }

    // If polling is somehow active but component is no longer meant to be processing, stop.
    if (!isProcessingRef.current && !isInitialFetch && pollingIntervalRef.current) {
        clearPolling();
        return;
    }

    try {
      const response = await fetch(`${apiUrl}/order/${refIdForCheck}`, { // Assuming GET request to /order/:refId
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
          detailedErrorMessage = `Transaksi dengan ID ${refIdForCheck} tidak ditemukan.`;
          clearPolling(); // Stop polling if not found
          setIsProcessing(false);
        } else if (errorResponseText) {
            try {
                const errorJson = JSON.parse(errorResponseText);
                detailedErrorMessage += ` Pesan: ${errorJson.message || errorJson.error || 'Tidak ada detail tambahan.'}`;
            } catch (e) {
                detailedErrorMessage += ` Respon: ${errorResponseText.substring(0,100)}`;
            }
        }
        
        setFeedbackMessage(prev => {
            if (prev && (prev.type === 'success' || prev.type === 'error') && response.status !== 404) return prev; // Don't overwrite final unless it's a 404
            if (typeof window !== 'undefined' && !navigator.onLine) {
                return { type: 'info', text: "Koneksi internet terputus. Pemeriksaan status akan dilanjutkan otomatis.", transactionId: refIdForCheck};
            }
            return { type: response.status === 404 ? 'error' : 'info', text: detailedErrorMessage, transactionId: refIdForCheck };
        });

        // For non-404 errors, if it's an initial fetch or processing is expected, ensure polling continues or starts for PENDING states.
        // This part of error handling might be tricky; main logic is based on successful fetch status codes.
        // If it's an error, and we are supposed to be processing, and no interval is set, set one.
        if (response.status !== 404 && !pollingIntervalRef.current && isProcessingRef.current) {
            pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000);
        }
        return;
      }

      const result = await response.json();
      
      // Assuming the endpoint /order/:refId returns an array with a single order object, or just the order object.
      // Adjust based on actual API contract. If it's always an array:
      const currentOrderInstance: Order | undefined = Array.isArray(result) ? result.find(o => o.ref_id === refIdForCheck) : (result.ref_id === refIdForCheck ? result : undefined) ;

      if (!currentOrderInstance || !currentOrderInstance.id_status || typeof currentOrderInstance.id_status.code === 'undefined') {
        clearPolling();
        setFeedbackMessage(prev => (prev && (prev.type === 'success' || prev.type === 'error')) ? prev : { type: 'error', text: `Data pesanan tidak valid atau tidak ditemukan untuk ID ${refIdForCheck}.`, transactionId: refIdForCheck });
        setIsProcessing(false);
        return;
      }
      
      setOrderData(currentOrderInstance);

      const statusCode = String(currentOrderInstance.id_status.code).toUpperCase();
      const statusName = currentOrderInstance.id_status.name || "Tidak diketahui";
      const orderOriginalRefId = currentOrderInstance.ref_id || refIdForCheck;

      if (statusCode.includes('SCCD') || statusCode.includes('SCCR')) {
        clearPolling();
        setFeedbackMessage({ type: 'success', text: `Asiiik, pembayaran berhasil! Status: ${statusName}. Item akan segera dikirim.`, transactionId: orderOriginalRefId });
        setIsProcessing(false);
      } else if (statusCode.includes('FAILD') || statusCode.includes('FAILR')) {
        clearPolling();
        setFeedbackMessage({ type: 'error', text: `Yah, pembayaran kamu ${statusName}.`, transactionId: orderOriginalRefId });
        setIsProcessing(false);
      } else if (statusCode.includes('PNDD') || statusCode.includes('PNDR')) {
        setFeedbackMessage(prev => {
          if (prev && (prev.type === 'success' || prev.type === 'error')) return prev;
          return { type: 'info', text: `Status: ${statusName}. Menunggu konfirmasi...`, transactionId: orderOriginalRefId };
        });
        if (!isProcessingRef.current) setIsProcessing(true); // Ensure processing is true for pending

        // Start polling interval ONLY if status is PENDING and no interval is active
        if (!pollingIntervalRef.current) {
           // isProcessingRef.current should be true if we are in PNDD/PNDR and want to poll
           if(isProcessingRef.current){
             pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000);
           }
        }
      } else { 
        // For any other status (unknown, expired, etc.) - treat as final for polling purposes
        clearPolling();
        setFeedbackMessage(prev => {
            if (prev && (prev.type === 'success' || prev.type === 'error')) return prev;
            return { type: 'info', text: `Status transaksi: ${statusName}. (Kode: ${statusCode})`, transactionId: orderOriginalRefId };
        });
        setIsProcessing(false); // No longer actively processing payment if status is unknown/other final
      }

    } catch (error: any) {
      let tempErrorMessage = "Terjadi masalah saat memeriksa status. Akan dicoba lagi otomatis.";
      if (typeof window !== 'undefined' && !navigator.onLine) {
         tempErrorMessage = "Koneksi internet terputus. Pemeriksaan status akan dilanjutkan otomatis.";
      }
      
      setFeedbackMessage(prev => {
        if (prev && (prev.type === 'success' || prev.type === 'error')) return prev; 
        return { type: 'info', text: tempErrorMessage, transactionId: refIdForCheck };
      });
      
      // If polling was not active, AND we are still in a processing state (e.g. initial fetch failed during pending)
      // then set up the interval to retry.
      if (!pollingIntervalRef.current && isProcessingRef.current) {
        pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000);
      }
    }
  }, [apiUrl, xApiToken, refId, clearPolling, setIsProcessing, setFeedbackMessage]);


  useEffect(() => {
    if (refId) {
      setIsProcessing(true); // Assume processing until first status check
      setFeedbackMessage(null); // Clear previous feedback
      clearPolling(); // Clear any existing poll from previous mount/refId change
      checkOrderStatusAndSetupInterval(true); // Perform initial fetch directly
    }

    return () => {
      clearPolling(); // Cleanup on unmount or if refId changes
    };
  }, [refId, checkOrderStatusAndSetupInterval, clearPolling]); 

  const getFallbackGame = (): Game | null => {
    if (!orderData || !orderData.id_service) return null;
    return {
      id: String(orderData.id_service.id_category),
      categoryId: orderData.id_service.id_category,
      name: orderData.id_service.id_category ? `Game (Kategori: ${orderData.id_service.id_category})` : (orderData.id_service.name || "Nama Game Tidak Diketahui"),
      slug: String(orderData.id_service.id_category), // Fallback slug
      imageUrl: orderData.id_service.img || "https://placehold.co/150x150.png",
      dataAiHint: "game icon",
      description: `Detail untuk layanan ${orderData.id_service.name || 'layanan ini'}`,
      packages: [],
      accountIdFields: []
    };
  };

  const getFallbackPackage = (): DiamondPackage | null => {
    if (!orderData || !orderData.id_service) return null;
    return {
      id: String(orderData.id_service.id),
      originalId: orderData.id_service.id,
      name: orderData.id_service.name || "Paket Tidak Diketahui",
      price: orderData.id_service.markup_price !== undefined ? orderData.id_service.markup_price : orderData.id_service.price,
      bonus: orderData.id_service.bonus,
      imageUrl: orderData.id_service.img
    };
  };
  
  const getFallbackAccountDetails = (): ContextAccountDetails | null => {
    if (!orderData) return null;
    const details: ContextAccountDetails = { username: orderData.nickname || "N/A" };
    if (orderData.user_id) details.userId = orderData.user_id; // Assuming 'userId' key in ContextAccountDetails
    if (orderData.zone_id) details.zoneId = orderData.zone_id; // Assuming 'zoneId' key
    return details;
  };

  const displayGame = contextGame || getFallbackGame();
  const displayPackage = contextPackage || getFallbackPackage();
  const displayAccountDetails = contextAccountDetails || getFallbackAccountDetails();
  
  if ((!displayGame || !displayPackage || !displayAccountDetails) && isProcessingRef.current && !orderData) {
      // Show loader if context data is missing AND we are processing AND no orderData has been fetched yet for fallback
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
          <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-primary animate-spin mb-4" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">Memuat detail transaksi...</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Harap tunggu sebentar.</p>
        </div>
      );
  }
  
  if (!displayGame || !displayPackage || !displayAccountDetails) {
    // If still missing data after attempting fallback (or if not processing), show error
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mb-4" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-destructive mb-2">Informasi Transaksi Tidak Lengkap</h1>
        <p className="text-muted-foreground mb-6 text-xs sm:text-sm md:text-base">
          Tidak dapat memuat semua detail yang diperlukan untuk transaksi ini. Coba muat ulang halaman atau kembali ke beranda.
        </p>
        <button 
          onClick={() => { 
            resetPurchase(); 
            if (typeof window !== 'undefined') window.location.href = '/'; 
          }} 
          className="text-xs sm:text-sm p-2 border rounded bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }
  
  const currentFeedback = feedbackMessage || 
                          (isProcessingRef.current ? 
                            { type: 'info', text: "Memeriksa status pembayaran...", transactionId: refId } :
                            // If not processing and no feedback, could mean initial state before first fetch or error state handled above
                            { type: 'info', text: "Tidak ada informasi status terbaru.", transactionId: refId });


  const handleRetryPayment = () => {
    clearPolling();
    if (orderData?.payment_url) {
        if (typeof window.loadJokulCheckout === 'function') {
            window.loadJokulCheckout(orderData.payment_url);
            setIsProcessing(true);
            setFeedbackMessage({ type: 'info', text: "Memeriksa status pembayaran setelah mencoba lagi...", transactionId: refId });
            checkOrderStatusAndSetupInterval(true); // Start checking immediately
        } else {
            setFeedbackMessage({ type: 'error', text: "Gagal memuat popup pembayaran. Fungsi tidak ditemukan.", transactionId: refId });
        }
    } else {
         router.push('/confirm'); // Go back to confirmation to re-trigger /process-order
    }
  };
  
  const handleGoBack = () => { 
    clearPolling();
    const gameSlug = displayGame?.slug;
    const isFallbackSlug = orderData && gameSlug === String(orderData.id_service.id_category);

    if (gameSlug && !isFallbackSlug) {
       if(typeof window !== 'undefined') window.location.href = `/games/${gameSlug}`;
    } else {
       if(typeof window !== 'undefined') window.location.href = '/';
    }
  };

  const handleShopAgain = () => { 
    clearPolling();
    const gameSlug = displayGame?.slug;
    const isFallbackSlug = orderData && gameSlug === String(orderData.id_service.id_category);
    resetPurchase(); // Clears context and its session storage
    if (gameSlug && !isFallbackSlug) {
      if(typeof window !== 'undefined') window.location.href = `/games/${gameSlug}`;
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };
  
  const handleGoToHome = () => {
    clearPolling();
    resetPurchase(); // Clears context and its session storage
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <FeedbackStateCard
      feedbackMessage={currentFeedback}
      selectedGame={displayGame}
      selectedPackage={displayPackage}
      accountDetails={displayAccountDetails}
      onRetryPayment={handleRetryPayment}
      onGoBack={handleGoBack}
      onShopAgain={handleShopAgain}
      onGoToHome={handleGoToHome}
      transactionDate={orderData?.created_at}
    />
  );
};

export default OrderDetailClient;

    