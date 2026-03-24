import { logger } from '@/lib/logger';

export interface SabnzbdConnectionConfig {
  host: string;   // e.g. 'http://localhost:8080'
  apiKey: string;
}

export interface NzbStatus {
  nzoId: string;
  filename: string;
  status: string;      // 'Queued', 'Downloading', 'Paused', 'Completed', 'Failed', etc.
  percentage: number;  // 0–100
  sizeLeft: number;    // bytes remaining
  totalSize: number;   // total bytes
  category: string;
}

/**
 * SABnzbd API response shapes (partial — only the fields we use).
 */
interface SabnzbdBaseResponse {
  status: boolean | string;
  error?: string;
}

interface SabnzbdAddUrlResponse extends SabnzbdBaseResponse {
  nzo_ids?: string[];
}

interface SabnzbdSlot {
  nzo_id: string;
  filename: string;
  status: string;
  percentage: string;  // SABnzbd returns this as a string, e.g. "42.3"
  mbleft: number;      // MB remaining
  mb: number;          // total MB
  cat: string;
}

interface SabnzbdQueueResponse extends SabnzbdBaseResponse {
  queue: {
    slots: SabnzbdSlot[];
  };
}

interface SabnzbdHistorySlot {
  nzo_id: string;
  name: string;
  status: string;      // 'Completed', 'Failed'
  category: string;
  bytes: number;
}

interface SabnzbdHistoryResponse extends SabnzbdBaseResponse {
  history: {
    slots: SabnzbdHistorySlot[];
  };
}

/**
 * SabnzbdClient - REST API client for SABnzbd.
 *
 * All SABnzbd API calls are GET requests to:
 *   {host}/api?apikey={key}&output=json&mode={mode}[&params…]
 *
 * Authentication is by API key, passed as the `apikey` query parameter.
 */
export class SabnzbdClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: SabnzbdConnectionConfig) {
    // Normalise: strip trailing slash.
    this.baseUrl = config.host.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Verify that the client can reach SABnzbd and the API key is accepted.
   * Returns true on success, throws a descriptive Error on failure.
   */
  async testConnection(): Promise<boolean> {
    // `mode=version` is the lightest-weight authenticated call available.
    const result = await this.apiGet<{ version: string }>('version');
    if (!result.version) {
      throw new Error('SABnzbd: server responded but did not return a version — check the API key.');
    }
    logger.info(`SABnzbd: connected, server version ${result.version}`);
    return true;
  }

  /**
   * Add an NZB by URL to the SABnzbd download queue.
   *
   * @param nzbUrl    HTTP/HTTPS URL pointing to an .nzb file.
   * @param category  SABnzbd category to apply (e.g. 'books').
   * @returns         The NZO ID assigned by SABnzbd.
   */
  async addNzb(nzbUrl: string, category: string = 'books'): Promise<string> {
    const result = await this.apiGet<SabnzbdAddUrlResponse>('addurl', {
      name: nzbUrl,
      cat: category,
      // pp=3 → download + unpack + delete archive (standard book workflow)
      pp: '3',
    });

    if (!result.status) {
      throw new Error(
        `SABnzbd: addurl failed — ${result.error ?? 'unknown error'}`
      );
    }

    const nzoId = result.nzo_ids?.[0];
    if (!nzoId) {
      throw new Error('SABnzbd: addurl succeeded but returned no NZO ID.');
    }

    logger.info(`SABnzbd: NZB queued, nzo_id=${nzoId}`);
    return nzoId;
  }

  /**
   * Retrieve the current status of a queued or completed download.
   * Checks the active queue first, then falls back to history (completed items).
   *
   * @param nzoId  The NZO ID returned by addNzb().
   */
  async getStatus(nzoId: string): Promise<NzbStatus> {
    // --- Check the active queue first ---
    const queue = await this.apiGet<SabnzbdQueueResponse>('queue', { nzo_ids: nzoId });
    const queueSlot = queue.queue?.slots?.find((s) => s.nzo_id === nzoId);

    if (queueSlot) {
      return {
        nzoId: queueSlot.nzo_id,
        filename: queueSlot.filename,
        status: queueSlot.status,
        percentage: parseFloat(queueSlot.percentage) || 0,
        sizeLeft: Math.round(queueSlot.mbleft * 1024 * 1024),
        totalSize: Math.round(queueSlot.mb * 1024 * 1024),
        category: queueSlot.cat,
      };
    }

    // --- Fall back to history (download finished or failed) ---
    const history = await this.apiGet<SabnzbdHistoryResponse>('history', { nzo_ids: nzoId });
    const historySlot = history.history?.slots?.find((s) => s.nzo_id === nzoId);

    if (historySlot) {
      return {
        nzoId: historySlot.nzo_id,
        filename: historySlot.name,
        status: historySlot.status,
        percentage: historySlot.status === 'Completed' ? 100 : 0,
        sizeLeft: 0,
        totalSize: historySlot.bytes,
        category: historySlot.category,
      };
    }

    throw new Error(`SABnzbd: no queue or history entry found for nzo_id "${nzoId}"`);
  }

  /**
   * Remove a download from the SABnzbd queue or history.
   *
   * @param nzoId  The NZO ID to remove.
   */
  async removeDownload(nzoId: string): Promise<void> {
    // Try removing from the active queue first.
    const queueResult = await this.apiGet<SabnzbdBaseResponse>('queue', {
      name: 'delete',
      value: nzoId,
    });

    // If the item was not in the queue, try history.
    if (!queueResult.status) {
      const historyResult = await this.apiGet<SabnzbdBaseResponse>('history', {
        name: 'delete',
        value: nzoId,
      });
      if (!historyResult.status) {
        throw new Error(
          `SABnzbd: could not remove nzo_id "${nzoId}" from queue or history — ${historyResult.error ?? 'unknown error'}`
        );
      }
    }

    logger.info(`SABnzbd: download removed, nzo_id=${nzoId}`);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Perform a GET request to the SABnzbd API endpoint.
   *
   * @param mode    The `mode` parameter value (e.g. 'addurl', 'queue', 'history').
   * @param params  Additional query parameters merged into the request.
   */
  private async apiGet<T>(
    mode: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/api`);
    url.searchParams.set('apikey', this.apiKey);
    url.searchParams.set('output', 'json');
    url.searchParams.set('mode', mode);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    let response: Response;
    try {
      response = await fetch(url.toString());
    } catch (err) {
      throw new Error(
        `SABnzbd: could not reach host at "${this.baseUrl}" — ${(err as Error).message}`
      );
    }

    if (!response.ok) {
      throw new Error(
        `SABnzbd: API request (mode=${mode}) returned HTTP ${response.status} ${response.statusText}`
      );
    }

    const body = (await response.json()) as T;

    // SABnzbd sometimes returns top-level error strings for invalid API keys.
    if (
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof (body as Record<string, unknown>).error === 'string'
    ) {
      const errorMsg = (body as Record<string, unknown>).error as string;
      // Only throw if it looks like a real error (not just a missing optional field).
      if (errorMsg && !(body as unknown as SabnzbdBaseResponse).status) {
        throw new Error(`SABnzbd: API error (mode=${mode}): ${errorMsg}`);
      }
    }

    return body;
  }
}
