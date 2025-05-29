
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ClipboardCheck, Gamepad2, ListPlus, ShoppingCart, User } from "lucide-react";

const steps = [
  {
    icon: <Gamepad2 className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />,
    title: "1. Pilih Game",
    description: "Pertama, pilih game favoritmu yang ingin di-top up dari daftar yang tersedia.",
  },
  {
    icon: <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />, // Changed from ListPlus for better relevance
    title: "2. Pilih Paket & Isi ID",
    description: "Pilih jumlah diamond atau paket yang kamu mau, lalu masukkan ID akun game kamu dengan benar.",
  },
  {
    icon: <ClipboardCheck className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />,
    title: "3. Konfirmasi Pesanan",
    description: "Cek lagi detail pesananmu. Pastikan game, paket, dan ID akun sudah sesuai.",
  },
  {
    icon: <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />,
    title: "4. Bayar & Selesai",
    description: "Lakukan pembayaran, dan diamond atau item akan langsung masuk ke akun game-mu. Sat set!",
  },
];

const HowToOrderSection = () => {
  return (
    <section className="py-12 sm:py-16 bg-muted/30 rounded-lg mt-12 sm:mt-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
            Cara Order di Sanrize Shop Gampang Banget!
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Ikuti langkah-langkah mudah ini buat top up game kesayanganmu.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {steps.map((step, index) => (
            <Card key={index} className="shadow-lg hover:shadow-primary/40 transition-shadow duration-300 bg-card flex flex-col">
              <CardHeader className="items-center text-center p-4 sm:p-6">
                <div className="p-3 bg-primary/10 rounded-full mb-3 sm:mb-4 inline-block">
                  {step.icon}
                </div>
                <CardTitle className="text-base sm:text-xl md:text-2xl text-accent leading-tight">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center flex-grow p-4 sm:p-6 pt-0">
                <p className="text-xs sm:text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowToOrderSection;
