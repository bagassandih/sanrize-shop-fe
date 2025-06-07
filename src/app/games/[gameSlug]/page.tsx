
import type { Game, DiamondPackage, AccountIdField } from '@/lib/data';
import DiamondPackagesClient from '@/app/(components)/DiamondPackagesClient';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { RateLimitError } from '@/lib/errors';
import RateLimitRetryLoader from '@/app/(components)/RateLimitRetryLoader';

export const runtime = 'edge';

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
  account_id_field?: AccountIdField[];
}

async function getPackagesForGame(categoryId: number, gameSlug: string): Promise<DiamondPackage[]> {
  const apiUrl = process.env.BASE_API_URL;
  if (!apiUrl) {
    return [];
  }

  try {
    const res = await fetch(`${apiUrl}/service`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idCategory: categoryId }),
      cache: 'no-store',
    });

    if (res.status === 429) {
      throw new RateLimitError(`Rate limit exceeded while fetching packages for category ${categoryId}.`);
    }

    if (!res.ok) {
      return [];
    }

    const apiResponse = await res.json();
    const serviceItems: ApiServiceItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];

    if (!Array.isArray(serviceItems)) {
        return [];
    }

    return serviceItems
      .filter(item => item.status === 'available')
      .map((item): DiamondPackage => ({
        id: `${gameSlug}_${item.id}`,
        originalId: item.id,
        name: item.name,
        price: item.price,
        bonus: item.bonus && String(item.bonus).trim() !== "" && String(item.bonus).toLowerCase() !== "0" && String(item.bonus).toLowerCase() !== "null" ? String(item.bonus) : undefined,
        imageUrl: item.img && item.img.trim() !== "" ? item.img : undefined,
        iconName: (!item.img || item.img.trim() === "") ? 'Gem' : undefined,
        diamonds: undefined,
      }));
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error; // Re-throw for the page component to catch
    }
    return []; // Fallback for other errors
  }
}

type Props = {
  params: { gameSlug: string };
};

export async function generateMetadata({ params: routeParams }: Props): Promise<Metadata> {
  const params = await routeParams;
  const currentApiUrl = process.env.BASE_API_URL;
  const lowerCaseGameSlug = params.gameSlug.toLowerCase();
  let gameName = lowerCaseGameSlug.replace(/-/g, ' ');

  if (currentApiUrl) {
    try {
      const res = await fetch(`${currentApiUrl}/category`, { cache: 'no-store' });
      // Note: generateMetadata should ideally not throw RateLimitError to avoid breaking metadata generation.
      // It should gracefully fallback or handle errors internally if possible.
      // For simplicity, we'll let it proceed, but in a real app, this might need more robust error handling for metadata.
      if (res.ok) {
        const apiResponse = await res.json();
        const categories: ApiCategoryItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];
        const currentGameApiData = categories.find(cat => cat.code.toLowerCase() === lowerCaseGameSlug && cat.status === 'active');
        if (currentGameApiData) {
          gameName = currentGameApiData.name;
        }
      }
    } catch (error) {
      // Silently ignore errors during metadata generation to prevent build failures
    }
  }

  const capitalizedGameName = gameName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `Paket Diamond ${capitalizedGameName} - Sanrize Shop`,
    description: `Beli diamond untuk ${capitalizedGameName}. Top-up cepat dan aman di Sanrize Shop.`,
  };
}

export default async function GamePackagesPage({ params }: Props) {
  try {
    const gameSlug = params.gameSlug.toLowerCase();
    const baseApiUrl = process.env.BASE_API_URL;

    let gameFromApi: ApiCategoryItem | undefined;

    if (baseApiUrl) {
      const res = await fetch(`${baseApiUrl}/category`, { cache: 'no-store' });
      if (res.status === 429) {
        throw new RateLimitError('Rate limit exceeded while fetching game details.');
      }
      if (res.ok) {
        const apiResponse = await res.json();
        const categories: ApiCategoryItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];
        gameFromApi = categories.find(cat => cat.code.toLowerCase() === gameSlug && cat.status === 'active');
      } else if (res.status !== 404) { // Handle non-404 errors that are not 429
         throw new Error(`API error fetching category details: ${res.status}`);
      }
      // If 404 or other issues leading to no gameFromApi, it will be caught by !gameFromApi check
    }

    if (!gameFromApi) {
      notFound(); // Game genuinely not found or initial fetch failed for non-rate-limit reasons
    }

    const accountIdFieldsFromApi = Array.isArray(gameFromApi.account_id_field) ? gameFromApi.account_id_field : [];
    if (accountIdFieldsFromApi.length === 0) {
      // This is a warning, not an error that stops rendering usually
    }

    // This call can also throw RateLimitError
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
      accountIdFields: accountIdFieldsFromApi,
      dataAiHint: hintKeywords,
    };

    return (
      <DiamondPackagesClient game={gameForClient} apiUrl={baseApiUrl} />
    );

  } catch (error) {
    if (error instanceof RateLimitError) {
      return <RateLimitRetryLoader />;
    }
    // For other unexpected errors, allow Next.js to handle or define a global error boundary
    // If it's an error from `new Error(...)` thrown above, it will also be caught here.
    // `notFound()` will be handled by Next.js if called.
    throw error;
  }
}
