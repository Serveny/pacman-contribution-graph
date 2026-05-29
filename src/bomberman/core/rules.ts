import { Utils } from '../../shared/utils/utils';
import { BombermanBomb, BombermanDirection, BombermanPlayer, BombermanPosition, BombermanStore } from '../types';
import {
	BOMBERMAN_BLAST_RANGE,
	BOMBERMAN_BOMB_FUSE_FRAMES,
	BOMBERMAN_EXPLOSION_DURATION_FRAMES,
	BOMBERMAN_SPRITE_SETS,
	GRID_HEIGHT,
	GRID_WIDTH
} from './constants';
import { destroyVisibleItemAt, getPlayerBlastRange, hasVisibleItemAt, revealItemAt } from './items';

export type DirectionVector = BombermanPosition & { direction: BombermanDirection };

export const DIRECTIONS: DirectionVector[] = [
	{ x: 0, y: -1, direction: 'up' },
	{ x: 0, y: 1, direction: 'down' },
	{ x: -1, y: 0, direction: 'left' },
	{ x: 1, y: 0, direction: 'right' }
];

export const positionKey = ({ x, y }: BombermanPosition) => `${x}:${y}`;

export const samePosition = (a: BombermanPosition, b: BombermanPosition) => a.x === b.x && a.y === b.y;

export const manhattan = (a: BombermanPosition, b: BombermanPosition) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const inBounds = ({ x, y }: BombermanPosition) => x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT;

export const isContributionCell = (store: BombermanStore, { x, y }: BombermanPosition) =>
	inBounds({ x, y }) && store.grid[x][y].commitsCount > 0;

export const isEmptyCell = (store: BombermanStore, { x, y }: BombermanPosition) =>
	inBounds({ x, y }) && store.grid[x][y].commitsCount === 0;

export const bombAt = (store: BombermanStore, { x, y }: BombermanPosition) =>
	store.bombs.find((bomb) => !bomb.exploded && bomb.x === x && bomb.y === y);

export const isPassableCell = (store: BombermanStore, position: BombermanPosition) =>
	isEmptyCell(store, position) && !bombAt(store, position);

export const getBlastCells = (
	store: BombermanStore,
	position: BombermanPosition,
	blastRange = BOMBERMAN_BLAST_RANGE
): BombermanPosition[] => {
	const cells: BombermanPosition[] = [position];

	for (const direction of DIRECTIONS) {
		for (let distance = 1; distance <= blastRange; distance++) {
			const cell = {
				x: position.x + direction.x * distance,
				y: position.y + direction.y * distance
			};
			if (!inBounds(cell)) break;

			cells.push(cell);
			if (isContributionCell(store, cell)) break;
		}
	}

	return cells;
};

export const isActiveExplosionCell = (store: BombermanStore, position: BombermanPosition, ownerId?: BombermanPlayer['id']) =>
	store.activeExplosions.some(
		(explosion) =>
			(ownerId === undefined || explosion.ownerId === ownerId) && explosion.affectedCells.some((cell) => samePosition(cell, position))
	);

export const bombsThreateningAt = (store: BombermanStore, position: BombermanPosition, ownerId?: BombermanPlayer['id']) =>
	store.bombs.filter(
		(bomb) =>
			!bomb.exploded &&
			(ownerId === undefined || bomb.ownerId === ownerId) &&
			getBlastCells(store, bomb, bomb.blastRange).some((cell) => samePosition(cell, position))
	);

export const isInOwnFutureBlast = (store: BombermanStore, player: BombermanPlayer, position: BombermanPosition) =>
	bombsThreateningAt(store, position, player.id).length > 0;

export const isOwnExplosionDangerCell = (store: BombermanStore, player: BombermanPlayer, position: BombermanPosition) =>
	isActiveExplosionCell(store, position, player.id) || isInOwnFutureBlast(store, player, position);

export const isSafeStandingCell = (store: BombermanStore, player: BombermanPlayer, position: BombermanPosition) =>
	isEmptyCell(store, position) &&
	!bombAt(store, position) &&
	!isOwnExplosionDangerCell(store, player, position);

export const getAdjacentPositions = ({ x, y }: BombermanPosition): (BombermanPosition & { direction: BombermanDirection })[] =>
	DIRECTIONS.map((delta) => ({
		x: x + delta.x,
		y: y + delta.y,
		direction: delta.direction
	})).filter(inBounds);

export const countRemainingContributions = (store: BombermanStore) =>
	store.grid.reduce((sum, col) => sum + col.filter((cell) => cell.commitsCount > 0).length, 0);

export const clearContributionCellSilently = (store: BombermanStore, position: BombermanPosition) => {
	if (!isContributionCell(store, position)) return false;

	const theme = Utils.getCurrentTheme(store);
	store.grid[position.x][position.y] = {
		commitsCount: 0,
		level: 'NONE',
		color: theme.intensityColors[0]
	};

	return true;
};

export const clearSpawnArea = (store: BombermanStore, topLeft: BombermanPosition) => {
	for (let x = topLeft.x; x < topLeft.x + 2; x++) {
		for (let y = topLeft.y; y < topLeft.y + 2; y++) {
			const position = { x, y };
			if (inBounds(position)) clearContributionCellSilently(store, position);
		}
	}
};

