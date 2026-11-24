import { AppError } from '../errors';
import { getDb, type DB } from '../db';
import type {
  Participant,
  ProviderKind,
  RoomBundle,
  RoomRecord,
  RoomSummary,
} from '../types';
import { hasActiveRound } from '../active-rounds';
import { listMessages, settleInterruptedMessages } from './messages';

interface RoomRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ParticipantRow {
  agent_id: string;
  enabled: number;
  position: number;
  name: string;
  emoji: string;
  color: string;
  persona: string;
  provider_id: string;
  provider_name: string;
  provider_kind: string;
  provider_has_key: number;
  model: string;
  temperature: number;
}

const ROOM_COLUMNS = 'id, title, created_at, updated_at';

function mapRoom(row: RoomRow): RoomRecord {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listRooms(db: DB = getDb()): RoomRecord[] {
  return (
    db.prepare(`SELECT ${ROOM_COLUMNS} FROM rooms ORDER BY updated_at DESC`).all() as unknown as RoomRow[]
  ).map(mapRoom);
}

export function getRoom(id: string, db: DB = getDb()): RoomRecord {
  const row = db.prepare(`SELECT ${ROOM_COLUMNS} FROM rooms WHERE id = ?`).get(id) as
    | RoomRow
    | undefined;
  if (!row) throw new AppError('讨论不存在', 404);
  return mapRoom(row);
}

export function listParticipants(roomId: string, db: DB = getDb()): Participant[] {
  const rows = db
    .prepare(
      `SELECT ra.agent_id, ra.enabled, ra.position,
              a.name, a.emoji, a.color, a.persona, a.provider_id, a.model, a.temperature,
              p.name AS provider_name, p.kind AS provider_kind,
              CASE WHEN p.api_key IS NULL OR p.api_key = '' THEN 0 ELSE 1 END AS provider_has_key
       FROM room_agents ra
       JOIN agents a ON a.id = ra.agent_id
       JOIN providers p ON p.id = a.provider_id
       WHERE ra.room_id = ?
       ORDER BY ra.position ASC, a.created_at ASC`,
    )
    .all(roomId) as unknown as ParticipantRow[];

  return rows.map((row) => ({
    agentId: row.agent_id,
    name: row.name,
    emoji: row.emoji,
    color: row.color,
    persona: row.persona,
    providerId: row.provider_id,
    providerName: row.provider_name,
    providerKind: row.provider_kind as ProviderKind,
    providerHasKey: Boolean(row.provider_has_key),
    model: row.model,
    temperature: Number(row.temperature),
    enabled: Boolean(row.enabled),
    position: Number(row.position),
  }));
}

export function getRoomBundle(roomId: string, db: DB = getDb()): RoomBundle {
  const room = getRoom(roomId, db);
  // A page load with no in-memory round means any "streaming" row is orphaned.
  if (!hasActiveRound(roomId)) settleInterruptedMessages(roomId, db);
  return {
    room,
    participants: listParticipants(roomId, db),
    messages: listMessages(roomId, db),
  };
}

export function listRoomSummaries(db: DB = getDb()): RoomSummary[] {
  const rows = db
    .prepare(
      `SELECT r.id, r.title, r.created_at, r.updated_at,
              (SELECT COUNT(*) FROM messages m WHERE m.room_id = r.id) AS message_count,
              (SELECT MAX(m.created_at) FROM messages m WHERE m.room_id = r.id) AS last_message_at,
              (SELECT m.content FROM messages m WHERE m.room_id = r.id
                 AND m.content <> '' ORDER BY m.seq DESC LIMIT 1) AS last_snippet
       FROM rooms r
       ORDER BY COALESCE(last_message_at, r.updated_at) DESC`,
    )
    .all() as unknown as Array<
    RoomRow & { message_count: number; last_message_at: string | null; last_snippet: string | null }
  >;

  return rows.map((row) => ({
    ...mapRoom(row),
    participants: listParticipants(row.id, db),
    messageCount: Number(row.message_count),
    lastMessageAt: row.last_message_at,
    lastSnippet: row.last_snippet,
  }));
}

export function listAgentsNotInRoom(roomId: string, db: DB = getDb()) {
  return db
    .prepare(
      `SELECT a.id, a.name, a.emoji, a.color, p.name AS provider_name, a.model
       FROM agents a JOIN providers p ON p.id = a.provider_id
       WHERE a.id NOT IN (SELECT agent_id FROM room_agents WHERE room_id = ?)
       ORDER BY a.created_at ASC`,
    )
    .all(roomId) as unknown as Array<{
    id: string;
    name: string;
    emoji: string;
    color: string;
    provider_name: string;
    model: string;
  }>;
}

export interface CreateRoomInput {
  title: string;
  agentIds: string[];
}

export function createRoom(input: CreateRoomInput, db: DB = getDb()): RoomRecord {
  const agentIds = uniqueIds(input.agentIds);
  if (agentIds.length === 0) throw new AppError('至少邀请一位角色入席', 400);
  assertAgentsExist(agentIds, db);

  const now = new Date().toISOString();
  const id = `room-${crypto.randomUUID()}`;

  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO rooms (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
      id,
      input.title.trim() || '未命名圆桌',
      now,
      now,
    );
    const insert = db.prepare(
      'INSERT INTO room_agents (room_id, agent_id, enabled, position) VALUES (?, ?, 1, ?)',
    );
    agentIds.forEach((agentId, index) => insert.run(id, agentId, index));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return getRoom(id, db);
}

export interface UpdateRoomInput {
  title?: string;
  /** Replace the room roster; order defines speaking order. */
  agentIds?: string[];
  /** Toggle which seated agents participate in the next round. */
  activeAgentIds?: string[];
}

export function updateRoom(roomId: string, input: UpdateRoomInput, db: DB = getDb()): RoomRecord {
  const room = getRoom(roomId, db);
  const now = new Date().toISOString();

  if (typeof input.title === 'string') {
    const title = input.title.trim();
    if (!title) throw new AppError('讨论标题不能为空', 400);
    db.prepare('UPDATE rooms SET title = ?, updated_at = ? WHERE id = ?').run(title, now, room.id);
  }

  if (input.agentIds) {
    const agentIds = uniqueIds(input.agentIds);
    if (agentIds.length === 0) throw new AppError('至少保留一位角色', 400);
    assertAgentsExist(agentIds, db);

    const existing = listParticipants(roomId, db);
    const nextIds = new Set(agentIds);

    db.exec('BEGIN');
    try {
      for (const participant of existing) {
        if (!nextIds.has(participant.agentId)) {
          db.prepare('DELETE FROM room_agents WHERE room_id = ? AND agent_id = ?').run(
            roomId,
            participant.agentId,
          );
        }
      }
      const upsert = db.prepare(
        `INSERT INTO room_agents (room_id, agent_id, enabled, position) VALUES (?, ?, ?, ?)
         ON CONFLICT(room_id, agent_id) DO UPDATE SET position = excluded.position`,
      );
      agentIds.forEach((agentId, index) => {
        // Keep the enabled flag of agents who were already seated.
        upsert.run(roomId, agentId, 1, index);
      });
      db.prepare('UPDATE rooms SET updated_at = ? WHERE id = ?').run(now, roomId);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  if (input.activeAgentIds) {
    const activeIds = uniqueIds(input.activeAgentIds);
    if (activeIds.length === 0) throw new AppError('至少让一位角色参与发言', 400);
    const participants = listParticipants(roomId, db);
    const valid = new Set(participants.map((item) => item.agentId));
    for (const id of activeIds) {
      if (!valid.has(id)) throw new AppError('有角色不在本场讨论中', 400);
    }
    const update = db.prepare(
      'UPDATE room_agents SET enabled = ? WHERE room_id = ? AND agent_id = ?',
    );
    for (const participant of participants) {
      update.run(activeIds.includes(participant.agentId) ? 1 : 0, roomId, participant.agentId);
    }
    db.prepare('UPDATE rooms SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), roomId);
  }

  return getRoom(roomId, db);
}

export function deleteRoom(roomId: string, db: DB = getDb()): void {
  const result = db.prepare('DELETE FROM rooms WHERE id = ?').run(roomId);
  if (Number(result.changes) === 0) throw new AppError('讨论不存在', 404);
}

export function touchRoom(roomId: string, db: DB = getDb()): void {
  db.prepare('UPDATE rooms SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), roomId);
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

function assertAgentsExist(agentIds: string[], db: DB): void {
  const placeholders = agentIds.map(() => '?').join(',');
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM agents WHERE id IN (${placeholders})`)
    .get(...agentIds) as { n: number };
  if (Number(row.n) !== agentIds.length) throw new AppError('有角色已被删除，请刷新后重试', 400);
}
