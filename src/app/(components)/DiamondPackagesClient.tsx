"use client";

import type { Game, DiamondPackage, AccountIdField } from '@/lib/data';
import { usePurchase } from '@/app/(store)/PurchaseContext';
import DiamondPackageCard from '@/app/(components)/DiamondPackageCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertCircle, Gem, ShoppingCart } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';

interface DiamondPackagesClientProps {
  game: Game;
}

const DiamondPackagesClient = ({ game }: DiamondPackagesClientProps) => {
  const router = useRouter();
  const { selectedPackage, setSelectedGame, setSelectedPackage, setAccountDetails } = usePurchase();
  const [currentSelectedPackage, setCurrentSelectedPackage] = useState<DiamondPackage | null>(selectedPackage);

  useEffect(() => {
    setSelectedGame(game); // Set the game in context when component mounts
    // If there's a globally selected package that matches this game, pre-select it
    if (selectedPackage && game.packages.some(p => p.id === selectedPackage.id)) {
      setCurrentSelectedPackage(selectedPackage);
    } else {
      setCurrentSelectedPackage(null); // Reset if package doesn't belong to this game
      setSelectedPackage(null);
    }
  }, [game, setSelectedGame, selectedPackage, setSelectedPackage]);

  const handlePackageSelect = (pkg: DiamondPackage) => {
    setCurrentSelectedPackage(pkg);
    setSelectedPackage(pkg); // Update global context
  };

  // Dynamically create Zod schema based on game.accountIdFields
  const createSchema = (fields: AccountIdField[]) => {
    const schemaFields: Record<string, z.ZodString> = {};
    fields.forEach(field => {
      schemaFields[field.name] = z.string()
        .min(1, `${field.label} is required.`)
        .regex(field.name === 'userId' || field.name === 'uid' || field.name === 'zoneId' ? /^\d+$/ : /.*/, `${field.label} must be valid.`);
    });
    return z.object(schemaFields);
  };

  const formSchema = createSchema(game.accountIdFields);
  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: game.accountIdFields.reduce((acc, field) => {
      acc[field.name] = '';
      return acc;
    }, {} as Record<string, string>),
  });

  const onSubmit: SubmitHandler<FormData> = (data) => {
    if (!currentSelectedPackage) {
      form.setError("root", { message: "Please select a diamond package." });
      return;
    }
    setAccountDetails(data);
    router.push('/confirm');
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 p-6 bg-card rounded-lg shadow-xl">
        <Image 
          src={game.imageUrl} 
          alt={game.name} 
          width={150} 
          height={150} 
          className="rounded-lg border-2 border-primary object-cover"
          data-ai-hint={game.dataAiHint}
        />
        <div>
          <h1 className="text-4xl font-bold text-accent mb-2">{game.name}</h1>
          <p className="text-lg text-muted-foreground">{game.description}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center space-x-2 mb-6">
          <Gem className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-semibold text-foreground">Select Diamond Package</h2>
        </div>
        {game.packages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {game.packages.map((pkg) => (
              <DiamondPackageCard
                key={pkg.id}
                pkg={pkg}
                onSelect={() => handlePackageSelect(pkg)}
                isSelected={currentSelectedPackage?.id === pkg.id}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">No diamond packages available for {game.name}.</p>
        )}
      </div>
      
      {form.formState.errors.root && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-6 bg-card rounded-lg shadow-xl">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Enter Account Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {game.accountIdFields.map((field) => (
                <FormField
                  key={field.name}
                  control={form.control}
                  name={field.name as keyof FormData}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel className="text-accent">{field.label}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={field.placeholder} 
                          {...formField} 
                          type={field.type || "text"}
                          className="bg-background border-border focus:ring-primary focus:border-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>
          
          <Button type="submit" size="lg" className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!currentSelectedPackage}>
            <ShoppingCart className="mr-2 h-5 w-5" />
            Proceed to Confirmation
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default DiamondPackagesClient;
