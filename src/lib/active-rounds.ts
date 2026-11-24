const globalForRounds = globalThis as unknown as {
  __roundtableActiveRounds?: Map<string, AbortController>;
};

function registry(): Map<string, AbortController> {
  if (!globalForRounds.__roundtableActiveRounds) {
    globalForRounds.__roundtableActiveRounds = new Map();
  }
  return globalForRounds.__roundtableActiveRounds;
}

export function hasActiveRound(roomId: string): boolean {
  return registry().has(roomId);
}

export function startRound(roomId: string): AbortController | null {
  if (registry().has(roomId)) return null;
  const controller = new AbortController();
  registry().set(roomId, controller);
  return controller;
}

export function endRound(roomId: string): void {
  registry().delete(roomId);
}

export function stopRound(roomId: string): boolean {
  const controller = registry().get(roomId);
  if (!controller) return false;
  controller.abort();
  return true;
}
