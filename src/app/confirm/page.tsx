
import ConfirmationClient from '@/app/(components)/ConfirmationClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Konfirmasi Pembelian - Sanrize Shop',
  description: 'Tinjau dan konfirmasi pembelian diamond Anda di Sanrize Shop.',
};

export default function ConfirmationPage() {
  return (
    <ConfirmationClient />
  );
}
