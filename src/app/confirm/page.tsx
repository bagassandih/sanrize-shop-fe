import ConfirmationClient from '@/app/(components)/ConfirmationClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Confirm Purchase - Sanrize Shop',
  description: 'Review and confirm your diamond purchase at Sanrize Shop.',
};

export default function ConfirmationPage() {
  return (
    <ConfirmationClient />
  );
}
