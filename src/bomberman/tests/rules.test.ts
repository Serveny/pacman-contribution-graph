import { GAME_THEMES, GRID_HEIGHT, GRID_WIDTH } from '../../shared/constants';
import { GridCell } from '../../shared/types';
import { BombermanStore } from '../types';
import { Game } from '../core/game';
import { movePlayer } from '../core/ai';
import { sortPathOptions } from '../core/pathfinding';
import { clearSpawnArea, killPlayersInActiveExplosions } from '../core/rules';

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
const createEmptyGrid = () => Array.from({ length: GRID_WIDTH }, () => Array.from({ length: GRID_HEIGHT }, () => createCell(0)));

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

		expect(store.gameHistory[0].players[0]).toMatchObject({ id: 1, x: 0, y: 0 });
		expect(store.gameHistory[0].players[1]).toMatchObject({ id: 2, x: GRID_WIDTH - 1, y: GRID_HEIGHT - 1 });
	});

	it('keeps players moving and fighting when the grid has no contributions', async () => {
		const store = createStore();

		await Game.startGame(store);

		const initialSnapshot = store.gameHistory[0];
		const moved = store.players.some((player) => {
			const initialPlayer = initialSnapshot.players.find((candidate) => candidate.id === player.id);
			return initialPlayer && (player.x !== initialPlayer.x || player.y !== initialPlayer.y);
		});

		expect(store.frameCount).toBeGreaterThan(0);
		expect(moved).toBe(true);
		expect(store.players.some((player) => player.bombsPlaced > 0)).toBe(true);
	});
});

describe('Bomberman movement AI', () => {
	it('uses the player route preference to vary equal-length chase paths', () => {
		const createChaseStore = (routePreference: 'horizontal-first' | 'vertical-first') => {
			const store = createStore();
			store.grid = createEmptyGrid();
			store.players = [
				{
					id: 1,
					name: 'Bomberman',
					x: 0,
					y: 0,
					alive: true,
					direction: 'right',
					bombsPlaced: 0,
					cellsDestroyed: 0,
					sprite: '',
					routePreference
				},
				{
					id: 2,
					name: 'Plunder Bomber',
					x: 2,
					y: 2,
					alive: true,
					direction: 'left',
					bombsPlaced: 0,
					cellsDestroyed: 0,
					sprite: ''
				}
			];
			return store;
		};

		const horizontalStore = createChaseStore('horizontal-first');
		const verticalStore = createChaseStore('vertical-first');

		movePlayer(horizontalStore, horizontalStore.players[0]);
		movePlayer(verticalStore, verticalStore.players[0]);

		expect(horizontalStore.players[0]).toMatchObject({ x: 1, y: 0, direction: 'right' });
		expect(verticalStore.players[0]).toMatchObject({ x: 0, y: 1, direction: 'down' });
	});

	it('uses the attack side as a tie breaker for equivalent path options', () => {
		const options = {
			origin: { x: 2, y: 1 },
			routePreference: 'horizontal-first' as const,
			target: { x: 2, y: 2 }
		};

		const leftFirst = sortPathOptions(
			[
				{ x: 3, y: 1 },
				{ x: 1, y: 1 }
			],
			{ ...options, attackSide: 'left' }
		);
		const rightFirst = sortPathOptions(
			[
				{ x: 1, y: 1 },
				{ x: 3, y: 1 }
			],
			{ ...options, attackSide: 'right' }
		);

		expect(leftFirst[0]).toEqual({ x: 1, y: 1 });
		expect(rightFirst[0]).toEqual({ x: 3, y: 1 });
	});
});

describe('Bomberman explosion handling', () => {
	it('kills players standing in an active explosion after the initial blast frame', () => {
		const store = createStore();
		store.grid = createEmptyGrid();
		store.players = [
			{
				id: 1,
				name: 'Bomberman',
				x: 1,
				y: 0,
				alive: true,
				direction: 'right',
				bombsPlaced: 0,
				cellsDestroyed: 0,
				sprite: ''
			},
			{
				id: 2,
				name: 'Plunder Bomber',
				x: 2,
				y: 0,
				alive: true,
				direction: 'left',
				bombsPlaced: 0,
				cellsDestroyed: 0,
				sprite: ''
			}
		];
		store.activeExplosions = [
			{
				bombId: 0,
				ownerId: 1,
				x: 0,
				y: 0,
				remainingFrames: 2,
				affectedCells: [
					{ x: 0, y: 0 },
					{ x: 1, y: 0 }
				],
				hitPlayerIds: [],
				sprite: ''
			}
		];

		killPlayersInActiveExplosions(store);

		expect(store.players[0].alive).toBe(false);
		expect(store.players[1].alive).toBe(true);
		expect(store.activeExplosions[0].hitPlayerIds).toEqual([1]);
	});

	it('does not move a player into their own active explosion while chasing', () => {
		const store = createStore();
		store.grid = createEmptyGrid();
		store.players = [
			{
				id: 1,
				name: 'Bomberman',
				x: 0,
				y: 0,
				alive: true,
				direction: 'right',
				bombsPlaced: 0,
				cellsDestroyed: 0,
				sprite: ''
			},
			{
				id: 2,
				name: 'Plunder Bomber',
				x: 2,
				y: 0,
				alive: true,
				direction: 'left',
				bombsPlaced: 0,
				cellsDestroyed: 0,
				sprite: ''
			}
		];
		store.activeExplosions = [
			{
				bombId: 0,
				ownerId: 1,
				x: 1,
				y: 0,
				remainingFrames: 2,
				affectedCells: [{ x: 1, y: 0 }],
				hitPlayerIds: [],
				sprite: ''
			}
		];

		movePlayer(store, store.players[0]);

		expect(store.players[0]).toMatchObject({ x: 0, y: 0 });
	});
});
