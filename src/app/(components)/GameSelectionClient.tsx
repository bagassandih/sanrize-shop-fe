"use client";

import type { Game } from '@/lib/data';
import GameCard from '@/app/(components)/GameCard';
import { Gamepad2 } from 'lucide-react';

interface GameSelectionClientProps {
  games: Game[];
}

const GameSelectionClient = ({ games }: GameSelectionClientProps) => {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent sm:text-5xl lg:text-6xl mb-4">
          Welcome to Sanrize Shop
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Select your game to top up Diamonds and enhance your gaming experience. Quick, easy, and secure.
        </p>
      </div>
      
      <div className="flex items-center justify-center space-x-2 mb-12">
        <Gamepad2 className="h-8 w-8 text-accent" />
        <h2 className="text-3xl font-semibold text-center text-foreground">Choose Your Game</h2>
      </div>

      {games.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">No games available at the moment. Please check back later.</p>
      )}
    </div>
  );
};

export default GameSelectionClient;
