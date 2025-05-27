
import GameSelectionClient from '@/app/(components)/GameSelectionClient';
import type { Game } from '@/lib/data'; // Pastikan tipe Game diimpor

// Interface untuk struktur data game dari API /category
interface ApiCategoryItem {
  id: number; // ID numerik, misal 1001
  created_at: string;
  code: string; // Digunakan untuk slug dan id internal game, misal "mobile-legends"
  name: string; // Nama game
  img_logo: string; // URL logo game
  img_banner: string;
  img_proof: string;
  status: string; // Misalnya "active"
}

// Fungsi untuk mengambil data game dari API
async function getGames(): Promise<Game[]> {
  const apiUrl = process.env.BASE_API_URL;

  if (!apiUrl) {
    console.error("BASE_API_URL tidak terdefinisi di file .env");
    return [];
  }

  try {
    const res = await fetch(`${apiUrl}/category`, { 
      next: { revalidate: 3600 } // Revalidasi data setiap 1 jam
    });

    if (!res.ok) {
      console.error(`Gagal mengambil data kategori game: ${res.status} ${res.statusText}`);
      return [];
    }

    const apiResponse = await res.json();
    
    const categories: ApiCategoryItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];

    if (!Array.isArray(categories)) {
        console.error("Format respons API kategori tidak valid, diharapkan array.");
        return [];
    }

    return categories
      .filter(apiItem => apiItem.status === 'active') // Filter hanya game yang aktif
      .map((apiItem): Game => {
        const nameParts = apiItem.name.toLowerCase().split(/\s+/);
        const hintKeywords = nameParts.slice(0, 2).join(' ');

        return {
          id: apiItem.code, // Menggunakan 'code' sebagai ID unik internal aplikasi (slug)
          categoryId: apiItem.id, // ID numerik dari API untuk pemanggilan /service
          name: apiItem.name,
          slug: apiItem.code, // Menggunakan 'code' sebagai slug
          imageUrl: apiItem.img_logo, 
          dataAiHint: hintKeywords, 
          description: `Top up untuk ${apiItem.name}. Pilih paket terbaikmu!`,
          packages: [], // Akan diisi dinamis pada halaman detail game
          accountIdFields: [], // Akan diambil dari data statis atau API lain jika ada
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
