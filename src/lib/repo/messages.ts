import { getDb, type DB } from '../db';
import type {
  MessageAgent,
  MessageRole,
  MessageStatus,
  MessageView,
} from '../types';
import { AppError } from '../errors';

interface MessageRow {
  seq: number;
  id: string;
  room_id: string;
  role: string;
  agent_id: string | null;
  content: string;
  status: string;
  error: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
  agent_name: string | null;
  agent_emoji: string | null;
  agent_color: string | null;
  agent_model: string | null;
  agent_provider_name: string | null;
}

const MESSAGE_SELECT = `
  SELECT m.seq, m.id, m.room_id, m.role, m.agent_id, m.content, m.status, m.error,
         m.input_tokens, m.output_tokens, m.created_at,
         a.name AS agent_name, a.emoji AS agent_emoji, a.color AS agent_color, a.model AS agent_model,
         p.name AS agent_provider_name
  FROM messages m
  LEFT JOIN agents a ON a.id = m.agent_id
  LEFT JOIN providers p ON p.id = a.provider_id
`;

function mapMessage(row: MessageRow): MessageView {
  const agent: MessageAgent | null = row.agent_id
    ? {
        id: row.agent_id,
        name: row.agent_name ?? '已离开的角色',
        emoji: row.agent_emoji ?? '◌',
        color: row.agent_color ?? '#8A8272',
        model: row.agent_model ?? '',
        providerName: row.agent_provider_name ?? '',
      }
    : null;

  return {
    id: row.id,
    seq: Number(row.seq),
    roomId: row.room_id,
    role: row.role as MessageRole,
    agentId: row.agent_id,
    agent,
    content: row.content,
    status: row.status as MessageStatus,
    error: row.error,
    inputTokens: row.input_tokens === null ? null : Number(row.input_tokens),
    outputTokens: row.output_tokens === null ? null : Number(row.output_tokens),
    createdAt: row.created_at,
  };
}

/** A stream can die with the process; show those as interrupted instead of "typing" forever. */
export function settleInterruptedMessages(roomId: string, db: DB): void {
  db.prepare(
    `UPDATE messages SET status = 'stopped', error = COALESCE(error, '上一轮被中断')
     WHERE room_id = ? AND status IN ('queued', 'streaming')`,
  ).run(roomId);
}

function markStaleMessages(roomId: string, db: DB): void {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  db.prepare(
    `UPDATE messages SET status = 'stopped', error = COALESCE(error, '连接中断，回复未完成')
     WHERE room_id = ? AND status IN ('queued', 'streaming') AND created_at < ?`,
  ).run(roomId, cutoff);
}

export function listMessages(roomId: string, db: DB = getDb(), limit = 300): MessageView[] {
  markStaleMessages(roomId, db);
  const rows = db
    .prepare(`${MESSAGE_SELECT} WHERE m.room_id = ? ORDER BY m.seq DESC LIMIT ?`)
    .all(roomId, limit) as unknown as MessageRow[];
  return rows.reverse().map(mapMessage);
}

export function listContextMessages(roomId: string, db: DB = getDb(), limit = 80): MessageView[] {
  const rows = db
    .prepare(
      `${MESSAGE_SELECT}
       WHERE m.room_id = ? AND m.status IN ('complete', 'stopped') AND m.content <> ''
       ORDER BY m.seq DESC LIMIT ?`,
    )
    .all(roomId, limit) as unknown as MessageRow[];
  return rows.reverse().map(mapMessage);
}

export function getMessage(id: string, db: DB = getDb()): MessageView {
  const row = db.prepare(`${MESSAGE_SELECT} WHERE m.id = ?`).get(id) as MessageRow | undefined;
  if (!row) throw new AppError('消息不存在', 404);
  return mapMessage(row);
}

export function countMessages(roomId: string, db: DB = getDb()): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM messages WHERE room_id = ?').get(roomId) as {
    n: number;
  };
  return Number(row.n);
}

export interface InsertMessageInput {
  roomId: string;
  role: MessageRole;
  agentId?: string | null;
  content?: string;
  status?: MessageStatus;
}

export function insertMessage(input: InsertMessageInput, db: DB = getDb()): MessageView {
  const id = `msg-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO messages (id, room_id, role, agent_id, content, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.roomId,
    input.role,
    input.agentId ?? null,
    input.content ?? '',
    input.status ?? 'complete',
    now,
  );
  return getMessage(id, db);
}

export function createUserMessage(roomId: string, content: string, db: DB = getDb()): MessageView {
  return insertMessage({ roomId, role: 'user', content, status: 'complete' }, db);
}

export function createAgentPlaceholder(
  roomId: string,
  agentId: string,
  db: DB = getDb(),
): MessageView {
  return insertMessage({ roomId, role: 'agent', agentId, status: 'queued' }, db);
}

export interface UpdateMessageInput {
  content?: string;
  status?: MessageStatus;
  error?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
}

export function updateMessage(
  id: string,
  input: UpdateMessageInput,
  db: DB = getDb(),
): MessageView {
  const fields: string[] = [];
  const values: Array<string | number | null> = [];

  if (input.content !== undefined) {
    fields.push('content = ?');
    values.push(input.content);
  }
  if (input.status !== undefined) {
    fields.push('status = ?');
    values.push(input.status);
  }
  if (input.error !== undefined) {
    fields.push('error = ?');
    values.push(input.error);
  }
  if (input.inputTokens !== undefined) {
    fields.push('input_tokens = ?');
    values.push(input.inputTokens);
  }
  if (input.outputTokens !== undefined) {
    fields.push('output_tokens = ?');
    values.push(input.outputTokens);
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE messages SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  return getMessage(id, db);
}

export function deleteMessage(id: string, db: DB = getDb()): void {
  db.prepare('DELETE FROM messages WHERE id = ?').run(id);
}
