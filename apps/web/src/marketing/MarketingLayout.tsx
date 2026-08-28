import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { MarketingNav } from './MarketingNav.js';
import { MarketingFooter } from './MarketingFooter.js';

/**
 * The dark "Stop juggling spreadsheets…" band + footer sit outside every
 * page-specific `sc-if` branch in ShiftOS Marketing.dc.html — i.e. they
 * render at the bottom of every marketing page, including Home (which also
 * has its own orange "Publish next week…" CTA above it). Kept here rather
 * than repeated per page.
 */
function SharedClosingBand(): React.ReactElement {
  return (
    <section className="border-t border-neutral-100 bg-[#231E1A] text-[#FBF7F4]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 py-9 sm:px-6">
        <div className="min-w-[260px] flex-1 basis-[340px]">
          <h2 className="text-[1.6rem] font-extrabold tracking-[-0.03em]">
            Stop juggling spreadsheets, WhatsApp and paper schedules.
          </h2>
          <p className="mt-2 text-sm text-[#C9BFB8]">Run your branches from one platform. 30-day trial, no credit card.</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2.5">
          <Link to="/request-demo" className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-bold text-white hover:bg-brand-600">
            Start free trial <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/request-demo"
            className="inline-flex h-[46px] items-center rounded-xl border border-[#4A403A] bg-transparent px-5 text-sm font-bold text-[#FBF7F4] hover:bg-white/5"
          >
            Book a demo
          </Link>
        </div>
      </div>
    </section>
  );
}

export function MarketingLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <main>{children}</main>
      <SharedClosingBand />
      <MarketingFooter />
    </div>
  );
}
