
"use client";

import type { Game, DiamondPackage, AccountIdField } from '@/lib/data';
import { usePurchase } from '@/app/(store)/PurchaseContext';
import DiamondPackageCard from '@/app/(components)/DiamondPackageCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertCircle, Gem, ShoppingCart, Info, ArrowLeft, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface DiamondPackagesClientProps {
  game: Game;
  apiUrl?: string;
  xApiToken?: string;
}

const DiamondPackagesClient = ({ game, apiUrl, xApiToken }: DiamondPackagesClientProps) => {
  const router = useRouter();
  const { selectedPackage: contextSelectedPackage, setSelectedGame, setSelectedPackage, setAccountDetails } = usePurchase();
  const [currentSelectedPackage, setCurrentSelectedPackage] = useState<DiamondPackage | null>(null);
  const [isAccountDialogOpen, setAccountDialogOpen] = useState(false);
  const [isCheckingAccount, setIsCheckingAccount] = useState(false);
  const [accountCheckError, setAccountCheckError] = useState<string | null>(null);


  useEffect(() => {
    setSelectedGame(game);
    if (contextSelectedPackage && game.packages.some(p => p.id === contextSelectedPackage.id)) {
      setCurrentSelectedPackage(contextSelectedPackage);
    } else {
      setCurrentSelectedPackage(null);
    }
  }, [game, setSelectedGame, contextSelectedPackage]);

  const handlePackageSelect = (pkg: DiamondPackage) => {
    setCurrentSelectedPackage(pkg);
  };

  const handleInitiatePurchase = (pkg: DiamondPackage) => {
    setCurrentSelectedPackage(pkg);
    setSelectedPackage(pkg);
    setAccountCheckError(null);
    setIsCheckingAccount(false);
    setAccountDialogOpen(true);
  };

  const createSchema = (fields: AccountIdField[]) => {
    const schemaFields: Record<string, z.ZodString> = {};
    fields.forEach(field => {
      let fieldSchema = z.string().min(1, `${field.label} wajib diisi.`);
      if (field.name.toLowerCase().includes('id') || field.type === 'number') {
        fieldSchema = fieldSchema.regex(/^\d*$/, `${field.label} harus berupa angka.`);
      }
      schemaFields[field.name] = fieldSchema;
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

  useEffect(() => {
    if (isAccountDialogOpen && currentSelectedPackage) {
      form.reset(game.accountIdFields.reduce((acc, field) => {
        acc[field.name] = '';
        return acc;
      }, {} as Record<string, string>));
      setAccountCheckError(null);
      setIsCheckingAccount(false);
    }
  }, [isAccountDialogOpen, currentSelectedPackage, form, game.accountIdFields]);


  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!currentSelectedPackage || !game) {
      setAccountCheckError("Terjadi kesalahan, paket atau game tidak terpilih.");
      return;
    }

    setIsCheckingAccount(true);
    setAccountCheckError(null);

    if (!apiUrl) {
      setAccountCheckError("URL API tidak terkonfigurasi. Silakan coba lagi nanti.");
      setIsCheckingAccount(false);
      return;
    }

    const checkAccountEndpoint = `${apiUrl}/check-account`;

    const payload: { code: string; [key: string]: string } = {
      code: game.slug,
      ...data,
    };

    try {
      const xApiToken = process.env.X_API_TOKEN;
      const response = await fetch(checkAccountEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Token': xApiToken || '',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setAccountCheckError(result.error || `Gagal memeriksa akun (Error: ${response.status})`);
        setIsCheckingAccount(false);
        return;
      }

      if (result.error) {
        setAccountCheckError(result.error);
      } else if (result.username !== undefined) {
        setAccountDetails({ ...data, username: result.username }); // Save form data + username
        router.push('/confirm');
      } else {
        setAccountCheckError("Format respons tidak dikenal dari server.");
      }
    } catch (error) {
      setAccountCheckError("Tidak dapat terhubung ke server untuk memeriksa akun. Coba lagi nanti.");
    } finally {
      setIsCheckingAccount(false);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="mb-4">
        <Button variant="outline" onClick={() => router.back()} size="sm" className="text-xs sm:text-sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Pilih Game
        </Button>
      </div>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6 p-4 sm:p-6 bg-card rounded-lg shadow-xl">
        <Image
          src={game.imageUrl}
          alt={game.name}
          width={150}
          height={150}
          className="rounded-lg border-2 border-primary object-cover w-[100px] h-[100px] sm:w-[150px] sm:h-[150px]"
          data-ai-hint={game.dataAiHint}
        />
        <div className="mt-2 md:mt-0 text-center md:text-left">
          <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-accent mb-1 sm:mb-2">{game.name}</h1>
          <p className="text-xs sm:text-base md:text-lg text-muted-foreground">{game.description}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center space-x-2 mb-4 sm:mb-6">
          <Gem className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary" />
          <h2 className="text-lg sm:text-2xl md:text-3xl font-semibold text-foreground">Pilih Paket Diamond</h2>
        </div>
        {game.packages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {game.packages.map((pkg) => (
              <DiamondPackageCard
                key={pkg.id}
                pkg={pkg}
                onSelectPackage={handlePackageSelect}
                onInitiatePurchase={handleInitiatePurchase}
                isSelected={currentSelectedPackage?.id === pkg.id}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground text-sm sm:text-base">Tidak ada paket diamond yang tersedia untuk {game.name}.</p>
        )}
      </div>

      {currentSelectedPackage && (
        <Dialog open={isAccountDialogOpen} onOpenChange={setAccountDialogOpen}>
          <DialogContent className="sm:max-w-[425px] md:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-2xl text-accent flex items-center">
                <Info className="mr-2 h-5 w-5 sm:h-6 sm:w-6" /> Masukkan Detail Akun
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-base">
                Untuk game <span className="font-semibold">{game.name}</span> dengan paket <span className="font-semibold">{currentSelectedPackage.name}</span>.
                 Pastikan data yang Anda masukkan sudah benar.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 pt-2">
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {game.accountIdFields.map((field) => (
                    <FormField
                      key={field.name}
                      control={form.control}
                      name={field.name as keyof FormData}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel className="text-xs sm:text-sm text-primary">{field.label}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={field.placeholder}
                              {...formField}
                              type={field.type || "text"}
                              className="bg-background border-border focus:ring-primary focus:border-primary text-xs sm:text-sm"
                            />
                          </FormControl>
                          <FormMessage className="text-xs"/>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                {accountCheckError && (
                  <p className="text-sm text-destructive text-center py-2">{accountCheckError}</p>
                )}

                <DialogFooter className="mt-4 sm:mt-8">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" size="sm" className="text-xs sm:text-sm">Batal</Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm"
                    disabled={isCheckingAccount}
                  >
                    {isCheckingAccount ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="mr-2 h-4 w-4" />
                    )}
                    {isCheckingAccount ? "Memeriksa..." : "Lanjutkan ke Konfirmasi"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DiamondPackagesClient;
