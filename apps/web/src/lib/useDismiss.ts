import { useEffect, useRef } from 'react';

/** Closes a popover on an outside click or Escape; attach the returned ref to the popover's wrapper. */
export function useDismiss<T extends HTMLElement = HTMLDivElement>(open: boolean, onClose: () => void): React.RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
}
