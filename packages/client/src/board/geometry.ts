import { routeCars, routeMidpoint, type CarSlot, type Route } from '@boboland/shared';

export { NODE_R, HUB_R, CAR_GAP, CAR_H } from '@boboland/shared';

export type CarRect = CarSlot;

/** One slot per train car, evenly spaced along the route's lane (following its curve, if it has one). */
export function carRects(route: Route): CarRect[] {
  return routeCars(route);
}

export { routeMidpoint };
