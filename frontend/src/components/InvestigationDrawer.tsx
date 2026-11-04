import React from "react";
import { TransactionItem } from "../types";
import { 
  X, 
  Receipt, 
  User, 
  Store, 
  Package, 
  FileDown, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

interface InvestigationDrawerProps {
  transaction: TransactionItem | null;
  onClose: () => void;
}

export const InvestigationDrawer: React.FC<InvestigationDrawerProps> = ({
  transaction,
  onClose,
}) => {
  if (!transaction) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white dark:bg-[#0c0c0f] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col justify-between transition-transform duration-300">
      
      {/* Header */}
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 font-mono">
              {transaction.order_id}
            </h3>
            <p className="text-xs text-zinc-500 font-mono">
              Txn: {transaction.transaction_id}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Scrollable Content */}
      <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
        
        {/* Economics Card */}
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400">Transaction Financials</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              ${transaction.net_revenue?.toFixed(2)} Net Rev
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 font-mono text-[11px]">
            <div>
              <div className="text-zinc-400">Quantity</div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">{transaction.quantity} units</div>
            </div>
            <div>
              <div className="text-zinc-400">Unit Retail Price</div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">${transaction.unit_price?.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-zinc-400">Unit Cost (COGS)</div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">${transaction.unit_cost?.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-zinc-400">Discount Applied</div>
              <div className="font-semibold text-amber-600 dark:text-amber-400">{(transaction.discount_pct * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-zinc-400">Gross Profit</div>
              <div className="font-semibold text-emerald-600 dark:text-emerald-400">${transaction.gross_profit?.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-zinc-400">Profit Margin</div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400">{transaction.profit_margin_pct}%</div>
            </div>
          </div>
        </div>

        {/* Product Details Block */}
        <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-2">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-semibold">
            <Package className="w-4 h-4 text-blue-500" />
            <span>Product Details</span>
          </div>
          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {transaction.product_name}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">
              {transaction.product_id}
            </span>
            <span>{transaction.category} &gt; {transaction.sub_category}</span>
          </div>
        </div>

        {/* Customer Profile Block */}
        <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-2">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-semibold">
            <User className="w-4 h-4 text-purple-500" />
            <span>Customer Profile</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{transaction.customer_name}</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              {transaction.customer_segment}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">
            ID: {transaction.customer_id}
          </div>
        </div>

        {/* Retail Store Block */}
        <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-2">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-semibold">
            <Store className="w-4 h-4 text-amber-500" />
            <span>Fulfillment Location</span>
          </div>
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
            {transaction.store_name}
          </div>
          <div className="text-[11px] text-zinc-500">
            Store ID: <span className="font-mono">{transaction.store_id}</span> · Region: <span className="font-mono">{transaction.region}</span>
          </div>
        </div>

      </div>

      {/* Drawer Action Buttons */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between gap-2">
        <button
          onClick={() => alert(`Exporting receipt for Order ${transaction.order_id}`)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-medium text-xs shadow-sm transition-colors"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>Export Summary</span>
        </button>

        <button
          onClick={() => {
            alert(`Order ${transaction.order_id} verified in audit ledger!`);
            onClose();
          }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Reconcile Order</span>
        </button>
      </div>

    </div>
  );
};

