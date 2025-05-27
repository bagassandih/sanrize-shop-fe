
"use client";

import { usePurchase } from '@/app/(store)/PurchaseContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Gem } from 'lucide-react'; // Import Gem
import Image from 'next/image';

const ConfirmationClient = () => {
  const router = useRouter();
  const { selectedGame, selectedPackage, accountDetails, resetPurchase } = usePurchase();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!selectedGame || !selectedPackage || !accountDetails) {
      // If critical data is missing, redirect to home.
      // This can happen if user navigates here directly.
      router.replace('/');
    }
  }, [selectedGame, selectedPackage, accountDetails, router]);

  const handleConfirmPurchase = async () => {
    setIsProcessing(true);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000)); 
    setIsProcessing(false);
    router.push('/success');
  };

  if (!selectedGame || !selectedPackage || !accountDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl sm:text-3xl font-bold text-destructive mb-2">Missing Information</h1>
        <p className="text-muted-foreground mb-6 text-sm sm:text-base">
          We couldn't find your purchase details. Please start over.
        </p>
        <Button onClick={() => router.push('/')} variant="outline">
          Go to Homepage
        </Button>
      </div>
    );
  }


  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
         <ShieldCheck className="h-10 w-10 sm:h-12 sm:w-12 text-primary mx-auto mb-4" />
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Confirm Your Purchase</h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Please review your order details below before completing the purchase.
        </p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl text-accent flex items-center">
            <Image 
              src={selectedGame.imageUrl} 
              alt={selectedGame.name} 
              width={40} 
              height={40} 
              className="rounded-md mr-3 border border-border"
              data-ai-hint={selectedGame.dataAiHint}
            />
            {selectedGame.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-primary mb-1">Selected Package:</h3>
            <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-md">
              {selectedPackage.iconName === "Gem" && <Gem className="h-7 w-7 sm:h-8 sm:w-8 text-accent" />}
              <div>
                <p className="font-medium text-foreground text-sm sm:text-base">{selectedPackage.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {selectedPackage.diamonds.toLocaleString()} Diamonds
                  {selectedPackage.bonus && ` (${selectedPackage.bonus})`}
                </p>
              </div>
              <p className="ml-auto font-semibold text-foreground text-sm sm:text-base">${selectedPackage.price.toFixed(2)}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-primary mb-1">Account Details:</h3>
            <ul className="list-disc list-inside space-y-1 pl-2 bg-muted/30 p-3 rounded-md text-sm sm:text-base">
              {Object.entries(accountDetails).map(([key, value]) => {
                  const fieldLabel = selectedGame.accountIdFields.find(f => f.name === key)?.label || key;
                  return (
                    <li key={key} className="text-foreground">
                      <span className="font-medium text-muted-foreground">{fieldLabel}: </span>{value}
                    </li>
                  );
              })}
            </ul>
          </div>

          <div className="text-right mt-4">
            <p className="text-lg sm:text-xl font-bold text-foreground">
              Total: <span className="text-accent">${selectedPackage.price.toFixed(2)}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={handleConfirmPurchase} 
        disabled={isProcessing}
        size="lg"
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Confirm & Pay
          </>
        )}
      </Button>
    </div>
  );
};

export default ConfirmationClient;

