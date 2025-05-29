
"use client";

import type { Game } from '@/lib/data';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

interface GameCardProps {
  game: Game;
}

const GameCard = ({ game }: GameCardProps) => {
  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl hover:shadow-primary/60 hover:brightness-105 transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col">
      <CardHeader className="p-0">
        <div className="aspect-video relative w-full">
          <Image
            src={game.imageUrl}
            alt={game.name}
            layout="fill"
            objectFit="cover"
            data-ai-hint={game.dataAiHint}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 flex-grow">
        <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold text-accent mb-1 sm:mb-2">{game.name}</CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground min-h-[2.5em] sm:min-h-[3em] line-clamp-2 sm:line-clamp-3">
          {game.description}
        </CardDescription>
      </CardContent>
      <CardFooter className="p-3 sm:p-4 mt-auto">
        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm">
          <Link href={`/games/${game.slug}`}>
            Pilih Game <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GameCard;
