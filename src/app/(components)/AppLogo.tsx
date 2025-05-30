
import Link from 'next/link';
import { Gem } from 'lucide-react';

const AppLogo = () => {
  return (
    <Link href="/" className="flex items-center space-x-2 text-lg sm:text-xl md:text-2xl font-bold text-primary hover:text-accent transition-colors duration-300 ease-in-out group">
      <Gem className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-accent group-hover:text-primary transition-colors duration-300 ease-in-out" />
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-accent group-hover:from-accent group-hover:to-primary">
        Sanrize Shop
      </span>
    </Link>
  );
};

export default AppLogo;
