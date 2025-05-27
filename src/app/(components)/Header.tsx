import AppLogo from '@/app/(components)/AppLogo';

const Header = () => {
  return (
    <header className="py-4 px-4 sm:px-6 lg:px-8 bg-background/80 backdrop-blur-md shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <AppLogo />
        {/* Future navigation items can go here */}
      </div>
    </header>
  );
};

export default Header;
