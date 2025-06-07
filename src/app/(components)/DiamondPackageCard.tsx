
"use client";

import type { DiamondPackage } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Gem, Star } from 'lucide-react';
import Image from 'next/image';
import { formatPriceIDR } from '@/lib/utils';
import { useMemo } from 'react';

interface DiamondPackageCardProps {
  pkg: DiamondPackage;
  onSelectPackage: (pkg: DiamondPackage) => void;
  onInitiatePurchase: (pkg: DiamondPackage) => void;
  isSelected: boolean;
}

const DiamondPackageCard = ({ pkg, onSelectPackage, onInitiatePurchase, isSelected }: DiamondPackageCardProps) => {

  const displayName = useMemo(() => {
    if (!pkg.name) return '';
    const parts = pkg.name.split(" ");
    if (parts.length > 0 && /^\d+$/.test(parts[0])) { // First part is purely numeric
      parts[0] = String(parseInt(parts[0], 10)); // This removes leading zeros
      return parts.join(" ");
    }
    return pkg.name;
  }, [pkg.name]);

  return (
    <Card
      className={cn(
        "relative overflow-hidden shadow-lg transition-all duration-300 ease-in-out cursor-pointer flex flex-col",
        isSelected ? "ring-2 ring-accent scale-105 shadow-accent/50 brightness-105" : "hover:shadow-lg hover:shadow-primary/40 hover:scale-102 hover:brightness-105"
      )}
      onClick={() => onSelectPackage(pkg)}
    >
      {pkg.buy_counter && pkg.buy_counter > 100 && (
        <div className="absolute top-1 right-1 z-10 flex items-center rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
          <Star className="mr-1.5 h-4 w-4 fill-white text-white" />
          Terlaris
        </div>
      )}
      <CardHeader className="pb-2 pt-4 items-center">
        {pkg.imageUrl ? (
          <div className="relative h-10 w-10 sm:h-12 sm:w-12 mb-2">
            <Image 
              src={pkg.imageUrl} 
              alt={displayName} 
              fill
              sizes="(max-width: 640px) 40px, 48px"
              style={{ objectFit: 'contain' }}
              className="rounded-md"
              data-ai-hint="game currency item" 
            />
          </div>
        ) : pkg.iconName === "Gem" ? (
          <Gem className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-accent mb-2" />
        ) : (
          <div className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 bg-muted rounded-md flex items-center justify-center">
             <Gem className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          </div>
        )}
        <CardTitle className="text-base sm:text-lg font-semibold text-center text-accent leading-tight pt-1">
          {displayName}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center pb-2 flex-grow pt-1">
        <p className="text-lg sm:text-xl font-bold text-foreground mb-1">{formatPriceIDR(pkg.price)}</p>
        {pkg.bonus && String(pkg.bonus).trim() !== "" && (
          <p className="text-xs sm:text-sm text-accent font-medium">Bonus: {String(pkg.bonus)}</p>
        )}
      </CardContent>
      <CardFooter className="p-3 sm:p-4 mt-auto">
        <Button
          variant={isSelected ? "default" : "outline"}
          className="w-full text-xs sm:text-sm"
          aria-pressed={isSelected}
          onClick={(e) => {
            e.stopPropagation(); 
            onInitiatePurchase(pkg);
          }}
        >
          Beli
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DiamondPackageCard;
