import { useEffect, useState, type ReactNode } from 'react';
import { MAP_ID, ROUTE_POINTS, type Card, type MapId, type RouteColor, type Ticket } from '@boboland/shared';
import { CardTile, CardBack, TicketBack } from './CardFace';
import { TicketCard } from './TicketCard';
import { GAME_TITLE, SKIN } from '../lib/skin';
import { ROUTE_FILL, ROUTE_STROKE, INK, PLAYER_COLORS, MUSTARD, ACCENT, MERLION } from '../theme';

/** The example trains are drawn in player 1's and player 2's default colours. */
const P1_COLOR = PLAYER_COLORS[0].fill;
const P2_COLOR = PLAYER_COLORS[1].fill;
const ticket = (a: string, b: string, points: number): Ticket => ({ id: `${a}-${b}`, a, b, points });

/** Example cities and tickets for a map (ticket ends must be real cities on it). */
export function examplesFor(mapId: MapId, hub: string) {
  if (mapId === 'sg') return {
    intro: ticket('LIN', 'CTN', 5), leg1: ['Little India', hub], leg2: [hub, 'Chinatown'], claim: ['Orchard Road', 'Little India'],
    toHub: 'National Stadium', gray: ['Geylang', 'National Stadium'], done: ticket('ECP', 'LIN', 7), failed: ticket('NTU', 'TAM', 23),
  };
  if (mapId === 'china') return {
    intro: ticket('HET', 'TAO', 6), leg1: ['Hohhot', hub], leg2: [hub, 'Qingdao'], claim: ['Zhengzhou', 'Wuhan'],
    toHub: 'Dalian', gray: ['Chengdu', 'Chongqing'], done: ticket('HRB', 'CGO', 10), failed: ticket('HRB', 'HAK', 21),
  };
  if (mapId === 'europe') return {
    intro: ticket('AMS', 'PRG', 6), leg1: ['Amsterdam', hub], leg2: [hub, 'Prague'], claim: ['Hamburg', hub],
    toHub: 'Berlin', gray: ['Brussels', hub], done: ticket('EDI', 'HAM', 9), failed: ticket('TRO', 'ATH', 24),
  };
  return {
    intro: ticket('DEN', 'OKC', 5), leg1: ['Denver', hub], leg2: [hub, 'Oklahoma City'], claim: ['Chicago', 'St. Louis'],
    toHub: 'Amarillo', gray: ['New York', 'Boston'], done: ticket('SEA', 'DAL', 19), failed: ticket('LA', 'CHI', 22),
  };
}
/** The hub's name (the game's name). */
const HUB = SKIN.name;
const EX = examplesFor(MAP_ID, HUB);

/* ---------- little drawing helpers -------------------------------------------------------- */

/** A straight stretch of railway between two named cities, as on the board. */
function Rail({ cars, color = 'gray', owner, from, to, width = 300, twin }: {
  cars: number; color?: RouteColor; owner?: string; from: string; to: string; width?: number; twin?: { color?: RouteColor; owner?: string };
}) {
  const h = twin ? 92 : 70, y = twin ? 40 : 34, r = 10, x1 = 26, x2 = width - 26;
  const lane = (yy: number, c: RouteColor, own?: string) => {
    const gap = 4, len = (x2 - x1 - 2 * (r + 4) - gap * (cars - 1)) / cars;
    return Array.from({ length: cars }, (_, i) => {
      const x = x1 + r + 4 + i * (len + gap);
      return own
        ? <g key={i}><rect x={x + 1.5} y={yy - 5} width={len} height={14} rx={3.5} fill="rgba(30,18,10,.4)" /><rect x={x} y={yy - 7} width={len} height={14} rx={3.5} fill={own} stroke={INK} strokeWidth={2} /><rect x={x + 4} y={yy - 4} width={len - 8} height={3} rx={1.5} fill="#fff" opacity={0.6} /></g>
        : <rect key={i} x={x} y={yy - 5} width={len} height={10} rx={2} fill={ROUTE_FILL[c]} stroke={ROUTE_STROKE} strokeWidth={1.1} />;
    });
  };
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} aria-hidden className="overflow-visible">
      {twin ? <>{lane(y - 9, color, owner)}{lane(y + 9, twin.color ?? color, twin.owner)}</> : lane(y, color, owner)}
      {[[x1, from], [x2, to]].map(([x, name]) => (
        <g key={name as string}>
          <circle cx={x as number} cy={y} r={r} fill="#f7f1e3" stroke={INK} strokeWidth={2.6} />
          <text x={x as number} y={y + 30} textAnchor="middle" fontFamily={MERLION ? 'Poppins' : 'Oswald'} fontWeight={600} fontSize={13} letterSpacing="0.06em" fill={INK}>{(name as string).toUpperCase()}</text>
        </g>
      ))}
    </svg>
  );
}

