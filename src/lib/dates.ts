/** UTC calendar date, matching the convention used across the app's stores. */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function daysBetweenISO(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0];
}
