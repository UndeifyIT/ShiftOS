import React, { useEffect, useRef } from 'react';
import { IconButton } from './IconButton.js';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Accessible dialog: aria-modal, Escape to close, focus moved to the dialog
 * on open and returned to the trigger on close (UI-009 §11 "Dialog Errors",
 * UI-011 §8 keyboard support). Deliberately no click-outside-to-close for
 * ConfirmationDialog usage — destructive confirmations should require an
 * explicit choice (UI-006 §10 "bulk actions require confirmation").
 */
export function Modal({ open, onClose, title, description, children, footer }: ModalProps): React.ReactElement | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        tabIndex={-1}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg focus:outline-none"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-neutral-900">
              {title}
            </h2>
            {description ? (
              <p id="modal-description" className="mt-1 text-sm text-neutral-500">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton aria-label="Close dialog" variant="ghost" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </IconButton>
        </div>
        {children}
        {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}

export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  children
}: ConfirmationDialogProps): React.ReactElement | null {
  // Local wrapper is used instead of importing Button here to avoid a
  // circular module-graph dependency issue; Button is composed by callers.
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 text-[0.9375rem] font-medium text-neutral-800 hover:bg-neutral-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading || undefined}
            className={[
              'inline-flex h-10 items-center justify-center rounded-lg px-4 text-[0.9375rem] font-medium text-white disabled:opacity-60',
              // brand-500 only reaches ~2.5:1 contrast for white text (fails WCAG
              // AA) — brand-700 matches the fix already applied to Button.tsx's
              // primary variant. See that file's contrast note for the full rationale.
              destructive ? 'bg-error-500 hover:bg-error-600' : 'bg-brand-700 hover:bg-brand-800'
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
