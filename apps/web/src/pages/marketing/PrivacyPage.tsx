import React from 'react';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';
import { Section, SectionHeading } from '../../marketing/components.js';

/**
 * Ported from shift-app-hero's routes/privacy.tsx — same section structure
 * and heading treatment, adapted onto MarketingLayout/Section/SectionHeading.
 * Body copy is kept generic/placeholder (ShiftOS has no finalized privacy
 * policy yet) rather than inventing specific retention periods or
 * compliance certifications.
 */

const sections = [
  {
    title: 'Information we collect',
    body: 'We collect the details you provide when creating an organization, branches and staff records — names, work emails, phone numbers, roles and shift activity such as clock-ins and task completion.'
  },
  {
    title: 'How we use it',
    body: 'Workforce data is used to operate ShiftOS: building schedules, tracking attendance, routing approvals and producing the reports your managers rely on.'
  },
  {
    title: 'Who can see it',
    body: 'Access follows your own role structure. Managers see their organization, supervisors see their branch, and staff see their own shifts and requests.'
  },
  {
    title: 'Data retention',
    body: 'Records are kept for as long as your organization remains active. When you close your workspace we remove operational data on a defined schedule.'
  },
  {
    title: 'Your choices',
    body: 'You can export, correct or delete records from your organization settings, and request assistance from our team at any time.'
  },
  {
    title: 'Contact us',
    body: "Questions about privacy? Reach us and we'll respond as soon as we can."
  }
];

export default function PrivacyPage(): React.ReactElement {
  return (
    <MarketingLayout>
      <Section wash>
        <SectionHeading
          eyebrow="Legal"
          title="Privacy"
          highlight="Policy"
          description="ShiftOS is still finalizing its formal privacy policy. In the meantime, we only collect the account and workforce data you provide directly to operate scheduling for your organization, and we do not sell it."
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
          For specific questions about how your data is handled, reach us at{' '}
          <a href="mailto:hello@shiftos.app" className="font-semibold text-brand-700 hover:text-brand-600">
            hello@shiftos.app
          </a>
          .
        </p>
      </Section>
    </MarketingLayout>
  );
}
