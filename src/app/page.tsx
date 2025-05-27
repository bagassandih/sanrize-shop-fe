
import GameSelectionClient from '@/app/(components)/GameSelectionClient';
import type { Game } from '@/lib/data'; // Pastikan tipe Game diimpor

// Fungsi untuk mengambil data game dari API
async function getGames(): Promise<Game[]> {
  const apiUrl = process.env.BASE_API_URL;

  if (!apiUrl) {
    console.error("BASE_API_URL tidak terdefinisi di file .env");
    return []; // Kembalikan array kosong jika URL API tidak ada
  }

  try {
    // Mengasumsikan endpoint API adalah `${apiUrl}/games`
    // dan responsnya langsung berupa array Game[]
    const res = await fetch(`${apiUrl}/games`, { 
      next: { revalidate: 3600 } // Revalidasi data setiap 1 jam
    });

    if (!res.ok) {
      console.error(`Gagal mengambil data games: ${res.status} ${res.statusText}`);
      // Anda bisa menambahkan logging detail error jika ada, misalnya:
      // const errorBody = await res.text();
      // console.error("Error body:", errorBody);
      return []; // Kembalikan array kosong jika terjadi error HTTP
    }

    const gamesData = await res.json();
    
    // Idealnya, lakukan validasi data di sini (misalnya dengan Zod)
    // untuk memastikan data sesuai dengan tipe Game[].
    // Untuk saat ini, kita akan melakukan type assertion.
    return gamesData as Game[];
  } catch (error) {
    console.error("Terjadi kesalahan saat mengambil data games:", error);
    return []; // Kembalikan array kosong jika terjadi error jaringan atau lainnya
  }
}

export default async function HomePage() {
  // Mengambil data game secara dinamis
  const games = await getGames();

  return (
    <GameSelectionClient games={games} /> 
  );
}
