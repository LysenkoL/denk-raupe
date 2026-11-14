import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Android-App (später Capacitor): Dateien liegen im App-Ordner, daher relative Pfade
  base: './',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 120000,
  },
});
