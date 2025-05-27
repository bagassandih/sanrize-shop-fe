import SuccessClient from '@/app/(components)/SuccessClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Purchase Successful - Sanrize Shop',
  description: 'Your diamond purchase was successful. Thank you for using Sanrize Shop!',
};

export default function SuccessPage() {
  return (
    <SuccessClient />
  );
}
