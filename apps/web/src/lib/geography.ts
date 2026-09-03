import { allCountries } from 'country-region-data';

/**
 * Structured country/state geography (Task 2 — spec §2 Phase 2).
 *
 * Backed by `country-region-data` (MIT, ~630KB unpacked, zero deps,
 * ~900K downloads/month, actively maintained — see task-2-report.md for the
 * full evaluation against `country-state-city` (GPL-3.0, disqualified) and
 * `world-countries` (no clear permissive license, 20MB+, no state data)).
 * The package ships country name + ISO 3166-1 alpha-2 code + a flat list of
 * [regionName, regionShortCode] tuples per country — no city data, which is
 * why city stays a plain text field everywhere in this feature (spec §3
 * non-goal: "full worldwide city datasets are large and of inconsistent
 * quality").
 *
 * Pure, framework-free module (no React/DOM) so it's unit-testable with
 * plain vitest, matching this repo's only real testing precedent for small
 * logic libraries (packages/tests/unit/*.test.ts) — apps/web has no working
 * component-test setup (its package.json's `jest --config jest.config.web.js`
 * script references a config file that doesn't exist anywhere in the repo).
 */

export interface GeoOption {
  value: string;
  label: string;
}

/** A resolved geography value: a stable `code` (ISO2 country code, or a region shortcode) plus the display `label` to show for it. */
export interface ResolvedGeoValue {
  code: string;
  label: string;
}

type Region = [name: string, shortCode: string];
type CountryData = [name: string, code: string, regions: Region[]];

const COUNTRIES = allCountries as unknown as CountryData[];

/** Every country, sorted alphabetically by name, as {value: ISO2 code, label: name}. */
export function getCountryOptions(): GeoOption[] {
  return COUNTRIES.map(([name, code]) => ({ value: code, label: name })).sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * States/provinces/regions for a given ISO2 country code, sorted alphabetically.
 * Returns an empty array for an unknown code or a country with no region data
 * (none exist in the current dataset, but a caller shouldn't assume that holds
 * forever — treat an empty result as "fall back to a plain text field").
 */
export function getStateOptions(countryCode: string | null | undefined): GeoOption[] {
  if (!countryCode) return [];
  const country = COUNTRIES.find(([, code]) => code.toLowerCase() === countryCode.toLowerCase());
  if (!country) return [];
  return country[2].map(([name, code]) => ({ value: code, label: name })).sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * The dataset has no per-country administrative-division type (it's just
 * name + shortcode), so most countries fall back to the generic label the
 * brief explicitly allows. A handful of common ones get their real-world
 * term because it reads noticeably better and costs nothing to maintain.
 */
const REGION_LABELS: Record<string, string> = {
  US: 'State',
  CA: 'Province',
  AU: 'State/Territory',
  GB: 'County/Region',
  NG: 'State',
  IN: 'State',
  MX: 'State'
};

export function getRegionLabel(countryCode: string | null | undefined): string {
  if (!countryCode) return 'State/Province/Region';
  return REGION_LABELS[countryCode.toUpperCase()] ?? 'State/Province/Region';
}

/**
 * Resolves a raw `organizations.metadata.country` / `branches.settings.country`
 * value — which may already be a new-format ISO2 code, or a pre-existing
 * free-text country name from before this task (e.g. "Nigeria") — into a
 * canonical {code, label}. Existing rows are never rewritten (Global
 * Constraint 4); this only affects how they're *displayed and cascaded from*
 * in the UI.
 *
 * Returns `null` for an empty/blank input. For a non-empty value that
 * matches nothing in the dataset (e.g. a legacy "Other"), returns the raw
 * string as both code and label so callers can still display it — the state
 * cascade will simply come back empty for it, same as any unresolvable
 * country.
 */
export function resolveCountryValue(raw: string | null | undefined): ResolvedGeoValue | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const byCode = COUNTRIES.find(([, code]) => code.toLowerCase() === trimmed.toLowerCase());
  if (byCode) return { code: byCode[1], label: byCode[0] };

  const byName = COUNTRIES.find(([name]) => name.toLowerCase() === trimmed.toLowerCase());
  if (byName) return { code: byName[1], label: byName[0] };

  return { code: trimmed, label: trimmed };
}

/**
 * Same idea as `resolveCountryValue`, scoped to one country's regions —
 * resolves a raw `branches.settings.state` value (a region shortcode, a
 * region name, or genuinely free text predating this task) against the
 * given country's region list. Returns `null` for an empty input or an
 * unresolvable country; returns the raw value as a passthrough {code, label}
 * when it matches nothing, same rationale as `resolveCountryValue`.
 */
export function resolveStateValue(countryCode: string | null | undefined, raw: string | null | undefined): ResolvedGeoValue | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const regions = getStateOptions(countryCode);
  const byCode = regions.find((region) => region.value.toLowerCase() === trimmed.toLowerCase());
  if (byCode) return { code: byCode.value, label: byCode.label };

  const byName = regions.find((region) => region.label.toLowerCase() === trimmed.toLowerCase());
  if (byName) return { code: byName.value, label: byName.label };

  return { code: trimmed, label: trimmed };
}
