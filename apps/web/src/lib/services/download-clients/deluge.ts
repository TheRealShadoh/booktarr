import { logger } from '@/lib/logger';

export interface DelugeConnectionConfig {
  host: string;       // e.g. 'http://localhost:8112'
  password: string;   // Deluge Web UI password
}

export interface TorrentStatus {
  hash: string;
  name: string;
  state: string;       // 'Downloading', 'Seeding', 'Paused', 'Error', etc.
  progress: number;    // 0–100
  savePath: string;
  totalSize: number;   // bytes
  downloadedSize: number;
}

interface DelugeRpcResponse<T = unknown> {
  id: number;
  result: T;
  error: { code: number; message: string } | null;
}

/**
 * DelugeClient - JSON-RPC client for the Deluge Web UI API.
 *
 * Auth flow:
 *   1. POST auth.login with password → server sets a session cookie.
 *   2. All subsequent calls reuse that session cookie.
 *
 * Deluge endpoint: POST {host}/json
 * Content-Type: application/json
 */
export class DelugeClient {
  private readonly jsonRpcUrl: string;
  private readonly password: string;

  // Accumulates Set-Cookie values across responses so they are replayed on
  // the next request without requiring a real cookie jar.
  private sessionCookie: string | null = null;
  private rpcId = 0;

  constructor(config: DelugeConnectionConfig) {
    // Normalise: strip trailing slash so we can always append /json safely.
    const base = config.host.replace(/\/+$/, '');
    this.jsonRpcUrl = `${base}/json`;
    this.password = config.password;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Verify that the client can connect and authenticate successfully.
   * Returns true on success, throws a descriptive Error on failure.
   */
  async testConnection(): Promise<boolean> {
    await this.authenticate();
    // If authenticate did not throw, we have a valid session.
    return true;
  }

  /**
   * Add a torrent by magnet link or HTTP/HTTPS URL.
   *
   * @param magnetOrUrl  Magnet URI or a direct .torrent file URL.
   * @param category     Label/category applied in Deluge (maps to the
   *                     "Label" plugin label if installed).
   * @returns            The info-hash string of the added torrent.
   */
  async addTorrent(magnetOrUrl: string, category: string = 'books'): Promise<string> {
    await this.authenticate();

    const isMagnet = magnetOrUrl.startsWith('magnet:');

    const method = isMagnet ? 'core.add_torrent_magnet' : 'core.add_torrent_url';

    // Both RPC methods share the same options shape.
    const options: Record<string, unknown> = {
      download_location: null,  // use Deluge default
      move_completed: false,
      add_paused: false,
      // Label plugin stores labels separately; we pass it in options so that
      // integrations that forward the field to Label plugin can use it.
      label: category,
    };

    const result = await this.rpc<string>(method, [magnetOrUrl, options]);

    if (!result) {
      throw new Error('Deluge returned an empty torrent hash — the torrent may already exist.');
    }

    logger.info(`Deluge: torrent added, hash=${result}`);
    return result;
  }

  /**
   * Retrieve current status for a specific torrent by its info-hash.
   *
   * @param torrentHash  The 40-character hex info-hash.
   */
  async getStatus(torrentHash: string): Promise<TorrentStatus> {
    await this.authenticate();

    // core.get_torrent_status returns a dict of the requested fields.
    const fields = ['name', 'state', 'progress', 'save_path', 'total_size', 'total_done'];
    const result = await this.rpc<Record<string, unknown>>(
      'core.get_torrent_status',
      [torrentHash, fields]
    );

    if (!result || Object.keys(result).length === 0) {
      throw new Error(`Deluge: torrent not found for hash "${torrentHash}"`);
    }

    return {
      hash: torrentHash,
      name: String(result['name'] ?? ''),
      state: String(result['state'] ?? 'Unknown'),
      progress: Number(result['progress'] ?? 0),
      savePath: String(result['save_path'] ?? ''),
      totalSize: Number(result['total_size'] ?? 0),
      downloadedSize: Number(result['total_done'] ?? 0),
    };
  }

  /**
   * Remove a torrent from Deluge.
   *
   * @param hash          Info-hash of the torrent to remove.
   * @param removeData    When true, also delete downloaded files on disk.
   *                      Defaults to false (safe: keeps files).
   */
  async removeTorrent(hash: string, removeData: boolean = false): Promise<void> {
    await this.authenticate();
    await this.rpc<boolean>('core.remove_torrent', [hash, removeData]);
    logger.info(`Deluge: torrent removed, hash=${hash}, removeData=${removeData}`);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Authenticate with the Deluge Web UI.
   * Stores the resulting session cookie for subsequent calls.
   * Idempotent: skips re-auth if we already hold a session cookie.
   */
  private async authenticate(): Promise<void> {
    // Re-use an existing session rather than re-authenticating on every call.
    if (this.sessionCookie !== null) {
      return;
    }

    let response: Response;
    try {
      response = await fetch(this.jsonRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'auth.login',
          params: [this.password],
          id: ++this.rpcId,
        }),
      });
    } catch (err) {
      throw new Error(
        `Deluge: could not reach host at "${this.jsonRpcUrl}" — ${(err as Error).message}`
      );
    }

    if (!response.ok) {
      throw new Error(
        `Deluge: auth request failed with HTTP ${response.status} ${response.statusText}`
      );
    }

    const body = (await response.json()) as DelugeRpcResponse<boolean>;

    if (body.error) {
      throw new Error(`Deluge: auth.login RPC error ${body.error.code}: ${body.error.message}`);
    }

    if (!body.result) {
      throw new Error('Deluge: authentication failed — incorrect password.');
    }

    // Capture all Set-Cookie headers from the auth response.
    // The Fetch API merges multiple Set-Cookie values into one header with
    // comma separators on some runtimes; split and rejoin with "; " for
    // the Cookie header format.
    const rawCookie = response.headers.get('set-cookie');
    if (rawCookie) {
      // Extract only the name=value tokens (strip attributes like Path, HttpOnly, …).
      this.sessionCookie = rawCookie
        .split(',')
        .map((part) => part.split(';')[0].trim())
        .join('; ');
    } else {
      // Some Deluge versions use a session token in the response body or do
      // not set an explicit cookie — treat an authenticated response as valid.
      this.sessionCookie = '';
    }
  }

  /**
   * Execute a single Deluge JSON-RPC call.
   * Expects an active session (call authenticate() first).
   */
  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.sessionCookie) {
      headers['Cookie'] = this.sessionCookie;
    }

    let response: Response;
    try {
      response = await fetch(this.jsonRpcUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ method, params, id: ++this.rpcId }),
      });
    } catch (err) {
      throw new Error(
        `Deluge: network error calling "${method}" — ${(err as Error).message}`
      );
    }

    if (!response.ok) {
      throw new Error(
        `Deluge: RPC "${method}" returned HTTP ${response.status} ${response.statusText}`
      );
    }

    const body = (await response.json()) as DelugeRpcResponse<T>;

    if (body.error) {
      throw new Error(`Deluge: RPC "${method}" error ${body.error.code}: ${body.error.message}`);
    }

    return body.result;
  }
}
