/** Replaces src/lib/supabase.ts inside the schedule preview only — no network, no credentials. */
const noop = async () => ({ data: { session: null, user: null, signedUrl: null }, error: null });

export const supabase = {
  auth: {
    getSession: noop,
    getUser: noop,
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    signOut: noop,
    signInWithPassword: noop,
    updateUser: noop
  },
  storage: {
    from: () => ({ createSignedUrl: noop, upload: noop, remove: noop })
  },
  from: () => ({ select: noop }),
  rpc: noop
};
