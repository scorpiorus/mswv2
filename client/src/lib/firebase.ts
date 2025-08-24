import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('Firebase config loaded:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.slice(0, 10)}...` : 'NOT_SET'
});

// Prevent duplicate app initialization in development
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  if (error.code === 'app/duplicate-app') {
    app = initializeApp(firebaseConfig, 'secondary');
  } else {
    throw error;
  }
}
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  console.log('Firebase config:', {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? 'Set' : 'Not set',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ? 'Set' : 'Not set'
  });
  
  // Check if config is valid
  if (!import.meta.env.VITE_FIREBASE_API_KEY || 
      !import.meta.env.VITE_FIREBASE_PROJECT_ID || 
      !import.meta.env.VITE_FIREBASE_APP_ID) {
    throw new Error('Firebase configuration is incomplete. Please check environment variables.');
  }
  
  try {
    // Use popup instead of redirect for better debugging
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Sign in successful:', result);
    return result;
  } catch (error: any) {
    console.error('Firebase sign in error:', error);
    
    // Handle specific error cases
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup was blocked by browser. Please allow popups and try again.');
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign in was cancelled.');
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error('Domain not authorized. Please add this domain to Firebase authorized domains.');
    }
    
    throw error;
  }
};

export const handleRedirectResult = () => {
  return getRedirectResult(auth);
};

export const signOutUser = () => {
  return signOut(auth);
};

export const onAuthStateChange = (callback: (user: any) => void) => {
  return onAuthStateChanged(auth, callback);
};