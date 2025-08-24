import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WalletCard from "@/components/wallet-card";
import SendForm from "@/components/send-form";
import MassSendForm from "@/components/mass-send-form";
import TransactionHistory from "@/components/transaction-history";
import ImportWalletModal from "@/components/import-wallet-modal";
import CustomNetworkModal from "@/components/custom-network-modal";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCustomNetworkModalOpen, setIsCustomNetworkModalOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      // User is not authenticated, let the router handle showing the landing page
      return;
    }
  }, [user, authLoading]);

  const { data: wallets = [], refetch: refetchWallets } = useQuery<any[]>({
    queryKey: ["/api/wallets"],
    enabled: !!user,
    retry: false,
  });

  const { data: transactions = [], refetch: refetchTransactions } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
    retry: false,
  });

  const handleLogout = async () => {
    try {
      const { signOutUser } = await import("@/lib/firebase");
      await signOutUser();
      toast({
        title: "Logout berhasil",
        description: "Anda telah keluar dari aplikasi",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout gagal",
        description: "Terjadi kesalahan saat logout",
        variant: "destructive",
      });
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-wallet text-white text-sm"></i>
              </div>
              <h1 className="text-xl font-bold text-slate-900">CryptoWallet</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-600">
                <i className="fas fa-circle text-green-500 text-xs"></i>
                <span>ETH Sepolia</span>
              </div>
              <Button 
                variant="ghost"
                onClick={handleLogout}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900"
                data-testid="button-logout"
              >
                <span className="hidden sm:inline">{user?.email || user?.displayName || 'User'}</span>
                <i className="fas fa-sign-out-alt"></i>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="wallets" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="wallets" className="flex items-center gap-2" data-testid="tab-wallets">
              <i className="fas fa-wallet"></i>
              My Wallets
            </TabsTrigger>
            <TabsTrigger value="send" className="flex items-center gap-2" data-testid="tab-send">
              <i className="fas fa-paper-plane"></i>
              Send Funds
            </TabsTrigger>
            <TabsTrigger value="mass-send" className="flex items-center gap-2" data-testid="tab-mass-send">
              <i className="fas fa-broadcast-tower"></i>
              Mass Send
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2" data-testid="tab-history">
              <i className="fas fa-history"></i>
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallets">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">My Wallets</h2>
              <div className="flex gap-3">
                <Button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-primary-700 transition-all flex items-center"
                  data-testid="button-import-wallet"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Import Wallet
                </Button>
                <Button
                  onClick={() => setIsCustomNetworkModalOpen(true)}
                  variant="outline"
                  className="border-primary-600 text-primary-600 hover:bg-primary-50 px-4 py-2 rounded-xl font-medium flex items-center"
                  data-testid="button-add-network"
                >
                  <i className="fas fa-network-wired mr-2"></i>
                  Add Network
                </Button>
              </div>
            </div>

            {wallets.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-200" data-testid="empty-wallets">
                <i className="fas fa-wallet text-slate-300 text-4xl mb-4"></i>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No wallets imported</h3>
                <p className="text-slate-500 mb-6">Import your first testnet wallet to get started</p>
                <Button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-all"
                  data-testid="button-import-first-wallet"
                >
                  Import Wallet
                </Button>
              </div>
            ) : (
              <div className="grid gap-6">
                {wallets.map((wallet: any) => (
                  <WalletCard 
                    key={wallet.id} 
                    wallet={wallet} 
                    onDelete={refetchWallets}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="send">
            <SendForm 
              wallets={wallets} 
              onTransactionComplete={() => {
                refetchWallets();
                refetchTransactions();
              }}
            />
          </TabsContent>

          <TabsContent value="mass-send">
            <MassSendForm 
              wallets={wallets}
              onTransactionComplete={() => {
                refetchWallets();
                refetchTransactions();
              }}
            />
          </TabsContent>

          <TabsContent value="history">
            <TransactionHistory transactions={transactions} />
          </TabsContent>
        </Tabs>
      </main>

      <ImportWalletModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onWalletImported={refetchWallets}
      />
      
      <CustomNetworkModal
        isOpen={isCustomNetworkModalOpen}
        onClose={() => setIsCustomNetworkModalOpen(false)}
        onNetworkAdded={() => {
          // Refetch any network-related data if needed
          console.log('Custom network added successfully');
        }}
      />
    </div>
  );
}
