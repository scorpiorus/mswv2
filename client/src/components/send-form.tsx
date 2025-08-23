import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const sendFormSchema = z.object({
  fromWalletId: z.string().min(1, "Please select a wallet"),
  toAddress: z.string().min(1, "Recipient address is required").regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  amount: z.string().min(1, "Amount is required").refine((val) => parseFloat(val) > 0, "Amount must be greater than 0"),
  token: z.string().default("ETH"),
});

interface SendFormProps {
  wallets: any[];
  onTransactionComplete: () => void;
}

export default function SendForm({ wallets, onTransactionComplete }: SendFormProps) {
  const { toast } = useToast();
  const [gasEstimate, setGasEstimate] = useState<string>("0");

  const form = useForm<z.infer<typeof sendFormSchema>>({
    resolver: zodResolver(sendFormSchema),
    defaultValues: {
      fromWalletId: "",
      toAddress: "",
      amount: "",
      token: "ETH",
    },
  });

  const selectedWalletId = form.watch("fromWalletId");
  const amount = form.watch("amount");
  const toAddress = form.watch("toAddress");

  const selectedWallet = wallets.find(w => w.id === selectedWalletId);

  // Estimate gas when form values change
  useQuery({
    queryKey: ["/api/estimate-gas", selectedWalletId, toAddress, amount],
    queryFn: async () => {
      if (!selectedWalletId || !toAddress || !amount) return null;
      
      const response = await apiRequest("POST", "/api/estimate-gas", {
        fromWalletId: selectedWalletId,
        toAddress,
        amount,
      });
      
      const data = await response.json();
      setGasEstimate(data.gasEstimate);
      return data;
    },
    enabled: !!selectedWalletId && !!toAddress && !!amount && parseFloat(amount) > 0,
    retry: false,
  });

  const sendTransactionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof sendFormSchema>) => {
      const response = await apiRequest("POST", "/api/transactions/send", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Transaction Sent",
        description: `Transaction hash: ${data.txHash}`,
      });
      form.reset();
      onTransactionComplete();
    },
    onError: (error: any) => {
      console.error("Error sending transaction:", error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to send transaction",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof sendFormSchema>) => {
    sendTransactionMutation.mutate(data);
  };

  const setPercentage = (percentage: number) => {
    if (!selectedWallet) return;
    
    const balance = parseFloat(selectedWallet.balance);
    const gas = parseFloat(gasEstimate);
    const availableBalance = Math.max(0, balance - gas - 0.001); // Keep small buffer
    
    let amount: number;
    if (percentage === 100) {
      amount = availableBalance;
    } else {
      amount = (availableBalance * percentage) / 100;
    }
    
    form.setValue("amount", Math.max(0, amount).toFixed(6));
  };

  const calculateTotal = () => {
    const amountValue = parseFloat(amount || "0");
    const gasValue = parseFloat(gasEstimate);
    return (amountValue + gasValue).toFixed(6);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Send Funds</h2>
      <Card className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fromWalletId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Wallet</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-from-wallet">
                            <SelectValue placeholder="Select wallet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {wallets.map((wallet) => (
                            <SelectItem key={wallet.id} value={wallet.id}>
                              {wallet.name} ({parseFloat(wallet.balance).toFixed(4)} ETH)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-token">
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
              </div>

              <FormField
                control={form.control}
                name="toAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="0x..." 
                        {...field} 
                        data-testid="input-recipient-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.000001" 
                          placeholder="0.00" 
                          className="pr-16"
                          {...field}
                          data-testid="input-amount"
                        />
                      </FormControl>
                      <span className="absolute right-4 top-3 text-slate-500 font-medium">ETH</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPercentage(10)}
                        disabled={!selectedWallet}
                        data-testid="button-percentage-10"
                      >
                        10%
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPercentage(25)}
                        disabled={!selectedWallet}
                        data-testid="button-percentage-25"
                      >
                        25%
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPercentage(50)}
                        disabled={!selectedWallet}
                        data-testid="button-percentage-50"
                      >
                        50%
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPercentage(75)}
                        disabled={!selectedWallet}
                        data-testid="button-percentage-75"
                      >
                        75%
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPercentage(100)}
                        disabled={!selectedWallet}
                        className="text-primary-600 border-primary-600 hover:bg-primary-50"
                        data-testid="button-percentage-max"
                      >
                        MAX
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Network Fee</span>
                  <span className="font-medium" data-testid="text-network-fee">~{gasEstimate} ETH</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-slate-600">Total</span>
                  <span className="font-medium" data-testid="text-total-amount">~{calculateTotal()} ETH</span>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary-600 text-white py-4 px-4 rounded-xl font-medium hover:bg-primary-700 transition-all"
                disabled={sendTransactionMutation.isPending}
                data-testid="button-send-transaction"
              >
                <i className="fas fa-paper-plane mr-2"></i>
                {sendTransactionMutation.isPending ? "Sending..." : "Send Transaction"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
