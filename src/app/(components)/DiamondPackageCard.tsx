
"use client";

import type { DiamondPackage } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Gem } from 'lucide-react';

interface DiamondPackageCardProps {
  pkg: DiamondPackage;
  onSelect: () => void;
  isSelected: boolean;
}

const DiamondPackageCard = ({ pkg, onSelect, isSelected }: DiamondPackageCardProps) => {
  const formatPriceIDR = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  };

  return (
    <Card
      className={cn(
        "overflow-hidden shadow-lg transition-all duration-300 ease-in-out cursor-pointer flex flex-col",
        isSelected ? "ring-2 ring-accent scale-105 shadow-accent/50" : "hover:shadow-primary/30 hover:scale-102"
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2 pt-4">
        {pkg.iconName === "Gem" && <Gem className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-accent mb-2" />}
        <CardTitle className="text-lg sm:text-xl font-semibold text-center text-accent">{pkg.name}</CardTitle>
      </CardHeader>
      <CardContent className="text-center pb-2 flex-grow pt-2">
        <p className="text-xl sm:text-2xl font-bold text-foreground mb-1">{formatPriceIDR(pkg.price)}</p>
        {pkg.bonus && <p className="text-xs sm:text-sm text-accent font-medium">{pkg.bonus}</p>}
      </CardContent>
      <CardFooter className="p-3 sm:p-4 mt-auto">
        <Button
          variant={isSelected ? "default" : "outline"}
          className="w-full text-xs sm:text-sm"
          aria-pressed={isSelected}
        >
          Beli
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DiamondPackageCard;
