
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
        <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent sm:text-4xl lg:text-5xl mb-4">
          Yuk, Top Up Gamenya di Sanrize Shop!
        </h1>
        <p className="text-md sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Mau nambah diamond buat game kesayangan? Gampang banget! Pilih gamenya, top up cepat, aman, dan pastinya bikin makin GG.
        </p>
      </div>
      
      <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-12">
        <Gamepad2 className="h-7 w-7 sm:h-8 sm:w-8 text-accent" />
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-center text-foreground">Game Mana Nih yang Mau Di-boost?</h2>
      </div>

      {games.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 sm:gap-8">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">Yah, belum ada game yang tersedia nih. Coba cek lagi nanti ya!</p>
      )}
    </div>
  );
};

export default GameSelectionClient;
