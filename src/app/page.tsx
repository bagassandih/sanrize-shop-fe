
import GameSelectionClient from '@/app/(components)/GameSelectionClient';
import type { Game, AccountIdField } from '@/lib/data'; 

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

async function getGames(): Promise<Game[]> {
  const apiUrl = process.env.BASE_API_URL;

  if (!apiUrl) {
    console.error("BASE_API_URL tidak terdefinisi di file .env");
    return [];
  }

  try {
    // Menggunakan cache: 'no-store' untuk selalu mengambil data terbaru
    const res = await fetch(`${apiUrl}/category`, { 
      cache: 'no-store' 
    });

    if (!res.ok) {
      console.error(`Gagal mengambil data kategori game: ${res.status} ${res.statusText}`);
      const errorBody = await res.text();
      console.error("Error body:", errorBody);
      return [];
    }

    const apiResponse = await res.json();
    
    // Menyesuaikan dengan kemungkinan struktur {data: [...]} atau langsung [...]
    const categories: ApiCategoryItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];

    if (!Array.isArray(categories)) {
        console.error("Format respons API kategori tidak valid, diharapkan array. Diterima:", apiResponse);
        return [];
    }

    return categories
      .filter(apiItem => apiItem.status === 'active') 
      .map((apiItem): Game => {
        const nameParts = apiItem.name.toLowerCase().split(/\s+/);
        const hintKeywords = nameParts.slice(0, 2).join(' ');

        return {
          id: apiItem.code, 
          categoryId: apiItem.id, 
          name: apiItem.name,
          slug: apiItem.code, 
          imageUrl: apiItem.img_logo, 
          dataAiHint: hintKeywords, 
          description: `Top up untuk ${apiItem.name}. Pilih paket terbaikmu!`,
          packages: [], 
          accountIdFields: [], // Akan diisi di halaman detail game
        };
      });
  } catch (error) {
    console.error("Terjadi kesalahan saat mengambil data kategori game:", error);
    return [];
  }
}

export default async function HomePage() {
  const games = await getGames();
  return (
    <GameSelectionClient games={games} /> 
  );
}
