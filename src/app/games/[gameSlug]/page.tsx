
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
  const xApiToken = process.env.X_API_TOKEN;
  const apiUrl = process.env.BASE_API_URL;

  if (!apiUrl) {
    return [];
  }

  try {
    const res = await fetch(`${apiUrl}/service`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Token': xApiToken || '',
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
        buy_counter: item.buy_counter,
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
  const xApiToken = process.env.X_API_TOKEN;

  if (currentApiUrl) {
    try {
      const res = await fetch(`${currentApiUrl}/category`, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Token': xApiToken || '',
        },
      });
      if (res.ok) {
        const apiResponse = await res.json();
        const categories: ApiCategoryItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];
        const currentGameApiData = categories.find(cat => cat.code.toLowerCase() === lowerCaseGameSlug && cat.status === 'active');
        if (currentGameApiData) {
          gameName = currentGameApiData.name;
        }
      }
    } catch (error) {
      // Silently ignore errors during metadata generation
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
    const xApiToken = process.env.X_API_TOKEN; // For passing to client component

    let gameFromApi: ApiCategoryItem | undefined;

    if (baseApiUrl) {
      const res = await fetch(`${baseApiUrl}/category`, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Token': process.env.X_API_TOKEN || '', // Direct use for this server-side fetch
        },
      });
      if (res.status === 429) {
        throw new RateLimitError('Rate limit exceeded while fetching game details.');
      }
      if (res.ok) {
        const apiResponse = await res.json();
        const categories: ApiCategoryItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];
        gameFromApi = categories.find(cat => cat.code.toLowerCase() === gameSlug && cat.status === 'active');
      } else if (res.status !== 404) {
         throw new Error(`API error fetching category details: ${res.status}`);
      }
    }

    if (!gameFromApi) {
      notFound();
    }

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
      accountIdFields: accountIdFieldsFromApi,
      dataAiHint: hintKeywords,
    };

    return (
      <DiamondPackagesClient game={gameForClient} apiUrl={baseApiUrl} xApiToken={xApiToken} />
    );

  } catch (error) {
    if (error instanceof RateLimitError) {
      return <RateLimitRetryLoader />;
    }
    throw error;
  }
}
