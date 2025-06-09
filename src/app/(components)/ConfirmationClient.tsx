
"use client";

import { usePurchase } from '@/app/(store)/PurchaseContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Gem, ShieldCheck, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { formatPriceIDR } from '@/lib/utils';
import FeedbackStateCard, { type FeedbackMessage } from './FeedbackStateCard'; // Keep for potential direct error display

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
  const [isProcessing, setIsProcessing] = useState(false); // For the "/process-order" call
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null); // For errors during "/process-order"

  // No more polling logic here. It moves to OrderDetailClient.

  const handleConfirmPurchase = async () => {
    // Clear any local feedback from previous attempts on this page
    setFeedbackMessage(null); 

    if (!selectedGame || !selectedPackage || !accountDetails || !apiUrl) {
      setFeedbackMessage({ type: 'error', text: "Waduh, info pembeliannya kurang lengkap atau API-nya lagi ngambek nih." });
      return;
    }

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
        
        // PurchaseContext already saves to sessionStorage on state change.
        // No need to manually save ref_id here for polling on *this* page.

        if (typeof window.loadJokulCheckout === 'function') {
          window.loadJokulCheckout(payment_url);
          // Redirect to the new order detail page for polling
          router.push(`/order/${ref_id}`); 
          // setIsProcessing will remain true, page navigates away.
          // If navigation fails, user is stuck on /confirm with isProcessing true.
          // This is an edge case. A timeout could reset isProcessing if navigation hangs.
        } else {
          setFeedbackMessage({ type: 'error', text: "Gagal memuat popup pembayaran. Fungsi tidak ditemukan."});
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
  
  useEffect(() => {
    // This effect can be simplified or removed as polling is no longer handled here.
    // It was primarily for `beforeunload` and session recovery for polling.
    // If `isProcessing` is true, it means the `/process-order` call is in flight.
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isProcessing) { 
        const message = 'Yakin ingin keluar? Proses permintaan pembayaran sedang berlangsung.';
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
    };
  }, [isProcessing]);


  if (!selectedGame || !selectedPackage || !accountDetails) {
    // This check is still important if user lands on /confirm directly without context
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mb-4" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-destructive mb-2">Waduh, Infonya Nggak Lengkap</h1>
        <p className="text-muted-foreground mb-6 text-xs sm:text-sm md:text-base">
          Detail pembelianmu nggak ketemu nih. Coba mulai dari awal lagi ya.
        </p>
        <Button onClick={() => { resetPurchase(); router.push('/'); }} variant="outline" size="sm" className="text-xs sm:text-sm">
          Balik ke Beranda
        </Button>
      </div>
    );
  }

  // If there's a feedback message from /process-order attempt
  if (feedbackMessage && feedbackMessage.type === 'error') {
     return (
      <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 p-2 text-center">
        <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-destructive mb-2">Oops, Terjadi Kesalahan</h1>
        <p className="text-muted-foreground mb-4">{feedbackMessage.text}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => router.back()} variant="outline">Kembali</Button>
            <Button onClick={handleConfirmPurchase} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Coba Lagi
            </Button>
        </div>
      </div>
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
    </div>
  );
};

export default ConfirmationClient;
