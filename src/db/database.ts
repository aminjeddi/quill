import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Entry {
  id: string;
  date: string;
  prompt: string;
  body: string;
  starred: boolean;
}

export const getTodayDateString = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// ─── Web fallback: AsyncStorage ───────────────────────────────────────────────

const WEB_KEY = 'quill_entries';

const webGetAll = async (): Promise<Entry[]> => {
  const raw = await AsyncStorage.getItem(WEB_KEY);
  if (!raw) return [];
  const entries = JSON.parse(raw) as any[];
  // Migrate: ensure starred exists on old entries
  return entries.map(e => ({ ...e, starred: e.starred ?? false }));
};

const webSaveAll = async (entries: Entry[]): Promise<void> => {
  await AsyncStorage.setItem(WEB_KEY, JSON.stringify(entries));
};

// ─── Native: SQLite ───────────────────────────────────────────────────────────

let db: any = null;

const getDb = async () => {
  if (!db) {
    const SQLite = await import('expo-sqlite');
    db = await SQLite.openDatabaseAsync('quill.db');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        prompt TEXT NOT NULL,
        body TEXT NOT NULL,
        starred INTEGER DEFAULT 0
      );
    `);
    // Migrate existing tables that don't have the starred column yet
    try {
      await db.execAsync(`ALTER TABLE entries ADD COLUMN starred INTEGER DEFAULT 0;`);
    } catch {
      // Column already exists — safe to ignore
    }
  }
  return db;
};

const rowToEntry = (row: any): Entry => ({
  ...row,
  starred: row.starred === 1 || row.starred === true,
});

// ─── Public API ───────────────────────────────────────────────────────────────

export const getToday = async (): Promise<Entry | null> => {
  const today = getTodayDateString();
  if (Platform.OS === 'web') {
    const all = await webGetAll();
    return all.find(e => e.date === today) ?? null;
  }
  const database = await getDb();
  const result = await database.getFirstAsync(
    'SELECT * FROM entries WHERE date = ?',
    [today]
  );
  return result ? rowToEntry(result) : null;
};

export const createEntry = async (prompt: string, body: string): Promise<Entry> => {
  const entry: Entry = {
    id: Crypto.randomUUID(),
    date: getTodayDateString(),
    prompt,
    body,
    starred: false,
  };
  if (Platform.OS === 'web') {
    const all = await webGetAll();
    await webSaveAll([entry, ...all]);
    return entry;
  }
  const database = await getDb();
  await database.runAsync(
    'INSERT INTO entries (id, date, prompt, body, starred) VALUES (?, ?, ?, ?, ?)',
    [entry.id, entry.date, entry.prompt, entry.body, 0]
  );
  return entry;
};

export const updateEntry = async (id: string, body: string, prompt?: string): Promise<void> => {
  if (Platform.OS === 'web') {
    const all = await webGetAll();
    await webSaveAll(all.map(e => e.id === id ? { ...e, body, ...(prompt !== undefined ? { prompt } : {}) } : e));
    return;
  }
  const database = await getDb();
  if (prompt !== undefined) {
    await database.runAsync('UPDATE entries SET body = ?, prompt = ? WHERE id = ?', [body, prompt, id]);
  } else {
    await database.runAsync('UPDATE entries SET body = ? WHERE id = ?', [body, id]);
  }
};

export const toggleStarEntry = async (id: string, starred: boolean): Promise<void> => {
  if (Platform.OS === 'web') {
    const all = await webGetAll();
    await webSaveAll(all.map(e => e.id === id ? { ...e, starred } : e));
    return;
  }
  const database = await getDb();
  await database.runAsync('UPDATE entries SET starred = ? WHERE id = ?', [starred ? 1 : 0, id]);
};

export const deleteEntry = async (id: string): Promise<void> => {
  if (Platform.OS === 'web') {
    const all = await webGetAll();
    await webSaveAll(all.filter(e => e.id !== id));
    return;
  }
  const database = await getDb();
  await database.runAsync('DELETE FROM entries WHERE id = ?', [id]);
};

export const getTodayAll = async (): Promise<Entry[]> => {
  const today = getTodayDateString();
  if (Platform.OS === 'web') {
    const all = await webGetAll();
    return all.filter(e => e.date === today).sort((a, b) => a.id.localeCompare(b.id));
  }
  const database = await getDb();
  const rows = await database.getAllAsync(
    'SELECT * FROM entries WHERE date = ? ORDER BY rowid ASC',
    [today]
  ) as any[];
  return rows.map(rowToEntry);
};

export const getAllEntries = async (): Promise<Entry[]> => {
  if (Platform.OS === 'web') {
    const all = await webGetAll();
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }
  const database = await getDb();
  const rows = await database.getAllAsync('SELECT * FROM entries ORDER BY date DESC, rowid DESC') as any[];
  return rows.map(rowToEntry);
};
