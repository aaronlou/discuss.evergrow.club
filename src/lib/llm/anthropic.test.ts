import { describe, expect, it } from 'vitest';

import { anthropicEndpoint, mergeTurns } from './anthropic';

describe('mergeTurns', () => {
  it('merges neighbour turns and drops empty content', () => {
    expect(
      mergeTurns([
        { role: 'user', content: '第一段' },
        { role: 'user', content: '第二段' },
        { role: 'assistant', content: '回答' },
        { role: 'assistant', content: '' },
        { role: 'user', content: '追问' },
      ]),
    ).toEqual([
      { role: 'user', content: '第一段\n\n第二段' },
      { role: 'assistant', content: '回答' },
      { role: 'user', content: '追问' },
    ]);
  });
});

describe('anthropicEndpoint', () => {
  it('appends the native path once', () => {
    expect(anthropicEndpoint('https://api.anthropic.com')).toBe(
      'https://api.anthropic.com/v1/messages',
    );
    expect(anthropicEndpoint('https://api.anthropic.com/')).toBe(
      'https://api.anthropic.com/v1/messages',
    );
    expect(anthropicEndpoint('https://api.anthropic.com/v1')).toBe(
      'https://api.anthropic.com/v1/messages',
    );
    expect(anthropicEndpoint('')).toBe('https://api.anthropic.com/v1/messages');
  });
});
