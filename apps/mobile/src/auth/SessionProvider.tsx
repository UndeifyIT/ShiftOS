import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.js';
import { callRpc } from '../lib/apiClient.js';
import type { MyContext, SessionStatus, UserProfile } from './types.js';

interface SessionState {
  status: SessionStatus;
  authUser: SupabaseUser | null;
  profile: UserProfile | null;
  myContext: MyContext | null;
  errorMessage: string | null;
}

interface SessionContextValue extends SessionState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);
const initialState: SessionState = { status: 'loading', authUser: null, profile: null, myContext: null, errorMessage: null };

/**
 * Mobile counterpart of apps/web/src/auth/SessionProvider.tsx, trimmed to
 * what the mobile P0 scope needs (MOBILE-001-003, Supervisor/Staff only):
 * no organization-bootstrap step (WEB-001 is web-only per the frontend
 * foundation doc's platform mapping — organization setup is an
 * infrequent, desktop-appropriate admin action) and a single active
 * organization (mobile users are effectively always single-org, §E).
 */
export function SessionProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, setState] = useState<SessionState>(initialState);

  const bootstrap = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, status: 'loading', errorMessage: null }));

    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData.session?.user ?? null;
    if (!authUser) {
      setState({ ...initialState, status: 'unauthenticated' });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, auth_user_id, first_name, last_name, email, phone')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (profileError) {
      setState({ ...initialState, status: 'error', authUser, errorMessage: profileError.message });
      return;
    }
    if (!profile) {
      setState({ ...initialState, status: 'no-profile', authUser });
      return;
    }

    const { data: organizations, error: orgError } = await supabase.from('organizations').select('id').order('name');
    if (orgError) {
      setState({ ...initialState, status: 'error', authUser, profile: profile as UserProfile, errorMessage: orgError.message });
      return;
    }
    if (!organizations || organizations.length === 0) {
      setState({ ...initialState, status: 'no-organization', authUser, profile: profile as UserProfile });
      return;
    }

    try {
      const myContext = await callRpc<MyContext>('get_my_context', organizations[0]!.id);
      setState({ status: 'ready', authUser, profile: profile as UserProfile, myContext, errorMessage: null });
    } catch (error) {
      setState({
        status: 'error',
        authUser,
        profile: profile as UserProfile,
        myContext: null,
        errorMessage: error instanceof Error ? error.message : 'Something went wrong.'
      });
    }
  }, []);

  useEffect(() => {
    void bootstrap();
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        void bootstrap();
      }
    });
    return () => subscription.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? 'Incorrect email or password.' : null };
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
  }, []);

  const hasPermission = useCallback((code: string) => state.myContext?.permissions.includes(code) ?? false, [state.myContext]);

  const value = useMemo<SessionContextValue>(
    () => ({ ...state, signIn, signOut, refresh: bootstrap, hasPermission }),
    [state, signIn, signOut, bootstrap, hasPermission]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
