import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface WalletCardProps {
  wallet: {
    id: string;
    name: string;
    address: string;
    balance: string;
    network: string;
  };
  onDelete: () => void;
}

export default function WalletCard({ wallet, onDelete }: WalletCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteWalletMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/wallets/${wallet.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Wallet deleted successfully",
      });
      onDelete();
    },
    onError: (error) => {
      console.error("Error deleting wallet:", error);
      toast({
        title: "Error",
        description: "Failed to delete wallet",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteWalletMutation.mutateAsync();
    } finally {
      setIsDeleting(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    return num.toFixed(4);
  };

  const getGradientClass = (index: number) => {
    const gradients = [
      "bg-gradient-to-r from-blue-500 to-purple-600",
      "bg-gradient-to-r from-green-500 to-teal-600",
      "bg-gradient-to-r from-pink-500 to-rose-600",
      "bg-gradient-to-r from-yellow-500 to-orange-600",
      "bg-gradient-to-r from-indigo-500 to-blue-600",
    ];
    return gradients[index % gradients.length];
  };

  return (
    <Card className="wallet-card bg-white rounded-2xl shadow-sm border border-slate-200 transition-all hover:transform hover:-translate-y-1 cursor-pointer" data-testid={`card-wallet-${wallet.id}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <div className={`w-12 h-12 ${getGradientClass(wallet.address.charCodeAt(2))} rounded-xl flex items-center justify-center mr-4`}>
              <i className="fas fa-ethereum text-white text-lg"></i>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900" data-testid={`text-wallet-name-${wallet.id}`}>{wallet.name}</h3>
              <p className="text-sm text-slate-500" data-testid={`text-wallet-network-${wallet.id}`}>{wallet.network.toUpperCase()}</p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-slate-400 hover:text-red-500 transition-colors"
                data-testid={`button-delete-wallet-${wallet.id}`}
              >
                <i className="fas fa-trash text-sm"></i>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Wallet</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{wallet.name}"? This action cannot be undone.
                  Make sure you have backed up your private key if you want to access this wallet again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="button-confirm-delete"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600">Address</span>
            <span 
              className="text-sm font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200 transition-colors"
              onClick={() => navigator.clipboard.writeText(wallet.address)}
              title="Click to copy"
              data-testid={`text-wallet-address-${wallet.id}`}
            >
              {formatAddress(wallet.address)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600">Balance</span>
            <span className="text-lg font-semibold text-slate-900" data-testid={`text-wallet-balance-${wallet.id}`}>
              {formatBalance(wallet.balance)} ETH
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
