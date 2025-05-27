"use client";

// Ensure this path is correct based on your project structure
// For example, if 'data.ts' is in 'src/lib/', then the path is '@/lib/data'
import type { Game, DiamondPackage } from '@/lib/data';
import type { ReactNode } from 'react';
import React, { createContext, useState, useContext } from 'react';

// It's good practice to ensure client components that use context are marked with "use client"
// However, context definition itself doesn't need it, but components consuming it will.
// For simplicity, and if this file exports hooks/components meant for client-side,
// "use client" can be added here. Or, ensure consuming components use it.

export interface AccountDetails {
  [key: string]: string;
}

interface PurchaseState {
  selectedGame: Game | null;
  selectedPackage: DiamondPackage | null;
  accountDetails: AccountDetails | null;
  setSelectedGame: (game: Game | null) => void;
  setSelectedPackage: (pkg: DiamondPackage | null) => void;
  setAccountDetails: (details: AccountDetails | null) => void;
  resetPurchase: () => void;
}

const PurchaseContext = createContext<PurchaseState | undefined>(undefined);

export const PurchaseProvider = ({ children }: { children: ReactNode }) => {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<DiamondPackage | null>(null);
  const [accountDetails, setAccountDetails] = useState<AccountDetails | null>(null);

  const resetPurchase = () => {
    setSelectedGame(null);
    setSelectedPackage(null);
    setAccountDetails(null);
  };

  return (
    <PurchaseContext.Provider
      value={{
        selectedGame,
        selectedPackage,
        accountDetails,
        setSelectedGame,
        setSelectedPackage,
        setAccountDetails,
        resetPurchase,
      }}
    >
      {children}
    </PurchaseContext.Provider>
  );
};

export const usePurchase = () => {
  const context = useContext(PurchaseContext);
  if (context === undefined) {
    throw new Error("usePurchase must be used within a PurchaseProvider");
  }
  return context;
};
