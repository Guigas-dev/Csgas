
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/config';
import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
// Loader2 is no longer used directly here for a global loader
// import { Loader2 } from 'lucide-react'; 

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: AuthError }>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // No need to setLoading(false) here if onAuthStateChanged handles currentUser update
      // which might trigger re-renders. However, for immediate feedback on the sign-in action itself:
      setLoading(false); 
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: error as AuthError };
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will set currentUser to null and loading to false.
      // Router push can be handled by AppSidebarNav or pages listening to auth state.
      router.push('/login'); 
    } catch (error) {
      console.error("Error signing out: ", error);
      // Handle sign out error if necessary, e.g., show a toast
    } finally {
      // setLoading(false) will be handled by onAuthStateChanged effectively
      // but if there's an error and onAuthStateChanged doesn't fire as expected,
      // this ensures loading state is reset.
      setLoading(false); 
    }
  };
  
  // Removed the problematic client-side only global loader block.
  // The AppSidebarNav and LoginPage components handle their own loading/redirect logic.
  // if (loading && !currentUser && typeof window !== 'undefined' && window.location.pathname !== '/login') {
  //   const isLoginPage = window.location.pathname === '/login';
  //   if (!isLoginPage) {
  //       return (
  //           <div className="flex items-center justify-center min-h-screen bg-background">
  //               <Loader2 className="h-12 w-12 animate-spin text-primary" />
  //           </div>
  //       );
  //   }
  // }


  const value = {
    currentUser,
    loading,
    signInWithEmail,
    signOutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

