import {
	BombermanAttackSide,
	BombermanBomb,
	BombermanPlayer,
	BombermanPosition,
	BombermanRoutePreference,
	BombermanStore
} from '../types';
import { BOMBERMAN_BOMB_FUSE_FRAMES } from './constants';
import {
	bombAt,
	bombsThreateningAt,
	getAdjacentPositions,
	isActiveExplosionCell,
	isContributionCell,
	isEmptyCell,
	isOwnExplosionDangerCell,
	isPassableCell,
	isSafeStandingCell,
	manhattan,
	positionKey,
	samePosition
} from './rules';
import { BOMBERMAN_AI, BOMBERMAN_PATH_BLAST_COST } from './constants';

export type RouteStep = { firstStep: BombermanPosition | null; distance: number };
export type EstimatedRoute = RouteStep & { cost: number; blastedCells: number };
export type PathOptions = {
	avoidFirstStep?: BombermanPosition | null;
	attackSide?: BombermanAttackSide;
	origin?: BombermanPosition;
	routePreference?: BombermanRoutePreference;
	target?: BombermanPosition;
};

export const getPreviousPlayerPosition = (store: BombermanStore, playerId: BombermanPlayer['id']): BombermanPosition | null => {
	const previousFrame = store.gameHistory[store.gameHistory.length - 2];
	const previousPlayer = previousFrame?.players.find((candidate) => candidate.id === playerId);
	return previousPlayer ? { x: previousPlayer.x, y: previousPlayer.y } : null;
};

export const isBacktrackingStep = (store: BombermanStore, player: BombermanPlayer, next: BombermanPosition) => {
	const previousPosition = getPreviousPlayerPosition(store, player.id);
	return Boolean(previousPosition && samePosition(previousPosition, next));
};

export const sortPathOptions = <T extends BombermanPosition>(positions: T[], options: PathOptions): T[] =>
	positions.sort((a, b) => {
		const aBacktracks = options.avoidFirstStep && samePosition(a, options.avoidFirstStep) ? 1 : 0;
		const bBacktracks = options.avoidFirstStep && samePosition(b, options.avoidFirstStep) ? 1 : 0;
		if (aBacktracks !== bBacktracks) return aBacktracks - bBacktracks;
		if (options.target) {
			const distanceDiff = manhattan(a, options.target) - manhattan(b, options.target);
			if (distanceDiff !== 0) return distanceDiff;

			const axisDiff = routeAxisRank(a, options) - routeAxisRank(b, options);
			if (axisDiff !== 0) return axisDiff;

			const sideDiff = attackSideRank(a, options) - attackSideRank(b, options);
			if (sideDiff !== 0) return sideDiff;
		}
		return 0;
	});

const routeAxisRank = (position: BombermanPosition, options: PathOptions) => {
	if (!options.origin || !options.routePreference) return 0;

	const axis = position.x !== options.origin.x ? 'horizontal-first' : 'vertical-first';
	return axis === options.routePreference ? 0 : 1;
};

const attackSideRank = (position: BombermanPosition, options: PathOptions) => {
	if (!options.attackSide || !options.target) return 0;

	if (options.attackSide === 'left') return position.x <= options.target.x ? 0 : 1;
	return position.x >= options.target.x ? 0 : 1;
};

export const findPathToTarget = (
	store: BombermanStore,
	start: BombermanPosition,
	isTarget: (position: BombermanPosition) => boolean,
	options: PathOptions = {}
): RouteStep | null => {
	const visited = new Set([positionKey(start)]);
	const queue: { position: BombermanPosition; firstStep: BombermanPosition | null; distance: number }[] = [
		{ position: start, firstStep: null, distance: 0 }
	];

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) break;

		if (current.firstStep && isTarget(current.position)) {
			return {
				firstStep: current.firstStep,
				distance: current.distance
			};
		}

		const nextPositions = sortPathOptions(
			getAdjacentPositions(current.position),
			current.firstStep
				? {
						attackSide: options.attackSide,
						origin: current.position,
						routePreference: options.routePreference,
						target: options.target
					}
				: { ...options, origin: current.position }
		);
		for (const next of nextPositions) {
			const key = positionKey(next);
			if (visited.has(key) || !isPassableCell(store, next)) continue;

			visited.add(key);
			queue.push({
				position: next,
				firstStep: current.firstStep ?? { x: next.x, y: next.y },
				distance: current.distance + 1
			});
		}
	}

	return null;
};

