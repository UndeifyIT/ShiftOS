/** Replaces src/lib/clock.ts inside the preview only: the handoff's morning, Friday May 16, 2025 at 07:58. */
const PINNED = new Date(2025, 4, 16, 7, 58);

export function currentTime(): Date {
  return new Date(PINNED);
}
