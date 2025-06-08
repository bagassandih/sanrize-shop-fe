
"use client";

import type { Game, DiamondPackage } from '@/lib/data';
import type { ReactNode } from 'react';
import React, { createContext, useState, useContext, useEffect } from 'react';

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

const SESSION_STORAGE_GAME_KEY = 'sanrize_selectedGame';
const SESSION_STORAGE_PACKAGE_KEY = 'sanrize_selectedPackage';
const SESSION_STORAGE_ACCOUNT_KEY = 'sanrize_accountDetails';

const getInitialState = <T,>(key: string, defaultValue: T | null): T | null => {
  if (typeof window !== 'undefined') {
    const storedValue = sessionStorage.getItem(key);
    if (storedValue) {
      try {
        return JSON.parse(storedValue) as T;
      } catch (error) {
        console.error(`Error parsing sessionStorage item ${key}:`, error);
        sessionStorage.removeItem(key);
      }
    }
  }
  return defaultValue;
};

export const PurchaseProvider = ({ children }: { children: ReactNode }) => {
  const [selectedGame, setSelectedGame] = useState<Game | null>(() => getInitialState<Game>(SESSION_STORAGE_GAME_KEY, null));
  const [selectedPackage, setSelectedPackage] = useState<DiamondPackage | null>(() => getInitialState<DiamondPackage>(SESSION_STORAGE_PACKAGE_KEY, null));
  const [accountDetails, setAccountDetails] = useState<AccountDetails | null>(() => getInitialState<AccountDetails>(SESSION_STORAGE_ACCOUNT_KEY, null));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedGame) {
        sessionStorage.setItem(SESSION_STORAGE_GAME_KEY, JSON.stringify(selectedGame));
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_GAME_KEY);
      }
    }
  }, [selectedGame]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedPackage) {
        sessionStorage.setItem(SESSION_STORAGE_PACKAGE_KEY, JSON.stringify(selectedPackage));
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_PACKAGE_KEY);
      }
    }
  }, [selectedPackage]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (accountDetails) {
        sessionStorage.setItem(SESSION_STORAGE_ACCOUNT_KEY, JSON.stringify(accountDetails));
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_ACCOUNT_KEY);
      }
    }
  }, [accountDetails]);

  const resetPurchase = () => {
    setSelectedGame(null);
    setSelectedPackage(null);
    setAccountDetails(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_GAME_KEY);
      sessionStorage.removeItem(SESSION_STORAGE_PACKAGE_KEY);
      sessionStorage.removeItem(SESSION_STORAGE_ACCOUNT_KEY);
    }
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
