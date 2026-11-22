export interface ShareContext {
  /** public https address when the game runs through a tunnel (`npm run play:online`) */
  publicUrl?: string | null;
  /** this computer's home-network address */
  lanIp?: string;
  /** the address the host's own browser is on */
  page: { protocol: string; hostname: string; port: string };
}

export const isOnline = (c: Pick<ShareContext, 'publicUrl'>) => !!c.publicUrl;

/** The link other players open to join a match. */
export function shareUrlFor(c: ShareContext, matchID: string): string {
  if (c.publicUrl) return `${c.publicUrl.replace(/\/+$/, '')}/join/${matchID}`;
  const host = c.lanIp && c.page.hostname === 'localhost' ? c.lanIp : c.page.hostname;
  const port = c.page.port ? `:${c.page.port}` : '';
  return `${c.page.protocol}//${host}${port}/join/${matchID}`;
}
