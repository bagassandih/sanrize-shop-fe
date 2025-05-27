import GameSelectionClient from '@/app/(components)/GameSelectionClient';
import { gamesData } from '@/lib/data';

export default function HomePage() {
  // Fetching data on the server component
  const games = gamesData;

  return (
    <GameSelectionClient games={games} /> 
  );
}
