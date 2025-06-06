
import GameSelectionClient from '@/app/(components)/GameSelectionClient';
import HowToOrderSection from '@/app/(components)/HowToOrderSection';
import type { Game, AccountIdField } from '@/lib/data'; 

export const runtime = 'edge';

interface ApiCategoryItem {
  id: number; 
  created_at: string;
  code: string; 
  name: string; 
  img_logo: string; 
  img_banner: string;
  img_proof: string;
  status: string; 
  account_id_field?: AccountIdField[];
}

async function getGames(): Promise<Game[]> {
  const apiUrl = process.env.BASE_API_URL;

  if (!apiUrl) {
    // console.error("BASE_API_URL tidak terdefinisi di file .env");
    return [];
  }

  try {
    const res = await fetch(`${apiUrl}/category`, { 
      cache: 'no-store',
      mode: 'cors' 
    });

    if (!res.ok) {
      // console.error(`Gagal mengambil data kategori game: ${res.status} ${res.statusText}`);
      // const errorBody = await res.text(); // Kept if errorBody is used elsewhere, otherwise remove
      // console.error("Error body:", errorBody);
      return [];
    }

    const apiResponse = await res.json();
    
    // Cek apakah apiResponse adalah array atau objek dengan properti 'data'
    const categories: ApiCategoryItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];

    if (!Array.isArray(categories)) {
        // console.error("Format respons API kategori tidak valid, diharapkan array atau objek dengan properti data array. Diterima:", apiResponse);
        return [];
    }

    return categories
      .filter(apiItem => apiItem.status === 'active') 
      .map((apiItem): Game => {
        const nameParts = apiItem.name.toLowerCase().split(/\s+/);
        const hintKeywords = nameParts.slice(0, 2).join(' ');

        const accountIdFields = Array.isArray(apiItem.account_id_field) ? apiItem.account_id_field : [];

        return {
          id: apiItem.code, 
          categoryId: apiItem.id, 
          name: apiItem.name,
          slug: apiItem.code, 
          imageUrl: apiItem.img_logo, 
          dataAiHint: hintKeywords, 
          description: `Top up untuk ${apiItem.name}. Pilih paket terbaikmu!`,
          packages: [], 
          accountIdFields: accountIdFields,
        };
      });
  } catch (error) {
    // console.error("Terjadi kesalahan saat mengambil data kategori game:", error);
    return [];
  }
}

export default async function HomePage() {
  const games = await getGames();
  return (
    <div className="space-y-12 sm:space-y-16 md:space-y-20">
      <GameSelectionClient games={games} /> 
      <HowToOrderSection />
    </div>
  );
}

