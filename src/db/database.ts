import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

export interface Entry {
  id: string;
  date: string;
  prompt: string;
  body: string;
}

let db: SQLite.SQLiteDatabase | null = null;

export const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
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

export const getTodayDateString = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

export const getToday = async (): Promise<Entry | null> => {
  const database = await getDb();
  const today = getTodayDateString();
  const result = await database.getFirstAsync<Entry>(
    'SELECT * FROM entries WHERE date = ?',
    [today]
  );
  return result ?? null;
};

export const createEntry = async (prompt: string, body: string): Promise<Entry> => {
  const database = await getDb();
  const entry: Entry = {
    id: Crypto.randomUUID(),
    date: getTodayDateString(),
    prompt,
    body,
  };
  await database.runAsync(
    'INSERT INTO entries (id, date, prompt, body) VALUES (?, ?, ?, ?)',
    [entry.id, entry.date, entry.prompt, entry.body]
  );
  return entry;
};

export const updateEntry = async (id: string, body: string): Promise<void> => {
  const database = await getDb();
  await database.runAsync('UPDATE entries SET body = ? WHERE id = ?', [body, id]);
};

export const getAllEntries = async (): Promise<Entry[]> => {
  const database = await getDb();
  return database.getAllAsync<Entry>('SELECT * FROM entries ORDER BY date DESC');
};
