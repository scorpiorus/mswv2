import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";

// Check if Firebase credentials are available
const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_API_KEY && 
                          import.meta.env.VITE_FIREBASE_PROJECT_ID && 
                          import.meta.env.VITE_FIREBASE_APP_ID;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project"}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "demo-app-id",
};

console.log('Firebase config status:', {
  configured: hasFirebaseConfig,
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.slice(0, 10)}...` : 'NOT_SET'
});

// Only initialize Firebase if properly configured
let app;
let firebaseAuth = null;

if (hasFirebaseConfig) {
  try {
    app = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(app);
  } catch (error: any) {
    if (error.code === 'app/duplicate-app') {
      app = initializeApp(firebaseConfig, 'secondary');
      firebaseAuth = getAuth(app);
    } else {
      console.warn('Firebase initialization failed:', error);
    }
  }
} else {
  console.warn('Firebase not configured - authentication will be disabled');
}

export const auth = firebaseAuth;
export const googleProvider = hasFirebaseConfig ? new GoogleAuthProvider() : null;

// Configure Google provider if available
if (googleProvider) {
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
}

export const signInWithGoogle = async () => {
  if (!hasFirebaseConfig || !auth || !googleProvider) {
    throw new Error('Firebase authentication is not configured. Please configure Firebase to use authentication features.');
  }
  
  console.log('Firebase config:', {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? 'Set' : 'Not set',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ? 'Set' : 'Not set'
  });
  
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
  if (!auth) return Promise.resolve(null);
  return getRedirectResult(auth);
};

export const signOutUser = () => {
  if (!auth) return Promise.resolve();
  return signOut(auth);
};

export const onAuthStateChange = (callback: (user: any) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};