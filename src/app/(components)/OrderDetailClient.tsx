
"use client";

import { usePurchase } from '@/app/(store)/PurchaseContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import FeedbackStateCard, { type FeedbackMessage } from './FeedbackStateCard';
import type { Order, OrderItemStatusCode, Game, DiamondPackage, AccountDetails as ContextAccountDetails } from '@/lib/data';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

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

  const checkOrderStatusAndSetupInterval = useCallback(async (isInitialFetch: boolean = false) => {
    if (!apiUrl || !refId) {
      clearPolling();
      setFeedbackMessage(prev => (!prev || (prev.type !== 'success' && prev.type !== 'error')) ? { type: 'error', text: "Konfigurasi API atau ID Referensi bermasalah.", transactionId: refId } : prev);
      setIsProcessing(false);
      return;
    }
    
    if (!isProcessingRef.current && !isInitialFetch) {
        clearPolling();
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
             setFeedbackMessage(prev => (!prev || (prev.type !== 'success' && prev.type !== 'error')) ? { type: 'info', text: "Waduh, koneksi internetnya putus. Cek jaringanmu dulu ya. Pemeriksaan status akan dilanjutkan.", transactionId: refId} : prev);
        } else {
           setFeedbackMessage(prev => (!prev || (prev.type !== 'success' && prev.type !== 'error')) ? { type: 'error', text: detailedErrorMessage, transactionId: refId } : prev);
           // For critical errors like 404 on initial fetch, stop processing.
           if (response.status === 404 && isInitialFetch) {
             clearPolling();
             setIsProcessing(false);
           }
        }
        // If it's not an initial fetch 404, polling might continue via existing interval for transient errors.
        if (isInitialFetch && response.status !== 404 && !pollingIntervalRef.current && isProcessingRef.current) {
            pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000);
        }
        return;
      }

      const result = await response.json();
      
      if (!Array.isArray(result) || result.length === 0) {
        setFeedbackMessage(prev => (prev === null || (prev.type !== 'success' && prev.type !== 'error')) ? { type: 'error', text: `Transaksi dengan ID ${refId} tidak ditemukan atau respons tidak valid.`, transactionId: refId } : prev);
        clearPolling();
        setIsProcessing(false);
        return;
      }
      const currentOrderInstance: Order = result[0];
      setOrderData(currentOrderInstance);


      if (!currentOrderInstance.id_status || !currentOrderInstance.id_status.code) {
        setFeedbackMessage(prev => (prev === null || prev.type === 'info') ? { type: 'error', text: "Data status pesanan tidak valid dari server.", transactionId: refId } : prev);
        clearPolling();
        setIsProcessing(false);
        return;
      }

      const statusCode = String(currentOrderInstance.id_status.code).toUpperCase() as OrderItemStatusCode;
      const statusName = currentOrderInstance.id_status.name || "Tidak diketahui";
      const orderOriginalRefId = currentOrderInstance.ref_id || refId;

      if (statusCode.includes('SCCD') || statusCode.includes('SCCR')) {
        clearPolling();
        setFeedbackMessage({ type: 'success', text: `Asiiik, pembayaran berhasil! Status: ${statusName}. Item akan segera dikirim.`, transactionId: orderOriginalRefId });
        setIsProcessing(false);
      } else if (statusCode.includes('FAILD') || statusCode.includes('FAILR')) {
        clearPolling();
        setFeedbackMessage({ type: 'error', text: `Yah, pembayaran kamu ${statusName}.`, transactionId: orderOriginalRefId });
        setIsProcessing(false);
      } else if (statusCode.includes('PNDD') || statusCode.includes('PNDR')) {
        setFeedbackMessage({ type: 'info', text: `Status: ${statusName}. Menunggu konfirmasi...`, transactionId: orderOriginalRefId });
        if (!pollingIntervalRef.current && isProcessingRef.current) {
          pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000);
        }
        if (!isProcessing) setIsProcessing(true);
      } else { 
        setFeedbackMessage({ type: 'info', text: `Status: ${statusName}. Menunggu update... (Kode: ${statusCode})`, transactionId: orderOriginalRefId });
         if (!pollingIntervalRef.current && isProcessingRef.current) {
           pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000);
        }
        if (!isProcessing) setIsProcessing(true);
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
      
      if (!pollingIntervalRef.current && isProcessingRef.current) {
        pollingIntervalRef.current = setInterval(() => checkOrderStatusAndSetupInterval(false), 30000);
      }
    }
  }, [apiUrl, xApiToken, refId, clearPolling, isProcessing]);


  useEffect(() => {
    if (refId) {
      setIsProcessing(true);
      setFeedbackMessage(null);
      clearPolling();
      checkOrderStatusAndSetupInterval(true); // Perform initial fetch directly
    }
    return () => {
      clearPolling();
    };
  }, [refId, checkOrderStatusAndSetupInterval, clearPolling]); 

  const getFallbackGame = (): Game | null => {
    if (!orderData || !orderData.id_service) return null;
    return {
      id: String(orderData.id_service.id_category),
      categoryId: orderData.id_service.id_category,
      name: orderData.id_service.id_category ? `Game (Kategori: ${orderData.id_service.id_category})` : (orderData.id_service.name || "Nama Game Tidak Diketahui"),
      slug: String(orderData.id_service.id_category),
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
    if (orderData.user_id) details.userId = orderData.user_id;
    if (orderData.zone_id) details.zoneId = orderData.zone_id;
    return details;
  };

  const displayGame = contextGame || getFallbackGame();
  const displayPackage = contextPackage || getFallbackPackage();
  const displayAccountDetails = contextAccountDetails || getFallbackAccountDetails();

  if ((!displayGame || !displayPackage || !displayAccountDetails) && isProcessingRef.current) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
          <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-primary animate-spin mb-4" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">Memuat detail transaksi...</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Harap tunggu sebentar.</p>
        </div>
      );
  }
  
  if (!displayGame || !displayPackage || !displayAccountDetails) {
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
                            { type: 'info', text: "Tidak ada informasi status terbaru atau proses selesai tanpa status final.", transactionId: refId });


  const handleRetryPayment = () => {
    clearPolling();
    if (orderData?.payment_url) { // Assuming payment_url might exist on orderData if retry is possible
        if (typeof window.loadJokulCheckout === 'function') {
            window.loadJokulCheckout(orderData.payment_url);
            setIsProcessing(true);
            setFeedbackMessage({ type: 'info', text: "Memeriksa status pembayaran setelah mencoba lagi...", transactionId: refId });
            checkOrderStatusAndSetupInterval(true);
        } else {
            setFeedbackMessage({ type: 'error', text: "Gagal memuat popup pembayaran. Fungsi tidak ditemukan.", transactionId: refId });
        }
    } else {
        // If no payment_url, implies cannot easily retry. Guide user to start over or go to confirm.
        // Going to /confirm might re-trigger /process-order if context is still set.
        // Let's try navigating back to confirm page to re-initiate the process.
         router.push('/confirm');
        // setFeedbackMessage({ type: 'error', text: "Tidak dapat mencoba ulang pembayaran, informasi pembayaran tidak ditemukan. Silakan coba dari awal.", transactionId: refId });
    }
  };
  
  const handleGoBack = () => { 
    clearPolling();
    const gameSlug = displayGame?.slug;
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

    