import { getGameBySlug } from '@/lib/data';
import DiamondPackagesClient from '@/app/(components)/DiamondPackagesClient';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

type Props = {
  params: { gameSlug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const game = getGameBySlug(params.gameSlug);
  if (!game) {
    return {
      title: "Game Not Found - Sanrize Shop"
    }
  }
  return {
    title: `${game.name} Diamond Packages - Sanrize Shop`,
    description: `Purchase ${game.name} diamonds and in-game currency. Fast and secure top-ups at Sanrize Shop.`,
  };
}


export default function GamePackagesPage({ params }: Props) {
  const { gameSlug } = params;
  const game = getGameBySlug(gameSlug);

  if (!game) {
    notFound(); // Triggers the not-found page
  }

  return (
    <DiamondPackagesClient game={game} />
  );
}
