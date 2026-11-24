import type { AgentView } from '@/lib/types';

const SEATS = [
  { top: '2%', left: '50%', translate: '-50%, 0' },
  { top: '68%', left: '2%', translate: '0, 0' },
  { top: '68%', right: '2%', translate: '0, 0' },
];

export function RoundTableGraphic({ agents }: { agents: AgentView[] }) {
  const seats = agents.slice(0, 3);

  return (
    <div className="relative aspect-square w-full select-none" aria-hidden>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute inset-[4%] rounded-full border border-dashed border-line-strong/80" />
        <div className="absolute inset-[15%] rounded-full border border-line/80" />
        <div className="absolute inset-[27%] rounded-full bg-surface/70 shadow-paper" />
        <div className="absolute inset-[27%] rounded-full border border-line" />
        <div className="relative text-center">
          <span className="block font-display text-[clamp(46px,6vw,68px)] leading-none text-ink">
            议
          </span>
          <span className="mt-2 block font-mono text-[8.5px] uppercase tracking-[0.32em] text-muted">
            round table
          </span>
        </div>
      </div>

      <span className="absolute left-1/2 top-1/2 h-px w-[46%] -translate-y-1/2 bg-line/50" />
      <span className="absolute left-1/2 top-1/2 h-[46%] w-px -translate-x-1/2 bg-line/50" />
      <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-vermilion" />

      {SEATS.map((seat, index) => {
        const agent = seats[index];
        return (
          <div
            key={index}
            className="absolute"
            style={{
              top: seat.top,
              left: seat.left,
              right: seat.right,
              transform: seat.translate ? `translate(${seat.translate})` : undefined,
            }}
          >
            {agent ? (
              <div className="flex items-center gap-2.5 border border-line bg-surface px-3 py-2 shadow-paper">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full border text-[15px]"
                  style={{
                    backgroundColor: `${agent.color}1f`,
                    borderColor: `${agent.color}66`,
                  }}
                >
                  {agent.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-[14px] leading-none text-ink">
                    {agent.name}
                  </span>
                  <span className="mt-1 block max-w-[92px] truncate font-mono text-[8px] uppercase tracking-[0.1em] text-muted">
                    {agent.model}
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex h-[54px] w-[112px] flex-col items-center justify-center gap-1 border border-dashed border-line-strong bg-paper/40">
                <span className="font-display text-[13px] text-muted">空席</span>
                <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-muted/70">
                  empty seat
                </span>
              </div>
            )}
          </div>
        );
      })}

      <span className="absolute bottom-[6%] left-1/2 -translate-x-1/2 font-mono text-[8.5px] uppercase tracking-[0.24em] text-muted/70">
        est. mmxxvi
      </span>
      <span className="absolute left-[8%] top-[38%] font-mono text-[9px] text-line-strong">+</span>
      <span className="absolute right-[8%] top-[38%] font-mono text-[9px] text-line-strong">+</span>
      <span className="absolute bottom-[6%] left-[12%] h-px w-8 bg-line-strong" />
      <span className="absolute bottom-[6%] right-[12%] h-px w-8 bg-line-strong" />
    </div>
  );
}
