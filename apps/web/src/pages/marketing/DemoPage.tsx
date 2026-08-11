import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  HelpCircle,
  Mail,
  MessageCircle,
  PlayCircle,
  Store,
  User,
  Users
} from 'lucide-react';
import { buttonClasses, Button, FormField, Input, Select, Textarea } from '@shiftos/ui';
import { MarketingLayout } from '../../marketing/MarketingLayout.js';
import { Eyebrow, IconCircle } from '../../marketing/components.js';
import dashboardMock from '../../assets/dashboard-mock.png';

/**
 * Ported from shift-app-hero's routes/demo.tsx (RequestDemo) — same
 * two-column layout, copy and form fields.
 *
 * Deliberate deviation from the source: the Lovable prototype's `onSubmit`
 * fakes a network call with `window.setTimeout` and then shows "Your demo
 * request is in" — implying a real lead was captured. ShiftOS has no
 * demo-request RPC/endpoint today (packages/api/src/registry.ts has no such
 * operation), so pretending to submit here would tell real users their
 * request was received when nothing happened. Instead, once the form
 * validates locally we show an honest "here's what's next" panel with a
 * `mailto:` link pre-filled from the values they entered, so the work they
 * put into the form isn't wasted — nothing is silently dropped, and nothing
 * false is claimed.
 */

const HIGHLIGHTS = [
  { icon: PlayCircle, title: 'Live Walkthrough', body: 'See ShiftOS in action' },
  { icon: HelpCircle, title: 'Q&A Session', body: 'Get answers in real time' },
  { icon: Users, title: 'Tailored for You', body: 'We focus on your branch needs' }
];

const EMPLOYEE_OPTIONS = [
  { value: '1-10', label: '1 – 10' },
  { value: '11-25', label: '11 – 25' },
  { value: '26-50', label: '26 – 50' },
  { value: '51-100', label: '51 – 100' },
  { value: '100+', label: '100+' }
];

const BUSINESS_TYPE_OPTIONS = [
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'retail-store', label: 'Retail Store' },
  { value: 'restaurant-qsr', label: 'Restaurant / QSR' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'hotel-hospitality', label: 'Hotel / Hospitality' },
  { value: 'logistics-warehouse', label: 'Logistics / Warehouse' },
  { value: 'other', label: 'Other' }
];

