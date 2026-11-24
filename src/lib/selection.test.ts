import { describe, expect, it } from 'vitest';

import { AppError } from './errors';
import { selectResponders } from './selection';
import type { Participant } from './types';

function agent(id: string, enabled = true): Participant {
  return {
    agentId: id,
    name: id,
    emoji: '🌾',
    color: '#C2452A',
    persona: '',
    providerId: 'prov-mock',
    providerName: '演示模式',
    providerKind: 'mock',
    providerHasKey: false,
    model: 'mock',
    temperature: 0.8,
    enabled,
    position: 0,
  };
}

describe('selectResponders', () => {
  it('returns every seated agent when nobody is mentioned', () => {
    const seated = [agent('a'), agent('b')];
    expect(selectResponders(seated).map((item) => item.agentId)).toEqual(['a', 'b']);
  });

  it('keeps mention order and drops duplicates', () => {
    const seated = [agent('a'), agent('b'), agent('c')];
    expect(
      selectResponders(seated, ['c', 'a', 'c']).map((item) => item.agentId),
    ).toEqual(['c', 'a']);
  });

  it('ignores unknown or disabled mentions as long as one is valid', () => {
    const seated = [agent('a'), agent('b')];
    expect(
      selectResponders(seated, ['ghost', 'b']).map((item) => item.agentId),
    ).toEqual(['b']);
  });

  it('rejects a round where every mention is absent', () => {
    expect(() => selectResponders([agent('a')], ['ghost'])).toThrow(AppError);
  });

  it('rejects a round with no seated agents', () => {
    expect(() => selectResponders([])).toThrow(AppError);
  });
});
