import { AppError } from '../errors';
import { getDb, type DB } from '../db';
import type { ProviderKind, ProviderRecord, PublicProvider } from '../types';
import { PROVIDER_KINDS } from '../types';

interface ProviderRow {
  id: string;
  name: string;
  kind: string;
  base_url: string;
  api_key: string | null;
  models: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderInput {
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKey?: string | null;
  models?: string[];
}

function parseModels(raw: string): string[] {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function mapProvider(row: ProviderRow): ProviderRecord {
  const kind = PROVIDER_KINDS.includes(row.kind as ProviderKind)
    ? (row.kind as ProviderKind)
    : 'openai';
  return {
    id: row.id,
    name: row.name,
    kind,
    baseUrl: row.base_url,
    apiKey: row.api_key,
    models: parseModels(row.models),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function maskKey(apiKey: string | null): string {
  if (!apiKey) return '';
  if (apiKey.length <= 8) return '••••';
  return `${apiKey.slice(0, 3)}••••${apiKey.slice(-4)}`;
}

export function toPublicProvider(provider: ProviderRecord): PublicProvider {
  return {
    id: provider.id,
    name: provider.name,
    kind: provider.kind,
    baseUrl: provider.baseUrl,
    models: provider.models,
    hasKey: Boolean(provider.apiKey),
    keyHint: maskKey(provider.apiKey),
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

const PROVIDER_COLUMNS = 'id, name, kind, base_url, api_key, models, created_at, updated_at';

export function listProviders(db: DB = getDb()): ProviderRecord[] {
  return (
    db.prepare(`SELECT ${PROVIDER_COLUMNS} FROM providers ORDER BY created_at ASC`).all() as unknown as ProviderRow[]
  ).map(mapProvider);
}

export function listPublicProviders(db: DB = getDb()): PublicProvider[] {
  return listProviders(db).map(toPublicProvider);
}

export function getProvider(id: string, db: DB = getDb()): ProviderRecord {
  const row = db.prepare(`SELECT ${PROVIDER_COLUMNS} FROM providers WHERE id = ?`).get(id) as
    | ProviderRow
    | undefined;
  if (!row) throw new AppError('模型接入不存在', 404);
  return mapProvider(row);
}

export function getPublicProvider(id: string, db: DB = getDb()): PublicProvider {
  return toPublicProvider(getProvider(id, db));
}

export function createProvider(input: ProviderInput, db: DB = getDb()): ProviderRecord {
  const now = new Date().toISOString();
  const id = `prov-${crypto.randomUUID()}`;
  db.prepare(
    `INSERT INTO providers (id, name, kind, base_url, api_key, models, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name.trim(),
    input.kind,
    input.baseUrl.trim(),
    input.apiKey?.trim() || null,
    JSON.stringify(input.models ?? []),
    now,
    now,
  );
  return getProvider(id, db);
}

export function updateProvider(
  id: string,
  input: ProviderInput,
  db: DB = getDb(),
): ProviderRecord {
  const current = getProvider(id, db);
  const nextKey = input.apiKey === undefined ? current.apiKey : input.apiKey?.trim() || null;
  db.prepare(
    `UPDATE providers SET name = ?, kind = ?, base_url = ?, api_key = ?, models = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    input.name.trim(),
    input.kind,
    input.baseUrl.trim(),
    nextKey,
    JSON.stringify(input.models ?? current.models),
    new Date().toISOString(),
    id,
  );
  return getProvider(id, db);
}

export function deleteProvider(id: string, db: DB = getDb()): void {
  const used = db.prepare('SELECT COUNT(*) AS n FROM agents WHERE provider_id = ?').get(id) as {
    n: number;
  };
  if (Number(used.n) > 0) {
    throw new AppError('还有角色正在使用这个接入，请先为它们切换模型', 409);
  }
  if (id === 'prov-mock') throw new AppError('演示模式是内置接入，不能删除', 400);
  const result = db.prepare('DELETE FROM providers WHERE id = ?').run(id);
  if (Number(result.changes) === 0) throw new AppError('模型接入不存在', 404);
}

export function providerNeedsKey(kind: ProviderKind): boolean {
  return kind !== 'mock';
}
