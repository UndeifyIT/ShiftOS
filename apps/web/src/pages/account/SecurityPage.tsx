import React, { useEffect, useState } from 'react';
import { Button, Card, ContentSection, PageContainer, PageHeader } from '@shiftos/ui';
import { supabase } from '../../lib/supabase.js';
import { useSession } from '../../auth/SessionProvider.js';

/**
 * SHARED-010 — Active Sessions / Security. Supabase's client SDK only ever
 * exposes the current device's session — listing/revoking sessions on other
 * devices requires the Auth admin API (service-role only, never callable
 * from the browser) and there is no RPC operation exposing it yet. Rather
 * than fabricate a cross-device session list, this shows the current
 * session honestly and explains the limitation (same pattern as
 * WEB-009/010's documented backend gaps).
 */
export default function SecurityPage(): React.ReactElement {
  const { authUser, signOut } = useSession();
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setExpiresAt(data.session?.expires_at ?? null));
  }, []);

  return (
    <PageContainer>
      <PageHeader title="Security & Sessions" />
      <ContentSection title="This device">
        <Card className="max-w-xl">
          <p className="text-sm text-neutral-700">Signed in as <strong>{authUser?.email}</strong></p>
          {expiresAt ? (
            <p className="mt-1 text-sm text-neutral-500">Session valid until {new Date(expiresAt * 1000).toLocaleString()}</p>
          ) : null}
          <Button variant="destructive" className="mt-4" onClick={() => void signOut()}>
            Sign out this device
          </Button>
        </Card>
      </ContentSection>
      <ContentSection title="Other devices" className="mt-6">
        <Card className="max-w-xl">
          <p className="text-sm text-neutral-500">
            Viewing and revoking sessions on other devices isn't available yet — this is reserved for a coming security milestone.
          </p>
        </Card>
      </ContentSection>
    </PageContainer>
  );
}
