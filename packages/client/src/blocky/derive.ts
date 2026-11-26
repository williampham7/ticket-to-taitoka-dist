import { PIECE_IDS, anchors, fits, guildsOf, playerScores, squaresOf, squaresPlaced, startIndex, TOTAL_SQUARES, cellsOf, type BView, type Guild, type PieceId } from '@boboland/shared/src/blocky';
import type { BannerData } from './Hud';
import { nameOf } from './text';

/** Everything the HUD shows, derived from the view (pure; the banners, danger and progress rules of PROMPT §7.1). */
export function progressOf(v: BView): number {
  const left = v.grounded.reduce((t, g) => t + v.shelf[g].reduce((s, p) => s + squaresOf(p), 0), 0);
  const placed = v.placed.reduce((t, q) => t + squaresOf(q.piece), 0);
  return Math.min(1, (placed + left) / (TOTAL_SQUARES * v.guilds.length));
}
export const DANGER_AT = 3;
export function rankOf(v: BView): Record<string, number> {
  const s = playerScores(v);
  const live = v.order.filter((p) => !v.out.includes(p)).sort((a, b) => s[b] - s[a]);
  const out = v.order.filter((p) => v.out.includes(p)).sort((a, b) => s[b] - s[a]);
  const r: Record<string, number> = {};
  [...live, ...out].forEach((p, i, all) => { r[p] = i > 0 && s[all[i - 1]] === s[p] && v.out.includes(p) === v.out.includes(all[i - 1]) ? r[all[i - 1]] : i; });
  return r;
}
export function banners(v: BView, me: string | null, names: Record<string, string>, connected: Record<string, boolean> = {}): BannerData[] {
  const scores = playerScores(v), ranks = rankOf(v);
  const danger = (gs: Guild[]) => {
    for (const g of gs) {
      if (v.grounded.includes(g) || startIndex(v.board, g) === null || !v.placed.some((q) => q.guild === g)) continue;
      const n = anchors(v, g).length;
      if (n > 0 && n <= DANGER_AT) return { guild: g, n };
    }
    return null;
  };
  const out: BannerData[] = v.order.map((p) => {
    const gs = guildsOf(v, p);
    return {
      key: p, name: nameOf(names, p), avatar: v.avatars[Number(p)] ?? Number(p), guilds: gs, you: p === me,
      active: !v.result && v.actor === p && gs.includes(v.current), thinking: !v.result && v.actor === p && p !== me,
      placed: gs.reduce((t, g) => t + squaresPlaced(v, g), 0), score: scores[p], rank: ranks[p], grounded: gs.filter((g) => v.grounded.includes(g)),
      danger: danger(gs), shelves: Object.fromEntries(gs.map((g) => [g, v.shelf[g]])), offline: connected[p] === false, bot: !!v.bots[Number(p)], out: v.out.includes(p),
    };
  });
  for (const g of v.guilds.filter((x) => v.seats[x] === 'shared')) {
    out.push({ key: `shared-${g}`, name: 'Shared', avatar: null, guilds: [g], shared: true, active: !v.result && v.current === g, thinking: false,
      placed: squaresPlaced(v, g), score: null, grounded: v.grounded.includes(g) ? [g] : [], danger: null, shelves: { [g]: v.shelf[g] } });
  }
  return out;
}
/** Live anchors where a piece fits in some orientation, and where it fits as currently turned. */
export function fitSets(v: BView, g: Guild, piece: PieceId, orient: number) {
  const live = new Set(anchors(v, g));
  const fit = new Set<number>(), now = new Set<number>();
  for (const pl of fits(v, g, piece)) for (const i of cellsOf(v.size, pl)) if (live.has(i)) { fit.add(i); if (pl.orient === orient) now.add(i); }
  return { fit, now };
}
export const noRoomOf = (v: BView, g: Guild) => new Set(PIECE_IDS.filter((p) => v.shelf[g].includes(p) && fits(v, g, p).length === 0));
