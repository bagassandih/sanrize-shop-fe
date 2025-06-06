
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const ProcessingStateCard = () => {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <Card className="my-6 border-primary bg-primary/10 shadow-lg w-full max-w-md">
        <CardHeader className="flex flex-col items-center text-center space-y-4 sm:space-y-6 p-6 sm:p-8">
          <Loader2 className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 text-primary animate-spin" />
          <CardTitle className="text-2xl sm:text-3xl md:text-4xl text-primary">
            Sedang Memproses...
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 pt-0 text-center">
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
            Sabar ya, status pembayaranmu lagi dicek nih. Mohon jangan refresh atau tutup halaman ini. Popup pembayaran akan muncul atau status akan diperbarui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessingStateCard;
