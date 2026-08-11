import React from 'react';
import { MarketingNav } from './MarketingNav.js';
import { MarketingFooter } from './MarketingFooter.js';

export function MarketingLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
