import { GridCell } from '../../shared/types';
import { BombermanItem, BombermanItemType, BombermanPlayer, BombermanPosition, BombermanStore } from '../types';
import {
	BOMBERMAN_BLAST_RANGE,
	BOMBERMAN_BOMB_LIMIT,
	BOMBERMAN_ITEM_DROP_CHANCE_BY_LEVEL,
	BOMBERMAN_ITEM_SPRITES,
	BOMBERMAN_PLAYER_SPEED_UNITS,
	BOMBERMAN_SPEED_ITEM_BONUS,
	GRID_HEIGHT,
	GRID_WIDTH
} from './constants';

export type BombermanItemDefinition = {
	type: BombermanItemType;
	sprite: {
		readonly width: number;
		readonly height: number;
		readonly data: string;
	};
	apply: (player: BombermanPlayer) => void;
};

export const BOMBERMAN_ITEM_DEFINITIONS: Record<BombermanItemType, BombermanItemDefinition> = {
	'blast-range': {
		type: 'blast-range',
		sprite: BOMBERMAN_ITEM_SPRITES.blastRange,
		apply: (player) => {
			player.blastRangeBonus = (player.blastRangeBonus ?? 0) + 1;
		}
	},
	speed: {
		type: 'speed',
		sprite: BOMBERMAN_ITEM_SPRITES.speed,
		apply: (player) => {
			player.speedBonus = (player.speedBonus ?? 0) + BOMBERMAN_SPEED_ITEM_BONUS;
		}
	},
	'bomb-capacity': {
		type: 'bomb-capacity',
		sprite: BOMBERMAN_ITEM_SPRITES.bombCapacity,
		apply: (player) => {
			player.bombCapacityBonus = (player.bombCapacityBonus ?? 0) + 1;
		}
	}
};

export const getPlayerBlastRange = (player: BombermanPlayer) => BOMBERMAN_BLAST_RANGE + (player.blastRangeBonus ?? 0);

export const getPlayerBombLimit = (player: BombermanPlayer) => BOMBERMAN_BOMB_LIMIT + (player.bombCapacityBonus ?? 0);

export const getPlayerMoveCount = (player: BombermanPlayer) => {
	const speedUnits = BOMBERMAN_PLAYER_SPEED_UNITS + (player.speedBonus ?? 0);
	const progress = (player.movementStepProgress ?? 0) + speedUnits;
	const moveCount = Math.floor(progress / BOMBERMAN_PLAYER_SPEED_UNITS);

	player.movementStepProgress = progress % BOMBERMAN_PLAYER_SPEED_UNITS;
	return Math.max(1, moveCount);
};

export const getItemDropChance = (cell: GridCell) =>
	cell.commitsCount > 0 ? BOMBERMAN_ITEM_DROP_CHANCE_BY_LEVEL[cell.level] : 0;

export const createHiddenItems = (store: BombermanStore) => {
	store.items = [];

	for (let x = 0; x < store.grid.length; x++) {
		for (let y = 0; y < store.grid[x].length; y++) {
			const cell = store.grid[x][y];
			const dropChance = getItemDropChance(cell);
			if (dropChance <= 0 || Math.random() >= dropChance) continue;

			store.items.push(createItem(store, { x, y }, selectRandomItemType()));
		}
	}
};

export const revealItemAt = (store: BombermanStore, position: BombermanPosition) => {
	const item = findItemAt(store, position);
	if (!item || item.collected || item.destroyed) return null;

	item.hidden = false;
	return item;
};

export const collectVisibleItemsAt = (store: BombermanStore, player: BombermanPlayer) => {
	const item = findItemAt(store, player);
	if (!item || item.hidden || item.collected || item.destroyed) return null;

	BOMBERMAN_ITEM_DEFINITIONS[item.type].apply(player);
	item.collected = true;
	return item;
};

export const destroyVisibleItemAt = (store: BombermanStore, position: BombermanPosition) => {
	const item = findItemAt(store, position);
	if (!item || item.hidden || item.collected || item.destroyed) return null;

	item.destroyed = true;
	return item;
};

export const hasVisibleItemAt = (store: BombermanStore, position: BombermanPosition) => {
	const item = findItemAt(store, position);
	return Boolean(item && !item.hidden && !item.collected && !item.destroyed);
};

const createItem = (store: BombermanStore, position: BombermanPosition, type: BombermanItemType): BombermanItem => {
	const definition = BOMBERMAN_ITEM_DEFINITIONS[type];

	return {
		id: store.nextItemId++,
		type,
		x: position.x,
		y: position.y,
		hidden: true,
		collected: false,
		destroyed: false,
		sprite: definition.sprite.data
	};
};

const selectRandomItemType = (): BombermanItemType => {
	const itemTypes = Object.keys(BOMBERMAN_ITEM_DEFINITIONS) as BombermanItemType[];
	return itemTypes[Math.floor(Math.random() * itemTypes.length)] ?? 'blast-range';
};

const findItemAt = (store: BombermanStore, position: BombermanPosition) => {
	if (position.x < 0 || position.x >= GRID_WIDTH || position.y < 0 || position.y >= GRID_HEIGHT) return undefined;
	return store.items.find((item) => !item.collected && !item.destroyed && item.x === position.x && item.y === position.y);
};
