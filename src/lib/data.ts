
import type { LucideIcon } from 'lucide-react';

export interface DiamondPackage {
  id: string;
  name: string;
  diamonds?: number;
  price: number; // Harga dalam IDR
  bonus?: string;
  iconName?: 'Gem';
  imageUrl?: string;
}

export interface AccountIdField {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
}
export interface Game {
  id: string; // slug from apiItem.code
  categoryId: number; // numeric id from apiItem.id
  name: string;
  slug: string;
  imageUrl: string;
  dataAiHint: string;
  description: string;
  packages: DiamondPackage[];
  accountIdFields: AccountIdField[];
}

export const parseDiamondsFromName = (name: string): number | undefined => {
  const match = name.match(/(\d+)\s*Diamonds/i) || name.match(/(\d+)\s*Points/i) || name.match(/(\d+)\s*VP/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return undefined;
};
