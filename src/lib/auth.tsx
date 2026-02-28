import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  mobile: string;
  class: string | null;
  status: 'pending' | 'approved' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string, mobile: string, studentClass?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileData) {
      setProfile(profileData as Profile);
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin');

    setIsAdmin(roleData && roleData.length > 0);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            if (mounted) fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
        
        // Mark loading done on any auth event if still loading
        if (isLoading) setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, mobile: string, studentClass?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    try {
      console.log('[Auth] signUp via proxy...');
      const { data: proxyData, error: proxyError } = await supabase.functions.invoke('auth-proxy', {
        body: { action: 'signUp', email, password, fullName, mobile, studentClass, redirectTo: redirectUrl },
      });

      if (proxyError) {
        console.error('[Auth] signUp proxy transport error:', proxyError);
        return { error: { message: proxyError.message || 'Network error during signup' } as Error };
      }

      if (proxyData?.error) {
        console.error('[Auth] signUp server error:', proxyData.error);
        return { error: { message: proxyData.error.message } as Error };
      }

      // If session was returned, set it on the local client
      if (proxyData?.session?.access_token) {
        await supabase.auth.setSession({
          access_token: proxyData.session.access_token,
          refresh_token: proxyData.session.refresh_token,
        });
      }

      return { error: null };
    } catch (err: any) {
      console.error('[Auth] signUp exception:', err);
      return { error: { message: err?.message || 'Signup failed' } as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    const startTime = Date.now();
    console.log('[Auth] signIn via proxy for:', email);
    
    try {
      const { data: proxyData, error: proxyError } = await supabase.functions.invoke('auth-proxy', {
        body: { action: 'signIn', email, password },
      });
      
      const elapsed = Date.now() - startTime;
      console.log('[Auth] proxy response in', elapsed, 'ms');
      
      if (proxyError) {
        console.error('[Auth] signIn proxy transport error:', proxyError);
        return { error: { message: `Connection error (${elapsed}ms): ${proxyError.message}. Try again.` } as any };
      }

      if (proxyData?.error) {
        console.error('[Auth] signIn server error:', proxyData.error);
        return { error: { message: proxyData.error.message } as any };
      }

      // Set the session on the local Supabase client
      if (proxyData?.session?.access_token) {
        await supabase.auth.setSession({
          access_token: proxyData.session.access_token,
          refresh_token: proxyData.session.refresh_token,
        });
      }
      
      console.log('[Auth] signIn success via proxy');
      return { error: null };
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      console.error('[Auth] signIn exception:', err);
      return { error: { message: `Unexpected error (${elapsed}ms): ${err?.message || 'Unknown'}` } as any };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isAdmin,
      isLoading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
