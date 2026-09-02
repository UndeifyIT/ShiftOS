import React from 'react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';

/**
 * Recreated from `Local file check/design_handoff_shiftos/ShiftOS
 * Marketing.dc.html`'s "isLegal" branch — LEGAL.Privacy / LEGAL.Terms
 * sections verbatim. The prototype's in-place segmented tabs become links
 * between the real /privacy and /terms routes.
 */

type LegalKind = 'Privacy' | 'Terms';

const LEGAL: Record<LegalKind, { updated: string; sections: { heading: string; body: string }[] }> = {
  Privacy: {
    updated: '1 August 2026',
    sections: [
      {
        heading: 'What we collect',
        body: 'Account details (name, work email, phone), the organization and branch structure you create, and the operational records your team enters: shifts, attendance, tasks and announcements.'
      },
      {
        heading: 'Why we collect it',
        body: 'To operate ShiftOS for your organization: authenticate users, enforce role-based access, schedule work and keep attendance records your organization relies on.'
      },
      {
        heading: 'Employee photographs',
        body: 'Profile photos are optional. They are stored only when uploaded by an authorized manager or supervisor, and can be replaced or removed at any time from the employee profile.'
      },
      {
        heading: 'Who can see your data',
        body: 'Data is scoped to your organization and, where applicable, to a single branch. Access is granted by role. ShiftOS staff access production data only when required for support, and such access is logged.'
      },
      {
        heading: 'Retention and export',
        body: 'Records are kept while your organization is active. On cancellation you can export your data before deletion.'
      },
      {
        heading: 'Contact',
        body: 'Questions about this policy can be sent to privacy@shiftos.app and we will respond within one business day.'
      }
    ]
  },
  Terms: {
    updated: '1 August 2026',
    sections: [
      {
        heading: 'Agreement',
        body: 'By creating a ShiftOS organization you agree to these terms on behalf of that organization. The person who creates the organization holds the Manager role.'
      },
      {
        heading: 'Your responsibilities',
        body: 'You are responsible for the accuracy of the workforce records you enter, for granting roles appropriately, and for complying with the labour rules that apply to your business.'
      },
      {
        heading: 'Acceptable use',
        body: "ShiftOS may not be used to store data unrelated to workforce operations, to attempt to access another organization's data, or to interfere with the service."
      },
      {
        heading: 'Trials, billing and cancellation',
        body: 'Trials run for 30 days without a payment method. Paid plans bill monthly in advance and can be cancelled at any time, effective at the end of the current period.'
      },
      {
        heading: 'Availability',
        body: 'We work to keep ShiftOS available and will notify organizations of planned maintenance. Uptime commitments apply only where stated in an Enterprise agreement.'
      },
      {
        heading: 'Changes',
        body: 'We will notify organization managers by email before material changes to these terms take effect.'
      }
    ]
  }
};

export function LegalPage({ kind }: { kind: LegalKind }): React.ReactElement {
  const doc = LEGAL[kind];
  return (
    <MarketingLayout>
      <div className="mx-auto max-w-[820px] px-4 pb-16 pt-[52px] sm:px-6">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-deep">Legal</span>
        <h1 className="mt-3.5 font-display text-[38px] font-extrabold tracking-[-0.03em] text-neutral-900">
          {kind === 'Privacy' ? 'Privacy policy' : 'Terms & conditions'}
        </h1>
        <p className="mt-2.5 text-[13px] text-neutral-600">
          Last updated {doc.updated} &middot; applies to all ShiftOS organizations
        </p>
        <nav aria-label="Legal documents" className="mt-3.5 inline-flex gap-[3px] rounded-xl bg-neutral-100 p-1">
          <Link
            to="/privacy"
            className={[
              'rounded-lg px-[15px] py-2 text-[12.5px] font-bold transition-colors',
              kind === 'Privacy'
                ? 'bg-white text-neutral-900 shadow-[0_1px_3px_rgba(56,49,43,0.14)]'
                : 'text-neutral-600 hover:text-neutral-700'
            ].join(' ')}
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className={[
              'rounded-lg px-[15px] py-2 text-[12.5px] font-bold transition-colors',
              kind === 'Terms'
                ? 'bg-white text-neutral-900 shadow-[0_1px_3px_rgba(56,49,43,0.14)]'
                : 'text-neutral-600 hover:text-neutral-700'
            ].join(' ')}
          >
            Terms
          </Link>
        </nav>
        <div className="mt-6.5 flex flex-col gap-5.5">
          {doc.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-[17px] font-extrabold text-neutral-900">{s.heading}</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </MarketingLayout>
  );
}
