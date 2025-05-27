
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

// Interface untuk struktur data game dari API /category
interface ApiCategoryItem {
  id: number; 
  created_at: string;
  code: string; 
  name: string; 
  img_logo: string; 
  img_banner: string;
  img_proof: string;
  status: string; 
}

async function getPackagesForGame(categoryId: number, gameSlug: string): Promise<DiamondPackage[]> {
  const apiUrl = process.env.BASE_API_URL;
  if (!apiUrl) {
    console.error("BASE_API_URL tidak terdefinisi untuk mengambil paket.");
    return [];
  }

  try {
    const res = await fetch(`${apiUrl}/service`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idCategory: categoryId }),
      next: { revalidate: 600 } // Revalidasi setiap 10 menit
    });

    if (!res.ok) {
      console.error(`Gagal mengambil paket untuk kategori ${categoryId}: ${res.status} ${res.statusText}`);
      const errorBody = await res.text();
      console.error("Error body:", errorBody);
      return [];
    }

    const apiResponse = await res.json();
    const serviceItems: ApiServiceItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];
    
    if (!Array.isArray(serviceItems)) {
        console.error("Format respons API service tidak valid, diharapkan array. Diterima:", apiResponse);
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
  const apiUrl = process.env.BASE_API_URL;
  let gameName = params.gameSlug.replace(/-/g, ' '); // Fallback name

  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/category`, { next: { revalidate: 3600 } });
      if (res.ok) {
        const apiResponse = await res.json();
        const categories: ApiCategoryItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];
        const currentGameApiData = categories.find(cat => cat.code === params.gameSlug && cat.status === 'active');
        if (currentGameApiData) {
          gameName = currentGameApiData.name;
        }
      }
    } catch (error) {
      console.warn(`Could not fetch category details for metadata for slug ${params.gameSlug}:`, error);
    }
  } else {
     // Fallback to static data if API URL is not defined
    const staticGameData = getGameBySlug(params.gameSlug);
    if (staticGameData) {
      gameName = staticGameData.name;
    }
  }
  
  return {
    title: `Paket Diamond ${gameName} - Sanrize Shop`,
    description: `Beli diamond ${gameName} dan mata uang dalam game. Top-up cepat dan aman di Sanrize Shop.`,
  };
}


export default async function GamePackagesPage({ params }: Props) {
  const { gameSlug } = params;
  const apiUrl = process.env.BASE_API_URL;
  
  // 1. Dapatkan data game dasar statis (terutama untuk accountIdFields dan categoryId fallback)
  const staticGameData = getGameBySlug(gameSlug);

  if (!staticGameData) {
    notFound();
  }

  // Default values from static data
  let dynamicGameName = staticGameData.name;
  let dynamicGameImageUrl = staticGameData.imageUrl;
  let dynamicGameDescription = staticGameData.description;
  let actualCategoryId = staticGameData.categoryId; // Use static categoryId as primary


  // 2. Ambil data game dinamis (nama, gambar logo, categoryId aktual) dari API /category
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/category`, { next: { revalidate: 600 } }); 
      if (res.ok) {
        const apiResponse = await res.json();
        const categories: ApiCategoryItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];
        const currentGameApiData = categories.find(cat => cat.code === gameSlug && cat.status === 'active');

        if (currentGameApiData) {
          dynamicGameName = currentGameApiData.name;
          dynamicGameImageUrl = currentGameApiData.img_logo;
          dynamicGameDescription = `Top up untuk ${currentGameApiData.name}. Pilih paket terbaikmu!`;
          actualCategoryId = currentGameApiData.id; // Gunakan categoryId dari API jika tersedia
        } else {
          console.warn(`Game dengan slug ${gameSlug} tidak ditemukan atau tidak aktif di API /category. Menggunakan data statis.`);
        }
      } else {
        console.error(`Gagal mengambil data kategori untuk ${gameSlug}: ${res.status}. Menggunakan data statis.`);
      }
    } catch (error) {
      console.error(`Error mengambil data kategori untuk ${gameSlug}:`, error, `. Menggunakan data statis.`);
    }
  }


  // 3. Ambil paket diamond secara dinamis menggunakan actualCategoryId
  const dynamicPackages = await getPackagesForGame(actualCategoryId, gameSlug);

  // 4. Gabungkan data game dasar dengan paket dinamis
  const gameForClient: Game = {
    ...staticGameData, // Ini termasuk accountIdFields
    id: gameSlug, // Pastikan id adalah slug
    categoryId: actualCategoryId, // Gunakan categoryId yang mungkin diperbarui
    name: dynamicGameName, 
    slug: gameSlug, 
    imageUrl: dynamicGameImageUrl, 
    description: dynamicGameDescription,
    packages: dynamicPackages,
    dataAiHint: dynamicGameName.toLowerCase().split(/\s+/).slice(0, 2).join(' '),
  };

  return (
    <DiamondPackagesClient game={gameForClient} />
  );
}
