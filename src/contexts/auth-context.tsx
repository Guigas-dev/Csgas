
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
import { Loader2 } from 'lucide-react';

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
      // No need to setCurrentUser(null) here, onAuthStateChanged will handle it
      router.push('/login'); // Redirect to login after sign out
    } catch (error) {
      console.error("Error signing out: ", error);
      // Handle sign out error if necessary, e.g., show a toast
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !currentUser && typeof window !== 'undefined' && window.location.pathname !== '/login') {
    // Show a global loader only if not on login page and still initially loading auth state
    // This helps prevent flicker for protected routes.
    const isLoginPage = window.location.pathname === '/login';
    if (!isLoginPage) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
  }


  const value = {
    currentUser,
    loading,
    signInWithEmail,
    signOutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
