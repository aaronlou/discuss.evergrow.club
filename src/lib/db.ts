import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { seedDatabase } from './seed';

export type DB = DatabaseSync;

const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    base_url TEXT NOT NULL DEFAULT '',
    api_key TEXT,
    models TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '◐',
    color TEXT NOT NULL DEFAULT '#C6492B',
    persona TEXT NOT NULL DEFAULT '',
    provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE RESTRICT,
    model TEXT NOT NULL DEFAULT '',
    temperature REAL NOT NULL DEFAULT 0.8,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS room_agents (
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    enabled INTEGER NOT NULL DEFAULT 1,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (room_id, agent_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
    content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'complete',
    error TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_room_seq ON messages(room_id, seq);
  CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages(room_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_room_agents_room ON room_agents(room_id);
  `,
];

export function resolveDatabasePath(): string {
  const configured = process.env.ROUNDTABLE_DB_PATH;
  if (configured && configured.trim()) return configured.trim();
  return path.join(process.cwd(), 'data', 'roundtable.db');
}

export function openDatabase(file: string = resolveDatabasePath()): DB {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  }
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

function userVersion(db: DB): number {
  const row = db.prepare('PRAGMA user_version').get() as { user_version?: number } | undefined;
  return Number(row?.user_version ?? 0);
}

export function migrate(db: DB): void {
  const current = userVersion(db);
  if (current >= MIGRATIONS.length) return;

  db.exec('BEGIN');
  try {
    for (let i = current; i < MIGRATIONS.length; i += 1) {
      db.exec(MIGRATIONS[i]);
    }
    db.exec(`PRAGMA user_version = ${MIGRATIONS.length}`);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  seedDatabase(db);
}

const globalForDb = globalThis as unknown as { __roundtableDb?: DB };

export function getDb(): DB {
  if (!globalForDb.__roundtableDb) {
    globalForDb.__roundtableDb = openDatabase();
  }
  return globalForDb.__roundtableDb;
}
