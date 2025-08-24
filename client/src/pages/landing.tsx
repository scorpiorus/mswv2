import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { signInWithGoogle, handleRedirectResult } from "@/lib/firebase";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const { toast } = useToast();

  useEffect(() => {
    // Handle redirect result when coming back from Google
    handleRedirectResult().then((result) => {
      if (result?.user) {
        toast({
          title: "Login berhasil",
          description: "Selamat datang!",
        });
      }
    }).catch((error) => {
      console.error("Login error:", error);
      toast({
        title: "Login gagal",
        description: "Terjadi kesalahan saat login",
        variant: "destructive",
      });
    });
  }, [toast]);

  const handleLogin = () => {
    signInWithGoogle();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <i className="fas fa-wallet text-white text-2xl"></i>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">CryptoWallet</h1>
          <p className="text-slate-600">Minimalist testnet wallet management</p>
        </div>

        {/* Login Card */}
        <Card className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <CardContent className="p-8">
            <h2 className="text-2xl font-semibold mb-6">Sign In</h2>
            <p className="text-slate-600 mb-6">
              Sign in with your Google account to access your crypto wallets and manage testnet transactions.
            </p>
            <Button 
              onClick={handleLogin}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-primary-700 transition-all"
              data-testid="button-login"
            >
              Sign In with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
