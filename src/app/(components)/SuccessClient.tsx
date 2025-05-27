"use client";

import { usePurchase } from '@/app/(store)/PurchaseContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CheckCircle, PartyPopper, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

const SuccessClient = () => {
  const router = useRouter();
  const { selectedGame, selectedPackage, accountDetails, resetPurchase } = usePurchase();

  useEffect(() => {
    // Check if crucial data exists, if not, maybe the user landed here by mistake.
    // For a success page, it might be okay even if context is partially cleared,
    // but ideally, some token or ID would confirm the success state.
    // For this simulation, we assume context is still valid or partially valid from confirmation.
    
    // Reset purchase details after showing success message
    // This should be done when user navigates away or after a timeout.
    // For now, we'll reset it when they click "Back to Home".
  }, []);


  const handleGoHome = () => {
    resetPurchase();
    router.push('/');
  };
  
  if (!selectedGame || !selectedPackage) {
    // If essential details are missing, show a generic success or redirect.
    // This scenario means the context was cleared before reaching here or direct navigation.
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
            <PartyPopper className="h-20 w-20 text-green-500 mb-6" />
            <h1 className="text-4xl font-bold text-foreground mb-3">Purchase Successful!</h1>
            <p className="text-xl text-muted-foreground mb-8">
                Your order has been processed. Thank you for shopping with Sanrize Shop!
            </p>
            <Button onClick={handleGoHome} size="lg" className="bg-primary hover:bg-primary/80 text-primary-foreground">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Shop Again
            </Button>
        </div>
    );
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <PartyPopper className="h-20 w-20 text-green-500 mb-6 animate-bounce" />
        <h1 className="text-4xl font-bold text-foreground mb-3">Thank You! Purchase Complete!</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-xl">
            Your diamonds for <span className="font-semibold text-accent">{selectedGame.name}</span> have been successfully processed and should reflect in your account shortly.
        </p>

        <Card className="w-full max-w-md shadow-xl mb-8 bg-card">
            <CardHeader>
                <CardTitle className="text-2xl text-primary flex items-center justify-center">
                    <CheckCircle className="mr-2 h-7 w-7"/> Order Summary
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-left">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Game:</span>
                    <span className="font-medium text-foreground">{selectedGame.name}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Package:</span>
                    <span className="font-medium text-foreground">{selectedPackage.name} ({selectedPackage.diamonds} Diamonds)</span>
                </div>
                {accountDetails && Object.entries(accountDetails).map(([key, value]) => {
                     const fieldLabel = selectedGame.accountIdFields.find(f => f.name === key)?.label || key;
                     return (
                        <div className="flex justify-between" key={key}>
                            <span className="text-muted-foreground">{fieldLabel}:</span>
                            <span className="font-medium text-foreground">{value}</span>
                        </div>
                     );
                })}
                <div className="flex justify-between border-t border-border pt-3 mt-3">
                    <span className="text-muted-foreground text-lg">Total Paid:</span>
                    <span className="font-bold text-accent text-lg">${selectedPackage.price.toFixed(2)}</span>
                </div>
            </CardContent>
        </Card>

        <Button onClick={handleGoHome} size="lg" className="bg-primary hover:bg-primary/80 text-primary-foreground">
             <ShoppingBag className="mr-2 h-5 w-5" />
            Back to Home
        </Button>
    </div>
  );
};

export default SuccessClient;
