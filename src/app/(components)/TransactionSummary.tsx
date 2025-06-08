
import type { Game, DiamondPackage } from '@/lib/data';
import type { AccountDetails } from '@/app/(store)/PurchaseContext';
import { formatPriceIDR } from '@/lib/utils';

interface TransactionSummaryProps {
  selectedGame: Game;
  selectedPackage: DiamondPackage;
  accountDetails: AccountDetails;
  transactionId?: string;
  headerText?: string;
}

const TransactionSummary = ({
  selectedGame,
  selectedPackage,
  accountDetails,
  transactionId,
  headerText = "Detail Transaksi:",
}: TransactionSummaryProps) => {
  return (
    <div className="text-left bg-muted/30 p-3 sm:p-4 rounded-md my-4 space-y-2 sm:space-y-2.5">
      <h4 className="font-semibold text-primary mb-2 text-base sm:text-lg">{headerText}</h4>
      
      {transactionId && (
        <div className="grid grid-cols-1 sm:grid-cols-[max-content,1fr] sm:gap-x-2 items-baseline text-sm sm:text-base">
          <span className="text-muted-foreground mb-0.5 sm:mb-0">ID Transaksi:</span>
          <span className="font-medium text-foreground text-left sm:text-right break-all">{transactionId}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[max-content,1fr] sm:gap-x-2 items-baseline text-sm sm:text-base">
        <span className="text-muted-foreground mb-0.5 sm:mb-0">Game:</span>
        <span className="font-medium text-foreground text-left sm:text-right break-words">{selectedGame.name}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[max-content,1fr] sm:gap-x-2 items-baseline text-sm sm:text-base">
        <span className="text-muted-foreground mb-0.5 sm:mb-0">Paket:</span>
        <div className="text-left sm:text-right">
          <span className="font-medium text-foreground block break-words">{selectedPackage.name}</span>
          {selectedPackage.bonus && String(selectedPackage.bonus).trim() !== "" && (
            <span className="text-xs text-accent block">Bonus: {String(selectedPackage.bonus)}</span>
          )}
        </div>
      </div>

      {Object.entries(accountDetails).map(([key, value]) => {
        let fieldLabel = key;
        if (key.toLowerCase() === 'username') {
          fieldLabel = "Nickname";
        } else {
          const fieldConfig = selectedGame.accountIdFields.find(f => f.name === key);
          fieldLabel = fieldConfig?.label || key.charAt(0).toUpperCase() + key.slice(1);
        }
        return (
          <div className="grid grid-cols-1 sm:grid-cols-[max-content,1fr] sm:gap-x-2 items-baseline text-sm sm:text-base" key={key}>
            <span className="text-muted-foreground mb-0.5 sm:mb-0">{fieldLabel}:</span>
            <span className="font-medium text-foreground text-left sm:text-right break-words">{String(value)}</span>
          </div>
        );
      })}

      <div className="grid grid-cols-1 sm:grid-cols-[max-content,1fr] sm:gap-x-2 items-baseline border-t border-border pt-2 mt-2 text-base sm:text-lg">
        <span className="text-muted-foreground mb-0.5 sm:mb-0">Total Bayar:</span>
        <span className="font-bold text-accent text-left sm:text-right">{formatPriceIDR(selectedPackage.price)}</span>
      </div>
    </div>
  );
};

export default TransactionSummary;
