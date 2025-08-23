import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TransactionHistoryProps {
  transactions: any[];
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount: string) => {
    return parseFloat(amount).toFixed(4);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "send":
        return <i className="fas fa-arrow-up text-green-600 text-sm"></i>;
      case "mass_send":
        return <i className="fas fa-broadcast-tower text-blue-600 text-sm"></i>;
      default:
        return <i className="fas fa-exchange-alt text-slate-600 text-sm"></i>;
    }
  };

  const viewTransaction = (txHash: string) => {
    if (txHash) {
      window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Transaction History</h2>
      <Card className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="text-center py-12" data-testid="empty-transactions">
              <i className="fas fa-history text-slate-300 text-4xl mb-4"></i>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No transactions yet</h3>
              <p className="text-slate-500">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-6 font-medium text-slate-600">Type</th>
                    <th className="text-left py-3 px-6 font-medium text-slate-600">From/To</th>
                    <th className="text-left py-3 px-6 font-medium text-slate-600">Amount</th>
                    <th className="text-left py-3 px-6 font-medium text-slate-600">Status</th>
                    <th className="text-left py-3 px-6 font-medium text-slate-600">Hash</th>
                    <th className="text-left py-3 px-6 font-medium text-slate-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50" data-testid={`row-transaction-${tx.id}`}>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                            {getTypeIcon(tx.type)}
                          </div>
                          <span className="font-medium text-slate-900 capitalize" data-testid={`text-transaction-type-${tx.id}`}>
                            {tx.type.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-slate-900" data-testid={`text-transaction-to-${tx.id}`}>
                            {formatAddress(tx.toAddress)}
                          </p>
                          {tx.fromWalletId && (
                            <p className="text-sm text-slate-500">from wallet</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-900" data-testid={`text-transaction-amount-${tx.id}`}>
                          {formatAmount(tx.amount)} {tx.token}
                        </span>
                      </td>
                      <td className="py-4 px-6" data-testid={`status-transaction-${tx.id}`}>
                        {getStatusBadge(tx.status)}
                      </td>
                      <td className="py-4 px-6">
                        {tx.txHash ? (
                          <Button
                            variant="link"
                            className="font-mono text-sm text-primary-600 hover:text-primary-700 p-0"
                            onClick={() => viewTransaction(tx.txHash)}
                            data-testid={`button-view-transaction-${tx.id}`}
                          >
                            {formatAddress(tx.txHash)}
                          </Button>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-slate-500" data-testid={`text-transaction-date-${tx.id}`}>
                          {formatDate(tx.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
