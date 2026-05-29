import { BaseConfig, BaseStore, Contribution, GridCell } from '../shared/types';

export interface BombermanStore extends BaseStore {
	frameCount: number;
	gameInterval: number;
	nextBombId: number;
	nextItemId: number;
	players: BombermanPlayer[];
	bombs: BombermanBomb[];
	activeExplosions: BombermanExplosion[];
	items: BombermanItem[];
	gameHistory: BombermanSnapshot[];
	initialColors: string[][];
	cellEvents: BombermanCellEvent[];
	explosionEvents: BombermanExplosionEvent[];
	contributions: Contribution[];
	grid: GridCell[][];
	monthLabels: string[];
	config: BombermanConfig;
}

export interface BombermanConfig extends BaseConfig {}

export type BombermanPlayerId = 1 | 2;
export type BombermanDirection = 'up' | 'down' | 'left' | 'right';
export type BombermanAttackSide = 'left' | 'right';
export type BombermanRoutePreference = 'horizontal-first' | 'vertical-first';
export type BombermanItemType = 'blast-range' | 'speed' | 'bomb-capacity';

export interface BombermanPosition {
	x: number;
	y: number;
}

export interface BombermanPlayer extends BombermanPosition {
	id: BombermanPlayerId;
	name: string;
	alive: boolean;
	direction: BombermanDirection;
	bombsPlaced: number;
	cellsDestroyed: number;
	blastRangeBonus: number;
	bombCapacityBonus?: number;
	speedBonus?: number;
	movementStepProgress?: number;
	sprite: string;
	attackSide?: BombermanAttackSide;
	routePreference?: BombermanRoutePreference;
}

export interface BombermanBomb extends BombermanPosition {
	id: number;
	ownerId: BombermanPlayerId;
	timer: number;
	exploded: boolean;
	blastRange: number;
	sprite: string;
}

export interface BombermanExplosion {
	bombId: number;
	ownerId: BombermanPlayerId;
	x: number;
	y: number;
	blastRange: number;
	remainingFrames: number;
	affectedCells: BombermanPosition[];
	hitPlayerIds: BombermanPlayerId[];
	sprite: string;
}

export interface BombermanItem extends BombermanPosition {
	id: number;
	type: BombermanItemType;
	hidden: boolean;
	collected: boolean;
	destroyed: boolean;
	sprite: string;
}

export interface BombermanCellEvent extends BombermanPosition {
	frameIndex: number;
	color: string;
}

export interface BombermanExplosionEvent extends BombermanExplosion {
	frameIndex: number;
}

export interface BombermanSnapshot {
	players: BombermanPlayer[];
	bombs: BombermanBomb[];
	explosions: BombermanExplosion[];
	items: BombermanItem[];
}
