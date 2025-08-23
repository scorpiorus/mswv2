import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const massSendFormSchema = z.object({
  toAddress: z.string().min(1, "Destination address is required").regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  token: z.string().default("ETH"),
  selectedWallets: z.array(z.string()).min(1, "Please select at least one wallet"),
});

interface MassSendFormProps {
  wallets: any[];
  onTransactionComplete: () => void;
}

export default function MassSendForm({ wallets, onTransactionComplete }: MassSendFormProps) {
  const { toast } = useToast();
  const [selectedWallets, setSelectedWallets] = useState<string[]>(wallets.map(w => w.id));

  const form = useForm<z.infer<typeof massSendFormSchema>>({
    resolver: zodResolver(massSendFormSchema),
    defaultValues: {
      toAddress: "",
      token: "ETH",
      selectedWallets: wallets.map(w => w.id),
    },
  });

  const massSendMutation = useMutation({
    mutationFn: async (data: z.infer<typeof massSendFormSchema>) => {
      const response = await apiRequest("POST", "/api/transactions/mass-send", {
        toAddress: data.toAddress,
        token: data.token,
        walletIds: data.selectedWallets,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Mass Send Completed",
        description: `Processed ${data.walletsProcessed} wallets. Total amount: ${data.totalAmount} ETH`,
      });
      form.reset();
      setSelectedWallets(wallets.map(w => w.id));
      onTransactionComplete();
    },
    onError: (error: any) => {
      console.error("Error in mass send:", error);
      toast({
        title: "Mass Send Failed",
        description: error.message || "Failed to execute mass send",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof massSendFormSchema>) => {
    massSendMutation.mutate({
      ...data,
      selectedWallets,
    });
  };

  const toggleWalletSelection = (walletId: string) => {
    setSelectedWallets(prev => 
      prev.includes(walletId) 
        ? prev.filter(id => id !== walletId)
        : [...prev, walletId]
    );
  };

  const selectAllWallets = () => {
    setSelectedWallets(wallets.map(w => w.id));
  };

  const deselectAllWallets = () => {
    setSelectedWallets([]);
  };

  const calculateTotalAmount = () => {
    return wallets
      .filter(w => selectedWallets.includes(w.id))
      .reduce((total, wallet) => total + Math.max(0, parseFloat(wallet.balance) - 0.003), 0) // Reserve for gas
      .toFixed(6);
  };

  const calculateEstimatedFees = () => {
    return (selectedWallets.length * 0.002).toFixed(6); // Rough estimate
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Mass Send</h2>
      <Card className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <CardContent className="p-8">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start">
              <i className="fas fa-exclamation-triangle text-amber-500 mt-1 mr-3"></i>
              <div>
                <h4 className="font-medium text-amber-800">Mass Send Warning</h4>
                <p className="text-sm text-amber-700 mt-1">
                  This will send ALL available balance from each selected wallet to the destination address. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-mass-send-token">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ETH">ETH (Sepolia)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="toAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="0x..." 
                          {...field} 
                          data-testid="input-mass-send-destination"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-slate-900">Wallets to Process</h4>
                  <div className="space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={selectAllWallets}
                      data-testid="button-select-all-wallets"
                    >
                      Select All
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={deselectAllWallets}
                      data-testid="button-deselect-all-wallets"
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>

                {wallets.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No wallets available. Import some wallets first.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {wallets.map((wallet) => (
                      <div 
                        key={wallet.id} 
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                        data-testid={`wallet-mass-send-${wallet.id}`}
                      >
                        <div className="flex items-center">
                          <Checkbox
                            checked={selectedWallets.includes(wallet.id)}
                            onCheckedChange={() => toggleWalletSelection(wallet.id)}
                            className="mr-3"
                            data-testid={`checkbox-wallet-${wallet.id}`}
                          />
                          <div>
                            <p className="font-medium text-slate-900">{wallet.name}</p>
                            <p className="text-sm text-slate-500">
                              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900" data-testid={`text-wallet-balance-${wallet.id}`}>
                            {parseFloat(wallet.balance).toFixed(4)} ETH
                          </p>
                          <p className="text-sm text-slate-500">Available</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Amount</span>
                  <span className="font-medium" data-testid="text-mass-send-total-amount">
                    {calculateTotalAmount()} ETH
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-slate-600">Estimated Fees</span>
                  <span className="font-medium" data-testid="text-mass-send-estimated-fees">
                    ~{calculateEstimatedFees()} ETH
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-slate-600">Wallets Selected</span>
                  <span className="font-medium" data-testid="text-mass-send-wallets-count">
                    {selectedWallets.length} wallets
                  </span>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-red-600 text-white py-4 px-4 rounded-xl font-medium hover:bg-red-700 transition-all"
                disabled={massSendMutation.isPending || selectedWallets.length === 0}
                data-testid="button-execute-mass-send"
              >
                <i className="fas fa-broadcast-tower mr-2"></i>
                {massSendMutation.isPending ? "Executing..." : "Execute Mass Send"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
