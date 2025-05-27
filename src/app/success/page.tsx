
import SuccessClient from '@/app/(components)/SuccessClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pembelian Berhasil - Sanrize Shop',
  description: 'Pembelian diamond Anda berhasil. Terima kasih telah menggunakan Sanrize Shop!',
};

export default function SuccessPage() {
  return (
    <SuccessClient />
  );
}
