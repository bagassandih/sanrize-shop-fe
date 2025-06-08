
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

// Types for /order endpoint response based on user example
export interface OrderItemStatus {
  id: number;
  code: string;
  name: string;
  created_at: string;
  description: string;
}

export interface OrderItemService {
  id: number;
  img?: string;
  name: string;
  note?: string;
  bonus?: string;
  price: number; // This might be the base price, not markup_price
  status: string;
  created_at: string;
  buy_counter: number;
  id_category: number;
  markup_price?: number; // Actual price charged to user
  markup_percentage?: number;
}

export interface Order {
  id: number;
  id_status: OrderItemStatus;
  id_service: OrderItemService;
  nickname: string;
  user_id: string;
  note?: string | null;
  created_at: string;
  ref_id: string; // Crucial for matching
  order_id?: string; // External order ID
  zone_id?: string;
}

// For stricter type checking on status names
export type OrderItemStatusCode = 
  | 'PNDD' 
  | 'PNDR' 
  | 'SCCD' 
  | 'SCCR' 
  | 'FAILD' 
  | 'FAILR'
  | string; // Fallback for other potential statuses
