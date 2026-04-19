import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  mobile: string;
  class: string | null;
  status: 'pending' | 'approved' | 'inactive';
  school_name?: string | null;
  profile_completed?: boolean;
  verified?: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  profileLoaded: boolean;
  /** True only after backend confirms the profile row truly does not exist. */
  profileMissing: boolean;
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
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileMissing, setProfileMissing] = useState(false);

  // Guards to prevent duplicate profile fetches for the same user id.
  const fetchingForRef = useRef<string | null>(null);

  const AUTH_PROXY_TIMEOUT_MS = 12000;
  const AUTH_PROXY_MAX_RETRIES = 2;

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const callAuthProxy = async (payload: Record<string, unknown>) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), AUTH_PROXY_TIMEOUT_MS);

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/auth-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: publishableKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const text = await response.text();
      const json = text ? JSON.parse(text) : {};

      if (!response.ok) {
        return {
          data: null,
          error: { message: json?.error?.message || `Request failed (${response.status})` } as Error,
          isTransportError: false,
        };
      }

      return { data: json, error: null, isTransportError: false };
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError';
      return {
        data: null,
        error: { message: isAbort ? 'Request timeout. Please check network and retry.' : err?.message || 'Network error' } as Error,
        isTransportError: true,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const callAuthProxyWithRetry = async (payload: Record<string, unknown>) => {
    let lastError: Error | null = null;
    let lastTransportError = false;

    for (let attempt = 0; attempt <= AUTH_PROXY_MAX_RETRIES; attempt++) {
      const result = await callAuthProxy(payload);

      if (!result.error) {
        return result;
      }

      lastError = result.error;
      lastTransportError = result.isTransportError;

      if (!result.isTransportError || attempt === AUTH_PROXY_MAX_RETRIES) {
        break;
      }

      await wait(400 * (attempt + 1));
    }

    return { data: null, error: lastError, isTransportError: lastTransportError };
  };

  /**
   * Fetch the profile row for a given user. Uses maybeSingle so a missing row
   * does NOT throw — we differentiate "still loading" vs "confirmed missing".
   * Retries once on transient network failure to avoid the false
   * "Account not found" flash on flaky mobile / PWA reloads.
   */
  const fetchProfile = async (userId: string) => {
    if (fetchingForRef.current === userId) return;
    fetchingForRef.current = userId;

    let attempt = 0;
    let lastError: any = null;

    while (attempt < 2) {
      try {
        const [profileRes, roleRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
          supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin'),
        ]);

        if (profileRes.error && profileRes.error.code !== 'PGRST116') {
          lastError = profileRes.error;
          throw profileRes.error;
        }

        const data = profileRes.data;
        if (data) {
          setProfile(data as Profile);
          setProfileMissing(false);
        } else {
          setProfile(null);
          setProfileMissing(true);
        }
        setIsAdmin(!!roleRes.data && roleRes.data.length > 0);
        setProfileLoaded(true);
        return;
      } catch (err) {
        lastError = err;
        attempt++;
        if (attempt < 2) await wait(600);
      }
    }

    // Network/server error after retries — do NOT mark profile as missing.
    // Just mark loaded so UI can show retry state instead of false "not found".
    console.warn('[Auth] fetchProfile failed after retries', lastError);
    setProfileLoaded(true);
  };

  const refreshProfile = async () => {
    if (user) {
      fetchingForRef.current = null;
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        const newUser = newSession?.user ?? null;
        setUser(newUser);

        if (newUser) {
          // reset stale state when user changes
          if (fetchingForRef.current !== newUser.id) {
            setProfileLoaded(false);
            setProfileMissing(false);
          }
          // Defer profile fetch to next tick to avoid deadlocks
          setTimeout(() => {
            if (mounted) fetchProfile(newUser.id);
          }, 0);
        } else {
          fetchingForRef.current = null;
          setProfile(null);
          setIsAdmin(false);
          setProfileLoaded(true);
          setProfileMissing(false);
        }

        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;
      setSession(existingSession);
      const existingUser = existingSession?.user ?? null;
      setUser(existingUser);

      if (existingUser) {
        fetchProfile(existingUser.id).finally(() => {
          if (mounted) setIsLoading(false);
        });
      } else {
        setProfileLoaded(true);
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
      const { data: proxyData, error: proxyError, isTransportError } = await callAuthProxyWithRetry({
        action: 'signUp',
        email,
        password,
        fullName,
        mobile,
        studentClass,
        redirectTo: redirectUrl,
      });

      if (proxyError) {
        if (isTransportError) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirectUrl },
          });

          if (error) return { error };

          if (data.session?.access_token) {
            await supabase.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            });
          }

          return { error: null };
        }

        return { error: proxyError };
      }

      if ((proxyData as any)?.error) {
        return { error: { message: (proxyData as any).error.message } as Error };
      }

      if ((proxyData as any)?.session?.access_token) {
        await supabase.auth.setSession({
          access_token: (proxyData as any).session.access_token,
          refresh_token: (proxyData as any).session.refresh_token,
        });
      }

      return { error: null };
    } catch (err: any) {
      return { error: { message: err?.message || 'Signup failed' } as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data: proxyData, error: proxyError, isTransportError } = await callAuthProxyWithRetry({
        action: 'signIn',
        email,
        password,
      });

      if (proxyError) {
        if (isTransportError) {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            return { error: { message: error.message } as any };
          }

          if (data.session?.access_token) {
            await supabase.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            });
          }

          return { error: null };
        }

        return { error: { message: proxyError.message } as any };
      }

      if ((proxyData as any)?.error) {
        return { error: { message: (proxyData as any).error.message } as any };
      }

      if ((proxyData as any)?.session?.access_token) {
        await supabase.auth.setSession({
          access_token: (proxyData as any).session.access_token,
          refresh_token: (proxyData as any).session.refresh_token,
        });
      }

      return { error: null };
    } catch (err: any) {
      return { error: { message: err?.message || 'Unexpected login error' } as any };
    }
  };

  const signOut = async () => {
    fetchingForRef.current = null;
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
    setProfileLoaded(true);
    setProfileMissing(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isAdmin,
      isLoading,
      profileLoaded,
      profileMissing,
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