const TIME_OPTIONS = [
  { value: 'morning', label: 'Morning (9am – 12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm – 4pm)' },
  { value: 'evening', label: 'Evening (4pm – 7pm)' }
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface DemoFormValues {
  fullName: string;
  company: string;
  branch: string;
  email: string;
  whatsapp: string;
  employees: string;
  businessType: string;
  date: string;
  time: string;
  notes: string;
}

const EMPTY_FORM: DemoFormValues = {
  fullName: '',
  company: '',
  branch: '',
  email: '',
  whatsapp: '',
  employees: '',
  businessType: '',
  date: '',
  time: '',
  notes: ''
};

type FormErrors = Partial<Record<keyof DemoFormValues, string>>;

function optionLabel(options: { value: string; label: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function buildMailtoHref(values: DemoFormValues): string {
  const subject = `Demo request – ${values.company || values.fullName || 'ShiftOS'}`;
  const lines = [
    `Full name: ${values.fullName}`,
    `Organization: ${values.company}`,
    `Branch: ${values.branch}`,
    `Work email: ${values.email}`,
    `WhatsApp: +234 ${values.whatsapp}`,
    `Number of employees: ${optionLabel(EMPLOYEE_OPTIONS, values.employees)}`,
    values.businessType ? `Business type: ${optionLabel(BUSINESS_TYPE_OPTIONS, values.businessType)}` : null,
    `Preferred date: ${values.date}`,
    `Preferred time: ${optionLabel(TIME_OPTIONS, values.time)}`,
    values.notes ? `Notes: ${values.notes}` : null
  ].filter((line): line is string => Boolean(line));
  const body = `Hi ShiftOS team,\n\nI'd like to book a demo. Here are my details:\n\n${lines.join('\n')}`;
  return `mailto:hello@shiftos.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function DemoPage(): React.ReactElement {
  const [values, setValues] = useState<DemoFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const update = <K extends keyof DemoFormValues>(key: K, value: DemoFormValues[K]): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    const next: FormErrors = {};
    if (!values.fullName.trim()) next.fullName = 'Enter your full name.';
    if (!values.company.trim()) next.company = 'Enter your organization name.';
    if (!values.branch.trim()) next.branch = 'Enter your branch name.';
    if (!EMAIL_PATTERN.test(values.email)) next.email = 'Enter a valid work email address.';
    if (values.whatsapp.replace(/\D/g, '').length < 7) next.whatsapp = 'Enter a valid number.';
    if (!values.employees) next.employees = 'Select the number of employees.';
    if (!values.businessType) next.businessType = 'Select your business type.';
    if (!values.date) next.date = 'Choose a preferred date.';
    if (!values.time) next.time = 'Choose a preferred time.';

    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError('Please fix the highlighted fields and try again.');
      return;
    }
    setFormError(null);
    setSubmitted(true);
  };

  return (
    <MarketingLayout>
      <section className="bg-neutral-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:py-16 lg:px-8">
          <div className="max-w-md">
            <Eyebrow>
              <CalendarDays size={14} aria-hidden="true" /> 30-minute live demo
            </Eyebrow>
            <h1 className="mt-5 text-4xl font-bold leading-[1.06] tracking-tight text-neutral-900 sm:text-5xl">
              See ShiftOS in Action, Built for <span className="text-brand-500">Shift Teams</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-neutral-500">
              Book a free, personalized demo and see how ShiftOS can simplify scheduling, attendance, tasks and team communication
              across your branches.
            </p>
            <span aria-hidden="true" className="mt-6 block h-1 w-14 rounded-full bg-brand-500" />
            <ul className="mt-6 space-y-4">
              {HIGHLIGHTS.map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <IconCircle size={40}>
                    <item.icon size={20} aria-hidden="true" />
                  </IconCircle>
                  <span>
                    <span className="block text-sm font-bold text-neutral-900">{item.title}</span>
                    <span className="block text-xs text-neutral-500">{item.body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-card">
              <img
                src={dashboardMock}
                alt="ShiftOS dashboard preview"
                width={1440}
                height={896}
                loading="lazy"
                className="w-full rounded-xl"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-lift sm:p-8">
            {submitted ? (
              <div className="py-10 text-center">
                <IconCircle tone="info" size={64}>
                  <Mail size={28} aria-hidden="true" />
                </IconCircle>
                <h2 className="mt-5 text-2xl font-bold text-neutral-900">One more step to lock it in</h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-neutral-500">
                  Thanks, {values.fullName.split(' ')[0] || 'there'}. Demo requests aren&rsquo;t wired up to book automatically
                  yet, so nothing was sent on our end. Click below to email hello@shiftos.app with the details you entered —
                  we&rsquo;ll confirm your {values.time ? `${optionLabel(TIME_OPTIONS, values.time)} ` : ''}slot on{' '}
                  {values.date || 'your preferred date'} by hand.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <a href={buildMailtoHref(values)} className={buttonClasses({ variant: 'hero', size: 'lg' })}>
                    <Mail size={16} aria-hidden="true" /> Email hello@shiftos.app
                  </a>
                  <button
                    type="button"
                    className={buttonClasses({ variant: 'heroOutline', size: 'lg' })}
                    onClick={() => {
                      setValues(EMPTY_FORM);
                      setErrors({});
                      setSubmitted(false);
                    }}
                  >
                    Edit details
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-neutral-900">Book Your Free Demo</h2>
                  <p className="mt-1.5 text-sm text-neutral-500">
                    Fill out the form below and we&rsquo;ll schedule a personalized demo for your team.
                  </p>
                </div>

                {formError ? (
                  <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-xl border border-error-500/30 bg-error-50 p-3">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-error-600" aria-hidden="true" />
                    <p className="text-xs font-semibold text-error-600">{formError}</p>
                  </div>
                ) : null}

                <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Full Name" htmlFor="fullName" required error={errors.fullName}>
                      {(fieldProps) => (
                        <Input
                          {...fieldProps}
                          value={values.fullName}
                          onChange={(e) => update('fullName', e.target.value)}
                          placeholder="Enter your full name"
                          autoComplete="name"
                        />
                      )}
                    </FormField>
                    <FormField label="Organization Name" htmlFor="company" required error={errors.company}>
                      {(fieldProps) => (
                        <Input
                          {...fieldProps}
                          value={values.company}
                          onChange={(e) => update('company', e.target.value)}
                          placeholder="Enter organization name"
                        />
                      )}
                    </FormField>
                    <FormField label="Branch Name" htmlFor="branch" required error={errors.branch}>
                      {(fieldProps) => (
                        <Input
                          {...fieldProps}
                          value={values.branch}
                          onChange={(e) => update('branch', e.target.value)}
                          placeholder="Enter branch name"
                        />
                      )}
                    </FormField>
                    <FormField label="Work Email" htmlFor="email" required error={errors.email}>
                      {(fieldProps) => (
                        <Input
                          {...fieldProps}
                          type="email"
                          value={values.email}
                          onChange={(e) => update('email', e.target.value)}
                          placeholder="Enter your work email"
                          autoComplete="email"
                        />
                      )}
                    </FormField>
                    <FormField label="WhatsApp Number" htmlFor="whatsapp" required error={errors.whatsapp}>
                      {(fieldProps) => (
                        <div className="flex">
                          <span className="flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-sm font-semibold text-neutral-600">
                            +234
                          </span>
                          <Input
                            {...fieldProps}
                            className="rounded-l-none"
                            inputMode="tel"
                            value={values.whatsapp}
                            onChange={(e) => update('whatsapp', e.target.value)}
                            placeholder="Enter WhatsApp number"
                          />
                        </div>
                      )}
                    </FormField>
                    <FormField label="Number of Employees" htmlFor="employees" required error={errors.employees}>
                      {(fieldProps) => (
                        <Select
                          {...fieldProps}
                          placeholder="Select number of employees"
                          options={EMPLOYEE_OPTIONS}
                          value={values.employees}
                          onChange={(e) => update('employees', e.target.value)}
                        />
                      )}
                    </FormField>
                  </div>

                  <FormField label="Business Type" htmlFor="businessType" required error={errors.businessType}>
                    {(fieldProps) => (
                      <Select
                        {...fieldProps}
                        placeholder="Select your business type"
                        options={BUSINESS_TYPE_OPTIONS}
                        value={values.businessType}
                        onChange={(e) => update('businessType', e.target.value)}
                      />
                    )}
                  </FormField>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Preferred Demo Date" htmlFor="date" required error={errors.date}>
                      {(fieldProps) => (
                        <Input {...fieldProps} type="date" value={values.date} onChange={(e) => update('date', e.target.value)} />
                      )}
                    </FormField>
                    <FormField label="Preferred Time" htmlFor="time" required error={errors.time}>
                      {(fieldProps) => (
                        <Select
                          {...fieldProps}
                          placeholder="Select time of day"
                          options={TIME_OPTIONS}
                          value={values.time}
                          onChange={(e) => update('time', e.target.value)}
                        />
                      )}
                    </FormField>
                  </div>

                  <FormField label="Anything else you'd like us to know?" htmlFor="notes">
                    {(fieldProps) => (
                      <Textarea
                        {...fieldProps}
                        value={values.notes}
                        onChange={(e) => update('notes', e.target.value)}
                        maxLength={1000}
                        rows={4}
                        placeholder="Tell us about your branch, goals, or any specific challenges…"
                      />
                    )}
                  </FormField>

                  <div className="rounded-xl bg-brand-soft/70 p-4 text-center">
                    <p className="text-sm font-bold text-brand-deep">Free 30-minute personalized demo.</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      No obligation. We&rsquo;ll tailor the walkthrough to your branch&rsquo;s workflow.
                    </p>
                  </div>

                  <Button type="submit" variant="hero" size="xl" fullWidth>
                    Continue <ArrowRight size={16} aria-hidden="true" />
                  </Button>

                  <p className="text-center text-xs text-neutral-500">
                    We respect your privacy. Read our{' '}
                    <Link to="/privacy" className="font-semibold text-brand-500 hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
