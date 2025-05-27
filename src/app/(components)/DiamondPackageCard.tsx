"use client";

import type { DiamondPackage } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Gem } from 'lucide-react'; // Import Gem icon

interface DiamondPackageCardProps {
  pkg: DiamondPackage;
  onSelect: () => void;
  isSelected: boolean;
}

const DiamondPackageCard = ({ pkg, onSelect, isSelected }: DiamondPackageCardProps) => {
  return (
    <Card 
      className={cn(
        "overflow-hidden shadow-lg transition-all duration-300 ease-in-out cursor-pointer",
        isSelected ? "ring-2 ring-accent scale-105 shadow-accent/50" : "hover:shadow-primary/30 hover:scale-102"
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2 pt-4">
        {pkg.iconName === "Gem" && <Gem className="h-10 w-10 mx-auto text-accent mb-2" />}
        <CardTitle className="text-xl font-semibold text-center text-accent">{pkg.name}</CardTitle>
      </CardHeader>
      <CardContent className="text-center pb-2">
        <p className="text-3xl font-bold text-foreground">{pkg.diamonds.toLocaleString()}</p>
        {pkg.bonus && <p className="text-sm text-primary">{pkg.bonus}</p>}
      </CardContent>
      <CardFooter className="p-4">
        <Button 
          variant={isSelected ? "default" : "outline"} 
          className="w-full"
          aria-pressed={isSelected}
        >
          {isSelected ? 'Selected' : `Price: $${pkg.price.toFixed(2)}`}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DiamondPackageCard;
