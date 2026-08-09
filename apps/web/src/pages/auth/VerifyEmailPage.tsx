import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { AuthLayout } from './AuthLayout.js';

/** SHARED-004 — Email Verification (WF-001 decision point: unverified email is blocked, not a generic error, DEC-019). */
export default function VerifyEmailPage(): React.ReactElement {
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setVerified(Boolean(data.session));
    });
  }, []);

  if (verified) {
    return (
      <AuthLayout title="Email verified">
        <p className="text-sm text-neutral-600">Taking you to your workspace…</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Verify your email">
      <p className="text-sm text-neutral-600">
        We sent a verification link to your email address. Click the link to activate your account, then sign in.
      </p>
      <Link to="/sign-in" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
        Back to sign in
      </Link>
    </AuthLayout>
  );
}
