/**
 * The current time, behind one seam so the design preview
 * (apps/web/vite.preview.config.ts) can pin "now" to the handoff's own
 * morning and render the same numbers the design shows.
 */
export function currentTime(): Date {
  return new Date();
}
