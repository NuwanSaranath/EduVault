import type { SQLiteDatabase } from 'expo-sqlite';

jest.mock('expo-sqlite', () => ({}));
jest.mock('../schema', () => ({ DATABASE_NAME: 'test.db', SCHEMA_VERSION: 1, migrate: jest.fn() }));

import { runInTransaction } from '../index';

/**
 * A fake connection that behaves like SQLite: BEGIN while a transaction is
 * already open throws the same error the app hit on "Mark Chapter as Complete".
 */
function fakeDb() {
  let open = false;
  const db = {
    withTransactionAsync: async (task: () => Promise<void>) => {
      if (open) throw new Error('cannot start a transaction within a transaction');
      open = true;
      try {
        await task();
      } finally {
        open = false;
      }
    },
  };
  return db as unknown as SQLiteDatabase;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('runInTransaction', () => {
  it('runs overlapping transactions one after another instead of nesting them', async () => {
    const db = fakeDb();
    const order: string[] = [];

    await Promise.all([
      runInTransaction(db, async () => {
        order.push('a:start');
        await tick();
        order.push('a:end');
      }),
      runInTransaction(db, async () => {
        order.push('b:start');
        await tick();
        order.push('b:end');
      }),
    ]);

    expect(order).toEqual(['a:start', 'a:end', 'b:start', 'b:end']);
  });

  it('returns the task result', async () => {
    await expect(runInTransaction(fakeDb(), async () => 42)).resolves.toBe(42);
  });

  it('rejects a failed transaction without blocking the next one', async () => {
    const db = fakeDb();
    const failed = runInTransaction(db, async () => {
      throw new Error('boom');
    });
    const next = runInTransaction(db, async () => 'ok');

    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
  });
});
