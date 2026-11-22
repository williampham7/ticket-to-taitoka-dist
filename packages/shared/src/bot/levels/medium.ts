import { makePolicy } from '../brain';

/** Plans a ticket network, claims bottlenecks first, draws what the plan lacks; 5% harmless slips. */
export const medium = makePolicy({ epsilon: 0.05, hard: false });
