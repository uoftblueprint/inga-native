import type { Site } from "frontend/types/form";

/**
 * searching rules:
 *  - capitals don't matter
 *  - accents must match
 *  - matches start at the beginning of a word
 */

// Lowercase, and make accented letters comparable however they were typed
function normalize(text: string): string {
    // NFC required for adding letter + accent is the same for keyboards with both together
  return text.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

// True if this character is a letter or digit (in any language)
function isWordChar(char: string): boolean {
  return /[\p{L}\p{N}]/u.test(char);
}

// True if `query` appears in `field` starting at the beginning of a word
function matchesWordStart(field: string, query: string): boolean {
  let index = field.indexOf(query);
  while (index !== -1) {
    if (index === 0 || !isWordChar(field[index - 1])) {
      return true;
    }
    index = field.indexOf(query, index + 1);
  }
  return false;
}

// The pieces of text a worker might search a farm by
function searchableFields(site: Site): string[] {
  const fields = [site.name, site.address, site.region.name];
  if (site.village) {
    fields.push(site.village.name);
  }
  return fields;
}

// Returns the farms that match `search`, in their original order
export function searchSites(sites: Site[], search: string): Site[] {
  const query = normalize(search);
  if (query === "") {
    return sites;
  }
  return sites.filter((site) =>
    searchableFields(site).some((field) =>
      matchesWordStart(normalize(field), query),
    ),
  );
}
