'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Session, User } from '@supabase/supabase-js';
import { forceAuthCleanup } from '@/utils/supabase';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();  useEffect(() => {
    console.log('AuthContext: Initializing auth state');
    
    let isMounted = true;
    let authCleanupInProgress = false;
    
    const getSession = async () => {
      if (authCleanupInProgress) {
        console.log('AuthContext: Auth cleanup in progress, skipping session check');
        return;
      }
      
      try {
        // Ajouter un timeout pour éviter les blocages
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 5000)
        );
        
        const { data: { session: initialSession }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);
        
        if (!isMounted) return;
        
        if (error) {
          console.error('AuthContext: Error getting session:', error.message);
          
          // Si c'est une erreur de refresh token, nettoyer complètement l'état
          if ((error.message.includes('refresh_token_not_found') || 
              error.message.includes('Invalid Refresh Token') ||
              error.message.includes('Session timeout') ||
              error.code === 'refresh_token_not_found') && !authCleanupInProgress) {
            console.log('AuthContext: Cleaning invalid session state');
            authCleanupInProgress = true;
            
            setSession(null);
            setUser(null);
            
            // Forcer un nettoyage complet en arrière-plan
            forceAuthCleanup().catch(cleanupError => {
              console.warn('AuthContext: Error during force cleanup:', cleanupError);
            }).finally(() => {
              authCleanupInProgress = false;
            });
          }
          
          setIsLoading(false);
          return;
        }
        
        console.log('AuthContext: Initial session:', initialSession ? 'exists' : 'null');
        
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
        }
      } catch (error) {
        if (!isMounted) return;
        
        console.error('AuthContext: Unexpected error during getSession:', error);
        // En cas d'erreur, réinitialiser l'état
        setSession(null);
        setUser(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    getSession();

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;
        
        console.log('AuthContext: Auth state changed -', event, newSession ? 'session exists' : 'no session');
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsLoading(false);
        
        if (event === 'SIGNED_IN' && newSession) {
          console.log('AuthContext: User signed in, redirecting to dashboard');
          router.refresh();
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('AuthContext: User signed out');
          router.refresh();
        }
        
        // Gestion des erreurs de token
        if (event === 'TOKEN_REFRESHED' && !newSession) {
          console.log('AuthContext: Token refresh failed, signing out');
          setSession(null);
          setUser(null);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};