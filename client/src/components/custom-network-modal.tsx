import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { customNetworkSchema } from "@shared/schema";

interface CustomNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNetworkAdded: () => void;
}

export default function CustomNetworkModal({ isOpen, onClose, onNetworkAdded }: CustomNetworkModalProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof customNetworkSchema>>({
    resolver: zodResolver(customNetworkSchema),
    defaultValues: {
      name: "",
      displayName: "",
      rpcUrl: "",
      chainId: "",
      symbol: "ETH",
      explorerUrl: "",
      isTestnet: true,
    },
  });

  const addNetworkMutation = useMutation({
    mutationFn: async (data: z.infer<typeof customNetworkSchema>) => {
      const response = await apiRequest("POST", "/api/custom-networks", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Custom Network Added",
        description: "Your custom network has been successfully added",
      });
      form.reset();
      onClose();
      onNetworkAdded();
    },
    onError: (error: any) => {
      console.error("Error adding custom network:", error);
      toast({
        title: "Failed to Add Network",
        description: error.message || "Failed to add custom network",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof customNetworkSchema>) => {
    addNetworkMutation.mutate(data);
  };

  const handleClose = () => {
    if (!addNetworkMutation.isPending) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Network</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Network Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="custom_network" 
                      {...field} 
                    />
                  </FormControl>
                  <p className="text-xs text-slate-500">
                    Internal name (lowercase, no spaces)
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Custom Network" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rpcUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RPC URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://rpc.example.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chainId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chain ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="1337" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symbol</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="ETH" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="explorerUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Explorer URL (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://explorer.example.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isTestnet"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Testnet</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Is this a testnet network?
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={handleClose}
                disabled={addNetworkMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-primary-600 hover:bg-primary-700"
                disabled={addNetworkMutation.isPending}
              >
                {addNetworkMutation.isPending ? "Adding..." : "Add Network"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}