function Mini({ card, rotate = 0, label }: { card: Card | 'back'; rotate?: number; label?: string }) {
  return (
    <div className="relative" style={{ transform: `rotate(${rotate}deg)` }}>
      {card === 'back' ? <CardBack label="Deck" /> : <CardTile card={card} />}
      {label && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2 text-[11px] text-paper">{label}</span>}
    </div>
  );
}

function Note({ children, tone = 'plain', icon }: { children: ReactNode; tone?: 'plain' | 'rule' | 'tip'; icon?: string }) {
  const look = { plain: 'border-line-strong bg-ticket', rule: 'border-poster bg-[#fbe9e1]', tip: 'border-[#4f7f4a] bg-[#e9f1df]' }[tone];
  return (
    <div className={`flex gap-2.5 rounded-xl border-2 px-3.5 py-2.5 text-[15px] leading-snug ${look}`}>
      {icon && <span className="text-[20px] leading-none" aria-hidden>{icon}</span>}
      <div>{children}</div>
    </div>
  );
}

const Arrow = () => (
  <svg width="46" height="24" viewBox="0 0 46 24" aria-hidden className="shrink-0"><path d="M2 12h36M28 3l12 9-12 9" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const Stamp = ({ children, color = '#4f7f4a' }: { children: ReactNode; color?: string }) => (
  <span className="inline-block -rotate-6 rounded border-2 px-2 py-0.5 font-display text-[13px] tracking-wider" style={{ borderColor: color, color }}>{children}</span>
);

/* ---------- the chapters ------------------------------------------------------------------- */

interface Chapter { title: string; kicker: string; body: ReactNode }

const CHAPTERS: Chapter[] = [
  {
    title: 'All aboard!',
    kicker: 'What the game is about',
    body: (
      <>
        <p className="text-[17px] leading-relaxed">
          {GAME_TITLE} is a race {MAP_ID === 'sg' ? 'across Singapore, from Tuas to Changi' : MAP_ID === 'europe' ? 'across Europe' : MAP_ID === 'china' ? 'across China, from Harbin to Haikou' : 'across America, from Seattle to Miami'}. You claim railway routes between cities,
          connect the cities on your secret <b>destination tickets</b>, and try to finish with the most points.
        </p>
        <div className="my-5 flex items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-5">
          <TicketCard ticket={EX.intro} />
          <Arrow />
          <div className="flex flex-col items-center gap-1">
            <Rail cars={3} owner={P1_COLOR} from={EX.leg1[0]} to={EX.leg1[1]} width={250} />
            <Rail cars={2} owner={P1_COLOR} from={EX.leg2[0]} to={EX.leg2[1]} width={200} />
          </div>
          <Stamp>CONNECTED · +8</Stamp>
        </div>
        <h3 className="mb-2 font-display text-[18px]">Three ways to score</h3>
        <div className="grid grid-cols-3 gap-3">
          <Note icon="🛤️"><b>Claim routes.</b> Every route you claim scores points straight away. Longer routes score far more.</Note>
          <Note icon="🎟️"><b>Finish your tickets.</b> At the end, each connected ticket adds its points. Each unfinished one subtracts them.</Note>
          <Note icon="🏆"><b>Longest path.</b> The longest unbroken line of your trains earns a 10-point bonus.</Note>
        </div>
      </>
    ),
  },
  {
    title: 'Setting out',
    kicker: 'How the game starts',
    body: (
      <>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-line-strong bg-ticket p-4">
            <div className="font-display text-[44px] leading-none" style={{ color: P1_COLOR }}>50</div>
            <div className="text-center text-[15px]">trains each. Every car you place on the board uses one.</div>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-line-strong bg-ticket p-4">
            <div className="flex -space-x-8 pt-1">{(['red', 'blue', 'locomotive', 'yellow'] as Card[]).map((c, i) => <Mini key={c} card={c} rotate={(i - 1.5) * 6} />)}</div>
            <div className="text-center text-[15px]">4 train cards to start your hand.</div>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-line-strong bg-ticket p-4">
            <div className="flex -space-x-14">{[0, 1, 2, 3].map((i) => <div key={i} style={{ transform: `rotate(${(i - 1.5) * 6}deg)` }}><TicketBack /></div>)}</div>
            <div className="text-center text-[15px]">4 destination tickets. <b>Keep at least 2</b>; you may keep all 4.</div>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          <Note tone="tip" icon="🤫">Your cards and tickets are secret. On one computer, a curtain covers the screen between turns. Pass it over and the next player taps to see their own hand.</Note>
          <Note icon="🚂">Everyone chooses their opening tickets first. Then the first player starts, and turns go round in order.</Note>
        </div>
      </>
    ),
  },
  {
    title: 'Your turn',
    kicker: 'Do exactly one of these three things',
    body: (
      <>
        <div className="grid grid-cols-3 gap-4">
          {[
            { n: '1', title: 'Draw train cards', text: 'Take 2 cards, face-up or from the deck.', art: <div className="flex -space-x-6"><Mini card="green" rotate={-6} /><Mini card="back" rotate={6} /></div> },
            { n: '2', title: 'Claim a route', text: 'Pay the matching cards and place your trains.', art: <Rail cars={3} owner={P1_COLOR} from={EX.claim[0]} to={EX.claim[1]} width={190} /> },
            { n: '3', title: 'Take tickets', text: 'Draw 3 destination tickets and keep at least 1.', art: <div className="flex -space-x-14 py-2">{[0, 1, 2].map((i) => <div key={i} style={{ transform: `rotate(${(i - 1) * 6}deg)` }}><TicketBack /></div>)}</div> },
          ].map((a) => (
            <div key={a.n} className="relative flex flex-col items-center gap-3 rounded-2xl border-2 border-ink bg-ticket px-4 pb-4 pt-6 text-center">
              <span className="absolute -top-4 left-1/2 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full border-2 border-ink bg-mustard font-display text-[17px]">{a.n}</span>
              <div className="grid h-[104px] place-items-center">{a.art}</div>
              <div className="font-display text-[18px]">{a.title}</div>
              <div className="text-[15px] text-muted">{a.text}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          <Note tone="rule" icon="☝️">Only one action per turn. You can't draw a card <i>and</i> claim a route in the same turn.</Note>
          <Note tone="tip" icon="💬">If you try something that isn't allowed, a speech bubble tells you why.</Note>
        </div>
      </>
    ),
  },
  {
    title: 'Drawing train cards',
    kicker: 'Two cards per turn, with a twist for locomotives',
    body: (
      <>
        <div className="flex items-end justify-center gap-3 rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 px-5 pb-5 pt-4">
          <Mini card="back" label="deck" />
          <div className="mx-2 h-20 border-l-2 border-dashed border-line-strong" />
          {(['red', 'locomotive', 'white', 'blue', 'orange'] as Card[]).map((c) => <Mini key={c} card={c} />)}
        </div>
        <p className="mt-3 text-[16px] leading-relaxed">
          Take any face-up card (a new one is turned up to replace it) or the top card of the deck, then take a second card the same way.
          Everyone sees the card you take float up in the middle of the screen.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Note tone="rule" icon="🌈"><b>Locomotives are wild</b>: they count as any colour when you claim a route.</Note>
          <Note tone="rule" icon="✋">A <b>face-up locomotive</b> is your whole draw. Take it first and your turn ends.</Note>
          <Note tone="rule" icon="🚫">A face-up locomotive <b>can't be your second card</b>.</Note>
          <Note icon="🎲">A locomotive drawn blind from the deck counts as one card, like any other.</Note>
          <Note icon="♻️">If three locomotives are ever face-up at once, all five are swept away and replaced.</Note>
          <Note icon="📦">When the deck runs out, the used cards are shuffled into a new deck.</Note>
        </div>
      </>
    ),
  },
  {
    title: 'Claiming routes',
    kicker: 'Spend cards, lay track, score points',
    body: (
      <>
        <div className="flex items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-4">
          <Rail cars={3} color="red" from={EX.toHub} to={HUB} width={230} />
          <span className="font-display text-[22px]">+</span>
          <div className="flex -space-x-7">{(['red', 'red', 'locomotive'] as Card[]).map((c, i) => <Mini key={i} card={c} rotate={(i - 1) * 5} />)}</div>
          <Arrow />
          <Rail cars={3} owner={P1_COLOR} from={EX.toHub} to={HUB} width={230} />
        </div>
        <p className="mt-3 text-[16px] leading-relaxed">
          Pay as many cards as the route has spaces, all in the route's colour. Locomotives fill any gap. Click a route, check the cards you'll spend, press <b>Claim route</b>, and watch your train roll in.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border-2 border-line-strong bg-ticket p-3.5">
            <div className="mb-1 font-display text-[16px]">Gray routes take any one colour</div>
            <div className="flex items-center gap-3"><Rail cars={2} from={EX.gray[0]} to={EX.gray[1]} width={170} /><div className="flex -space-x-7"><Mini card="blue" /><Mini card="blue" /></div><span className="text-[14px] text-muted">or two greens, two yellows…</span></div>
          </div>
          <div className="rounded-2xl border-2 border-line-strong bg-ticket p-3.5">
            <div className="mb-1 font-display text-[16px]">Double routes: one track each</div>
            <div className="flex items-center gap-3"><Rail cars={2} owner={P1_COLOR} twin={{ owner: P2_COLOR }} from="Seattle" to="Portland" width={170} /><span className="text-[14px] text-muted">Both tracks can be used, but nobody may own both.</span></div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 rounded-2xl border-2 border-ink bg-ticket px-4 py-3">
          <span className="font-display text-[16px] text-poster">Route points</span>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="flex flex-col items-center">
              <div className="flex gap-0.5">{Array.from({ length: n }, (_, i) => <span key={i} className="h-2.5 w-3 rounded-[2px] border border-[#6b5848] bg-[#cbc3b3]" />)}</div>
              <span className="font-display text-[18px]">{ROUTE_POINTS[n]}</span>
            </div>
          ))}
          <span className="text-[13px] text-muted">Long routes are worth a lot!</span>
        </div>
      </>
    ),
  },
  {
    title: 'Destination tickets',
    kicker: 'Your secret goals',
    body: (
      <>
        <div className="flex items-center justify-center gap-6 rounded-2xl border-2 border-dashed border-line-strong bg-paper/60 p-5">
          <div className="flex flex-col items-center gap-2"><TicketCard ticket={EX.done} done /><Stamp>+{EX.done.points} at the end</Stamp></div>
          <div className="flex flex-col items-center gap-2"><TicketCard ticket={EX.failed} revealed="failed" /><Stamp color={ACCENT}>−{EX.failed.points} if unfinished</Stamp></div>
        </div>
        <p className="mt-3 text-[16px] leading-relaxed">
          A ticket is complete when an unbroken chain of <b>your own</b> routes joins its two cities, by any path you like. Completed tickets score their points at the end. Unfinished ones cost you the same amount.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Note tone="rule" icon="🎟️"><b>Taking more tickets</b> uses your whole turn. You'll be asked to confirm, then you draw 3 and must keep at least 1.</Note>
          <Note tone="tip" icon="👆">Hover a ticket in <b>My routes</b>: its two cities light up on the map, along with any of your routes already connecting them.</Note>
          <Note tone="tip" icon="✨"><b>Highlight my routes</b> (top-left of the map) fades everyone else's track so you can see your own network.</Note>
          <Note icon="🙈">The eye buttons hide <b>My hand</b> or <b>My routes</b> if someone is looking over your shoulder.</Note>
        </div>
      </>
    ),
  },
  {
    title: 'The last stop',
    kicker: 'How the game ends and who wins',
    body: (
      <>
        <div className="flex items-center gap-5 rounded-2xl border-2 border-ink p-4" style={{ background: MUSTARD }}>
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-ticket font-display text-[38px]">2</div>
          <p className="text-[17px] leading-snug">
            When a player ends their turn with <b>2 or fewer trains</b>, the whistle blows: <b>every player, including them, gets one final turn</b>. Then the game ends.
          </p>
        </div>
        <h3 className="mb-2 mt-5 font-display text-[18px]">Final scoring</h3>
        <div className="grid grid-cols-3 gap-3">
          <Note icon="🛤️">Points from every route you claimed.</Note>
          <Note icon="🎟️">Plus each completed ticket, minus each unfinished one.</Note>
          <Note icon="🏆"><b>+10</b> for the longest continuous path. Ties all score it.</Note>
        </div>
        <div className="mt-4 flex items-center gap-5 rounded-2xl border-2 border-line-strong bg-ticket p-4">
          <svg width="230" height="110" viewBox="0 0 230 110" aria-hidden>
            {[[20, 80, 80, 20], [80, 20, 140, 80], [140, 80, 80, 80], [80, 80, 20, 80], [140, 80, 210, 30]].map(([a, b, c, d], i) => (
              <line key={i} x1={a} y1={b} x2={c} y2={d} stroke={P1_COLOR} strokeWidth={9} strokeLinecap="round" />
            ))}
            {[[20, 80], [80, 20], [140, 80], [80, 80], [210, 30]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={7} fill="#f7f1e3" stroke={INK} strokeWidth={2.5} />)}
          </svg>
          <p className="text-[15px] leading-snug">
            The longest path is one unbroken line of your trains. It may loop and pass through a city more than once, but it can never use the same route twice.
          </p>
        </div>
        <Note tone="plain" icon="⚖️">Tied on points? The player with more completed tickets wins. Still tied? The longest-path holder wins.</Note>
      </>
    ),
  },
  {
    title: 'Handy controls',
    kicker: 'Getting around the screen',
    body: (
      <div className="grid grid-cols-2 gap-3">
        <Note icon="🖱️"><b>Click a route</b> to claim it. Unaffordable routes explain what you're missing.</Note>
        <Note icon="🟣">Your turn makes the <b>status pill</b> at the top pulse.</Note>
        <Note icon="⏱️">The <b>clock</b> counts up from the deal.</Note>
        <Note icon="🎵">The <b>music</b> and <b>sound effects</b> buttons work separately and are remembered.</Note>
        <Note icon="📜"><b>Last moves</b>, bottom right, lists what just happened. Card colours are written in their colour.</Note>
        <Note icon="🔁">On one computer, the curtain tells the next player what happened <b>since their last turn</b>.</Note>
        <Note icon="📶">On two computers, the host shares a link or QR code. Both must be on the same Wi-Fi, unless the game was started online.</Note>
        <Note icon="🗺️">After the game, <b>View the board</b> to admire the network, or <b>Save results (PDF)</b> to keep it.</Note>
        <Note tone="tip" icon="🏠"><b>House rules:</b> 50 trains each, seven card colours, and both tracks of a double route are usable at any player count.</Note>
        <Note tone="tip" icon="💡">Open these rules any time with the <b>Rules</b> button at the top.</Note>
      </div>
    ),
  },
];

export function HowToPlay({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const go = (n: number) => setPage(Math.max(0, Math.min(CHAPTERS.length - 1, n)));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setPage((p) => Math.min(CHAPTERS.length - 1, p + 1));
      if (e.key === 'ArrowLeft') setPage((p) => Math.max(0, p - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const ch = CHAPTERS[page];

  return (
    <div className="fade-in fixed inset-0 z-[85] grid place-items-center bg-ink/60 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div role="dialog" aria-label="How to play" data-testid="how-to-play" onClick={(e) => e.stopPropagation()}
        className="flex h-[min(760px,94vh)] w-[min(1120px,96vw)] overflow-hidden rounded-2xl border-[3px] border-ink bg-panel shadow-2xl">
        <nav className="flex w-[230px] shrink-0 flex-col gap-1 border-r-2 border-ink bg-ink px-3 py-5 text-paper">
          <div className="mb-4 px-2 font-display text-[22px] leading-tight">How to play<br /><span className="text-mustard">{SKIN.name}</span></div>
          {CHAPTERS.map((c, i) => (
            <button key={c.title} type="button" onClick={() => go(i)} aria-current={i === page ? 'step' : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[15px] transition-colors ${i === page ? 'bg-paper text-ink' : 'text-paper/80 hover:bg-paper/10'}`}>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 font-display text-[12px] ${i === page ? 'border-ink bg-mustard' : i < page ? 'border-mustard bg-mustard text-ink' : 'border-paper/40'}`}>{i + 1}</span>
              {c.title}
            </button>
          ))}
          <div className="mt-auto px-2 text-[12px] text-paper/50">Use ← → to turn pages</div>
        </nav>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-start justify-between border-b-2 border-line px-7 pb-3 pt-5">
            <div>
              <div className="font-serif text-[14px] italic text-muted">{ch.kicker}</div>
              <h2 className="font-display text-[34px] leading-tight text-poster">{ch.title}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Close rules" data-testid="close-help"
              className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-ticket text-[20px] hover:bg-paper">✕</button>
          </header>
          <div key={page} className="card-in min-h-0 flex-1 overflow-y-auto px-7 py-5">{ch.body}</div>
          <footer className="flex items-center justify-between border-t-2 border-line px-7 py-3">
            <button type="button" onClick={() => go(page - 1)} disabled={page === 0}
              className="rounded-lg border-2 border-ink bg-ticket px-4 py-1.5 font-display text-[15px] disabled:opacity-30">← Back</button>
            <div className="flex gap-1.5" aria-label={`Page ${page + 1} of ${CHAPTERS.length}`}>
              {CHAPTERS.map((_, i) => <span key={i} className={`h-2.5 rounded-full transition-all ${i === page ? 'w-6 bg-poster' : 'w-2.5 bg-line-strong'}`} />)}
            </div>
            {page < CHAPTERS.length - 1 ? (
              <button type="button" onClick={() => go(page + 1)} data-testid="help-next"
                className="rounded-lg bg-poster px-5 py-1.5 font-display text-[15px] text-[#fff6e6] shadow-[0_3px_0_#8e2d24]">Next →</button>
            ) : (
              <button type="button" onClick={onClose} className="rounded-lg bg-poster px-5 py-1.5 font-display text-[15px] text-[#fff6e6] shadow-[0_3px_0_#8e2d24]">Let's ride!</button>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
