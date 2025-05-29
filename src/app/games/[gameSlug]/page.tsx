
import { parseDiamondsFromName, type Game, type DiamondPackage, type AccountIdField } from '@/lib/data';
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
  account_id_field?: AccountIdField[]; // Tambahkan ini, buat opsional
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
      cache: 'no-store' 
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
        bonus: item.bonus && String(item.bonus).trim() !== "" && String(item.bonus).toLowerCase() !== "0" && String(item.bonus).toLowerCase() !== "null" ? String(item.bonus) : undefined,
        imageUrl: item.img && item.img.trim() !== "" ? item.img : undefined,
        iconName: (!item.img || item.img.trim() === "") ? 'Gem' : undefined,
      }));
  } catch (error) {
    console.error(`Error fetching packages for category ${categoryId}:`, error);
    return [];
  }
}

// Fungsi getAccountIdFieldsBySlug sudah tidak diperlukan lagi dan akan dihapus.

type Props = {
  params: { gameSlug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const apiUrl = process.env.BASE_API_URL;
  const lowerCaseGameSlug = params.gameSlug.toLowerCase();
  let gameName = lowerCaseGameSlug.replace(/-/g, ' '); 

  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/category`, { cache: 'no-store' }); 
      if (res.ok) {
        const apiResponse = await res.json();
        const categories: ApiCategoryItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];
        const currentGameApiData = categories.find(cat => cat.code.toLowerCase() === lowerCaseGameSlug && cat.status === 'active');
        if (currentGameApiData) {
          gameName = currentGameApiData.name;
        }
      }
    } catch (error) {
      console.warn(`Tidak dapat mengambil detail kategori untuk metadata slug ${lowerCaseGameSlug}:`, error);
    }
  }
  
  return {
    title: `Paket Diamond ${gameName} - Sanrize Shop`,
    description: `Beli diamond ${gameName} dan mata uang dalam game. Top-up cepat dan aman di Sanrize Shop.`,
  };
}

export default async function GamePackagesPage({ params }: Props) {
  const gameSlug = params.gameSlug.toLowerCase();
  const apiUrl = process.env.BASE_API_URL;
  
  let gameFromApi: ApiCategoryItem | undefined;

  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/category`, { cache: 'no-store' }); 
      if (res.ok) {
        const apiResponse = await res.json();
        const categories: ApiCategoryItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];
        gameFromApi = categories.find(cat => cat.code.toLowerCase() === gameSlug && cat.status === 'active');
      } else {
        console.error(`Gagal mengambil data kategori dari API: ${res.status}. Slug: ${gameSlug}`);
      }
    } catch (error) {
      console.error(`Error mengambil data kategori dari API untuk slug ${gameSlug}:`, error);
    }
  }

  if (!gameFromApi) {
    console.error(`Game dengan slug '${gameSlug}' tidak ditemukan di API atau API tidak dapat dijangkau, atau status tidak aktif.`);
    notFound();
  }

  // Memastikan account_id_field adalah array, default ke array kosong jika tidak ada atau bukan array
  const accountIdFieldsFromApi = Array.isArray(gameFromApi.account_id_field) ? gameFromApi.account_id_field : [];

  const dynamicPackages = await getPackagesForGame(gameFromApi.id, gameSlug);

  const nameParts = gameFromApi.name.toLowerCase().split(/\s+/);
  const hintKeywords = nameParts.slice(0, 2).join(' ');

  const gameForClient: Game = {
    id: gameFromApi.code, 
    categoryId: gameFromApi.id, 
    name: gameFromApi.name, 
    slug: gameFromApi.code, 
    imageUrl: gameFromApi.img_logo, 
    description: `Top up untuk ${gameFromApi.name}. Pilih paket terbaikmu!`, 
    packages: dynamicPackages,
    accountIdFields: accountIdFieldsFromApi, // Ambil dari API
    dataAiHint: hintKeywords,
  };

  return (
    <DiamondPackagesClient game={gameForClient} />
  );
}
