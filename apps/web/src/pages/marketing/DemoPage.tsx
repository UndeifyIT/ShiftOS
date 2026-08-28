import React from 'react';
import { HelpCircle, PlayCircle, Users } from 'lucide-react';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';

/**
 * Recreated from `Local file check/design_handoff_shiftos/ShiftOS
 * Marketing.dc.html`'s "isDemo" branch — DEMO_FIELDS/demoPoints verbatim and
 * the prototype's async submit flow made real: required-field + work-email
 * validation (its "Validation error" state), busy submit label ("Loading"),
 * then the "Request received" success panel ("Success"), resettable via
 * "Send another request".
 */

const DEMO_POINTS = [
  {
    title: 'Live walkthrough',
    body: 'See ShiftOS run a real shift end to end.',
    icon: PlayCircle,
    tile: 'bg-brand-soft text-brand-deep'
  },
  {
    title: 'Q&A session',
    body: 'Ask about your branches, roles and rotations.',
    icon: HelpCircle,
    tile: 'bg-info-50 text-info-600'
  },
  {
    title: 'Tailored to you',
    body: 'We focus on your operation, not a generic deck.',
    icon: Users,
    tile: 'bg-success-soft text-success-600'
  }
];

const EMPLOYEE_RANGES = ['1 – 15', '16 – 50', '51 – 200', '200+'];

type FormState = 'idle' | 'busy' | 'sent';

type FieldErrors = Partial<Record<'fullName' | 'organization' | 'workEmail' | 'whatsapp' | 'employees' | 'businessType' | 'preferredDate', string>>;

const INPUT_BASE =
  'h-11 w-full rounded-xl border bg-white px-[13px] text-[13.5px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500';

