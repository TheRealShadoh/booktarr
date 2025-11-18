/**
 * SeriesParserService - Extracts series name and volume number from book titles
 *
 * Handles common formats:
 * - "Title (Series Name #3)"
 * - "Series Name: Title, Vol. 3"
 * - "Title - Book 3"
 * - "Series Name, Volume 3: Title"
 * - "Title (Series Name, Book 3)"
 */

export interface SeriesInfo {
  seriesName: string;
  volumeNumber: number;
  volumeName?: string;
}

export class SeriesParserService {
  /**
   * Parse series information from a book title
   * Returns null if no series pattern is detected
   */
  parseTitle(title: string): SeriesInfo | null {
    if (!title) return null;

    // Try different parsing strategies in order of specificity
    const parsers = [
      this.parseParenthesesFormat,
      this.parseColonFormat,
      this.parseCommaFormat,
      this.parseDashFormat,
      this.parseBookNumberOnly,
    ];

    for (const parser of parsers) {
      const result = parser.call(this, title);
      if (result) return result;
    }

    return null;
  }

  /**
   * Pattern: "Title (Series Name #3)" or "Title (Series Name, Book 3)"
   * Examples:
   * - "The Way of Kings (The Stormlight Archive #1)"
   * - "Blue Exorcist, Vol. 1 (Blue Exorcist #1)"
   */
  private parseParenthesesFormat(title: string): SeriesInfo | null {
    // Match: (Series Name #N) or (Series Name, Book N) or (Series Name, Vol. N)
    const patterns = [
      /\(([^)]+?)\s*#(\d+)\)$/,                    // (Series #3)
      /\(([^)]+?),?\s*Book\s+(\d+)\)$/i,          // (Series, Book 3)
      /\(([^)]+?),?\s*Vol\.?\s+(\d+)\)$/i,        // (Series, Vol. 3)
      /\(([^)]+?),?\s*Volume\s+(\d+)\)$/i,        // (Series, Volume 3)
      /\(([^)]+?)\s*(\d+)\)$/,                     // (Series 3) - last resort
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        const seriesName = match[1].trim();
        const volumeNumber = parseInt(match[2], 10);
        const volumeName = title.replace(pattern, '').trim();

        return {
          seriesName,
          volumeNumber,
          volumeName: volumeName || undefined,
        };
      }
    }

    return null;
  }

  /**
   * Pattern: "Series Name: Title, Vol. 3" or "Series Name, Vol. 3: Title"
   * Examples:
   * - "Stormlight Archive: The Way of Kings, Book 1"
   * - "Blue Exorcist, Vol. 1: The Devil in Blue"
   */
  private parseColonFormat(title: string): SeriesInfo | null {
    const patterns = [
      // Series before colon: "Series: Title, Vol. 3"
      /^([^:]+?):\s*([^,]+),\s*(?:Vol\.?|Volume|Book)\s+(\d+)$/i,
      // Volume before colon: "Series, Vol. 3: Title"
      /^([^,]+?),\s*(?:Vol\.?|Volume|Book)\s+(\d+):\s*(.+)$/i,
    ];

    const match1 = title.match(patterns[0]);
    if (match1) {
      return {
        seriesName: match1[1].trim(),
        volumeNumber: parseInt(match1[3], 10),
        volumeName: match1[2].trim(),
      };
    }

    const match2 = title.match(patterns[1]);
    if (match2) {
      return {
        seriesName: match2[1].trim(),
        volumeNumber: parseInt(match2[2], 10),
        volumeName: match2[3].trim(),
      };
    }

    return null;
  }

  /**
   * Pattern: "Series Name, Volume 3" (volume in title itself)
   * Examples:
   * - "Blue Exorcist, Vol. 1"
   * - "Attack on Titan, Volume 3"
   */
  private parseCommaFormat(title: string): SeriesInfo | null {
    const patterns = [
      /^(.+?),\s*Vol\.?\s+(\d+)$/i,              // Series, Vol. 3
      /^(.+?),\s*Volume\s+(\d+)$/i,              // Series, Volume 3
      /^(.+?),\s*Book\s+(\d+)$/i,                // Series, Book 3
      /^(.+?)\s+Vol\.?\s+(\d+)$/i,               // Series Vol. 3 (no comma)
      /^(.+?)\s+Volume\s+(\d+)$/i,               // Series Volume 3
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return {
          seriesName: match[1].trim(),
          volumeNumber: parseInt(match[2], 10),
        };
      }
    }

    return null;
  }

  /**
   * Pattern: "Title - Book 3 of Series" or "Title - Series, Book 3"
   * Examples:
   * - "The Way of Kings - Book 1 of The Stormlight Archive"
   * - "Some Title - Mistborn, Book 2"
   */
  private parseDashFormat(title: string): SeriesInfo | null {
    const patterns = [
      /^(.+?)\s*-\s*Book\s+(\d+)\s+of\s+(.+)$/i,      // Title - Book 3 of Series
      /^(.+?)\s*-\s*(.+?),\s*Book\s+(\d+)$/i,         // Title - Series, Book 3
      /^(.+?)\s*-\s*(.+?)\s+Book\s+(\d+)$/i,          // Title - Series Book 3
    ];

    const match1 = title.match(patterns[0]);
    if (match1) {
      return {
        seriesName: match1[3].trim(),
        volumeNumber: parseInt(match1[2], 10),
        volumeName: match1[1].trim(),
      };
    }

    const match2 = title.match(patterns[1]);
    if (match2) {
      return {
        seriesName: match2[2].trim(),
        volumeNumber: parseInt(match2[3], 10),
        volumeName: match2[1].trim(),
      };
    }

    const match3 = title.match(patterns[2]);
    if (match3) {
      return {
        seriesName: match3[2].trim(),
        volumeNumber: parseInt(match3[3], 10),
        volumeName: match3[1].trim(),
      };
    }

    return null;
  }

  /**
   * Pattern: "Book 3" or "Volume 3" at the end (extract generic series)
   * Examples:
   * - "Some Title, Book 3" (when not already caught)
   * - "Title - Book 3"
   */
  private parseBookNumberOnly(title: string): SeriesInfo | null {
    const patterns = [
      /^(.+?)\s*-\s*Book\s+(\d+)$/i,
      /\s+Book\s+(\d+)$/i,
      /\s+Volume\s+(\d+)$/i,
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        // Extract potential series name
        const seriesName = title.replace(pattern, '').trim();
        const volumeNumber = parseInt(match[match.length - 1], 10);

        // Only return if we have a meaningful series name
        if (seriesName && seriesName.length > 2) {
          return {
            seriesName,
            volumeNumber,
          };
        }
      }
    }

    return null;
  }

  /**
   * Parse volume number from various Roman numeral and numeric formats
   */
  private parseVolumeNumber(volumeStr: string): number | null {
    // Try direct number first
    const num = parseInt(volumeStr, 10);
    if (!isNaN(num)) return num;

    // Try Roman numerals
    const romanMap: Record<string, number> = {
      I: 1,
      II: 2,
      III: 3,
      IV: 4,
      V: 5,
      VI: 6,
      VII: 7,
      VIII: 8,
      IX: 9,
      X: 10,
    };

    const upper = volumeStr.toUpperCase();
    if (romanMap[upper]) return romanMap[upper];

    return null;
  }

  /**
   * Normalize series name (trim, remove extra spaces, consistent casing)
   */
  normalizeSeriesName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/^(The|A|An)\s+/i, '') // Remove leading articles for matching
      .trim();
  }

  /**
   * Check if two series names are likely the same (fuzzy matching)
   */
  areSeriesSimilar(name1: string, name2: string): boolean {
    const normalized1 = this.normalizeSeriesName(name1).toLowerCase();
    const normalized2 = this.normalizeSeriesName(name2).toLowerCase();

    // Exact match
    if (normalized1 === normalized2) return true;

    // One contains the other
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      return true;
    }

    // TODO: Could add more sophisticated fuzzy matching (Levenshtein distance)
    return false;
  }
}