export const estimateFastestRoute = (
	store: BombermanStore,
	start: BombermanPosition,
	target: BombermanPosition,
	openedCells: Set<string> = new Set()
): EstimatedRoute | null => {
	const queue: {
		position: BombermanPosition;
		firstStep: BombermanPosition | null;
		distance: number;
		cost: number;
		blastedCells: number;
	}[] = [{ position: start, firstStep: null, distance: 0, cost: 0, blastedCells: 0 }];
	const bestCosts = new Map<string, number>([[positionKey(start), 0]]);

	while (queue.length > 0) {
		queue.sort((a, b) => a.cost - b.cost || manhattan(a.position, target) - manhattan(b.position, target));
		const current = queue.shift();
		if (!current) break;

		if (current.firstStep && samePosition(current.position, target)) {
			return {
				firstStep: current.firstStep,
				distance: current.distance,
				cost: current.cost,
				blastedCells: current.blastedCells
			};
		}

		for (const next of getAdjacentPositions(current.position)) {
			if (bombAt(store, next) || isActiveExplosionCell(store, next)) continue;

			const key = positionKey(next);
			const opened = openedCells.has(key);
			const contribution = isContributionCell(store, next) && !opened;
			const walkable = isEmptyCell(store, next) || opened || contribution || samePosition(next, target);
			if (!walkable) continue;

			const stepCost = contribution ? BOMBERMAN_PATH_BLAST_COST : 1;
			const nextCost = current.cost + stepCost;
			const previousBest = bestCosts.get(key);
			if (previousBest !== undefined && previousBest <= nextCost) continue;

			bestCosts.set(key, nextCost);
			queue.push({
				position: { x: next.x, y: next.y },
				firstStep: current.firstStep ?? { x: next.x, y: next.y },
				distance: current.distance + 1,
				cost: nextCost,
				blastedCells: current.blastedCells + (contribution ? 1 : 0)
			});
		}
	}

	return null;
};

export const findEscapeStep = (store: BombermanStore, player: BombermanPlayer): BombermanPosition | null => {
	const maxDepth = Math.max(BOMBERMAN_BOMB_FUSE_FRAMES, BOMBERMAN_AI.ESCAPE_MIN_SEARCH_DEPTH);
	const queue: { position: BombermanPosition; firstStep: BombermanPosition | null; depth: number }[] = [
		{ position: player, firstStep: null, depth: 0 }
	];
	const visited = new Set([positionKey(player)]);

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) break;

		if (current.firstStep && isSafeStandingCell(store, player, current.position)) return current.firstStep;
		if (current.depth >= maxDepth) continue;

		const nextPositions = getAdjacentPositions(current.position).sort((a, b) => {
			const aThreats = bombsThreateningAt(store, a, player.id).length;
			const bThreats = bombsThreateningAt(store, b, player.id).length;
			return aThreats - bThreats;
		});

		for (const next of nextPositions) {
			const key = positionKey(next);
			if (visited.has(key) || !isEmptyCell(store, next) || bombAt(store, next) || isActiveExplosionCell(store, next, player.id))
				continue;

			const nextDepth = current.depth + 1;
			const explodesBeforeNextMove = bombsThreateningAt(store, next, player.id).some((bomb) => bomb.timer <= nextDepth);
			if (explodesBeforeNextMove) continue;

			visited.add(key);
			queue.push({
				position: next,
				firstStep: current.firstStep ?? { x: next.x, y: next.y },
				depth: nextDepth
			});
		}
	}

	return null;
};

export const findReachableBombOrigins = (
	store: BombermanStore,
	player: BombermanPlayer
): (RouteStep & { position: BombermanPosition })[] => {
	const visited = new Set([positionKey(player)]);
	const queue: (RouteStep & { position: BombermanPosition })[] = [{ position: player, firstStep: null, distance: 0 }];
	const origins: (RouteStep & { position: BombermanPosition })[] = [];
	const previousPosition = getPreviousPlayerPosition(store, player.id);

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) break;
		origins.push(current);

		const nextPositions = sortPathOptions(
			getAdjacentPositions(current.position),
			current.firstStep
				? {
						attackSide: player.attackSide,
						origin: current.position,
						routePreference: player.routePreference,
						target: player
					}
				: {
						attackSide: player.attackSide,
						avoidFirstStep: previousPosition,
						origin: current.position,
						routePreference: player.routePreference,
						target: player
					}
		);
		for (const next of nextPositions) {
			const key = positionKey(next);
			if (
				visited.has(key) ||
				!isPassableCell(store, next) ||
				isOwnExplosionDangerCell(store, player, next)
			) {
				continue;
			}

			visited.add(key);
			queue.push({
				position: { x: next.x, y: next.y },
				firstStep: current.firstStep ?? { x: next.x, y: next.y },
				distance: current.distance + 1
			});
		}
	}

	return origins;
};

export const canEscapeAfterPlantingBombAt = (store: BombermanStore, player: BombermanPlayer, position: BombermanPosition) => {
	if (!isEmptyCell(store, position) || bombAt(store, position)) return false;

	const virtualBomb: BombermanBomb = {
		id: -1,
		ownerId: player.id,
		x: position.x,
		y: position.y,
		timer: BOMBERMAN_BOMB_FUSE_FRAMES,
		exploded: false,
		sprite: ''
	};
	const virtualPlayer = { ...player, x: position.x, y: position.y };

	store.bombs.push(virtualBomb);
	try {
		return Boolean(findEscapeStep(store, virtualPlayer));
	} finally {
		store.bombs.pop();
	}
};

export const canEscapeAfterPlantingBomb = (store: BombermanStore, player: BombermanPlayer) => {
	return canEscapeAfterPlantingBombAt(store, player, player);
};