export default function DemoPage(): React.ReactElement {
  const [state, setState] = React.useState<FormState>('idle');
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [values, setValues] = React.useState({
    fullName: '',
    organization: '',
    branchName: '',
    workEmail: '',
    whatsapp: '',
    employees: '',
    businessType: '',
    preferredDate: '',
    notes: ''
  });

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'busy') return;
    const next: FieldErrors = {};
    if (!values.fullName.trim()) next.fullName = 'Enter your full name.';
    if (!values.organization.trim()) next.organization = 'Enter your organization name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.workEmail.trim())) next.workEmail = 'Enter a valid work email address.';
    if (!values.whatsapp.trim()) next.whatsapp = 'Enter a WhatsApp number we can reach you on.';
    if (!values.employees) next.employees = 'Select a range.';
    if (!values.businessType.trim()) next.businessType = 'Tell us your business type.';
    if (!values.preferredDate) next.preferredDate = 'Select a preferred date.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setState('busy');
    window.setTimeout(() => setState('sent'), 900);
  };

  const reset = () => {
    setState('idle');
    setErrors({});
  };

  const inputClass = (invalid?: string) =>
    invalid ? `${INPUT_BASE} border-error-500 bg-[#FEF7F5]` : `${INPUT_BASE} border-neutral-300`;

  return (
    <MarketingLayout>
      <div className="mx-auto flex max-w-7xl flex-wrap items-start gap-8 px-4 pb-16 pt-[52px] sm:px-6">
        {/* Copy */}
        <div className="min-w-[280px] flex-1 basis-[360px]">
          <span className="inline-flex items-center rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-brand-deep">
            30-minute live demo
          </span>
          <h1 className="mt-4 font-display text-[2.625rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-neutral-900">
            See ShiftOS in action, built for <span className="text-brand-500">shift teams</span>.
          </h1>
          <p className="mt-4 max-w-[480px] text-[15.5px] leading-relaxed text-neutral-500">
            Book a free, personalized demo and see how ShiftOS handles scheduling, attendance, tasks and communication
            across your branches.
          </p>
          <ul className="mt-6 flex flex-col gap-3.5">
            {DEMO_POINTS.map((d) => (
              <li key={d.title} className="flex items-start gap-3">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${d.tile}`}>
                  <d.icon className="size-[18px]" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-extrabold text-neutral-900">{d.title}</span>
                  <span className="block text-[12.5px] text-neutral-500">{d.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6.5 rounded-2xl border border-neutral-200 bg-[#FDFCFB] p-4.5">
            <p className="text-[13px] font-extrabold text-neutral-900">Prefer to write instead?</p>
            <p className="mt-1.5 text-[13px] text-neutral-500">
              Email{' '}
              <a href="mailto:hello@shiftos.app" className="font-bold text-brand-deep hover:text-brand-500">
                hello@shiftos.app
              </a>{' '}
              or send the form &mdash; both reach the same team, usually within one business day.
            </p>
          </div>
        </div>

        {/* Form card */}
        <form
          onSubmit={submit}
          noValidate
          className="min-w-[290px] flex-1 basis-[420px] rounded-[20px] border border-neutral-200 bg-white p-6.5 shadow-[0_20px_50px_-30px_rgba(56,49,43,0.35)]"
        >
          {state === 'sent' ? (
            <div role="status" className="rounded-2xl border border-success-500/40 bg-[#F1FAF5] p-4.5 text-center">
              <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-success-500 text-[19px] font-extrabold text-white">
                &#10003;
              </span>
              <p className="mt-3 text-[15px] font-extrabold text-neutral-900">Request received</p>
              <p className="mt-1.5 text-[13px] text-neutral-600">
                We'll confirm your slot by email within one business day. Nothing is scheduled until you get that
                confirmation.
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-3.5 h-[38px] rounded-xl border border-success-500/40 bg-white px-4 text-[12.5px] font-bold text-neutral-900 transition-colors hover:border-success-500"
              >
                Send another request
              </button>
            </div>
          ) : (
            <>
              <h2 className="m-0 text-center text-[22px] font-extrabold text-neutral-900">Book your free demo</h2>
              <p className="mb-5 mt-1.5 text-center text-[13px] text-neutral-500">
                Tell us about your operation and we'll tailor the walkthrough.
              </p>

              <div className="grid gap-3.5 sm:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">
                <label>
                  <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">
                    Full name<span className="text-brand-500"> *</span>
                  </span>
                  <input
                    type="text"
                    value={values.fullName}
                    onChange={set('fullName')}
                    placeholder="Enter your full name"
                    aria-invalid={!!errors.fullName}
                    className={inputClass(errors.fullName)}
                  />
                  {errors.fullName ? <span className="mt-1.5 block text-[11.5px] font-semibold text-error-500">{errors.fullName}</span> : null}
                </label>

                <label>
                  <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">
                    Organization name<span className="text-brand-500"> *</span>
                  </span>
                  <input
                    type="text"
                    value={values.organization}
                    onChange={set('organization')}
                    placeholder="Enter organization name"
                    aria-invalid={!!errors.organization}
                    className={inputClass(errors.organization)}
                  />
                  {errors.organization ? (
                    <span className="mt-1.5 block text-[11.5px] font-semibold text-error-500">{errors.organization}</span>
                  ) : null}
                </label>

                <label>
                  <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">Branch name</span>
                  <input
                    type="text"
                    value={values.branchName}
                    onChange={set('branchName')}
                    placeholder="Enter branch name"
                    className={`${INPUT_BASE} border-neutral-300`}
                  />
                </label>

                <label>
                  <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">
                    Work email<span className="text-brand-500"> *</span>
                  </span>
                  <input
                    type="email"
                    value={values.workEmail}
                    onChange={set('workEmail')}
                    placeholder="you@company.com"
                    aria-invalid={!!errors.workEmail}
                    className={inputClass(errors.workEmail)}
                  />
                  {errors.workEmail ? (
                    <span className="mt-1.5 block text-[11.5px] font-semibold text-error-500">{errors.workEmail}</span>
                  ) : null}
                </label>

                <label>
                  <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">
                    WhatsApp number<span className="text-brand-500"> *</span>
                  </span>
                  <input
                    type="tel"
                    value={values.whatsapp}
                    onChange={set('whatsapp')}
                    placeholder="+234 801 234 5678"
                    aria-invalid={!!errors.whatsapp}
                    className={inputClass(errors.whatsapp)}
                  />
                  {errors.whatsapp ? (
                    <span className="mt-1.5 block text-[11.5px] font-semibold text-error-500">{errors.whatsapp}</span>
                  ) : null}
                </label>

                <label>
                  <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">
                    Number of employees<span className="text-brand-500"> *</span>
                  </span>
                  <select
                    value={values.employees}
                    onChange={set('employees')}
                    aria-invalid={!!errors.employees}
                    className={`${inputClass(errors.employees)} ${values.employees ? '' : 'text-neutral-400'}`}
                  >
                    <option value="" disabled>
                      Select a range
                    </option>
                    {EMPLOYEE_RANGES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {errors.employees ? (
                    <span className="mt-1.5 block text-[11.5px] font-semibold text-error-500">{errors.employees}</span>
                  ) : null}
                </label>

                <label className="sm:col-span-full">
                  <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">
                    Business type<span className="text-brand-500"> *</span>
                  </span>
                  <input
                    type="text"
                    value={values.businessType}
                    onChange={set('businessType')}
                    placeholder="Supermarket, restaurant, hotel…"
                    aria-invalid={!!errors.businessType}
                    className={inputClass(errors.businessType)}
                  />
                  {errors.businessType ? (
                    <span className="mt-1.5 block text-[11.5px] font-semibold text-error-500">{errors.businessType}</span>
                  ) : null}
                </label>

                <label className="sm:col-span-full">
                  <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">
                    Preferred date<span className="text-brand-500"> *</span>
                  </span>
                  <input
                    type="date"
                    value={values.preferredDate}
                    onChange={set('preferredDate')}
                    aria-invalid={!!errors.preferredDate}
                    className={inputClass(errors.preferredDate)}
                  />
                  {errors.preferredDate ? (
                    <span className="mt-1.5 block text-[11.5px] font-semibold text-error-500">{errors.preferredDate}</span>
                  ) : null}
                </label>

                <label className="sm:col-span-full">
                  <span className="mb-1.5 block text-[12.5px] font-bold text-neutral-900">
                    Anything else we should know?{' '}
                    <span className="font-medium text-neutral-400">(optional)</span>
                  </span>
                  <textarea
                    rows={3}
                    value={values.notes}
                    onChange={set('notes')}
                    placeholder="Tell us about your branches, goals or any specific challenges…"
                    className="w-full resize-y rounded-xl border border-neutral-300 px-[13px] py-2.5 text-[13.5px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={state === 'busy'}
                className={
                  state === 'busy'
                    ? 'mt-4.5 h-12 w-full cursor-progress rounded-[13px] bg-[#F5A98A] text-[14.5px] font-bold text-white'
                    : 'mt-4.5 h-12 w-full cursor-pointer rounded-[13px] bg-brand-500 text-[14.5px] font-bold text-white shadow-[0_14px_30px_-16px_rgba(240,78,23,0.75)] transition-colors hover:bg-brand-600'
                }
              >
                {state === 'busy' ? 'Sending request…' : 'Book my free demo \u2192'}
              </button>
              <p className="mt-3 text-center text-[11.5px] text-neutral-400">
                We respect your privacy. Your information is only used to arrange the demo.
              </p>
            </>
          )}
        </form>
      </div>
    </MarketingLayout>
  );
}
