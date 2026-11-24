import { AppError } from './errors';
import type { Participant } from './types';

/**
 * Decides who speaks this round.
 * - No explicit mentions: every seated + enabled agent, in seat order.
 * - Mentions: only those agents, in the order they were mentioned.
 * - Mentions that refer to absent/disabled agents are ignored; if none remain,
 *   the round is rejected instead of silently falling back to everyone.
 */
export function selectResponders(
  seated: Participant[],
  requested?: string[],
): Participant[] {
  if (seated.length === 0) {
    throw new AppError('这桌还没有可以发言的角色，先去邀请一位', 400);
  }

  if (!requested || requested.length === 0) return seated;

  const byId = new Map(seated.map((participant) => [participant.agentId, participant]));
  const picked: Participant[] = [];
  for (const agentId of Array.from(new Set(requested))) {
    const participant = byId.get(agentId);
    if (participant) picked.push(participant);
  }

  if (picked.length === 0) {
    throw new AppError('被点名的角色本轮不在场', 400);
  }

  return picked;
}
