/** Small table art: the slapping hand, the false-slap crack, the ankh try pips, a crown for the winner. */

export function HandArt({ ok }: { ok: boolean }) {
  return (
    <svg viewBox="0 0 100 110" className={`egw-hand-art ${ok ? 'ok' : 'bad'}`} aria-hidden>
      <path d="M30 104 C18 92 12 76 13 62 L14 44 C14 38 22 37 24 43 L27 58 L27 22 C27 15 37 15 37 22 L38 50 L39 12 C39 4 50 4 50 12 L51 50 L53 16 C53 8 64 9 64 17 L63 54 L67 30 C68 23 78 24 77 31 L73 68 C71 84 66 96 58 104 Z"
        fill="currentColor" stroke="rgba(0,0,0,.55)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M38 50 L38 60 M51 50 L51 60 M63 54 L62 62" stroke="rgba(0,0,0,.35)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CrackArt() {
  return (
    <svg viewBox="0 0 200 200" className="egw-crack-art" aria-hidden>
      <g fill="none" stroke="#ff4b3e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M100 100 L72 64 L80 40 L58 12" />
        <path d="M100 100 L140 82 L156 92 L192 70" />
        <path d="M100 100 L118 140 L106 160 L122 196" />
        <path d="M100 100 L62 116 L44 108 L8 130" />
        <path d="M100 100 L132 40" strokeWidth="3" />
      </g>
      <circle cx="100" cy="100" r="9" fill="#ff4b3e" />
    </svg>
  );
}

export function Ankh({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="0 0 60 100" className={`egw-ankh ${lit ? 'lit' : 'spent'}`} aria-hidden>
      <path fill="currentColor" fillRule="evenodd" d="M30 4 C16 4 10 16 12 28 C13 36 20 42 25 46 L4 46 L4 56 L25 56 L23 96 L37 96 L35 56 L56 56 L56 46 L35 46 C40 42 47 36 48 28 C50 16 44 4 30 4 Z M30 13 C38 13 40 22 38 30 C36 36 32 40 30 42 C28 40 24 36 22 30 C20 22 22 13 30 13 Z" />
    </svg>
  );
}
