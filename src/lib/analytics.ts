import * as amplitude from '@amplitude/analytics-browser';
import { appDb } from './db';

let initialised = false;

export function initAnalytics() {
  const key = import.meta.env.VITE_AMPLITUDE_KEY ?? 'PLACEHOLDER_KEY';
  amplitude.init(key, undefined, {
    defaultTracking: false,
  });
  initialised = true;

  // Flush any queued offline events when we come back online
  window.addEventListener('online', flushPendingEvents);
  if (navigator.onLine) {
    flushPendingEvents();
  }
}

export async function track(eventName: string, props: Record<string, unknown> = {}) {
  if (!navigator.onLine || !initialised) {
    await appDb.pendingEvents.add({
      eventName,
      eventProps: props,
      queuedAt: Date.now(),
    });
    return;
  }
  amplitude.track(eventName, props);
}

export function setUserProperties(userId: string, careHomeId: string, language: string) {
  const identifyEvent = new amplitude.Identify();
  identifyEvent.set('userId', userId);
  identifyEvent.set('careHomeId', careHomeId);
  identifyEvent.set('language', language);
  amplitude.identify(identifyEvent);
  amplitude.setUserId(userId);
}

async function flushPendingEvents() {
  if (!initialised) return;
  const pending = await appDb.pendingEvents.toArray();
  if (pending.length === 0) return;

  for (const event of pending) {
    amplitude.track(event.eventName, event.eventProps);
  }
  await appDb.pendingEvents.clear();
}
