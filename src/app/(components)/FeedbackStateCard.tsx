
import type { Game, DiamondPackage } from '@/lib/data';
import type { AccountDetails } from '@/app/(store)/PurchaseContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft, Info, PartyPopper, RefreshCw, ShoppingBag } from 'lucide-react';
import TransactionSummary from './TransactionSummary';
import { cn } from "@/lib/utils";

export interface FeedbackMessage {
  type: 'success' | 'error' | 'info';
  text: string;
  transactionId?: string;
}

interface FeedbackStateCardProps {
  feedbackMessage: FeedbackMessage;
  selectedGame: Game;
  selectedPackage: DiamondPackage;
  accountDetails: AccountDetails;
  onRetryPayment: () => void;
  onGoBack: () => void;
  onProceedToSuccess: () => void;
}

const FeedbackStateCard = ({
  feedbackMessage,
  selectedGame,
  selectedPackage,
  accountDetails,
  onRetryPayment,
  onGoBack,
  onProceedToSuccess,
}: FeedbackStateCardProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <Card className={cn(
        "my-6 shadow-xl w-full max-w-lg",
        feedbackMessage.type === 'success' && "border-green-500 bg-green-500/10",
        feedbackMessage.type === 'error' && "border-destructive bg-destructive/10",
        feedbackMessage.type === 'info' && "border-sky-500 bg-sky-500/10"
      )}>
        <CardHeader className="flex flex-col items-center text-center space-y-3 p-4 sm:p-6">
          {feedbackMessage.type === 'success' && <PartyPopper className="h-10 w-10 sm:h-12 sm:w-12 text-green-500" />}
          {feedbackMessage.type === 'error' && <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive" />}
          {feedbackMessage.type === 'info' && <Info className="h-10 w-10 sm:h-12 sm:w-12 text-sky-500" />}
          <CardTitle className={cn(
            "text-lg sm:text-xl md:text-2xl",
            feedbackMessage.type === 'success' && "text-green-700 dark:text-green-400",
            feedbackMessage.type === 'error' && "text-destructive",
            feedbackMessage.type === 'info' && "text-sky-700 dark:text-sky-400"
          )}>
            {feedbackMessage.type === 'success' ? "Pembayaran Berhasil!" : feedbackMessage.type === 'error' ? "Waduh, Ada Masalah Nih!" : "Informasi Penting"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 text-center">
          <p className={cn(
            "text-sm sm:text-base mb-4",
            feedbackMessage.type === 'success' && "text-green-600 dark:text-green-300",
            feedbackMessage.type === 'error' && "text-destructive/90",
            feedbackMessage.type === 'info' && "text-sky-600 dark:text-sky-300"
          )}>
            {feedbackMessage.text}
          </p>

          <TransactionSummary
            selectedGame={selectedGame}
            selectedPackage={selectedPackage}
            accountDetails={accountDetails}
            transactionId={feedbackMessage.transactionId}
          />

          {feedbackMessage.type === 'success' && (
            <Button
              onClick={onProceedToSuccess}
              className="mt-4 w-full sm:w-auto bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Lanjut ke Halaman Sukses
            </Button>
          )}
          {feedbackMessage.type === 'error' && (
            <div className="mt-6 flex flex-col sm:flex-row sm:justify-center sm:space-x-4 space-y-3 sm:space-y-0">
              <Button
                variant="outline"
                onClick={onGoBack}
                className="w-full sm:w-auto"
                size="sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali
              </Button>
              <Button
                onClick={onRetryPayment}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                size="sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Coba Bayar Lagi
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackStateCard;
