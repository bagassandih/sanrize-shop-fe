
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
    <Card className="overflow-hidden shadow-lg hover:shadow-primary/50 transition-all duration-300 ease-in-out transform hover:-translate-y-1">
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
      <CardContent className="p-6">
        <CardTitle className="text-xl sm:text-2xl font-bold text-accent mb-2">{game.name}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground min-h-[3em]">{game.description}</CardDescription>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href={`/games/${game.slug}`}>
            Select Game <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GameCard;

