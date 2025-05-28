import { Loader2 } from 'lucide-react';

export default function Loading() {
  // Anda dapat menambahkan UI Skeleton kustom di sini atau apa pun yang Anda inginkan
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-250px)]"> {/* Sesuaikan min-h jika perlu */}
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
}
