import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  // React 19 only exports act() in its development CJS bundle.
  // Setting NODE_ENV to 'development' before modules load makes
  // react/index.js and react-dom/index.js pick up the dev build.
  setupFiles: ['<rootDir>/jest.env.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/.worktrees/'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
};

export default config;
