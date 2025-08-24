import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { signInWithGoogle, handleRedirectResult } from "@/lib/firebase";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const { toast } = useToast();

  // Remove redirect handling since we're using popup now

  const handleLogin = async () => {
    try {
      console.log('Attempting Google sign in...');
      const result = await signInWithGoogle();
      console.log('Sign in successful:', result);
      toast({
        title: "Login berhasil",
        description: "Selamat datang!",
      });
    } catch (error: any) {
      console.error('Sign in error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        credential: error.credential
      });
      toast({
        title: "Login gagal",
        description: `Error: ${error.code || error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm">
              <p className="text-red-800">
                <strong>Configuration Error:</strong> Firebase environment variables appear to be incorrect. 
              </p>
              <p className="text-red-700 mt-2">
                Please check that you've provided the correct values:
                <br/>• <code>VITE_FIREBASE_PROJECT_ID</code> should be your project name (e.g., "my-wallet-app")
                <br/>• <code>VITE_FIREBASE_APP_ID</code> should be like "1:123456:web:abc123def456"
                <br/>• <code>VITE_FIREBASE_API_KEY</code> should be your Web API key
              </p>
            </div>
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
