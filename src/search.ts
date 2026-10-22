// Flexible string search helpers for the IPTV app.
//
// Default mode (exact = false): treat the query as a regex pattern AND as a
// flexible, case-insensitive substring that ignores spaces, symbols and other
// "extras" in both the query and the target text. This means a query like
// "actionmovie" will match "Action Movie", "action-movie", "ACTION_MOVIE", etc.
//
// Exact mode (exact = true): literal, case-insensitive substring match with no
// regex interpretation and no normalization.

export function normalize(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function matchesSearch(text: string, query: string, exact: boolean): boolean {
  const q = (query || '').trim();
  if (!q) return true;
  const t = text || '';

  if (exact) {
    // Literal, case-insensitive substring match.
    return t.toLowerCase().includes(q.toLowerCase());
  }

  // 1) Try the query as a raw regex pattern (case-insensitive).
  try {
    const re = new RegExp(q, 'i');
    if (re.test(t)) return true;
  } catch {
    // Not a valid regex - fall through to flexible matching.
  }

  // 2) Flexible match: ignore case, spaces and symbols in both sides.
  const nq = normalize(q);
  if (!nq) return true; // query was only symbols/spaces
  return normalize(t).includes(nq);
}

// Build a regex that matches the query even when spaces/symbols are inserted
// between its characters. Useful for highlighting or advanced filtering.
export function flexibleRegex(query: string): RegExp | null {
  const q = (query || '').trim();
  if (!q) return null;
  // Escape regex metacharacters, then allow optional non-word chars between chars.
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped.split('').map((c) => c.replace(/\s/, '\\s*')).join('[\\W_]*');
  try {
    return new RegExp(pattern, 'i');
  } catch {
    return null;
  }
}