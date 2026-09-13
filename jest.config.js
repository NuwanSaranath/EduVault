/**
 * Jest is scoped to the pure logic layers: the adaptive algorithm, the sync
 * policy, and the merge strategies. Those are the parts where a silent
 * regression is invisible in the UI — a slightly wrong priority score or a
 * merge that drops XP looks exactly like correct behaviour on screen.
 *
 * Repositories and the engine are deliberately not unit-tested; they are thin
 * wrappers over SQLite and Firestore whose useful assertions need a real device,
 * so they are verified through the manual offline/online flow in
 * docs/04-offline-sync.md instead.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    // Mirrors the "@/*" path alias in tsconfig.json.
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/features/**/*.ts',
    'src/sync/*.ts',
    'src/db/cachePolicy.ts',
    '!**/__tests__/**',
  ],
};
