import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Entry {
  id: string;
  date: string;
  prompt: string;
  body: string;
}

export const getTodayDateString = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// ─── Web fallback: AsyncStorage ───────────────────────────────────────────────

const WEB_KEY = 'quill_entries';

const webGetAll = async (): Promise<Entry[]> => {
  const raw = await AsyncStorage.getItem(WEB_KEY);
  return raw ? JSON.parse(raw) : [];
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
        body TEXT NOT NULL
      );
    `);
  }
  return db;
};

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
  return (result as Entry) ?? null;
};

export const createEntry = async (prompt: string, body: string): Promise<Entry> => {
  const entry: Entry = {
    id: Crypto.randomUUID(),
    date: getTodayDateString(),
    prompt,
    body,
  };
  if (Platform.OS === 'web') {
    const all = await webGetAll();
    await webSaveAll([entry, ...all]);
    return entry;
  }
  const database = await getDb();
  await database.runAsync(
    'INSERT INTO entries (id, date, prompt, body) VALUES (?, ?, ?, ?)',
    [entry.id, entry.date, entry.prompt, entry.body]
  );
  return entry;
};

export const updateEntry = async (id: string, body: string): Promise<void> => {
  if (Platform.OS === 'web') {
    const all = await webGetAll();
    await webSaveAll(all.map(e => e.id === id ? { ...e, body } : e));
    return;
  }
  const database = await getDb();
  await database.runAsync('UPDATE entries SET body = ? WHERE id = ?', [body, id]);
};

export const getAllEntries = async (): Promise<Entry[]> => {
  if (Platform.OS === 'web') {
    const all = await webGetAll();
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }
  const database = await getDb();
  return database.getAllAsync('SELECT * FROM entries ORDER BY date DESC') as Promise<Entry[]>;
};
