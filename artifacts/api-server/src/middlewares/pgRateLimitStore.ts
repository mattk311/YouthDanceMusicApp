import type pg from "pg";
import type {
  ClientRateLimitInfo,
  IncrementResponse,
  Options,
  Store,
} from "express-rate-limit";
import { logger } from "../lib/logger";

const TABLE_NAME = "rate_limit_counters";

let schemaPromise: Promise<void> | undefined;

async function ensureSchema(pool: pg.Pool): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          bucket TEXT NOT NULL,
          key TEXT NOT NULL,
          count INTEGER NOT NULL DEFAULT 0,
          reset_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (bucket, key)
        )
      `);
      await pool.query(
        `CREATE INDEX IF NOT EXISTS ${TABLE_NAME}_reset_at_idx ON ${TABLE_NAME} (reset_at)`,
      );
    })().catch((err) => {
      schemaPromise = undefined;
      throw err;
    });
  }
  return schemaPromise;
}

interface PostgresRateLimitStoreOptions {
  pool: pg.Pool;
  bucket: string;
}

export class PostgresRateLimitStore implements Store {
  public readonly localKeys = false;
  public prefix: string;

  private readonly pool: pg.Pool;
  private readonly bucket: string;
  private windowMs = 0;

  constructor(options: PostgresRateLimitStoreOptions) {
    this.pool = options.pool;
    this.bucket = options.bucket;
    this.prefix = `${options.bucket}:`;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
    ensureSchema(this.pool).catch((err) => {
      logger.error({ err }, "Failed to initialize rate limit table");
    });
  }

  async increment(key: string): Promise<IncrementResponse> {
    await ensureSchema(this.pool);
    const newReset = new Date(Date.now() + this.windowMs);
    const result = await this.pool.query<{ count: number; reset_at: Date }>(
      `
      INSERT INTO ${TABLE_NAME} (bucket, key, count, reset_at)
      VALUES ($1, $2, 1, $3)
      ON CONFLICT (bucket, key) DO UPDATE
        SET count = CASE
              WHEN ${TABLE_NAME}.reset_at <= NOW() THEN 1
              ELSE ${TABLE_NAME}.count + 1
            END,
            reset_at = CASE
              WHEN ${TABLE_NAME}.reset_at <= NOW() THEN EXCLUDED.reset_at
              ELSE ${TABLE_NAME}.reset_at
            END
      RETURNING count, reset_at
      `,
      [this.bucket, key, newReset],
    );
    const row = result.rows[0]!;
    return {
      totalHits: Number(row.count),
      resetTime: row.reset_at,
    };
  }

  async decrement(key: string): Promise<void> {
    await ensureSchema(this.pool);
    await this.pool.query(
      `
      UPDATE ${TABLE_NAME}
      SET count = GREATEST(count - 1, 0)
      WHERE bucket = $1 AND key = $2 AND reset_at > NOW()
      `,
      [this.bucket, key],
    );
  }

  async resetKey(key: string): Promise<void> {
    await ensureSchema(this.pool);
    await this.pool.query(
      `DELETE FROM ${TABLE_NAME} WHERE bucket = $1 AND key = $2`,
      [this.bucket, key],
    );
  }

  async resetAll(): Promise<void> {
    await ensureSchema(this.pool);
    await this.pool.query(`DELETE FROM ${TABLE_NAME} WHERE bucket = $1`, [
      this.bucket,
    ]);
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    await ensureSchema(this.pool);
    const result = await this.pool.query<{ count: number; reset_at: Date }>(
      `
      SELECT count, reset_at FROM ${TABLE_NAME}
      WHERE bucket = $1 AND key = $2 AND reset_at > NOW()
      `,
      [this.bucket, key],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      totalHits: Number(row.count),
      resetTime: row.reset_at,
    };
  }
}
