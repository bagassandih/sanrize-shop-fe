
import type { LucideIcon } from 'lucide-react';

export interface DiamondPackage {
  id: string; // Frontend unique ID (e.g., gameSlug_originalId)
  originalId: number; // Original ID from the API service, used for processing order
  name: string;
  diamonds?: number;
  price: number; // Harga dalam IDR
  bonus?: string;
  iconName?: 'Gem';
  imageUrl?: string;
  buy_counter?: number; // Added to track sales volume
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
