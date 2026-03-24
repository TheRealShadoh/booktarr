export interface StoreLink {
  name: string;
  url: string;
  /** Short label used for icon-only buttons (e.g. "AMZ", "B&N") */
  shortName: string;
}

/**
 * Generates purchase links for the given book identifiers.
 *
 * At least one of isbn, title, or author must be provided for a link to be
 * included.  ISBN is preferred because it produces the most accurate search
 * results; title+author is used as a fallback when ISBN is absent.
 *
 * All query-string values are URL-encoded via encodeURIComponent so that
 * special characters and Unicode in titles / author names are handled
 * correctly.
 */
export function generateStoreLinks(
  isbn?: string | null,
  title?: string,
  author?: string
): StoreLink[] {
  const hasIsbn = Boolean(isbn?.trim());
  const hasTitle = Boolean(title?.trim());
  const hasAuthor = Boolean(author?.trim());

  // Need at least a title or ISBN to build any useful link.
  if (!hasIsbn && !hasTitle) {
    return [];
  }

  const links: StoreLink[] = [];

  // --- Amazon ---
  // Prefer ISBN; fall back to "title author" keyword search.
  const amazonQuery = hasIsbn
    ? encodeURIComponent(isbn!.trim())
    : encodeURIComponent(
        [title?.trim(), author?.trim()].filter(Boolean).join(' ')
      );
  links.push({
    name: 'Amazon',
    shortName: 'AMZ',
    url: `https://www.amazon.com/s?k=${amazonQuery}&i=stripbooks`,
  });

  // --- Barnes & Noble ---
  // Prefer ISBN; fall back to title only (B&N search handles title well).
  if (hasIsbn || hasTitle) {
    const bnQuery = hasIsbn
      ? encodeURIComponent(isbn!.trim())
      : encodeURIComponent(title!.trim());
    links.push({
      name: 'Barnes & Noble',
      shortName: 'B&N',
      url: `https://www.barnesandnoble.com/s/${bnQuery}`,
    });
  }

  // --- Bookshop.org ---
  if (hasIsbn || hasTitle) {
    const bookshopQuery = hasIsbn
      ? encodeURIComponent(isbn!.trim())
      : encodeURIComponent(title!.trim());
    links.push({
      name: 'Bookshop.org',
      shortName: 'BSH',
      url: `https://bookshop.org/search?keywords=${bookshopQuery}`,
    });
  }

  // --- RightStuf / Crunchyroll Store (manga) ---
  // Only included when we have a title to search with.
  if (hasTitle) {
    links.push({
      name: 'RightStuf',
      shortName: 'RS',
      url: `https://www.crunchyrollstore.com/search?q=${encodeURIComponent(title!.trim())}`,
    });
  }

  return links;
}
