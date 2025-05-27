
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
  id: string;
  categoryId: number;
  name: string;
  slug: string;
  imageUrl: string;
  dataAiHint: string;
  description: string;
  packages: DiamondPackage[];
  accountIdFields: AccountIdField[];
}

export const gamesData: Game[] = [
  {
    id: "mobile-legends",
    categoryId: 1001,
    name: "Mobile Legends",
    slug: "mobile-legends",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "fantasy battle",
    description: "Top up Diamond Mobile Legends dalam hitungan detik!",
    accountIdFields: [
      { label: "ID Pengguna", name: "userId", placeholder: "Masukkan ID Pengguna", type: "text" },
      { label: "ID Zona", name: "zoneId", placeholder: "Masukkan ID Zona (cth: 1234)", type: "text" },
    ],
    packages: [],
  },
  {
    id: "free-fire",
    categoryId: 1002,
    name: "Free Fire",
    slug: "free-fire",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "action shooter",
    description: "Dapatkan Diamond Free Fire Anda dengan cepat dan mudah!",
    accountIdFields: [
      { label: "ID Pemain (UID)", name: "uid", placeholder: "Masukkan ID Pemain", type: "text" },
    ],
    packages: [],
  },
  {
    id: "valorant",
    categoryId: 1003,
    name: "Valorant",
    slug: "valorant", // Pastikan slug huruf kecil
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "tactical shooter",
    description: "Beli Valorant Points dengan mudah di sini!",
    accountIdFields: [
      { label: "Riot ID", name: "riotId", placeholder: "Masukkan Riot ID (Nama#Tag)", type: "text" },
    ],
    packages: [],
  },
];

export const getGameBySlug = (slug: string): Game | undefined => {
  if (!slug) return undefined;
  const lowerCaseSlug = slug.toLowerCase();
  return gamesData.find((game) => game.slug.toLowerCase() === lowerCaseSlug);
};

export const parseDiamondsFromName = (name: string): number | undefined => {
  const match = name.match(/(\d+)\s*Diamonds/i) || name.match(/(\d+)\s*Points/i) || name.match(/(\d+)\s*VP/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return undefined;
};
