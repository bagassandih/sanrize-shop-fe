
import type { LucideIcon } from 'lucide-react';

export interface DiamondPackage {
  id: string; // ID unik paket, bisa dari API
  name: string; // Nama paket, misal "50 Diamonds"
  diamonds?: number; // Jumlah diamond, opsional jika sudah ada di nama
  price: number; // Harga dalam IDR
  bonus?: string; // Bonus jika ada, misal "+5 Bonus" atau "5 + 0"
  iconName?: 'Gem'; // Untuk fallback jika tidak ada imageUrl
  imageUrl?: string; // URL gambar spesifik paket
}

export interface AccountIdField {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
}
export interface Game {
  id: string; // Slug atau kode unik game, misal "mobile-legends"
  categoryId: number; // ID numerik dari API /category, misal 1001
  name: string;
  slug: string;
  imageUrl: string; // URL logo game
  dataAiHint: string;
  description: string;
  packages: DiamondPackage[]; // Akan diisi dinamis dari API /service
  accountIdFields: AccountIdField[];
}

// Data statis ini bisa berfungsi sebagai fallback atau untuk field yang tidak ada di API (seperti accountIdFields)
export const gamesData: Game[] = [
  {
    id: "mobile-legends", // cocok dengan 'code' dari API /category
    categoryId: 1001, // 'id' numerik dari API /category
    name: "Mobile Legends",
    slug: "mobile-legends",
    imageUrl: "https://placehold.co/600x400.png", // Ini bisa di-override oleh img_logo dari API
    dataAiHint: "fantasy battle",
    description: "Top up Diamond Mobile Legends dalam hitungan detik!",
    accountIdFields: [
      { label: "ID Pengguna", name: "userId", placeholder: "Masukkan ID Pengguna", type: "text" },
      { label: "ID Zona", name: "zoneId", placeholder: "Masukkan ID Zona (cth: 1234)", type: "text" },
    ],
    packages: [], // Akan diisi oleh API
  },
  {
    id: "free-fire", // cocok dengan 'code' dari API /category
    categoryId: 1002, // 'id' numerik dari API /category (asumsi untuk Free Fire)
    name: "Free Fire",
    slug: "free-fire",
    imageUrl: "https://placehold.co/600x400.png", // Ini bisa di-override oleh img_logo dari API
    dataAiHint: "action shooter",
    description: "Dapatkan Diamond Free Fire Anda dengan cepat dan mudah!",
    accountIdFields: [
      { label: "ID Pemain (UID)", name: "uid", placeholder: "Masukkan ID Pemain", type: "text" },
    ],
    packages: [], // Akan diisi oleh API
  },
  {
    id: "valorant", // cocok dengan 'code' dari API /category jika ada
    categoryId: 1003, // Asumsi ID kategori untuk Valorant (API akan override jika ada)
    name: "Valorant",
    slug: "valorant",
    imageUrl: "https://placehold.co/600x400.png", // Akan di-override oleh img_logo dari API
    dataAiHint: "tactical shooter",
    description: "Beli Valorant Points dengan mudah di sini!",
    accountIdFields: [
      { label: "Riot ID", name: "riotId", placeholder: "Masukkan Riot ID (Nama#Tag)", type: "text" },
    ],
    packages: [], // Akan diisi oleh API
  },
  // Tambahkan game lain di sini jika ada data statisnya
];

export const getGameBySlug = (slug: string): Game | undefined => {
  // Mencari di data statis. Ini akan memberikan AccountIdFields dan categoryId.
  // Informasi lain seperti nama, deskripsi, imageUrl akan dioverride oleh data dari /category di page.tsx.
  // Dan packages akan dioverride oleh data dari /service di [gameSlug]/page.tsx.
  return gamesData.find((game) => game.slug === slug);
};

// Helper function to parse diamonds from package name
export const parseDiamondsFromName = (name: string): number | undefined => {
  const match = name.match(/(\d+)\s*Diamonds/i) || name.match(/(\d+)\s*Points/i) || name.match(/(\d+)\s*VP/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return undefined;
};
