
import ConfirmationClient from '@/app/(components)/ConfirmationClient';
import type { Metadata } from 'next';

export const runtime = 'edge';

export const metadata: Metadata = {
  title: 'Konfirmasi Pembelian - Sanrize Shop',
  description: 'Tinjau dan konfirmasi pembelian diamond Anda di Sanrize Shop.',
};

export default function ConfirmationPage() {
  const apiUrl = process.env.BASE_API_URL;
  const xApiToken = process.env.X_API_TOKEN;
  return (
    <ConfirmationClient apiUrl={apiUrl} xApiToken={xApiToken} />
  );
}
