/**
 * Dev-only client for the watchdog markdown log.
 * Posts watchdog activity to the Vite dev middleware (see vite.config.ts),
 * which appends it to `playtest-log.md`. No-ops in production builds.
 */

const ENDPOINT = '/__watchdog';
let sessionStarted = false;

function post(payload: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* dev logging is best-effort */
  }
}

/** Start a new playtest section in the log (called when the monitor turns on). */
export function startWatchdogSession(label?: string): void {
  if (!import.meta.env.DEV) return;
  sessionStarted = true;
  post({ type: 'session', label: label ?? '', at: Date.now() });
}

/** Append a single watchdog violation to the log. */
export function logWatchdogViolation(v: {
  kind: string;
  id: string;
  message: string;
  at: number;
}): void {
  if (!import.meta.env.DEV) return;
  if (!sessionStarted) startWatchdogSession();
  post({ type: 'violation', kind: v.kind, id: v.id, message: v.message, at: v.at });
}

/** Append a freeform note (e.g. "playtest ended", manual markers). */
export function logWatchdogNote(message: string): void {
  if (!import.meta.env.DEV) return;
  post({ type: 'note', message });
}
