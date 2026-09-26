/** Same preset list the onboarding wizard's Branch step uses (settings.storeType). */
export const STORE_TYPES = ['Supermarket', 'Convenience Store', 'Restaurant', 'Warehouse', 'Kitchen / Production', 'Office', 'Other'];

/** Most orgs on ShiftOS run in Nigeria — prefilled on create, not locked. */
export const DEFAULT_TIME_ZONE = 'Africa/Lagos';

/** Same IANA-timezone source the onboarding wizard's Branch step uses (settings.timeZone), with a small fallback list. */
export function getTimeZoneOptions(): string[] {
  try {
    const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    if (typeof supportedValuesOf === 'function') {
      return supportedValuesOf('timeZone');
    }
  } catch {
    // fall through to the static fallback below
  }
  return ['Africa/Lagos', 'Africa/Accra', 'Africa/Nairobi', 'Africa/Johannesburg', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'UTC'];
}
