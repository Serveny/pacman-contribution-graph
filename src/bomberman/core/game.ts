import { Utils } from '../../shared/utils/utils';
import { Renderer } from '../renderers/svg';
import { BombermanAttackSide, BombermanPlayer, BombermanPosition, BombermanRoutePreference, BombermanStore } from '../types';
import { GRID_HEIGHT, GRID_WIDTH, BOMBERMAN_MAX_FRAMES, BOMBERMAN_SPRITE_SETS } from './constants';
import { movePlayer, shouldPlaceBomb } from './ai';
import { collectVisibleItemsAt, createHiddenItems, getPlayerMoveCount } from './items';
import {
	canPlaceBomb,
	clearSpawnArea,
	killPlayersInActiveExplosions,
	placeBomb,
	updateBombs,
	updateExplosions
} from './rules';
import { BOMBERMAN_DEATH_ANIMATION_FRAMES } from './constants';

const placePlayers = (store: BombermanStore) => {
	const playerOneStart = { x: 0, y: 0 };
	const playerTwoStart = { x: GRID_WIDTH - 1, y: GRID_HEIGHT - 1 };

	store.players = [
		createPlayer(1, 'Bomberman', playerOneStart, 'right', BOMBERMAN_SPRITE_SETS.player.idleDown.data),
		createPlayer(2, 'Plunder Bomber', playerTwoStart, 'left', BOMBERMAN_SPRITE_SETS.plunderBomber.idleDown.data)
	];
};

const clearPlayerSpawnAreas = (store: BombermanStore) => {
	clearSpawnArea(store, { x: 0, y: 0 });
	clearSpawnArea(store, { x: GRID_WIDTH - 2, y: GRID_HEIGHT - 2 });
};

const createPlayer = (
	id: BombermanPlayer['id'],
	name: string,
	position: BombermanPosition,
	direction: BombermanPlayer['direction'],
	sprite: string
): BombermanPlayer => ({
	id,
	name,
	...position,
	alive: true,
	direction,
	bombsPlaced: 0,
	cellsDestroyed: 0,
	blastRangeBonus: 0,
	speedBonus: 0,
	movementStepProgress: 0,
	sprite,
	attackSide: randomAttackSide(),
	routePreference: randomRoutePreference()
});

const randomAttackSide = (): BombermanAttackSide => (Math.random() < 0.5 ? 'left' : 'right');

const randomRoutePreference = (): BombermanRoutePreference =>
	Math.random() < 0.5 ? 'horizontal-first' : 'vertical-first';

const pushSnapshot = (store: BombermanStore) => {
	store.gameHistory.push({
		players: store.players.map((player) => ({ ...player })),
		bombs: store.bombs.map((bomb) => ({ ...bomb })),
		explosions: store.activeExplosions.map((explosion) => ({
			...explosion,
			affectedCells: explosion.affectedCells.map((cell) => ({ ...cell })),
			hitPlayerIds: [...explosion.hitPlayerIds]
		})),
		items: store.items.map((item) => ({ ...item }))
	});
};

const updateGame = (store: BombermanStore) => {
	store.frameCount++;

	updateExplosions(store);
	updateBombs(store);
	killPlayersInActiveExplosions(store);

	for (const player of store.players) {
		if (!player.alive) continue;
		if (canPlaceBomb(store, player) && shouldPlaceBomb(store, player)) {
			placeBomb(store, player);
		}
		const moveCount = getPlayerMoveCount(player);
		for (let moveIndex = 0; moveIndex < moveCount && player.alive; moveIndex++) {
			movePlayer(store, player);
			collectVisibleItemsAt(store, player);
			killPlayersInActiveExplosions(store);
		}
	}

	pushSnapshot(store);
};

const appendDeathAnimationSnapshots = (store: BombermanStore) => {
	if (store.players.every((player) => player.alive)) return;

	for (let frame = 1; frame < BOMBERMAN_DEATH_ANIMATION_FRAMES; frame++) {
		updateExplosions(store);
		pushSnapshot(store);
	}
};

const resetGameState = (store: BombermanStore) => {
	store.frameCount = 0;
	store.nextBombId = 0;
	store.nextItemId = 0;
	store.players = [];
	store.bombs = [];
	store.activeExplosions = [];
	store.items = [];
	store.gameHistory = [];
	store.cellEvents = [];
	store.explosionEvents = [];
};

const stopGame = async (store: BombermanStore) => {
	clearInterval(store.gameInterval as number);
};

const startGame = async (store: BombermanStore) => {
	resetGameState(store);

	store.grid = Utils.createGridFromData(store);
	clearPlayerSpawnAreas(store);
	store.initialColors = store.grid.map((col) => col.map((cell) => cell.color));
	createHiddenItems(store);
	placePlayers(store);
	pushSnapshot(store);

	while (store.players.filter((player) => player.alive).length > 1 && store.frameCount < BOMBERMAN_MAX_FRAMES) {
		updateGame(store);
	}

	appendDeathAnimationSnapshots(store);

	const svg = Renderer.generateAnimatedSVG(store);
	store.config.svgCallback(svg);

	if (store.config.gameStatsCallback) {
		store.config.gameStatsCallback({
			totalScore: store.cellEvents.length,
			steps: store.frameCount,
			ghostsEaten: 0
		});
	}

	store.config.gameOverCallback();
};

export const Game = {
	startGame,
	stopGame
};
