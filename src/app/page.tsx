
import GameSelectionClient from '@/app/(components)/GameSelectionClient';
import HowToOrderSection from '@/app/(components)/HowToOrderSection';
import type { Game, AccountIdField } from '@/lib/data';
import { RateLimitError } from '@/lib/errors';
import RateLimitRetryLoader from '@/app/(components)/RateLimitRetryLoader';

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
  const xApiToken = process.env.X_API_TOKEN;

  if (!apiUrl) {
    return [];
  }

  try {
    const res = await fetch(`${apiUrl}/category`, {
      cache: 'no-store',
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Api-Token': xApiToken || ''
      }),
      body: JSON.stringify({}) 
    });

    if (res.status === 429) {
      throw new RateLimitError('Rate limit exceeded while fetching game categories.');
    }

    if (!res.ok) {
      return [];
    }

    const apiResponse = await res.json();
    const categories: ApiCategoryItem[] = Array.isArray(apiResponse) ? apiResponse : apiResponse.data || [];

    if (!Array.isArray(categories)) {
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
    if (error instanceof RateLimitError) {
      throw error; // Re-throw for the page component to catch
    }
    return []; // Fallback for other errors
  }
}

export default async function HomePage() {
  let games: Game[];
  try {
    games = await getGames();
  } catch (error) {
    if (error instanceof RateLimitError) {
      return <RateLimitRetryLoader />;
    }
    // For other errors not handled by getGames (e.g., network issues before fetch, unexpected errors)
    // or if getGames() returns empty due to non-429 API error.
    games = [];
  }

  return (
    <div className='space-y-12 sm:space-y-16 md:space-y-20'>
      <GameSelectionClient games={games} />
      <HowToOrderSection />
    </div>
  );
}
