
const ZH = { fontFamily: 'var(--font-zh)' } as const;

/**
 * HSR turn announcement: a station departure display. A dark LED board with amber dot-matrix text,
 * "下一位 NEXT", and whose turn it is (yours in your colour, with a scrolling hint). Same texts as the
 * vintage banner ("Your turn!", "<name>’s turn"), so screen readers and tests read it the same way.
 */
export function DepartureBoard({ mine, name, fill, platform }: { mine: boolean; name: string; fill: string; platform: number }) {
  const now = new Date();
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return (
    <div className="hsr-board w-[min(440px,86vw)] rounded-[14px] p-[6px]">
      <div className="hsr-board-led relative overflow-hidden rounded-[9px] px-4 pb-3 pt-2.5">
        <div className="hsr-led-amber flex items-baseline gap-3 text-[13px] leading-none">
          <span className="font-bold tracking-[0.14em]" style={ZH}>下一位</span>
          <span className="font-display tracking-[0.18em]">NEXT</span>
          {mine && <span className="min-w-0 truncate font-display tracking-[0.1em] opacity-80">· {name}</span>}
          <span className="ml-auto font-display tracking-[0.12em] opacity-80"><span style={ZH}>站台</span> {platform}</span>
          <span className="hsr-led-blink font-display tabular-nums tracking-[0.08em]">{clock}</span>
        </div>
        <div className="hsr-board-rule mb-1 mt-2" />
        <div className="hsr-flip flex items-center gap-3 overflow-hidden">
          <span className="hsr-led-dot h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: fill, color: fill }} />
          {mine ? (
            <span className="hsr-led truncate py-1.5 pl-0.5 pr-2 font-display text-[40px] uppercase leading-[1.05] tracking-[0.06em]" style={{ color: fill }}>Your turn!</span>
          ) : (
            <span className="hsr-led hsr-led-green truncate py-1.5 pl-0.5 pr-2 font-display text-[36px] uppercase leading-[1.05] tracking-[0.06em]">
              <span>{name}</span><span className="hsr-led-amber">’s turn</span>
            </span>
          )}
        </div>
        {mine && (
          <div className="hsr-ticker mt-1.5 overflow-hidden whitespace-nowrap text-[13px] leading-none">
            <span className="hsr-ticker-run hsr-led-amber inline-block font-display tracking-[0.12em]">
              <span style={ZH}>请选择</span> · DRAW TWO CARDS, CLAIM A ROUTE, OR TAKE TICKETS
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
