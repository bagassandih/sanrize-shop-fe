
import { getGameBySlug, parseDiamondsFromName, type Game, type DiamondPackage } from '@/lib/data';
import DiamondPackagesClient from '@/app/(components)/DiamondPackagesClient';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface ApiServiceItem {
  id: number;
  created_at: string;
  id_category: number;
  name: string;
  price: number;
  note: string;
  img: string;
  status: string;
  buy_counter: number;
  bonus: string;
}

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
      next: { revalidate: 600 }
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
        id: `${gameSlug}_${item.id}`,
        name: item.name,
        diamonds: parseDiamondsFromName(item.name),
        price: item.price,
        bonus: item.bonus && String(item.bonus).trim() !== "" ? String(item.bonus) : undefined,
        imageUrl: item.img || undefined, // Pastikan imageUrl adalah string atau undefined
        iconName: !item.img ? 'Gem' : undefined, // Default ke Gem jika tidak ada imageUrl
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
  const lowerCaseGameSlug = params.gameSlug.toLowerCase();
  let gameName = lowerCaseGameSlug.replace(/-/g, ' ');

  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/category`, { next: { revalidate: 3600 } });
      if (res.ok) {
        const apiResponse = await res.json();
        const categories: ApiCategoryItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];
        const currentGameApiData = categories.find(cat => cat.code.toLowerCase() === lowerCaseGameSlug && cat.status === 'active');
        if (currentGameApiData) {
          gameName = currentGameApiData.name;
        }
      }
    } catch (error) {
      console.warn(`Could not fetch category details for metadata for slug ${lowerCaseGameSlug}:`, error);
    }
  } else {
    const staticGameData = getGameBySlug(lowerCaseGameSlug);
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
  const gameSlug = params.gameSlug.toLowerCase(); // Normalisasi slug ke huruf kecil
  const apiUrl = process.env.BASE_API_URL;
  
  const staticGameData = getGameBySlug(gameSlug);

  if (!staticGameData) {
    console.error(`Static game data not found for slug: ${gameSlug}`);
    notFound();
  }

  let dynamicGameName = staticGameData.name;
  let dynamicGameImageUrl = staticGameData.imageUrl;
  let dynamicGameDescription = staticGameData.description;
  let actualCategoryId = staticGameData.categoryId;

  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/category`, { next: { revalidate: 600 } }); 
      if (res.ok) {
        const apiResponse = await res.json();
        const categories: ApiCategoryItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];
        const currentGameApiData = categories.find(cat => cat.code.toLowerCase() === gameSlug && cat.status === 'active');

        if (currentGameApiData) {
          dynamicGameName = currentGameApiData.name;
          dynamicGameImageUrl = currentGameApiData.img_logo;
          dynamicGameDescription = `Top up untuk ${currentGameApiData.name}. Pilih paket terbaikmu!`;
          actualCategoryId = currentGameApiData.id;
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

  const dynamicPackages = await getPackagesForGame(actualCategoryId, gameSlug);

  const gameForClient: Game = {
    ...staticGameData,
    id: gameSlug,
    categoryId: actualCategoryId,
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
