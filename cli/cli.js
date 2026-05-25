#!/usr/bin/env node

// Run `npm link` to test locally
import fs from 'fs';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import { ARCADE_GAMES, ArcadeRenderer, generateScenarioContributions, SCENARIOS } from '../dist/pacman-contribution-graph.min.js';

const argv = yargs(hideBin(process.argv))
	.option('game', {
		alias: 'g',
		describe: `Game to generate: ${ARCADE_GAMES.join(', ')}`,
		choices: ARCADE_GAMES,
		default: 'pacman',
		type: 'string'
	})
	.option('platform', {
		alias: 'pl',
		describe: 'Platform: github, gitlab',
		choices: ['github', 'gitlab'],
		type: 'string'
	})
	.option('gameTheme', {
		alias: 'gt',
		describe: 'Game theme: github, github-dark, gitlab, gitlab-dark',
		choices: ['github', 'github-dark', 'gitlab', 'gitlab-dark'],
		type: 'string'
	})
	.option('username', {
		alias: 'un',
		describe: 'Username for the platform',
		type: 'string'
	})
	.option('scenario', {
		alias: 's',
		describe: `Use a predefined contribution scenario instead of fetching user contributions: ${SCENARIOS.join(', ')}. Without a value, random is used.`,
		type: 'string'
	})
	.option('output', {
		alias: 'o',
		describe: 'Output file (SVG)',
		default: 'contribution-graph.svg',
		type: 'string'
	})
	.check((parsedArgv) => {
		const hasScenario = parsedArgv.scenario !== undefined;
		if (hasScenario) return true;

		const missingOptions = ['platform', 'gameTheme', 'username'].filter((option) => !parsedArgv[option]);
		if (missingOptions.length > 0) {
			throw new Error(`Missing required argument${missingOptions.length > 1 ? 's' : ''}: ${missingOptions.join(', ')}`);
		}

		return true;
	})
	.help().argv;

let scenario = { name: undefined, contributions: undefined };

if (argv.scenario !== undefined) {
	try {
		scenario = generateScenarioContributions(argv.scenario);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

const renderer = new ArcadeRenderer({
	game: argv.game,
	platform: argv.platform ?? 'github',
	username: argv.username ?? `scenario-${scenario.name}`,
	gameTheme: argv.gameTheme ?? (argv.platform === 'gitlab' ? 'gitlab' : 'github'),
	contributions: scenario.contributions,
	includeFutureContributions: argv.scenario !== undefined,
	svgCallback: (svg) => {
		fs.writeFileSync(argv.output, svg);
		console.log(`SVG saved to ${argv.output}`);
	}
});
renderer.start();
