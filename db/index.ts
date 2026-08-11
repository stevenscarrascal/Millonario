import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DB_PATH = process.env.SQLITE_DB_PATH || join(process.cwd(), "data", "app.db");

const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  consent INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  organization_id TEXT,
  finished_at INTEGER,
  winnings_points INTEGER,
  level TEXT,
  mastery_percent INTEGER
);
CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  demo_score INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
`;

function ensureColumn(sqlite: Database.Database, table: string, column: string, definition: string) {
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((existing) => existing.name === column)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.exec(BOOTSTRAP_SQL);
    ensureColumn(sqlite, "participants", "organization_id", "TEXT");
    ensureColumn(sqlite, "participants", "finished_at", "INTEGER");
    ensureColumn(sqlite, "participants", "winnings_points", "INTEGER");
    ensureColumn(sqlite, "participants", "level", "TEXT");
    ensureColumn(sqlite, "participants", "mastery_percent", "INTEGER");
    sqlite.exec("CREATE INDEX IF NOT EXISTS participants_organization_id_idx ON participants (organization_id)");
    db = drizzle(sqlite, { schema });
  }

  return db;
}
