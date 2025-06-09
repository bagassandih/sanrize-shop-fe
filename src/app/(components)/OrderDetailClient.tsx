
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
  const [isProcessing, setIsProcessing] = useState(true); // True initially until first fetch completes or polling ends
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(isProcessing); // To access current isProcessing state in callbacks
  
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
    if (!apiUrl || !refId) {
      clearPolling();
      setFeedbackMessage(prev => (!prev || (prev.type !== 'success' && prev.type !== 'error')) ? { type: 'error', text: "Konfigurasi API atau ID Referensi bermasalah.", transactionId: refId } : prev);
      setIsProcessing(false);
      return;
    }
    
    // If no longer processing (e.g., user navigated away, or final status received), don't fetch.
    if (!isProcessingRef.current && !isInitialDirectFetch) { // Allow initial fetch even if ref.current is somehow false
        clearPolling();
        return;
    }

    try {
      const response = await fetch(`${apiUrl}/order/${refId}`, { // Assumes GET request to /order/:refId
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
        // For most errors, we stop polling and mark as not processing.
        // However, for initial 404, we might want to retry for a bit if the order is very new.
        // But current logic makes this an error state, which is fine.
        clearPolling(); 
        setIsProcessing(false);
        return;
      }

      const currentOrderInstance: Order = await response.json();
      setOrderData(currentOrderInstance);

      if (!currentOrderInstance || !currentOrderInstance.id_status || !currentOrderInstance.id_status.code) {
        setFeedbackMessage(prev => (prev === null || prev.type === 'info') ? { type: 'error', text: "Data pesanan tidak valid dari server.", transactionId: refId } : prev);
        clearPolling();
        setIsProcessing(false);
        return;
      }

      const statusCode = String(currentOrderInstance.id_status.code).toUpperCase() as OrderItemStatusCode;
      const statusName = currentOrderInstance.id_status.name || "Tidak diketahui";
      const orderOriginalRefId = currentOrderInstance.ref_id || refId;

      if (statusCode.includes('SCCD') || statusCode.includes('SCCR')) { // Success codes
        clearPolling();
        setFeedbackMessage({ type: 'success', text: `Asiiik, pembayaran berhasil! Status: ${statusName}. Item akan segera dikirim.`, transactionId: orderOriginalRefId });
        setIsProcessing(false);
      } else if (statusCode.includes('FAILD') || statusCode.includes('FAILR')) { // Failure codes
        clearPolling();
        setFeedbackMessage({ type: 'error', text: `Yah, pembayaran kamu ${statusName}.`, transactionId: orderOriginalRefId });
        setIsProcessing(false);
      } else if (statusCode.includes('PNDD') || statusCode.includes('PNDR')) { // Pending codes
        setFeedbackMessage({ type: 'info', text: `Status: ${statusName}. Menunggu konfirmasi...`, transactionId: orderOriginalRefId });
        if (!pollingIntervalRef.current && isProcessingRef.current) {
          pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000); // Poll every 30 seconds
        }
        // Ensure isProcessing remains true if pending
        if (!isProcessing) setIsProcessing(true);
      } else { 
        // For other statuses, treat as info but might stop polling depending on business logic
        // For now, assume other statuses are also "in progress" or require monitoring
        setFeedbackMessage({ type: 'info', text: `Status: ${statusName}. Menunggu update...`, transactionId: orderOriginalRefId });
         if (!pollingIntervalRef.current && isProcessingRef.current) { // If still processing and no interval, set one.
           pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000);
        }
        if (!isProcessing) setIsProcessing(true);
      }
    } catch (error: any) {
      // This catch block is for network errors or unexpected issues during fetch/JSON parsing
      let tempErrorMessage = "Terjadi masalah saat memeriksa status. Akan dicoba lagi.";
      if (typeof window !== 'undefined' && !navigator.onLine) {
         tempErrorMessage = "Koneksi internet terputus. Pemeriksaan status akan dilanjutkan.";
      }
      
      setFeedbackMessage(prev => {
        // Don't overwrite a final success/error message with a temporary polling error
        if (prev && (prev.type === 'success' || prev.type === 'error')) return prev; 
        return { type: 'info', text: tempErrorMessage, transactionId: refId };
      });
      
      // If an error occurs, and we are still processing, and no interval is set, set one.
      // This ensures polling continues after a temporary network glitch.
      if (!pollingIntervalRef.current && isProcessingRef.current) {
        pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000);
      }
      // Do not setIsProcessing(false) here for general catch errors, let interval retry.
      return; // Important to return to avoid setIsProcessing(false) if it's a recoverable error.
    }
    
    // Only set isProcessing to false here if it's not the initial direct fetch AND it wasn't handled by a pending state.
    // The states SCCD, SCCR, FAILD, FAILR explicitly set isProcessing(false).
    // If it's PNDD/PNDR or other unknown status, isProcessing might remain true for polling.
    if (isInitialDirectFetch && !(statusCode.includes('PNDD') || statusCode.includes('PNDR'))) {
        // If initial fetch and status is NOT pending, processing might be considered done
        // unless it's an unknown status we decided to poll.
        // This logic can be tricky; the primary control is `setIsProcessing(false)` in final states.
    }

  }, [apiUrl, xApiToken, refId, clearPolling]); // isProcessing and feedbackMessage removed to stabilize


  useEffect(() => {
    if (refId) {
      setIsProcessing(true); // Set processing to true when refId is available and we start
      setFeedbackMessage(null); // Clear previous messages
      clearPolling(); // Clear any existing polling from a previous instance/navigation
      checkOrderStatusAndSetupInterval(true); // true indicates it's the initial direct fetch
    }
    return () => {
      clearPolling(); // Cleanup on unmount
    };
  }, [refId, checkOrderStatusAndSetupInterval, clearPolling]); 

  // Fallback details if context is missing, constructed from orderData
  const getFallbackGame = (): Game | null => {
    if (!orderData || !orderData.id_service) return null;
    return {
      id: String(orderData.id_service.id_category), // Using category as a fallback ID
      categoryId: orderData.id_service.id_category,
      name: orderData.id_service.id_category ? `Game (Kategori: ${orderData.id_service.id_category})` : (orderData.id_service.name || "Nama Game Tidak Diketahui"),
      slug: String(orderData.id_service.id_category), // Fallback slug
      imageUrl: orderData.id_service.img || "https://placehold.co/150x150.png",
      dataAiHint: "game icon",
      description: `Detail untuk layanan ${orderData.id_service.name || 'layanan ini'}`,
      packages: [], // Cannot determine packages from order details alone
      accountIdFields: [] // Cannot determine accountIdFields from order details
    };
  };

  const getFallbackPackage = (): DiamondPackage | null => {
    if (!orderData || !orderData.id_service) return null;
    return {
      id: String(orderData.id_service.id), // Using service ID as package ID
      originalId: orderData.id_service.id,
      name: orderData.id_service.name || "Paket Tidak Diketahui",
      price: orderData.id_service.markup_price !== undefined ? orderData.id_service.markup_price : orderData.id_service.price,
      bonus: orderData.id_service.bonus,
      imageUrl: orderData.id_service.img // Can be undefined, handled by DiamondPackageCard
    };
  };
  
  const getFallbackAccountDetails = (): ContextAccountDetails | null => {
    if (!orderData) return null;
    const details: ContextAccountDetails = { username: orderData.nickname || "N/A" };
    // Standardize keys for display if they come from orderData
    if (orderData.user_id) details.userId = orderData.user_id; // Assuming 'userId' is a common key
    if (orderData.zone_id) details.zoneId = orderData.zone_id; // Assuming 'zoneId' is a common key
    
    // Attempt to add any other relevant fields directly from orderData that aren't 'id_status', 'id_service', etc.
    // This is a generic fallback, specific fields would depend on your Order structure and Game.accountIdFields
    // For example, if your Order object had other fields like `server_id`, you might add them here.
    // For now, keeping it simple to username, userId, zoneId.
    return details;
  };

  const displayGame = contextGame || getFallbackGame();
  const displayPackage = contextPackage || getFallbackPackage();
  const displayAccountDetails = contextAccountDetails || getFallbackAccountDetails();


  if ((!displayGame || !displayPackage || !displayAccountDetails) && isProcessingRef.current) {
      // If essential display details are missing AND we are still in a processing/loading state
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
          <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-primary animate-spin mb-4" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">Memuat detail transaksi...</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Harap tunggu sebentar.</p>
        </div>
      );
  }
  
  if (!displayGame || !displayPackage || !displayAccountDetails) {
    // If, after attempting fallbacks and processing is potentially done, details are still missing
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mb-4" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-destructive mb-2">Informasi Transaksi Tidak Lengkap</h1>
        <p className="text-muted-foreground mb-6 text-xs sm:text-sm md:text-base">
          Tidak dapat memuat semua detail yang diperlukan untuk transaksi ini.
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
  
  // Ensure currentFeedback is always an object for FeedbackStateCard
  const currentFeedback = feedbackMessage || 
                          (isProcessingRef.current ? 
                            { type: 'info', text: "Memeriksa status pembayaran...", transactionId: refId } :
                            // If not processing and no specific message, it implies an issue or incomplete state if not success/error
                            { type: 'info', text: "Tidak ada informasi status terbaru atau proses selesai.", transactionId: refId });


  const handleRetryPayment = () => {
    clearPolling();
    if (orderData?.payment_url) {
        if (typeof window.loadJokulCheckout === 'function') {
            window.loadJokulCheckout(orderData.payment_url);
            setIsProcessing(true);
            setFeedbackMessage({ type: 'info', text: "Memeriksa status pembayaran setelah mencoba lagi...", transactionId: refId });
            // Re-initiate polling for this refId after retry attempt
            checkOrderStatusAndSetupInterval(true); // Start with an immediate check
        } else {
            setFeedbackMessage({ type: 'error', text: "Gagal memuat popup pembayaran. Fungsi tidak ditemukan.", transactionId: refId });
        }
    } else {
        // Fallback: if no payment_url from orderData, redirect to /confirm, which should re-trigger /process-order
        // This assumes /confirm can gracefully handle re-entry.
        // router.push('/confirm'); // This might be too aggressive. Consider a message.
        setFeedbackMessage({ type: 'error', text: "Tidak dapat mencoba ulang pembayaran, informasi pembayaran tidak ditemukan. Silakan coba dari awal.", transactionId: refId });
    }
  };
  
  const handleGoBack = () => { 
    clearPolling();
    // Determine if contextGame is available, otherwise try to use game slug from orderData if available
    const gameSlug = displayGame?.slug;
    const isFallbackSlug = gameSlug === String(displayGame?.categoryId); // Check if it's a fallback slug

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
    resetPurchase(); // Crucial: resets context and sessionStorage items via context
    if (gameSlug && !isFallbackSlug) {
      if(typeof window !== 'undefined') window.location.href = `/games/${gameSlug}`;
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };
  
  const handleGoToHome = () => {
    clearPolling();
    resetPurchase(); // Crucial
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
    />
  );
};

export default OrderDetailClient;
    

    