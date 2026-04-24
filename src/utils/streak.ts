import { Entry } from '../db/database';

/**
 * Calculate the current writing streak from a list of entries.
 * A streak is the number of consecutive days (ending today or yesterday)
 * where at least one entry exists.
 */
export const calculateStreak = (entries: Entry[]): number => {
  if (entries.length === 0) return 0;

  // Get unique dates that have entries, sorted newest first
  const uniqueDates = [
    ...new Set(entries.map((e) => e.date)),
  ].sort((a, b) => b.localeCompare(a));

  const today = getDateString(new Date());
  const yesterday = getDateString(offsetDays(new Date(), -1));

  // Streak must include today or yesterday to be active
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const expected = getDateString(offsetDays(parseDate(uniqueDates[i - 1]), -1));
    if (uniqueDates[i] === expected) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

const getDateString = (date: Date): string => date.toISOString().split('T')[0];

const offsetDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const formatStreak = (streak: number): string => {
  if (streak === 0) return '';
  if (streak === 1) return 'Day 1 🔥';
  return `${streak} day streak 🔥`;
};