export const findNearestEmptyCell = (
	store: BombermanStore,
	origin: BombermanPosition,
	blocked: Set<string> = new Set()
): BombermanPosition => {
	let best: BombermanPosition | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;

	for (let x = 0; x < GRID_WIDTH; x++) {
		for (let y = 0; y < GRID_HEIGHT; y++) {
			const position = { x, y };
			if (!isEmptyCell(store, position) || blocked.has(positionKey(position))) continue;

			const distance = Math.abs(origin.x - x) + Math.abs(origin.y - y);
			if (distance < bestDistance) {
				best = position;
				bestDistance = distance;
			}
		}
	}

	return best ?? origin;
};

export const canPlaceBomb = (store: BombermanStore, player: BombermanPlayer) =>
	player.alive &&
	isEmptyCell(store, player) &&
	!bombAt(store, player) &&
	!store.bombs.some((bomb) => !bomb.exploded && bomb.ownerId === player.id);

export const bombWouldHitContribution = (store: BombermanStore, position: BombermanPosition, blastRange = BOMBERMAN_BLAST_RANGE) =>
	getBlastCells(store, position, blastRange).some((cell) => isContributionCell(store, cell));

export const bombWouldHitVisibleItem = (store: BombermanStore, position: BombermanPosition, blastRange = BOMBERMAN_BLAST_RANGE) =>
	getBlastCells(store, position, blastRange).some((cell) => hasVisibleItemAt(store, cell));

export const bombWouldHitOpponent = (store: BombermanStore, player: BombermanPlayer) => {
	const opponent = store.players.find((candidate) => candidate.id !== player.id && candidate.alive);
	return Boolean(opponent && getBlastCells(store, player, getPlayerBlastRange(player)).some((cell) => samePosition(cell, opponent)));
};

export const bombWouldHitTarget = (store: BombermanStore, player: BombermanPlayer) =>
	bombWouldHitContribution(store, player, getPlayerBlastRange(player)) || bombWouldHitOpponent(store, player);

export const placeBomb = (store: BombermanStore, player: BombermanPlayer) => {
	if (!canPlaceBomb(store, player)) return;

	store.bombs.push({
		id: store.nextBombId++,
		ownerId: player.id,
		x: player.x,
		y: player.y,
		timer: BOMBERMAN_BOMB_FUSE_FRAMES,
		exploded: false,
		blastRange: getPlayerBlastRange(player),
		sprite: BOMBERMAN_SPRITE_SETS.explosions.bombs.fuse0.data
	});
	player.bombsPlaced++;
};

export const clearContributionCell = (store: BombermanStore, position: BombermanPosition, ownerId: number) => {
	if (!isContributionCell(store, position)) return false;

	const theme = Utils.getCurrentTheme(store);
	store.grid[position.x][position.y] = {
		commitsCount: 0,
		level: 'NONE',
		color: theme.intensityColors[0]
	};

	const owner = store.players.find((player) => player.id === ownerId);
	if (owner) owner.cellsDestroyed++;
	revealItemAt(store, position);

	store.cellEvents.push({
		frameIndex: store.gameHistory.length,
		x: position.x,
		y: position.y,
		color: theme.intensityColors[0]
	});
	store.config.pointsIncreasedCallback(store.cellEvents.length);

	return true;
};

export const explodeBomb = (store: BombermanStore, bomb: BombermanBomb) => {
	if (bomb.exploded) return;

	bomb.exploded = true;
	const affectedCells = getBlastCells(store, bomb, bomb.blastRange);
	const hitPlayerIds: BombermanPlayer['id'][] = [];

	for (const position of affectedCells) {
		if (isContributionCell(store, position)) {
			clearContributionCell(store, position, bomb.ownerId);
		} else {
			destroyVisibleItemAt(store, position);
		}

		const chainedBomb = bombAt(store, position);
		if (chainedBomb) explodeBomb(store, chainedBomb);
	}

	for (const player of store.players) {
		if (!player.alive) continue;
		if (!affectedCells.some((position) => position.x === player.x && position.y === player.y)) continue;

		player.alive = false;
		hitPlayerIds.push(player.id);
	}

	const explosion = {
		bombId: bomb.id,
		ownerId: bomb.ownerId,
		x: bomb.x,
		y: bomb.y,
		blastRange: bomb.blastRange,
		remainingFrames: BOMBERMAN_EXPLOSION_DURATION_FRAMES,
		affectedCells,
		hitPlayerIds,
		sprite: BOMBERMAN_SPRITE_SETS.explosions.bombs.blastCenter.data
	};

	store.activeExplosions.push(explosion);
	store.explosionEvents.push({
		frameIndex: store.gameHistory.length,
		...explosion
	});
};

export const killPlayersInActiveExplosions = (store: BombermanStore) => {
	for (const player of store.players) {
		if (!player.alive) continue;

		for (const explosion of store.activeExplosions) {
			if (!explosion.affectedCells.some((position) => samePosition(position, player))) continue;

			player.alive = false;
			if (!explosion.hitPlayerIds.includes(player.id)) explosion.hitPlayerIds.push(player.id);
			break;
		}
	}
};

export const updateBombs = (store: BombermanStore) => {
	for (const bomb of store.bombs) {
		if (!bomb.exploded) bomb.timer--;
	}

	for (const bomb of [...store.bombs]) {
		if (!bomb.exploded && bomb.timer <= 0) explodeBomb(store, bomb);
	}

	store.bombs = store.bombs.filter((bomb) => !bomb.exploded);
};

export const updateExplosions = (store: BombermanStore) => {
	for (const explosion of store.activeExplosions) {
		explosion.remainingFrames--;
	}
	store.activeExplosions = store.activeExplosions.filter((explosion) => explosion.remainingFrames > 0);
};
