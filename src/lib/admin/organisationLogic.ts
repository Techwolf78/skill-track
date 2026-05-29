/**
 * Organisation management domain logic.
 */

export interface Organisation {
  id: string;
  name: string;
  logoUrl?: string;
}

export const isValidOrgPayload = (payload: Partial<Organisation>): boolean =>
  !!(payload.name && payload.name.trim() !== "");

/** Builds a create-org payload, trimming the name and omitting logoUrl when absent. */
export const buildCreateOrgPayload = (
  name: string,
  logoUrl?: string
): { name: string; logoUrl?: string } => ({
  name: name.trim(),
  ...(logoUrl ? { logoUrl } : {}),
});

/** Returns a new alphabetically sorted copy of the organisation list. */
export const sortOrgsByName = (orgs: Organisation[]): Organisation[] =>
  [...orgs].sort((a, b) => a.name.localeCompare(b.name));
