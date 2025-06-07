
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const RETRY_DELAY_SECONDS = 7;

const RateLimitRetryLoader = () => {
  const router = useRouter();
  const [countdown, setCountdown] = useState(RETRY_DELAY_SECONDS);

  useEffect(() => {
    if (countdown <= 0) {
      router.refresh();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
      <Card className="w-full max-w-md shadow-xl bg-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl md:text-2xl text-primary flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-primary animate-spin mb-4" />
            Server sedang Sibuk
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3 text-sm sm:text-base p-4 sm:p-6 pt-0">
          <p className="text-muted-foreground">
            Lagi banyak banget nih permintaannya, tunggu sebentar ya.
          </p>
          <p className="text-muted-foreground">
            Akan dicoba lagi secara otomatis dalam {countdown} detik...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RateLimitRetryLoader;
