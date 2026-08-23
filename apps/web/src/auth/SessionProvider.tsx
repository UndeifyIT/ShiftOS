import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.js';
import { callRpc } from '../lib/apiClient.js';
import { friendlyErrorMessage } from '../lib/errors.js';
import type { MyContext, OrganizationSummary, SessionStatus, UserProfile } from './types.js';

const ACTIVE_ORG_STORAGE_KEY = 'shiftos.activeOrganizationId';

interface SessionState {
  status: SessionStatus;
  authUser: SupabaseUser | null;
  profile: UserProfile | null;
  organizations: OrganizationSummary[];
  myContext: MyContext | null;
  errorMessage: string | null;
}

interface SessionContextValue extends SessionState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  completeProfile: (input: { firstName: string; lastName: string; phone?: string; jobTitle?: string; avatarUrl?: string }) => Promise<{ error: string | null }>;
  switchOrganization: (organizationId: string) => Promise<void>;
  refresh: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
  /** The organization myContext currently resolves to, including metadata (e.g. onboarding progress) — undefined until 'ready'. */
  activeOrganization: OrganizationSummary | null;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const initialState: SessionState = {
  status: 'loading',
  authUser: null,
  profile: null,
  organizations: [],
  myContext: null,
  errorMessage: null
};

export function SessionProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, setState] = useState<SessionState>(initialState);

  const resolveContextForOrganization = useCallback(async (organizationId: string): Promise<MyContext> => {
    const context = await callRpc<MyContext>('get_my_context', organizationId);
    window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, organizationId);
    return context;
  }, []);

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
      .select('id, auth_user_id, first_name, last_name, email, phone, job_title, avatar_url, is_active')
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

    // Opportunistically turn a matching pending invitation (031) into a real
    // organization_memberships row before resolving which organizations this
    // identity belongs to. Safe to call on every bootstrap: accept_invitation()
    // returns an expected, ignorable error for the common case of no pending
    // invitation existing for this account's email (Supabase RPC calls report
    // failures via `error`, not a thrown exception — same convention as
    // create_organization_with_owner in OrganizationSetupPage.tsx). This is
    // what makes AcceptInvitationPage's "set your password" step actually
    // result in a usable Supervisor/Employee account, without that page
    // needing to know anything about membership/role/branch assignment itself.
    await supabase.rpc('accept_invitation');

    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, metadata')
      .order('name', { ascending: true });

    if (orgError) {
      setState({ ...initialState, status: 'error', authUser, profile: profile as UserProfile, errorMessage: orgError.message });
      return;
    }
    if (!organizations || organizations.length === 0) {
      setState({ ...initialState, status: 'no-organization', authUser, profile: profile as UserProfile, organizations: [] });
      return;
    }

    const stored = window.localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
    const activeOrganizationId = organizations.some((org) => org.id === stored) ? stored! : organizations[0]!.id;

    try {
      const myContext = await resolveContextForOrganization(activeOrganizationId);
      setState({
        status: 'ready',
        authUser,
        profile: profile as UserProfile,
        organizations,
        myContext,
        errorMessage: null
      });
    } catch (error) {
      setState({
        status: 'error',
        authUser,
        profile: profile as UserProfile,
        organizations,
        myContext: null,
        errorMessage: friendlyErrorMessage(error)
      });
    }
  }, [resolveContextForOrganization]);

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
    if (error) {
      return { error: 'Incorrect email or password.' };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    window.localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
  }, []);

  const completeProfile = useCallback(
    async (input: {
      firstName: string;
      lastName: string;
      phone?: string;
      jobTitle?: string;
      avatarUrl?: string;
    }): Promise<{ error: string | null }> => {
      if (!state.authUser) {
        return { error: 'Your session has expired. Please sign in again.' };
      }
      const { error } = await supabase.from('users').insert({
        auth_user_id: state.authUser.id,
        first_name: input.firstName,
        last_name: input.lastName,
        email: state.authUser.email,
        phone: input.phone ?? null,
        job_title: input.jobTitle ?? null,
        avatar_url: input.avatarUrl ?? null
      });
      if (error) {
        return { error: error.message };
      }
      await bootstrap();
      return { error: null };
    },
    [state.authUser, bootstrap]
  );

  const switchOrganization = useCallback(
    async (organizationId: string): Promise<void> => {
      setState((prev) => ({ ...prev, status: 'loading' }));
      try {
        const myContext = await resolveContextForOrganization(organizationId);
        setState((prev) => ({ ...prev, status: 'ready', myContext, errorMessage: null }));
      } catch (error) {
        setState((prev) => ({ ...prev, status: 'error', errorMessage: friendlyErrorMessage(error) }));
      }
    },
    [resolveContextForOrganization]
  );

  const hasPermission = useCallback((permissionCode: string) => state.myContext?.permissions.includes(permissionCode) ?? false, [
    state.myContext
  ]);

  const activeOrganization = useMemo(
    () => state.organizations.find((org) => org.id === state.myContext?.organizationId) ?? null,
    [state.organizations, state.myContext]
  );

  const value = useMemo<SessionContextValue>(
    () => ({ ...state, signIn, signOut, completeProfile, switchOrganization, refresh: bootstrap, hasPermission, activeOrganization }),
    [state, signIn, signOut, completeProfile, switchOrganization, bootstrap, hasPermission, activeOrganization]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}
