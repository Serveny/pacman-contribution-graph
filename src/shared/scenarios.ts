import type { Contribution, ContributionLevel } from './types';

export const SCENARIO_WEEKS = 53;
export const SCENARIO_DAYS = 7;

export const SCENARIOS = ['full', 'empty', 'random', 'checkerboard', 'gradient', 'streaks'] as const;

export type ScenarioName = (typeof SCENARIOS)[number];

interface ScenarioResult {
	name: ScenarioName;
	contributions: Contribution[];
}

export const isScenarioName = (value: string): value is ScenarioName => SCENARIOS.includes(value as ScenarioName);

export const resolveScenarioName = (scenarioArg: string | undefined): ScenarioName => {
	const scenarioName = scenarioArg === '' || scenarioArg === undefined ? 'random' : scenarioArg;

	if (!isScenarioName(scenarioName)) {
		throw new Error(`Unknown scenario "${scenarioName}". Available scenarios: ${SCENARIOS.join(', ')}`);
	}

	return scenarioName;
};

export const generateScenarioContributions = (scenarioArg?: string): ScenarioResult => {
	const name = resolveScenarioName(scenarioArg);

	return {
		name,
		contributions: countsToContributions(createScenarioCounts(name))
	};
};

const createScenarioCounts = (name: ScenarioName): number[][] => {
	switch (name) {
		case 'empty':
			return createEmptyCounts();
		case 'full':
			return createFullCounts(8);
		case 'random':
			return createRandomCounts({ density: 0.5, min: 1, max: 8 });
		case 'checkerboard':
			return createCheckerboardCounts({ low: 0, high: 10 });
		case 'gradient':
			return createGradientCounts({ min: 0, max: 12 });
		case 'streaks':
			return createStreakCounts({
				count: 10,
				streaks: [
					{ day: 1, startWeek: 2, length: 12, count: 6 },
					{ day: 3, startWeek: 18, length: 18, count: 10 },
					{ day: 5, startWeek: 38, length: 10, count: 14 }
				]
			});
	}
};

const createEmptyCounts = () => Array.from({ length: SCENARIO_WEEKS }, () => Array(SCENARIO_DAYS).fill(0));

const createFullCounts = (count: number) =>
	Array.from({ length: SCENARIO_WEEKS }, () => Array(SCENARIO_DAYS).fill(toNonNegativeInteger(count)));

const createRandomCounts = ({ density, min, max }: { density: number; min: number; max: number }) => {
	const clampedDensity = clampNumber(density, 0, 1);
	const minimum = toNonNegativeInteger(min);
	const maximum = Math.max(minimum, toNonNegativeInteger(max));
	const contributionRange = maximum - minimum + 1;

	return Array.from({ length: SCENARIO_WEEKS }, (_, week) =>
		Array.from({ length: SCENARIO_DAYS }, (_, day) => {
			const value = Math.random();
			if (value >= clampedDensity) return 0;
			return minimum + Math.floor(Math.random() * contributionRange);
		})
	);
};

const createCheckerboardCounts = ({ low, high }: { low: number; high: number }) => {
	const lowCount = toNonNegativeInteger(low);
	const highCount = toNonNegativeInteger(high);

	return Array.from({ length: SCENARIO_WEEKS }, (_, week) =>
		Array.from({ length: SCENARIO_DAYS }, (_, day) => ((week + day) % 2 === 0 ? highCount : lowCount))
	);
};

const createGradientCounts = ({ min, max }: { min: number; max: number }) => {
	const minimum = toNonNegativeInteger(min);
	const maximum = Math.max(minimum, toNonNegativeInteger(max));

	return Array.from({ length: SCENARIO_WEEKS }, (_, week) =>
		Array.from({ length: SCENARIO_DAYS }, (_, day) => {
			const weekRatio = week / (SCENARIO_WEEKS - 1);
			const dayRatio = day / (SCENARIO_DAYS - 1);
			return Math.round(minimum + (maximum - minimum) * (weekRatio * 0.75 + dayRatio * 0.25));
		})
	);
};

const createStreakCounts = ({
	count,
	streaks
}: {
	count: number;
	streaks: { day: number; startWeek: number; length: number; count?: number }[];
}) => {
	const defaultCount = toNonNegativeInteger(count);
	const counts = createEmptyCounts();

	for (const streak of streaks) {
		const day = clampNumber(toNonNegativeInteger(streak.day), 0, SCENARIO_DAYS - 1);
		const startWeek = clampNumber(toNonNegativeInteger(streak.startWeek), 0, SCENARIO_WEEKS - 1);
		const length = toNonNegativeInteger(streak.length);
		const streakCount = toNonNegativeInteger(streak.count ?? defaultCount);

		for (let week = startWeek; week < Math.min(SCENARIO_WEEKS, startWeek + length); week++) {
			counts[week][day] = streakCount;
		}
	}

	return counts;
};

const countsToContributions = (counts: number[][]): Contribution[] => {
	const endDate = truncateToUTCDate(new Date());
	const startDate = new Date(endDate);
	startDate.setUTCDate(endDate.getUTCDate() - 365);
	startDate.setUTCDate(startDate.getUTCDate() - startDate.getUTCDay());

	const maxCount = Math.max(0, ...counts.flat());
	const contributions: Contribution[] = [];

	for (let week = 0; week < SCENARIO_WEEKS; week++) {
		for (let day = 0; day < SCENARIO_DAYS; day++) {
			const date = new Date(startDate);
			date.setUTCDate(startDate.getUTCDate() + week * SCENARIO_DAYS + day);

			if (date > endDate) continue;

			const count = counts[week][day];
			contributions.push({
				date,
				count,
				color: '',
				level: countToLevel(count, maxCount)
			});
		}
	}

	return contributions;
};

const countToLevel = (count: number, maxCount: number): ContributionLevel => {
	if (count === 0 || maxCount === 0) return 'NONE';

	const quartile = maxCount / 4;
	if (count < quartile) return 'FIRST_QUARTILE';
	if (count < quartile * 2) return 'SECOND_QUARTILE';
	if (count < quartile * 3) return 'THIRD_QUARTILE';
	return 'FOURTH_QUARTILE';
};

const truncateToUTCDate = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const toNonNegativeInteger = (value: number) => {
	if (!Number.isFinite(value) || value < 0) {
		throw new Error(`Scenario counts must be non-negative numbers. Received: ${value}`);
	}
	return Math.floor(value);
};

const clampNumber = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
