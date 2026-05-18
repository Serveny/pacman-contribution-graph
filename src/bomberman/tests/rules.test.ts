import { GAME_THEMES, GRID_HEIGHT, GRID_WIDTH } from '../../shared/constants';
import { GridCell } from '../../shared/types';
import { BombermanStore } from '../types';
import { Game } from '../core/game';
import { clearSpawnArea } from '../core/rules';

const createCell = (commitsCount: number): GridCell => ({
	commitsCount,
	level: commitsCount > 0 ? 'FIRST_QUARTILE' : 'NONE',
	color: commitsCount > 0 ? GAME_THEMES.github.intensityColors[1] : GAME_THEMES.github.intensityColors[0]
});

const createStore = (): BombermanStore => ({
	frameCount: 0,
	contributions: [],
	grid: [],
	monthLabels: [],
	gameInterval: 0,
	nextBombId: 0,
	players: [],
	bombs: [],
	activeExplosions: [],
	gameHistory: [],
	initialColors: [],
	cellEvents: [],
	explosionEvents: [],
	config: {
		platform: 'github',
		username: '',
		gameTheme: 'github',
		githubSettings: { accessToken: '' },
		svgCallback: () => {},
		gameOverCallback: () => {},
		pointsIncreasedCallback: () => {}
	}
});

const createFilledGrid = () => Array.from({ length: GRID_WIDTH }, () => Array.from({ length: GRID_HEIGHT }, () => createCell(1)));

describe('Bomberman spawn handling', () => {
	it('clears every contribution cell in a 2x2 spawn area without scoring an event', () => {
		const store = createStore();
		store.grid = createFilledGrid();

		clearSpawnArea(store, { x: 0, y: 0 });
		clearSpawnArea(store, { x: GRID_WIDTH - 2, y: GRID_HEIGHT - 2 });

		expect(store.grid[0][0]).toEqual(createCell(0));
		expect(store.grid[1][0]).toEqual(createCell(0));
		expect(store.grid[0][1]).toEqual(createCell(0));
		expect(store.grid[1][1]).toEqual(createCell(0));
		expect(store.grid[GRID_WIDTH - 2][GRID_HEIGHT - 2]).toEqual(createCell(0));
		expect(store.grid[GRID_WIDTH - 1][GRID_HEIGHT - 2]).toEqual(createCell(0));
		expect(store.grid[GRID_WIDTH - 2][GRID_HEIGHT - 1]).toEqual(createCell(0));
		expect(store.grid[GRID_WIDTH - 1][GRID_HEIGHT - 1]).toEqual(createCell(0));
		expect(store.grid[2][0]).toEqual(createCell(1));
		expect(store.cellEvents).toHaveLength(0);
	});

	it('places players at fixed opposite corners', async () => {
		const store = createStore();

		await Game.startGame(store);

		expect(store.players[0]).toMatchObject({ id: 1, x: 0, y: 0 });
		expect(store.players[1]).toMatchObject({ id: 2, x: GRID_WIDTH - 1, y: GRID_HEIGHT - 1 });
	});
});
