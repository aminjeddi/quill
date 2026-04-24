import { Entry } from '../db/database';
import { calculateStreak } from './streak';

export interface WritingStats {
  totalEntries: number;
  totalWords: number;
  avgWordsPerEntry: number;
  currentStreak: number;
  longestStreak: number;
  favoriteDay: string | null;
  writingSince: string | null; // YYYY-MM-DD
}

const wordCount = (text: string): number =>
  text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const computeStats = (entries: Entry[]): WritingStats => {
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      totalWords: 0,
      avgWordsPerEntry: 0,
      currentStreak: 0,
      longestStreak: 0,
      favoriteDay: null,
      writingSince: null,
    };
  }

  // Total & average words
  const totalWords = entries.reduce((sum, e) => sum + wordCount(e.body), 0);
  const avgWordsPerEntry = Math.round(totalWords / entries.length);

  // Current streak (reuse existing logic)
  const currentStreak = calculateStreak(entries);

  // Longest streak
  const uniqueDates = [...new Set(entries.map((e) => e.date))].sort();
  const longestStreak = computeLongestStreak(uniqueDates);

  // Favorite day of week
  const dayCounts: Record<number, number> = {};
  for (const entry of entries) {
    const dow = parseLocalDate(entry.date).getDay();
    dayCounts[dow] = (dayCounts[dow] ?? 0) + 1;
  }
  const topDay = Object.entries(dayCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
  const favoriteDay = topDay ? DAY_NAMES[Number(topDay[0])] : null;

  // Writing since (earliest date)
  const writingSince = uniqueDates[0] ?? null;

  return {
    totalEntries: entries.length,
    totalWords,
    avgWordsPerEntry,
    currentStreak,
    longestStreak,
    favoriteDay,
    writingSince,
  };
};

const computeLongestStreak = (sortedUniqueDates: string[]): number => {
  if (sortedUniqueDates.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sortedUniqueDates.length; i++) {
    const prev = parseLocalDate(sortedUniqueDates[i - 1]);
    const curr = parseLocalDate(sortedUniqueDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
};

export const formatWritingSince = (dateStr: string): string => {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const formatNumber = (n: number): string =>
  n.toLocaleString('en-US');
