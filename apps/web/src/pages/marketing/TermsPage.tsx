import React from 'react';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';
import { Section, SectionHeading } from '../../marketing/components.js';

/**
 * Ported from shift-app-hero's routes/terms.tsx — same section structure and
 * heading treatment, adapted onto MarketingLayout/Section/SectionHeading.
 * Body copy is kept generic/placeholder (ShiftOS has no finalized legal
 * terms yet) rather than inventing specific contractual commitments.
 */

const sections = [
  {
    title: 'Using ShiftOS',
    body: 'ShiftOS is licensed to your organization for managing schedules, attendance, tasks and team communication across your branches.'
  },
  {
    title: 'Accounts and roles',
    body: 'You are responsible for who you invite and the permissions you grant. Managers, supervisors and staff each see only what their role allows.'
  },
  {
    title: 'Acceptable use',
    body: "Don't use ShiftOS to store unrelated personal data, attempt to bypass access controls, or resell access without an agreement with us."
  },
  {
    title: 'Billing',
    body: 'Paid plans renew on your chosen billing cycle. You can change or cancel a plan from your organization settings before the next renewal.'
  },
  {
    title: 'Availability',
    body: 'We work hard to keep ShiftOS available around your shift patterns and will notify workspace admins ahead of planned maintenance.'
  },
  {
    title: 'Changes to these terms',
    body: "If we update these terms materially we'll notify workspace admins by email before the changes take effect."
  }
];

export default function TermsPage(): React.ReactElement {
  return (
    <MarketingLayout>
      <Section wash>
        <SectionHeading
          eyebrow="Legal"
          title="Terms of"
          highlight="Service"
          description="ShiftOS's formal terms of service are still being finalized as the product moves toward general availability. This page summarizes the terms that would govern your use of ShiftOS. If you need contractual terms for an active or pending engagement, contact us directly."
        />
      </Section>
      <Section>
        <div className="mx-auto max-w-3xl space-y-6">
          {sections.map((s) => (
            <section key={s.title} className="rounded-lg border border-neutral-200 bg-white p-6 shadow-card">
              <h2 className="text-lg font-bold text-neutral-900">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{s.body}</p>
            </section>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-neutral-500">
          Questions about these terms? Reach us at{' '}
          <a href="mailto:hello@shiftos.app" className="font-semibold text-brand-700 hover:text-brand-600">
            hello@shiftos.app
          </a>
          .
        </p>
      </Section>
    </MarketingLayout>
  );
}
