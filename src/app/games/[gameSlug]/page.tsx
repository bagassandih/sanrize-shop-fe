
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
      title: "Game Tidak Ditemukan - Sanrize Shop"
    }
  }
  return {
    title: `Paket Diamond ${game.name} - Sanrize Shop`,
    description: `Beli diamond ${game.name} dan mata uang dalam game. Top-up cepat dan aman di Sanrize Shop.`,
  };
}


export default function GamePackagesPage({ params }: Props) {
  const { gameSlug } = params;
  const game = getGameBySlug(gameSlug);

  if (!game) {
    notFound();
  }

  return (
    <DiamondPackagesClient game={game} />
  );
}
