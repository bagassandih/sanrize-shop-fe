
import { getGameBySlug, parseDiamondsFromName, type Game, type DiamondPackage } from '@/lib/data';
import DiamondPackagesClient from '@/app/(components)/DiamondPackagesClient';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

// Interface untuk item dari API /service
interface ApiServiceItem {
  id: number; // ID unik dari service/paket
  created_at: string;
  id_category: number;
  name: string; // misal "5 Diamonds"
  price: number; // Harga dalam IDR
  note: string;
  img: string; // URL gambar produk/paket
  status: string; // misal "available"
  buy_counter: number;
  bonus: string; // misal "5 + 0"
}

async function getPackagesForGame(categoryId: number, gameSlug: string): Promise<DiamondPackage[]> {
  const apiUrl = process.env.BASE_API_URL;
  if (!apiUrl) {
    console.error("BASE_API_URL tidak terdefinisi untuk mengambil paket.");
    return [];
  }

  try {
    const res = await fetch(`${apiUrl}/service?idCategory=${categoryId}`, {
      next: { revalidate: 600 } // Revalidasi setiap 10 menit
    });

    if (!res.ok) {
      console.error(`Gagal mengambil paket untuk kategori ${categoryId}: ${res.status} ${res.statusText}`);
      return [];
    }

    const apiResponse = await res.json();
    const serviceItems: ApiServiceItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];

    if (!Array.isArray(serviceItems)) {
        console.error("Format respons API service tidak valid, diharapkan array.");
        return [];
    }

    return serviceItems
      .filter(item => item.status === 'available')
      .map((item): DiamondPackage => ({
        id: `${gameSlug}_${item.id}`, // Membuat ID unik dengan prefix slug game
        name: item.name,
        diamonds: parseDiamondsFromName(item.name),
        price: item.price,
        bonus: item.bonus,
        imageUrl: item.img,
        // iconName: 'Gem', // Bisa dihapus jika imageUrl selalu ada atau tidak ingin fallback ke Gem
      }));
  } catch (error) {
    console.error(`Error fetching packages for category ${categoryId}:`, error);
    return [];
  }
}

type Props = {
  params: { gameSlug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Untuk metadata, kita bisa mengambil nama game dari data statis atau fetch minimal
  const staticGameData = getGameBySlug(params.gameSlug);
  const gameName = staticGameData?.name || params.gameSlug.replace(/-/g, ' ');
  
  return {
    title: `Paket Diamond ${gameName} - Sanrize Shop`,
    description: `Beli diamond ${gameName} dan mata uang dalam game. Top-up cepat dan aman di Sanrize Shop.`,
  };
}


export default async function GamePackagesPage({ params }: Props) {
  const { gameSlug } = params;
  
  // 1. Dapatkan data game dasar (termasuk categoryId dan accountIdFields)
  const baseGameData = getGameBySlug(gameSlug);

  if (!baseGameData) {
    notFound();
  }

  // 2. Ambil data kategori game dari API (untuk nama dan gambar terbaru jika perlu, atau gunakan dari baseGameData)
  //    Untuk saat ini, kita asumsikan baseGameData sudah cukup untuk nama, deskripsi, dll.
  //    Jika ingin data nama/gambar game selalu terbaru dari API /category, perlu fetch di sini juga.
  //    Kita akan menggunakan `baseGameData.categoryId` untuk mengambil paket.

  // 3. Ambil paket diamond secara dinamis
  const dynamicPackages = await getPackagesForGame(baseGameData.categoryId, gameSlug);

  // 4. Gabungkan data game dasar dengan paket dinamis
  const gameForClient: Game = {
    ...baseGameData, // Ini termasuk id (slug), categoryId, name, slug, imageUrl (fallback), description, accountIdFields
    name: baseGameData.name, // Pastikan menggunakan nama dari data yang lebih akurat jika ada
    imageUrl: baseGameData.imageUrl, // Bisa juga di-override jika /category punya img_logo yg lebih baru
    packages: dynamicPackages, // Override packages dengan yang dari API
  };

  return (
    <DiamondPackagesClient game={gameForClient} />
  );
}
