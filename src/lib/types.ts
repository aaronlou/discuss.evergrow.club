export type ProviderKind = 'openai' | 'anthropic' | 'mock';

export const PROVIDER_KINDS: ProviderKind[] = ['openai', 'anthropic', 'mock'];

export interface ProviderRecord {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKey: string | null;
  models: string[];
  createdAt: string;
  updatedAt: string;
}

/** Provider shape that is safe to send to the browser. */
export interface PublicProvider {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  models: string[];
  hasKey: boolean;
  keyHint: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRecord {
  id: string;
  name: string;
  emoji: string;
  color: string;
  persona: string;
  providerId: string;
  model: string;
  temperature: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentView extends AgentRecord {
  provider: PublicProvider;
}

export interface RoomRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  agentId: string;
  name: string;
  emoji: string;
  color: string;
  persona: string;
  providerId: string;
  providerName: string;
  providerKind: ProviderKind;
  providerHasKey: boolean;
  model: string;
  temperature: number;
  enabled: boolean;
  position: number;
}

export interface RoomSummary extends RoomRecord {
  participants: Participant[];
  messageCount: number;
  lastMessageAt: string | null;
  lastSnippet: string | null;
}

export type MessageRole = 'user' | 'agent' | 'system';
export type MessageStatus = 'queued' | 'streaming' | 'complete' | 'error' | 'stopped';

export interface MessageRecord {
  id: string;
  seq: number;
  roomId: string;
  role: MessageRole;
  agentId: string | null;
  content: string;
  status: MessageStatus;
  error: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
}

export interface MessageAgent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  model: string;
  providerName: string;
}

export interface MessageView extends MessageRecord {
  agent: MessageAgent | null;
}

export interface RoomBundle {
  room: RoomRecord;
  participants: Participant[];
  messages: MessageView[];
}

/** The small, browser-safe slice of a participant sent at round start. */
export interface RoundResponder {
  agentId: string;
  name: string;
  emoji: string;
  color: string;
  model: string;
  providerName: string;
  providerKind: ProviderKind;
}
