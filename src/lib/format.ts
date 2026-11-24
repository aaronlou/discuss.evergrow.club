const clockFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dayFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
});

export function formatClock(iso: string): string {
  return clockFormatter.format(new Date(iso));
}

export function formatDay(iso: string): string {
  return dayFormatter.format(new Date(iso));
}

export function formatRelative(iso: string | null): string {
  if (!iso) return '还没有人开口';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '';
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  return formatDay(iso);
}

export function hexAlpha(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  const value = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(120, 114, 97, ${alpha})`;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function truncate(text: string, length = 120): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > length ? `${clean.slice(0, length)}…` : clean;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function firstNameSentence(persona: string): string {
  return truncate(persona.split(/[。！？!?\n]/)[0] ?? '', 64);
}

export function formatTokens(input: number | null, output: number | null): string | null {
  if (!input && !output) return null;
  return `${input ?? 0} in / ${output ?? 0} out`;
}
