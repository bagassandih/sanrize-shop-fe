
import OrderDetailClient from '@/app/(components)/OrderDetailClient';
import type { Metadata } from 'next';

export const runtime = 'edge';

type Props = {
  params: { refId: string };
};

// Note: Generating dynamic metadata that depends on the specific order 
// would require fetching the order details here. For simplicity,
// we'll use a generic title for now. If specific order details are needed
// in the title/description, this function would need to fetch data.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Detail Transaksi - Sanrize Shop`,
    description: `Rincian dan status transaksi Anda dengan ID ${params.refId}.`,
  };
}

export default function OrderDetailPage({ params }: Props) {
  const apiUrl = process.env.BASE_API_URL;
  const xApiToken = process.env.X_API_TOKEN;
  const { refId } = params;

  if (!apiUrl || !xApiToken) {
    // Handle missing environment variables, perhaps render an error component
    // or log a server-side error. For now, we'll assume they are present.
    console.error("API URL or Token is not configured in environment variables.");
  }

  return (
    <OrderDetailClient 
      refId={refId} 
      apiUrl={apiUrl} 
      xApiToken={xApiToken} 
    />
  );
}
