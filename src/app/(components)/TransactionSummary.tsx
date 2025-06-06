
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
    <div className="text-left bg-muted/30 p-3 sm:p-4 rounded-md my-4 space-y-1.5">
      <h4 className="font-semibold text-primary mb-2 text-base sm:text-lg">{headerText}</h4>
      {transactionId && (
        <div className="flex justify-between text-sm sm:text-base">
          <span className="text-muted-foreground">ID Transaksi:</span>
          <span className="font-medium text-foreground">{transactionId}</span>
        </div>
      )}
      <div className="flex justify-between text-sm sm:text-base">
        <span className="text-muted-foreground">Game:</span>
        <span className="font-medium text-foreground">{selectedGame.name}</span>
      </div>
      <div className="flex justify-between items-start text-sm sm:text-base">
        <span className="text-muted-foreground pt-0.5">Paket:</span>
        <div className="text-right">
          <span className="font-medium text-foreground block">{selectedPackage.name}</span>
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
          <div className="flex justify-between text-sm sm:text-base" key={key}>
            <span className="text-muted-foreground">{fieldLabel}:</span>
            <span className="font-medium text-foreground">{String(value)}</span>
          </div>
        );
      })}
      <div className="flex justify-between border-t border-border pt-2 mt-2 text-base sm:text-lg">
        <span className="text-muted-foreground">Total Bayar:</span>
        <span className="font-bold text-accent">{formatPriceIDR(selectedPackage.price)}</span>
      </div>
    </div>
  );
};

export default TransactionSummary;
