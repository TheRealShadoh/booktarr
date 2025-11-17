interface AniListMedia {
  id: number;
  title: {
    romaji: string;
    english?: string;
    native?: string;
  };
  description?: string;
  volumes?: number;
  chapters?: number;
  status: string;
  coverImage: {
    large?: string;
    medium?: string;
  };
  startDate?: {
    year?: number;
    month?: number;
    day?: number;
  };
  endDate?: {
    year?: number;
    month?: number;
    day?: number;
  };
}

export interface AniListSeriesMetadata {
  id: number;
  title: string;
  alternativeTitles: string[];
  description?: string;
  totalVolumes?: number;
  status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
  coverUrl?: string;
  startDate?: string;
  endDate?: string;
}

export class AniListClient {
  private apiUrl = 'https://graphql.anilist.co';

  async searchSeries(title: string): Promise<AniListSeriesMetadata[]> {
    const query = `
      query ($search: String) {
        Page(page: 1, perPage: 10) {
          media(search: $search, type: MANGA) {
            id
            title {
              romaji
              english
              native
            }
            description
            volumes
            status
            coverImage {
              large
              medium
            }
            startDate {
              year
              month
              day
            }
            endDate {
              year
              month
              day
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { search: title },
        }),
      });

      if (!response.ok) {
        throw new Error(`AniList API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.data?.Page?.media) {
        return [];
      }

      return data.data.Page.media.map((media: AniListMedia) =>
        this.parseMedia(media)
      );
    } catch (error) {
      console.error('AniList search error:', error);
      return [];
    }
  }

  async getSeriesById(id: number): Promise<AniListSeriesMetadata | null> {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: MANGA) {
          id
          title {
            romaji
            english
            native
          }
          description
          volumes
          status
          coverImage {
            large
            medium
          }
          startDate {
            year
            month
            day
          }
          endDate {
            year
            month
            day
          }
        }
      }
    `;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { id },
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (!data.data?.Media) {
        return null;
      }

      return this.parseMedia(data.data.Media);
    } catch (error) {
      console.error('AniList get series error:', error);
      return null;
    }
  }

  private parseMedia(media: AniListMedia): AniListSeriesMetadata {
    const statusMap: Record<string, 'ongoing' | 'completed' | 'hiatus' | 'cancelled'> = {
      FINISHED: 'completed',
      RELEASING: 'ongoing',
      NOT_YET_RELEASED: 'ongoing',
      CANCELLED: 'cancelled',
      HIATUS: 'hiatus',
    };

    const startDate = this.formatDate(media.startDate);
    const endDate = this.formatDate(media.endDate);

    return {
      id: media.id,
      title: media.title.english || media.title.romaji,
      alternativeTitles: [
        media.title.romaji,
        media.title.english,
        media.title.native,
      ].filter((t): t is string => !!t && t !== (media.title.english || media.title.romaji)),
      description: media.description?.replace(/<[^>]*>/g, ''), // Strip HTML tags
      totalVolumes: media.volumes || undefined,
      status: statusMap[media.status] || 'ongoing',
      coverUrl: media.coverImage.large || media.coverImage.medium,
      startDate,
      endDate,
    };
  }

  private formatDate(date?: { year?: number; month?: number; day?: number }): string | undefined {
    if (!date?.year) return undefined;

    const year = date.year;
    const month = date.month?.toString().padStart(2, '0') || '01';
    const day = date.day?.toString().padStart(2, '0') || '01';

    return `${year}-${month}-${day}`;
  }
}
