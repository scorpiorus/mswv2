import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { frontendWalletSchema } from "@shared/schema";

const importWalletSchema = frontendWalletSchema;

interface ImportWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletImported: () => void;
}

export default function ImportWalletModal({ isOpen, onClose, onWalletImported }: ImportWalletModalProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof importWalletSchema>>({
    resolver: zodResolver(importWalletSchema),
    defaultValues: {
      name: "",
      privateKey: "",
      network: "sepolia",
    },
  });

  const importWalletMutation = useMutation({
    mutationFn: async (data: z.infer<typeof importWalletSchema>) => {
      const response = await apiRequest("POST", "/api/wallets", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Wallet Imported",
        description: "Your wallet has been successfully imported and encrypted",
      });
      form.reset();
      onClose();
      onWalletImported();
    },
    onError: (error: any) => {
      console.error("Error importing wallet:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import wallet",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof importWalletSchema>) => {
    console.log('Form data being submitted:', data);
    importWalletMutation.mutate(data);
  };

  const handleClose = () => {
    if (!importWalletMutation.isPending) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-import-wallet">
        <DialogHeader>
          <DialogTitle>Import Wallet</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="My Wallet" 
                      {...field} 
                      data-testid="input-wallet-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="privateKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Private Key</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter your testnet private key..." 
                      className="h-24 resize-none font-mono text-sm"
                      {...field}
                      data-testid="input-private-key"
                    />
                  </FormControl>
                  <p className="text-xs text-slate-500">
                    Your private key will be encrypted and stored securely
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="network"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Network</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-network">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sepolia">ETH Sepolia</SelectItem>
                      <SelectItem value="goerli">ETH Goerli</SelectItem>
                      <SelectItem value="polygon_mumbai">Polygon Mumbai</SelectItem>
                      <SelectItem value="bsc_testnet">BSC Testnet</SelectItem>
                      <SelectItem value="arbitrum_goerli">Arbitrum Goerli</SelectItem>
                      <SelectItem value="optimism_goerli">Optimism Goerli</SelectItem>
                      <SelectItem value="avalanche_fuji">Avalanche Fuji</SelectItem>
                      <SelectItem value="mainnet">ETH Mainnet</SelectItem>
                      <SelectItem value="polygon">Polygon</SelectItem>
                      <SelectItem value="bsc">BSC Mainnet</SelectItem>
                      <SelectItem value="arbitrum">Arbitrum</SelectItem>
                      <SelectItem value="optimism">Optimism</SelectItem>
                      <SelectItem value="avalanche">Avalanche</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={handleClose}
                disabled={importWalletMutation.isPending}
                data-testid="button-cancel-import"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-primary-600 hover:bg-primary-700"
                disabled={importWalletMutation.isPending}
                data-testid="button-import-wallet"
              >
                {importWalletMutation.isPending ? "Importing..." : "Import Wallet"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
