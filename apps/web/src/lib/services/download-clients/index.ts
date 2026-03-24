import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { downloadClients } from '@booktarr/database';
import { eq, and } from 'drizzle-orm';
import { DelugeClient, type DelugeConnectionConfig } from './deluge';
import { SabnzbdClient, type SabnzbdConnectionConfig } from './sabnzbd';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of a row from the download_clients table. */
export type DownloadClientRow = typeof downloadClients.$inferSelect;

/** Supported client type discriminators (matches the `type` column). */
export type DownloadClientType = 'deluge' | 'sabnzbd';

/** Result returned after successfully dispatching a download. */
export interface SendResult {
  clientId: string;
  clientName: string;
  clientType: DownloadClientType;
  /** The remote identifier: info-hash for torrents, NZO ID for Usenet. */
  remoteId: string;
}

/**
 * Configuration shape passed to testClient() — mirrors the DB row fields
 * required to construct and exercise a client without persisting anything.
 */
export interface ClientTestConfig {
  type: DownloadClientType;
  host: string;
  password?: string | null;
  apiKey?: string | null;
}

// ---------------------------------------------------------------------------
// DownloadClientManager
// ---------------------------------------------------------------------------

/**
 * DownloadClientManager orchestrates all configured download clients.
 *
 * - getEnabledClients()  – query the database for enabled clients for a user.
 * - sendToClient()       – dispatch a download URL to a specific client.
 * - testClient()         – validate connection credentials without saving.
 */
export class DownloadClientManager {

  // ---------------------------------------------------------------------------
  // Public methods
  // ---------------------------------------------------------------------------

  /**
   * Return all enabled download clients for a given user, ordered by
   * descending priority (highest priority first).
   *
   * @param userId  UUID of the authenticated user.
   */
  async getEnabledClients(userId: string): Promise<DownloadClientRow[]> {
    try {
      const rows = await db
        .select()
        .from(downloadClients)
        .where(
          and(
            eq(downloadClients.userId, userId),
            eq(downloadClients.enabled, true)
          )
        );

      // Sort in-process so we avoid a db-driver ORDER BY compatibility issue
      // with the Neon HTTP driver on some column types.
      rows.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

      return rows;
    } catch (err) {
      logger.error(
        'DownloadClientManager: failed to query enabled clients',
        err instanceof Error ? err : new Error(String(err))
      );
      throw new Error('Could not retrieve download clients from the database.');
    }
  }

  /**
   * Dispatch a download to a specific client identified by its database ID.
   *
   * The correct client implementation (Deluge / SABnzbd) is chosen based on
   * the `type` column of the stored configuration row.
   *
   * @param clientId     UUID of the download_clients row to use.
   * @param downloadUrl  Magnet URI, .torrent URL, or .nzb URL.
   * @param title        Human-readable label used for logging.
   */
  async sendToClient(
    clientId: string,
    downloadUrl: string,
    title: string
  ): Promise<SendResult> {
    const clientRow = await this.fetchClientRow(clientId);

    logger.info(
      `DownloadClientManager: sending "${title}" to ${clientRow.type} client "${clientRow.name}"`
    );

    try {
      const remoteId = await this.dispatchToClient(clientRow, downloadUrl);

      return {
        clientId: clientRow.id,
        clientName: clientRow.name,
        clientType: clientRow.type as DownloadClientType,
        remoteId,
      };
    } catch (err) {
      // Re-throw with context so callers surface a useful error message.
      const cause = err instanceof Error ? err.message : String(err);
      throw new Error(
        `DownloadClientManager: failed to send to client "${clientRow.name}" (${clientRow.type}): ${cause}`
      );
    }
  }

  /**
   * Test a client configuration without persisting it to the database.
   * Throws a descriptive Error if the connection or authentication fails.
   *
   * @param config  Connection details to validate.
   * @returns       true when the connection test passes.
   */
  async testClient(config: ClientTestConfig): Promise<boolean> {
    switch (config.type) {
      case 'deluge': {
        if (!config.password) {
          throw new Error('Deluge requires a password.');
        }
        const client = new DelugeClient({
          host: config.host,
          password: config.password,
        } satisfies DelugeConnectionConfig);
        return client.testConnection();
      }

      case 'sabnzbd': {
        if (!config.apiKey) {
          throw new Error('SABnzbd requires an API key.');
        }
        const client = new SabnzbdClient({
          host: config.host,
          apiKey: config.apiKey,
        } satisfies SabnzbdConnectionConfig);
        return client.testConnection();
      }

      default: {
        // Exhaustiveness guard — `type` column may hold unsupported values.
        const unsupported: string = config.type;
        throw new Error(
          `DownloadClientManager: unsupported client type "${unsupported}". Supported: deluge, sabnzbd.`
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Load a single download client row by its UUID.
   * Throws a descriptive Error when no row is found.
   */
  private async fetchClientRow(clientId: string): Promise<DownloadClientRow> {
    try {
      const rows = await db
        .select()
        .from(downloadClients)
        .where(eq(downloadClients.id, clientId))
        .limit(1);

      const row = rows[0];
      if (!row) {
        throw new Error(`No download client found with id "${clientId}".`);
      }

      if (!row.enabled) {
        throw new Error(`Download client "${row.name}" (id: ${clientId}) is disabled.`);
      }

      return row;
    } catch (err) {
      // Rethrow errors we constructed ourselves; wrap unexpected DB errors.
      if (err instanceof Error && err.message.includes(clientId)) {
        throw err;
      }
      logger.error(
        'DownloadClientManager: DB error fetching client row',
        err instanceof Error ? err : new Error(String(err))
      );
      throw new Error(`Database error while loading download client "${clientId}".`);
    }
  }

  /**
   * Route the download URL to the appropriate client implementation and
   * return the remote identifier (torrent hash or NZO ID).
   */
  private async dispatchToClient(
    row: DownloadClientRow,
    downloadUrl: string
  ): Promise<string> {
    const category = row.category ?? 'books';

    switch (row.type as DownloadClientType) {
      case 'deluge': {
        if (!row.password) {
          throw new Error(`Deluge client "${row.name}" has no password configured.`);
        }
        const client = new DelugeClient({
          host: row.host,
          password: row.password,
        } satisfies DelugeConnectionConfig);
        return client.addTorrent(downloadUrl, category);
      }

      case 'sabnzbd': {
        if (!row.apiKey) {
          throw new Error(`SABnzbd client "${row.name}" has no API key configured.`);
        }
        const client = new SabnzbdClient({
          host: row.host,
          apiKey: row.apiKey,
        } satisfies SabnzbdConnectionConfig);
        return client.addNzb(downloadUrl, category);
      }

      default: {
        throw new Error(
          `DownloadClientManager: client "${row.name}" has unsupported type "${row.type}". Supported: deluge, sabnzbd.`
        );
      }
    }
  }
}
