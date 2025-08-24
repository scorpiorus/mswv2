import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User, getIdToken } from "firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Force refresh auth state - useful for production environments
  const refreshAuthState = async () => {
    if (!auth?.currentUser) return;
    
    try {
      const idToken = await getIdToken(auth.currentUser);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          idToken,
          user: {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            displayName: auth.currentUser.displayName,
            photoURL: auth.currentUser.photoURL,
          }
        })
      });

      if (response.ok) {
        setUser(auth.currentUser);
        return true;
      }
    } catch (error) {
      console.error('Auth refresh error:', error);
    }
    return false;
  };

  useEffect(() => {
    // If Firebase auth is not configured, consider user as not authenticated
    if (!auth) {
      setIsLoading(false);
      setUser(null);
      return;
    }

    // Check for existing auth state first
    const checkCurrentUser = async () => {
      if (auth?.currentUser) {
        console.log('Found existing authenticated user:', auth.currentUser.email);
        await refreshAuthState();
      }
      setIsLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? `User signed in: ${firebaseUser.email}` : 'User signed out');
      
      if (firebaseUser) {
        try {
          console.log('Processing authentication for:', firebaseUser.email);
          
          // Get ID token and send to backend
          const idToken = await getIdToken(firebaseUser);
          
          console.log('Sending authentication to backend...');
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              idToken,
              user: {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
              }
            })
          });

          if (response.ok) {
            console.log('✅ Backend authentication successful - setting user state');
            setUser(firebaseUser);
            
            // Force a small delay to ensure state updates properly in production
            setTimeout(() => {
              console.log('🔄 Verifying user state is set:', !!firebaseUser);
              setUser(firebaseUser);
            }, 100);
          } else {
            console.error('❌ Failed to authenticate with backend:', response.status);
            setUser(null);
          }
        } catch (error) {
          console.error('❌ Authentication error:', error);
          setUser(null);
        }
      } else {
        console.log('🚪 User signed out - clearing state');
        setUser(null);
        // Logout from backend session
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });
        } catch (error) {
          console.error('Backend logout error:', error);
        }
      }
      setIsLoading(false);
    });

    // Check current user immediately
    checkCurrentUser();

    return () => unsubscribe?.();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
