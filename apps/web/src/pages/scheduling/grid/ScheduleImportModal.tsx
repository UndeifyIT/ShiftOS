import React, { useEffect, useMemo, useRef, useState } from 'react';
import { downloadText, readSpreadsheet, SpreadsheetError, toCsv } from '../../../lib/spreadsheet.js';
import { ScheduleIcon } from './ScheduleIcon.js';
import { shortDate } from './scheduleFormat.js';
import {
  parseScheduleImport,
  SCHEDULE_COLUMNS,
  SCHEDULE_OPTIONAL_COLUMNS,
  scheduleTemplateRows,
  type ScheduleImportContext,
  type ScheduleImportRow
} from './scheduleImportModel.js';

export interface ScheduleImportModalProps {
  context: ScheduleImportContext;
  template: { name: string; department: string };
  progress: { done: number; total: number } | null;
  onImport: (rows: ScheduleImportRow[], fileName: string) => void;
  onClose: () => void;
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayLabel = (iso: string): string => `${WEEKDAY[new Date(`${iso}T00:00:00Z`).getUTCDay()]} ${shortDate(iso)}`;

/**
 * Import Schedule — the handoff's toolbar and empty-state "Import Schedule"
 * ("Pick a spreadsheet — every row is validated before it lands"), in the
 * schedule screen's own dialog style: pick an .xlsx/.csv, see which rows
 * will land and which won't (and why), then write the good ones into this week.
 */
export function ScheduleImportModal({ context, template, progress, onImport, onClose }: ScheduleImportModalProps): React.ReactElement {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; table: string[][] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const importing = progress !== null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !importing) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, importing]);

  const parsed = useMemo(() => (file ? parseScheduleImport(file.table, context) : null), [file, context]);
  const ready = parsed?.rows.filter((row) => row.problems.length === 0) ?? [];
  const issues = parsed?.rows.filter((row) => row.problems.length > 0) ?? [];

  const accept = async (picked: File | undefined): Promise<void> => {
    if (!picked) return;
    setReading(true);
    setError(null);
    try {
      const table = await readSpreadsheet(picked);
      const check = parseScheduleImport(table, context);
      if (check.missingColumns.length) {
        setError(`Your file is missing ${check.missingColumns.length === 1 ? 'this column' : 'these columns'}: ${check.missingColumns.join(', ')}. Download the template to see the format.`);
        return;
      }
      if (check.rows.length === 0) {
        setError("We didn't find any shifts in this file — add one shift per row under the header row.");
        return;
      }
      setFile({ name: picked.name, table });
    } catch (err) {
      setError(err instanceof SpreadsheetError ? err.message : "We couldn't read this file. Check it opens in Excel, then try again.");
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const downloadTemplate = (): void => {
    const [first, second] = [context.dates[0], context.dates[1] ?? context.dates[0]];
    if (!first) return;
    downloadText('shiftos-schedule-import-template.csv', toCsv(scheduleTemplateRows(template.name, first, second, template.department)));
  };

  return (
    <div onClick={importing ? undefined : onClose} className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(56,49,43,.34)] p-[22px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Import Schedule"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-[560px] flex-col rounded-[18px] bg-white text-[13px] text-[#38312B] shadow-[0_34px_74px_-32px_rgba(56,49,43,.5)] [line-height:normal]"
      >
        <div className="flex items-start gap-2.5 px-[18px] pt-[18px]">
          <span className="min-w-0">
            <h2 className="m-0 text-[16px] font-extrabold tracking-[-0.02em]">Import Schedule</h2>
            <p className="mb-0 mt-1 text-[11.5px] text-[#857A72]">Pick a spreadsheet — every row is validated before it lands in {context.weekLabel}.</p>
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            aria-label="Close"
            className="ml-auto size-7 flex-none cursor-pointer rounded-[9px] border-0 bg-[#F6F3F0] text-[12px] font-extrabold text-[#57504A] disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-auto overflow-y-auto px-[18px] pb-2 pt-[13px]">
          {error ? (
            <p role="alert" className="mb-3 mt-0 rounded-[12px] border border-solid border-[#F2C9BF] bg-[#FCEDEA] px-3 py-2.5 text-[12px] leading-[1.5] text-[#C93A22]">
              {error}
            </p>
          ) : null}

          {!parsed ? (
            <>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!dragOver) setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  void accept(event.dataTransfer.files[0]);
                }}
                className={[
                  'flex flex-col items-center justify-center rounded-[14px] border-2 border-dashed px-[18px] py-[26px] text-center',
                  dragOver ? 'border-[#F04E17] bg-[#FDF0E9]' : 'border-[#E4DED9] bg-[#FDFCFB]'
                ].join(' ')}
              >
                <span className="flex size-[46px] items-center justify-center rounded-[14px] bg-[#F2EEEA] text-[#857A72]">
                  <ScheduleIcon name="upload" size={20} />
                </span>
                <p className="mb-0 mt-3.5 text-[13px] font-bold text-[#57504A]">{reading ? 'Reading your file…' : 'Drag and drop your file here'}</p>
                <p className="my-[9px] text-[11.5px] text-[#A79C93]">or</p>
                <button
                  type="button"
                  disabled={reading}
                  onClick={() => fileInput.current?.click()}
                  className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[11px] border border-solid border-[#F0C7AF] bg-white px-4 text-[12.5px] font-bold text-[#C6420E] hover:bg-[#FDF0E9]"
                >
                  📄 Choose File
                </button>
                <p className="mb-0 mt-3.5 text-[11px] text-[#A79C93]">Supports: .xlsx, .csv (Max size: 5MB)</p>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(event) => void accept(event.target.files?.[0])}
              />
              <div className="mt-3 rounded-[12px] border border-solid border-[#F2EEEA] bg-[#FDFCFB] px-3 py-2.5 text-[11.5px] leading-[1.55] text-[#57504A]">
                <strong className="font-extrabold text-[#38312B]">One row per shift:</strong> {SCHEDULE_COLUMNS.join(', ')} (name, Employee ID or email).{' '}
                <strong className="font-extrabold text-[#38312B]">Optional:</strong> {SCHEDULE_OPTIONAL_COLUMNS.join(', ')}. Write <strong className="font-extrabold">OFF</strong> as the times for a
                day off. Dates as MM/DD/YYYY.
                <button type="button" onClick={downloadTemplate} className="ml-1 cursor-pointer border-0 bg-transparent p-0 text-[11.5px] font-bold text-[#C6420E]">
                  Download Template →
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-[#2E9E62]">
                  <ScheduleIcon name="file" size={15} />
                </span>
                <span className="min-w-0 flex-auto truncate font-bold">{file?.name}</span>
                {!importing ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setError(null);
                    }}
                    className="cursor-pointer border-0 bg-transparent p-0 text-[11.5px] font-bold text-[#C6420E]"
                  >
                    Choose another file
                  </button>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2.5">
                {(
                  [
                    ['Rows in file', parsed.rows.length, '#38312B', '#fff', '#EBE7E3'],
                    ['Ready to import', ready.length, '#2E9E62', '#fff', '#EBE7E3'],
                    ['Rows with issues', issues.length, '#B77714', '#FEFAF3', '#F3DCB8']
                  ] as const
                ).map(([label, value, color, background, border]) => (
                  <div key={label} className="rounded-[12px] border border-solid px-3 py-2.5" style={{ background, borderColor: border }}>
                    <p className="m-0 text-[11px] font-bold text-[#857A72]">{label}</p>
                    <p className="mb-0 mt-1.5 text-[20px] font-extrabold leading-none tracking-[-0.03em]" style={{ color }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {issues.length ? (
                <>
                  <p className="mb-1.5 mt-3.5 text-[12px] font-extrabold">Skipped rows</p>
                  <ul className="m-0 flex max-h-[180px] list-none flex-col gap-1.5 overflow-y-auto rounded-[12px] border border-solid border-[#F2EEEA] p-2.5">
                    {issues.map((row) => (
                      <li key={row.row} className="text-[11.5px] leading-[1.5] text-[#57504A]">
                        <strong className="font-extrabold text-[#38312B]">Row {row.row}</strong>
                        {row.who ? ` · ${row.who}` : ''} — <span className="text-[#C93A22]">{row.problems.join('; ')}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {ready.length ? (
                <>
                  <p className="mb-1.5 mt-3.5 text-[12px] font-extrabold">Ready to land</p>
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {ready.slice(0, 5).map((row) => (
                      <li key={row.row} className="flex items-center gap-2 text-[11.5px] text-[#57504A]">
                        <span className="size-1.5 flex-none rounded-full bg-[#2E9E62]" />
                        <span className="min-w-0 truncate">
                          {dayLabel(row.date as string)} · <strong className="font-bold text-[#38312B]">{row.employeeName}</strong> ·{' '}
                          {row.off ? 'Day off' : `${row.startTime} – ${row.endTime}${row.breakMinutes ? ` · ${row.breakMinutes}m break` : ''}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {ready.length > 5 ? <p className="mb-0 mt-1.5 text-[11px] text-[#A79C93]">+{ready.length - 5} more</p> : null}
                </>
              ) : null}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 border-t border-solid border-[#F2EEEA] px-[18px] py-3.5">
          <p className="m-0 min-w-0 flex-[1_1_200px] text-[11px] text-[#A79C93]">
            {parsed ? 'Rows with issues are skipped. Anyone not on this week yet is added to it.' : 'Nothing is saved until you import.'}
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="h-10 cursor-pointer rounded-[11px] border border-solid border-[#EBE7E3] bg-white px-4 text-[12.5px] font-bold text-black disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!parsed || ready.length === 0 || importing}
            onClick={() => file && onImport(ready, file.name)}
            className="h-10 cursor-pointer rounded-[11px] border-0 bg-[#F04E17] px-4 text-[12.5px] font-bold text-white shadow-[0_10px_22px_-13px_rgba(240,78,23,.75)] disabled:cursor-default disabled:opacity-50"
          >
            {progress ? `Importing ${progress.done} of ${progress.total}…` : `Import ${ready.length} ${ready.length === 1 ? 'row' : 'rows'}`}
          </button>
        </div>
      </section>
    </div>
  );
}
