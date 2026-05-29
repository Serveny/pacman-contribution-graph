import type { Config } from 'jest';

const config: Config = {
	testEnvironment: 'node',
	testMatch: ['**/?(*.)+(test).ts'],
	extensionsToTreatAsEsm: ['.ts'],
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.test.json',
				useESM: true
			}
		]
	},
	coverageProvider: 'v8',
	collectCoverage: true,
	collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/types.ts', '!src/index.ts'],
	coverageReporters: ['text', 'html'],
	coverageDirectory: 'coverage'
};

export default config;
