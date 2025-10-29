/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  moduleDirectories: ['node_modules', 'src'],
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.jsx'],
  testMatch: ['**/__tests__/**/*.(test|spec).{ts,tsx,js,jsx}'],
  verbose: true,
};


