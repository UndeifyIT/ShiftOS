import React, { useState } from 'react';
import { HandoffModal } from '../../components/HandoffModal.js';
import { DialogNote } from '../people/RolePeopleTable.js';
import { AdminPage } from './AdminShell.js';
import { AdminLoading, card } from './adminUi.js';
import { PLAN } from './adminModel.js';
import { useAdminOrg } from './useAdminOrg.js';

/*
 * The Admin console's Subscription, built to the design handoff
 * (`ShiftOS Admin.dc.html`, "SUBSCRIPTION" markup lines 727-771): the plan
 * card and the invoices. ShiftOS has no billing yet — the organization is on
 * early access, nothing is charged and there are no invoices — so that is what
 * this shows, and the plan buttons say so instead of pretending to change it.
 */

export default function AdminSubscriptionPage(): React.ReactElement {
  const { loading, stats, branches } = useAdminOrg();
  const [dialog, setDialog] = useState<'plan' | 'payment' | null>(null);

  return (
    <AdminPage title="Subscription" subtitle="Plan, billing and invoices." attention={branches.some((b) => b.attentionNote)}>
      {loading ? (
        <AdminLoading />
      ) : (
        <div className="flex max-w-[820px] flex-col gap-4">
          <section className="rounded-[16px] border border-solid border-[#F7DFD1] bg-[#FEFAF7] p-5">
            <div className="flex flex-wrap items-start gap-3.5">
              <div className="min-w-0 flex-[1_1_260px]">
                <span className="inline-flex items-center rounded-full bg-[#F04E17] px-[11px] py-1 text-[10.5px] font-extrabold uppercase tracking-[.08em] text-white">{PLAN.name}</span>
                <h2 className="mb-0 mt-3 text-[22px] font-extrabold tracking-[-0.025em]">
                  {PLAN.price} <span className="text-[13px] font-semibold text-[#857A72]">/ month</span>
                </h2>
                <p className="mb-0 mt-1.5 text-[12.5px] text-[#857A72]">
                  {PLAN.seats(stats.employees)} · {PLAN.renews.toLowerCase()}
                </p>
              </div>
              <div className="ml-auto flex flex-wrap gap-[9px]">
                <button type="button" onClick={() => setDialog('plan')} className="h-10 cursor-pointer rounded-[11px] border-0 bg-[#F04E17] px-4 text-[12.5px] font-bold text-white [line-height:normal]">
                  Change plan
                </button>
                <button
                  type="button"
                  onClick={() => setDialog('payment')}
                  className="h-10 cursor-pointer rounded-[11px] border border-solid border-[#EBE7E3] bg-white px-[15px] text-[12.5px] font-bold text-black [line-height:normal]"
                >
                  Update payment method
                </button>
              </div>
            </div>
            <div className="mt-4 border-0 border-t border-solid border-[#F7E3D6] pt-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-bold text-[#857A72]">Employee capacity used</span>
                <span className="text-[12px] font-bold text-[#857A72]">{PLAN.usage}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F3EEE9]" />
            </div>
          </section>

          <section className={`${card} overflow-hidden`}>
            <h2 className="m-0 border-0 border-b border-solid border-[#F2EEEA] px-[18px] py-[15px] text-[14.5px] font-extrabold tracking-normal">Invoices</h2>
            <p className="m-0 px-[18px] py-[13px] text-[12.5px] text-[#857A72]">No invoices yet — nothing has been billed.</p>
          </section>
        </div>
      )}
      <HandoffModal
        open={dialog !== null}
        title={dialog === 'plan' ? 'Change plan' : 'Update payment method'}
        subtitle="You're on early access."
        primary="Done"
        onPrimary={() => setDialog(null)}
        onClose={() => setDialog(null)}
      >
        <DialogNote>
          Every feature is included while ShiftOS is in early access, with no seat limit, and nothing is charged — so there is no plan to change and no card on file. When paid plans open,
          they will be chosen here and the first invoice will appear below.
        </DialogNote>
      </HandoffModal>
    </AdminPage>
  );
}
