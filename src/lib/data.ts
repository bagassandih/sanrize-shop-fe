
import type { LucideIcon } from 'lucide-react';
// Gem icon tidak lagi diimpor langsung di sini karena akan ditangani di komponen klien
// import { Gem } from 'lucide-react';

export interface DiamondPackage {
  id: string;
  name: string;
  diamonds: number;
  price: number; // Harga sekarang dalam IDR
  bonus?: string;
  iconName?: 'Gem';
}

export interface AccountIdField {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
}
export interface Game {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  dataAiHint: string;
  description: string;
  packages: DiamondPackage[];
  accountIdFields: AccountIdField[];
}

const convertPriceToIDR = (usdPrice: number): number => {
  // Kurs perkiraan 1 USD = 15000 IDR
  // Pembulatan sederhana untuk harga yang lebih rapi
  if (usdPrice === 0.99) return 15000;
  if (usdPrice === 1.99) return 30000;
  if (usdPrice === 4.99) return 75000;
  if (usdPrice === 9.99) return 150000;
  return Math.round(usdPrice * 15000 / 1000) * 1000; // Bulatkan ke ribuan terdekat
};

export const gamesData: Game[] = [
  {
    id: "ml",
    name: "Mobile Legends",
    slug: "mobile-legends",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "fantasy battle",
    description: "Top up Diamond Mobile Legends dalam hitungan detik!",
    accountIdFields: [
      { label: "ID Pengguna", name: "userId", placeholder: "Masukkan ID Pengguna", type: "text" },
      { label: "ID Zona", name: "zoneId", placeholder: "Masukkan ID Zona (cth: 1234)", type: "text" },
    ],
    packages: [
      { id: "ml_pkg1", name: "50 Diamonds", diamonds: 50, price: convertPriceToIDR(0.99), bonus: "+5 Bonus", iconName: "Gem" },
      { id: "ml_pkg2", name: "100 Diamonds", diamonds: 100, price: convertPriceToIDR(1.99), bonus: "+10 Bonus", iconName: "Gem" },
      { id: "ml_pkg3", name: "250 Diamonds", diamonds: 250, price: convertPriceToIDR(4.99), bonus: "+25 Bonus", iconName: "Gem" },
      { id: "ml_pkg4", name: "500 Diamonds", diamonds: 500, price: convertPriceToIDR(9.99), bonus: "+65 Bonus", iconName: "Gem" },
    ],
  },
  {
    id: "ff",
    name: "Free Fire",
    slug: "free-fire",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "action shooter",
    description: "Dapatkan Diamond Free Fire Anda dengan cepat dan mudah!",
    accountIdFields: [
      { label: "ID Pemain (UID)", name: "uid", placeholder: "Masukkan ID Pemain", type: "text" },
    ],
    packages: [
      { id: "ff_pkg1", name: "100 Diamonds", diamonds: 100, price: convertPriceToIDR(0.99), iconName: "Gem" },
      { id: "ff_pkg2", name: "210 Diamonds", diamonds: 210, price: convertPriceToIDR(1.99), bonus: "+21 Bonus", iconName: "Gem" },
      { id: "ff_pkg3", name: "530 Diamonds", diamonds: 530, price: convertPriceToIDR(4.99), bonus: "+53 Bonus", iconName: "Gem" },
      { id: "ff_pkg4", name: "1080 Diamonds", diamonds: 1080, price: convertPriceToIDR(9.99), bonus: "+108 Bonus", iconName: "Gem" },
    ],
  },
];

export const getGameBySlug = (slug: string): Game | undefined => {
  return gamesData.find((game) => game.slug === slug);
};
