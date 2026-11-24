import { AppError } from '../errors';
import { getDb, type DB } from '../db';
import type { AgentRecord, AgentView, ProviderKind } from '../types';
import { getProvider, listProviders, toPublicProvider } from './providers';

interface AgentRow {
  id: string;
  name: string;
  emoji: string;
  color: string;
  persona: string;
  provider_id: string;
  model: string;
  temperature: number;
  created_at: string;
  updated_at: string;
}

export interface AgentInput {
  name: string;
  emoji: string;
  color: string;
  persona: string;
  providerId: string;
  model: string;
  temperature: number;
}

function mapAgent(row: AgentRow): AgentRecord {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    color: row.color,
    persona: row.persona,
    providerId: row.provider_id,
    model: row.model,
    temperature: Number(row.temperature),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const AGENT_COLUMNS =
  'id, name, emoji, color, persona, provider_id, model, temperature, created_at, updated_at';

export function listAgents(db: DB = getDb()): AgentRecord[] {
  return (
    db.prepare(`SELECT ${AGENT_COLUMNS} FROM agents ORDER BY created_at ASC`).all() as unknown as AgentRow[]
  ).map(mapAgent);
}

export function listAgentViews(db: DB = getDb()): AgentView[] {
  const providers = new Map(listProviders(db).map((provider) => [provider.id, provider]));
  return listAgents(db).flatMap((agent) => {
    const provider = providers.get(agent.providerId);
    if (!provider) return [];
    return [{ ...agent, provider: toPublicProvider(provider) }];
  });
}

export function getAgent(id: string, db: DB = getDb()): AgentRecord {
  const row = db
    .prepare(`SELECT ${AGENT_COLUMNS} FROM agents WHERE id = ?`)
    .get(id) as AgentRow | undefined;
  if (!row) throw new AppError('角色不存在', 404);
  return mapAgent(row);
}

export function getAgentView(id: string, db: DB = getDb()): AgentView {
  const agent = getAgent(id, db);
  return { ...agent, provider: toPublicProvider(getProvider(agent.providerId, db)) };
}

export function createAgent(input: AgentInput, db: DB = getDb()): AgentView {
  const provider = getProvider(input.providerId, db);
  const now = new Date().toISOString();
  const id = `agent-${crypto.randomUUID()}`;
  const model = input.model.trim() || provider.models[0] || '';
  db.prepare(
    `INSERT INTO agents (id, name, emoji, color, persona, provider_id, model, temperature, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name.trim(),
    input.emoji.trim() || '◐',
    input.color.trim() || '#C6492B',
    input.persona.trim(),
    provider.id,
    model,
    clampTemperature(input.temperature),
    now,
    now,
  );
  return getAgentView(id, db);
}

export function updateAgent(id: string, input: AgentInput, db: DB = getDb()): AgentView {
  getAgent(id, db);
  const provider = getProvider(input.providerId, db);
  const model = input.model.trim() || provider.models[0] || '';
  db.prepare(
    `UPDATE agents SET name = ?, emoji = ?, color = ?, persona = ?, provider_id = ?, model = ?,
       temperature = ?, updated_at = ? WHERE id = ?`,
  ).run(
    input.name.trim(),
    input.emoji.trim() || '◐',
    input.color.trim() || '#C6492B',
    input.persona.trim(),
    provider.id,
    model,
    clampTemperature(input.temperature),
    new Date().toISOString(),
    id,
  );
  return getAgentView(id, db);
}

export function deleteAgent(id: string, db: DB = getDb()): void {
  const result = db.prepare('DELETE FROM agents WHERE id = ?').run(id);
  if (Number(result.changes) === 0) throw new AppError('角色不存在', 404);
}

function clampTemperature(value: number): number {
  if (!Number.isFinite(value)) return 0.8;
  return Math.min(2, Math.max(0, value));
}

export function agentProviderKind(providerId: string, db: DB = getDb()): ProviderKind {
  return getProvider(providerId, db).kind;
}
