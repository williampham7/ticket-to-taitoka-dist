import { CONT_BY_ID, TERR, type LogEvent, type Mission } from '@boboland/shared/src/warfront';

export const nameOf = (names: Record<string, string>, p: string) => (p === 'N' ? 'Neutral' : names[p] ?? `General ${Number(p) + 1}`);

export function missionText(m: Mission, names: Record<string, string>): string {
  switch (m.kind) {
    case 'conts': return `Capture ${m.conts.map((c) => CONT_BY_ID[c].name).join(' and ')}${m.plus ? ', plus one more continent of your choice' : ''}.`;
    case 'count': return `Hold ${m.n} territories.`;
    case 'count2': return `Hold ${m.n} territories with at least 2 armies in each.`;
    case 'destroy': return `Destroy every army of ${nameOf(names, m.target)}. If someone else gets there first, hold 24 territories instead.`;
  }
}

/** One teleprinter line per event. */
export function logLine(e: LogEvent, names: Record<string, string>): string | null {
  const n = (p: string) => nameOf(names, p);
  switch (e.k) {
    case 'turn': return `ROUND ${e.round} · ${n(e.p).toUpperCase()} TAKES COMMAND`;
    case 'trade': return `${n(e.p)} cashes in intel for ${e.armies} armies${e.bonus ? ` (+2 on ${TERR[e.bonus].name})` : ''}`;
    case 'deploy': return `${n(e.p)} deploys ${e.n} armies`;
    case 'battle': return `${n(e.p)} strikes ${TERR[e.to].name} from ${TERR[e.from].name}: −${e.attLoss} / −${e.defLoss}${e.conquered ? ' · SECURED' : ''}`;
    case 'move': return e.fortify ? `${n(e.p)} redeploys ${e.n} to ${TERR[e.to].name}` : `${e.n} armies march into ${TERR[e.to].name}`;
    case 'card': return `${n(e.p)} receives an intel card`;
    case 'eliminate': return `${n(e.target).toUpperCase()} NEUTRALISED by ${n(e.p)}`;
    case 'resign': return `${n(e.p)} leaves the field`;
    case 'win': return `${n(e.p).toUpperCase()} ${e.reason === 'mission' ? 'COMPLETES SECRET ORDERS' : 'SECURES THE WORLD'}`;
  }
}
