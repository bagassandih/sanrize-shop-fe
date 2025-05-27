
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
          Selamat Datang di Sanrize Shop
        </h1>
        <p className="text-md sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Pilih game Anda untuk top up Diamond dan tingkatkan pengalaman bermain Anda. Cepat, mudah, dan aman.
        </p>
      </div>
      
      <div className="flex items-center justify-center space-x-2 mb-12">
        <Gamepad2 className="h-7 w-7 sm:h-8 sm:w-8 text-accent" />
        <h2 className="text-2xl sm:text-3xl font-semibold text-center text-foreground">Pilih Game Anda</h2>
      </div>

      {games.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 sm:gap-8">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">Saat ini tidak ada game yang tersedia. Silakan kembali lagi nanti.</p>
      )}
    </div>
  );
};

export default GameSelectionClient;
