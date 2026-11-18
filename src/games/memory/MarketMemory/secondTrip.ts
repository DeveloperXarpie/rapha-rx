/**
 * Shopping List's "second trip" (FINAL_SPEC 7.1a): the Retention measure.
 *
 * The first round of a visit records its list. When Memory completes during a visit of
 * two or more rounds, one extra round shows no list and asks for that first list again
 * on the same shelf. Retention = correct picks on the trip / correct picks first time.
 *
 * State is module-level and keyed by the visit id GameRouter mints on mount, because
 * the game and its shell remount every round. A reload loses it, which only costs that
 * visit's Retention score.
 */

interface VisitRecord {
  first?: { list: string[]; correct: number };
  pending: boolean;
  done: boolean;
}

const visits = new Map<string, VisitRecord>();

function visit(visitId: string): VisitRecord {
  let v = visits.get(visitId);
  if (!v) {
    v = { pending: false, done: false };
    visits.set(visitId, v);
  }
  return v;
}

/** The first record per visit wins; later rounds do not overwrite it. */
export function recordFirstRound(visitId: string, list: string[], correct: number): void {
  const v = visit(visitId);
  if (!v.first) v.first = { list: [...list], correct };
}

export function firstRound(visitId: string): { list: string[]; correct: number } | undefined {
  return visits.get(visitId)?.first;
}

/** True when Memory completing now should first send this visit on its second trip. */
export function needsSecondTrip(args: {
  visitId: string; round: number; secondTripDone: boolean;
}): boolean {
  return args.round >= 1 && !!firstRound(args.visitId) && !args.secondTripDone
    && !visits.get(args.visitId)?.done;
}

export function requestSecondTrip(visitId: string): void {
  visit(visitId).pending = true;
}

export function isSecondTripPending(visitId: string): boolean {
  return visits.get(visitId)?.pending === true;
}

export function markSecondTripDone(visitId: string): void {
  const v = visit(visitId);
  v.pending = false;
  v.done = true;
}

/** Items remembered at the end / items remembered straight after x 100 (FINAL_SPEC 7.1). */
export function retentionScore(secondCorrect: number, firstCorrect: number): number | null {
  if (firstCorrect === 0) return null;
  return Math.round((secondCorrect / firstCorrect) * 100);
}
