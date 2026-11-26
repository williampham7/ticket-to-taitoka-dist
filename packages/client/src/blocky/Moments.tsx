import type { CSSProperties } from 'react';
import { guildsOf, type BView, type Guild } from '@boboland/shared/src/blocky';
import { Avatar } from './art/avatars';
import { Crest } from './art/crests';
import { BEAT, fxScale } from './fx';
import { GUILD_NAME, nameOf } from './text';
import type { Anim } from './useBlockyFx';

/**
 * Moments over the stage (HTML): the guild reveal at the start and the cloud ribbon when the turn passes to you
 * (or to a different human on this device). CSS-animated from `--d`, like the board effects.
 */
const v = (o: Record<string, string | number>) => o as CSSProperties;

export function Moments({ anims, me, names, view, local }: { anims: Anim[]; me: string | null; names: Record<string, string>; view: BView; local?: boolean }) {
  const k = fxScale();
  return (
    <div className="bly-moments" aria-live="polite">
      {anims.map((a) => {
        if (a.e.k === 'start') return <Reveal key={a.key} view={view} me={me} names={names} k={k} />;
        if (a.e.k === 'turn') {
          const prev = a.before.actor;
          const toMe = me !== null && a.e.actor === me && prev !== me;
          const human = local && !view.bots[Number(a.e.actor)] && a.e.actor !== prev;
          if (!toMe && !human) return null;
          return <Ribbon key={a.key} guild={a.e.guild} name={a.e.actor === me ? 'Your turn' : `${nameOf(names, a.e.actor)}’s turn`} avatar={view.avatars[Number(a.e.actor)] ?? 0} k={k} />;
        }
        return null;
      })}
    </div>
  );
}

/** The cloud ribbon: unrolls with the builder's avatar and the guild crest, then drifts away. */
export function Ribbon({ guild, name, avatar, k }: { guild: Guild; name: string; avatar: number; k: number }) {
  return (
    <div className={`bly-ribbon bly-fxa bly-g-${guild}`} style={v({ '--d': '0ms', '--t': `${Math.round(BEAT.turn.ribbon * k)}ms` })} role="status">
      <span className="bly-ribbon-cloud" aria-hidden />
      <Avatar id={avatar} size={52} />
      <b>{name}</b>
      <Crest guild={guild} size={40} />
      <small>{GUILD_NAME[guild]} builds</small>
    </div>
  );
}

/** The guild reveal at the start: who leads which guild, crests flying to their banners. */
export function Reveal({ view, me, names, k }: { view: BView; me: string | null; names: Record<string, string>; k: number }) {
  const mine = me !== null ? guildsOf(view, me) : [];
  const t = Math.round(BEAT.start.ms * k);
  return (
    <div className="bly-reveal bly-fxa" style={v({ '--d': '0ms', '--t': `${t}ms` })} role="status" data-testid="bly-reveal">
      <div className="bly-reveal-card bly-cloud">
        <h2>{mine.length ? `You lead ${mine.map((g) => GUILD_NAME[g]).join(' and ')}` : 'The guilds gather'}</h2>
        <ul>
          {view.guilds.map((g, i) => {
            const s = view.seats[g];
            return (
              <li key={g} className={`bly-fxa bly-reveal-guild bly-g-${g}`} style={v({ '--d': `${Math.round((200 + i * 160) * k)}ms`, '--t': `${Math.round(700 * k)}ms` })}>
                <Crest guild={g} size={54} shared={s === 'shared'} />
                <b>{GUILD_NAME[g]}</b>
                <small>{s === 'shared' ? 'Shared' : s === me ? 'You' : nameOf(names, s)}</small>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
