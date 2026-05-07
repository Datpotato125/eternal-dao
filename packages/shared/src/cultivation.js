import { OFFLINE_CAP_HOURS } from './constants.js';

// Calculate Qi gained while offline (or between /cultivate calls).
// cultivation_rate is Qi per hour; result is floored and capped at 8 hours.
export function calculateOfflineQi(
  cultivationRate,
  lastSeenMs,
  nowMs = Date.now(),
  capHours = OFFLINE_CAP_HOURS
) {
  const elapsedMs = Math.min(nowMs - lastSeenMs, capHours * 60 * 60 * 1000);
  const elapsedHours = elapsedMs / 1000 / 3600;
  return Math.floor(cultivationRate * elapsedHours);
}
