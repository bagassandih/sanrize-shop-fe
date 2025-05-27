import type { LucideIcon } from 'lucide-react';
import { Gem } from 'lucide-react';

export interface DiamondPackage {
  id: string;
  name: string;
  diamonds: number;
  price: number;
  bonus?: string;
  iconName?: 'Gem'; // Changed from IconComponent: LucideIcon
}

export interface AccountIdField {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
}
export interface Game {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  dataAiHint: string;
  description: string;
  packages: DiamondPackage[];
  accountIdFields: AccountIdField[];
}

export const gamesData: Game[] = [
  {
    id: "ml",
    name: "Mobile Legends",
    slug: "mobile-legends",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "fantasy battle",
    description: "Top up Mobile Legends Diamonds in seconds!",
    accountIdFields: [
      { label: "User ID", name: "userId", placeholder: "Enter User ID", type: "text" },
      { label: "Zone ID", name: "zoneId", placeholder: "Enter Zone ID (e.g., 1234)", type: "text" },
    ],
    packages: [
      { id: "ml_pkg1", name: "50 Diamonds", diamonds: 50, price: 0.99, bonus: "+5 Bonus", iconName: "Gem" },
      { id: "ml_pkg2", name: "100 Diamonds", diamonds: 100, price: 1.99, bonus: "+10 Bonus", iconName: "Gem" },
      { id: "ml_pkg3", name: "250 Diamonds", diamonds: 250, price: 4.99, bonus: "+25 Bonus", iconName: "Gem" },
      { id: "ml_pkg4", name: "500 Diamonds", diamonds: 500, price: 9.99, bonus: "+65 Bonus", iconName: "Gem" },
    ],
  },
  {
    id: "ff",
    name: "Free Fire",
    slug: "free-fire",
    imageUrl: "https://placehold.co/600x400.png",
    dataAiHint: "action shooter",
    description: "Get your Free Fire Diamonds fast and easy!",
    accountIdFields: [
      { label: "Player ID (UID)", name: "uid", placeholder: "Enter Player ID", type: "text" },
    ],
    packages: [
      { id: "ff_pkg1", name: "100 Diamonds", diamonds: 100, price: 0.99, iconName: "Gem" },
      { id: "ff_pkg2", name: "210 Diamonds", diamonds: 210, price: 1.99, bonus: "+21 Bonus", iconName: "Gem" },
      { id: "ff_pkg3", name: "530 Diamonds", diamonds: 530, price: 4.99, bonus: "+53 Bonus", iconName: "Gem" },
      { id: "ff_pkg4", name: "1080 Diamonds", diamonds: 1080, price: 9.99, bonus: "+108 Bonus", iconName: "Gem" },
    ],
  },
];

export const getGameBySlug = (slug: string): Game | undefined => {
  return gamesData.find((game) => game.slug === slug);
};
