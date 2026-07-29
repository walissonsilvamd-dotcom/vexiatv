import { Radio } from "lucide-react";
import type { Channel } from "../../data/vexia";

export function ChannelRow({
  title,
  channels,
  navRow,
}: {
  title: string;
  channels: Channel[];
  navRow: number;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-bold tracking-wide text-vexia-text">
        {title}
        <span className="ml-3 inline-block h-[2px] w-16 translate-y-[-4px] rounded bg-gradient-to-r from-vexia-purple to-vexia-cyan" />
      </h3>
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-1 py-3">
        {channels.map((channel) => (
          <button
            key={channel.id}
            type="button"
            data-nav-row={navRow}
            tabIndex={0}
            className="vexia-focus flex w-[210px] shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-vexia-card p-3 text-left"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-vexia-purple to-vexia-cyan text-sm font-black text-vexia-text">
              {channel.initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-vexia-text">
                {channel.name}
              </span>
              <span className="block truncate text-[11px] text-vexia-muted">{channel.category}</span>
              <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-vexia-cyan">
                <Radio className="h-3 w-3" aria-hidden />
                {channel.now}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
