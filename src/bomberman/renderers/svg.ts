import { AnimationData } from '../../shared/types';
import { Utils } from '../../shared/utils/utils';
import { BOMBERMAN_ITEM_DEFINITIONS } from '../core/items';
import { BOMBERMAN_SPRITE_SETS, BOMBERMAN_SVG, CELL_SIZE, DELTA_TIME, GAP_SIZE, GRID_HEIGHT, GRID_WIDTH } from '../core/constants';
import { BombermanBomb, BombermanCellEvent, BombermanExplosionEvent, BombermanItem, BombermanPlayer, BombermanStore } from '../types';
import { buildChangingValuesAnimation, buildStepwiseLinearAnimation, frameToKeyTime } from './animation';

type SpriteFrame = {
	readonly width: number;
	readonly height: number;
	readonly data: string;
};

type SpriteSymbol = {
	id: string;
	frame: SpriteFrame;
	flipX?: boolean;
	preserveAspectRatio?: 'none';
};

type SpriteCycle = readonly SpriteSymbol[];
type BlastSpriteKind = 'center' | 'segment' | 'end';
type BlastDirection = BombermanPlayer['direction'];
type BlastAnimationContext = {
	explosion: BombermanExplosionEvent;
};

const PLAYER_SPRITE_CHAINS: Record<BombermanPlayer['id'], Record<BombermanPlayer['direction'], SpriteCycle>> = {
	1: {
		down: [
			{ id: 'bm-player-1-down-0', frame: BOMBERMAN_SPRITE_SETS.player.walkDown0 },
			{ id: 'bm-player-1-down-1', frame: BOMBERMAN_SPRITE_SETS.player.walkDown1 },
			{ id: 'bm-player-1-down-2', frame: BOMBERMAN_SPRITE_SETS.player.walkDown2 },
			{ id: 'bm-player-1-down-3', frame: BOMBERMAN_SPRITE_SETS.player.walkDown3 }
		],
		up: [
			{ id: 'bm-player-1-up-0', frame: BOMBERMAN_SPRITE_SETS.player.walkUp0 },
			{ id: 'bm-player-1-up-1', frame: BOMBERMAN_SPRITE_SETS.player.walkUp1 },
			{ id: 'bm-player-1-up-2', frame: BOMBERMAN_SPRITE_SETS.player.walkUp2 },
			{ id: 'bm-player-1-up-3', frame: BOMBERMAN_SPRITE_SETS.player.walkUp3 }
		],
		left: [
			{ id: 'bm-player-1-left-0', frame: BOMBERMAN_SPRITE_SETS.player.walkRight0, flipX: true },
			{ id: 'bm-player-1-left-1', frame: BOMBERMAN_SPRITE_SETS.player.walkRight1, flipX: true },
			{ id: 'bm-player-1-left-2', frame: BOMBERMAN_SPRITE_SETS.player.walkRight2, flipX: true },
			{ id: 'bm-player-1-left-3', frame: BOMBERMAN_SPRITE_SETS.player.walkRight3, flipX: true },
			{ id: 'bm-player-1-left-4', frame: BOMBERMAN_SPRITE_SETS.player.walkRight4, flipX: true },
			{ id: 'bm-player-1-left-5', frame: BOMBERMAN_SPRITE_SETS.player.walkRight5, flipX: true }
		],
		right: [
			{ id: 'bm-player-1-right-0', frame: BOMBERMAN_SPRITE_SETS.player.walkRight0 },
			{ id: 'bm-player-1-right-1', frame: BOMBERMAN_SPRITE_SETS.player.walkRight1 },
			{ id: 'bm-player-1-right-2', frame: BOMBERMAN_SPRITE_SETS.player.walkRight2 },
			{ id: 'bm-player-1-right-3', frame: BOMBERMAN_SPRITE_SETS.player.walkRight3 },
			{ id: 'bm-player-1-right-4', frame: BOMBERMAN_SPRITE_SETS.player.walkRight4 },
			{ id: 'bm-player-1-right-5', frame: BOMBERMAN_SPRITE_SETS.player.walkRight5 }
		]
	},
	2: {
		down: [
			{ id: 'bm-player-2-down-0', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkDown0 },
			{ id: 'bm-player-2-down-1', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkDown1 },
			{ id: 'bm-player-2-down-2', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkDown2 },
			{ id: 'bm-player-2-down-3', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkDown3 }
		],
		up: [
			{ id: 'bm-player-2-up-0', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkUp0 },
			{ id: 'bm-player-2-up-1', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkUp1 },
			{ id: 'bm-player-2-up-2', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkUp2 },
			{ id: 'bm-player-2-up-3', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkUp3 }
		],
		left: [
			{ id: 'bm-player-2-left-0', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkRight0, flipX: true },
			{ id: 'bm-player-2-left-1', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkRight1, flipX: true },
			{ id: 'bm-player-2-left-2', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkRight2, flipX: true },
			{ id: 'bm-player-2-left-3', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkRight3, flipX: true },
			{ id: 'bm-player-2-left-4', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkRight4, flipX: true },
			{ id: 'bm-player-2-left-5', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkRight5, flipX: true }
		],
		right: [
			{ id: 'bm-player-2-right-0', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkRight0 },
			{ id: 'bm-player-2-right-1', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkRight1 },
			{ id: 'bm-player-2-right-2', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkRight2 },
			{ id: 'bm-player-2-right-3', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkRight3 },
			{ id: 'bm-player-2-right-4', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkRight4 },
			{ id: 'bm-player-2-right-5', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.walkRight5 }
		]
	}
};

const PLAYER_DEATH_SPRITE_CHAINS: Record<BombermanPlayer['id'], SpriteCycle> = {
	1: [
		{ id: 'bm-player-1-death-0', frame: BOMBERMAN_SPRITE_SETS.player.death0 },
		{ id: 'bm-player-1-death-1', frame: BOMBERMAN_SPRITE_SETS.player.death1 },
		{ id: 'bm-player-1-death-2', frame: BOMBERMAN_SPRITE_SETS.player.death2 },
		{ id: 'bm-player-1-death-3', frame: BOMBERMAN_SPRITE_SETS.player.death3 },
		{ id: 'bm-player-1-death-4', frame: BOMBERMAN_SPRITE_SETS.player.death4 }
	],
	2: [
		{ id: 'bm-player-2-death-0', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.death0 },
		{ id: 'bm-player-2-death-1', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.death1 },
		{ id: 'bm-player-2-death-2', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.death2 },
		{ id: 'bm-player-2-death-3', frame: BOMBERMAN_SPRITE_SETS.plunderBomber.death3 }
	]
};

const BOMB_SPRITE: SpriteSymbol = { id: 'bm-bomb', frame: BOMBERMAN_SPRITE_SETS.explosions.bombs.fuse0 };

const BLAST_SPRITES: Record<BlastSpriteKind, SpriteCycle> = {
	center: BOMBERMAN_SPRITE_SETS.explosions.blast.center.map((frame, index) => ({
		id: `bm-blast-center-${index}`,
		frame,
		preserveAspectRatio: 'none'
	})),
	segment: BOMBERMAN_SPRITE_SETS.explosions.blast.segment.map((frame, index) => ({
		id: `bm-blast-segment-${index}`,
		frame,
		preserveAspectRatio: 'none'
	})),
	end: BOMBERMAN_SPRITE_SETS.explosions.blast.end.map((frame, index) => ({
		id: `bm-blast-end-${index}`,
		frame,
		preserveAspectRatio: 'none'
	}))
};

const ITEM_SPRITES = Object.fromEntries(
	Object.entries(BOMBERMAN_ITEM_DEFINITIONS).map(([type, definition]) => [type, { id: `bm-item-${type}`, frame: definition.sprite }])
) as Record<BombermanItem['type'], SpriteSymbol>;

const toSvgX = (gx: number) => gx * (CELL_SIZE + GAP_SIZE);
const toSvgY = (gy: number) => gy * (CELL_SIZE + GAP_SIZE) + BOMBERMAN_SVG.HEADER_HEIGHT;

const generateAnimatedSVG = (store: BombermanStore): string => {
	const svgWidth = GRID_WIDTH * (CELL_SIZE + GAP_SIZE);
	const svgHeight = GRID_HEIGHT * (CELL_SIZE + GAP_SIZE) + BOMBERMAN_SVG.HEADER_HEIGHT;
	const totalFrames = store.gameHistory.length;
	const totalDurationMs = Math.max((totalFrames * DELTA_TIME) / BOMBERMAN_SVG.DURATION_SPEED_DIVISOR, BOMBERMAN_SVG.MIN_DURATION_MS);
	const theme = Utils.getCurrentTheme(store);
	const cellEventsByPosition = indexCellEvents(store.cellEvents);

	let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" color-interpolation="sRGB">`;
	svg += `<style>image { image-rendering: pixelated; image-rendering: -moz-crisp-edges; }</style>`;
	svg += buildSpriteDefs();
	svg += `<rect width="100%" height="100%" fill="${theme.gridBackground}"/>`;

	let lastMonth = '';
	for (let x = 0; x < GRID_WIDTH; x++) {
		if (store.monthLabels[x] !== lastMonth) {
			const xPos = x * (CELL_SIZE + GAP_SIZE) + CELL_SIZE / 2;
			svg += `<text x="${xPos}" y="${BOMBERMAN_SVG.MONTH_LABEL_Y}" text-anchor="middle" font-size="${BOMBERMAN_SVG.MONTH_LABEL_FONT_SIZE}" fill="${theme.textColor}">${store.monthLabels[x]}</text>`;
			lastMonth = store.monthLabels[x];
		}
	}

	for (let x = 0; x < GRID_WIDTH; x++) {
		for (let y = 0; y < GRID_HEIGHT; y++) {
			const colorAnim = getCellAnimationData(store, x, y, cellEventsByPosition);
			svg += `<rect id="c-${x}-${y}" x="${toSvgX(x)}" y="${toSvgY(y)}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="${BOMBERMAN_SVG.CELL_RADIUS}" fill="${store.initialColors[x]?.[y] ?? theme.intensityColors[0]}">`;
			if (colorAnim) {
				svg += `<animate attributeName="fill" calcMode="discrete" dur="${totalDurationMs}ms" repeatCount="indefinite"
					values="${colorAnim.values}" keyTimes="${colorAnim.keyTimes}"/>`;
			}
			svg += `</rect>`;
		}
	}

	for (const bombEvent of collectBombs(store)) {
		const opacityAnim = buildVisibilityAnimation(totalFrames, bombEvent.startFrame, bombEvent.endFrameExclusive);
		const initialOpacity = bombEvent.startFrame === 0 ? '1' : '0';
		svg += `<g id="bomb-${bombEvent.bomb.id}" opacity="${initialOpacity}" transform="translate(${centerPosition(bombEvent.bomb.x, bombEvent.bomb.y)})">`;
		if (opacityAnim) {
			svg += `<animate attributeName="opacity" calcMode="discrete" dur="${totalDurationMs}ms" repeatCount="indefinite"
				keyTimes="${opacityAnim.keyTimes}" values="${opacityAnim.values}"/>`;
		}
		svg += `<use x="${BOMBERMAN_SVG.BOMB_X}" y="${BOMBERMAN_SVG.BOMB_Y}" width="${BOMBERMAN_SVG.BOMB_WIDTH}" height="${BOMBERMAN_SVG.BOMB_HEIGHT}" href="${getDefaultBombRef()}">
			<animateTransform attributeName="transform" type="scale" calcMode="linear" dur="${BOMBERMAN_SVG.BOMB_PULSE_DURATION_MS}ms" repeatCount="indefinite"
				keyTimes="0;0.5;1" values="1;${BOMBERMAN_SVG.BOMB_PULSE_SCALE};1"/>
		</use></g>`;
	}

	for (const itemEvent of collectItems(store)) {
		const opacityAnim = buildVisibilityAnimation(totalFrames, itemEvent.startFrame, itemEvent.endFrameExclusive);
		const initialOpacity = itemEvent.startFrame === 0 ? '1' : '0';
		const x = toSvgX(itemEvent.item.x) + (CELL_SIZE - BOMBERMAN_SVG.ITEM_WIDTH) / 2;
		const y = toSvgY(itemEvent.item.y) + (CELL_SIZE - BOMBERMAN_SVG.ITEM_HEIGHT) / 2;
		svg += `<use id="item-${itemEvent.item.id}" x="${x}" y="${y}" width="${BOMBERMAN_SVG.ITEM_WIDTH}" height="${BOMBERMAN_SVG.ITEM_HEIGHT}" href="${getItemRef(itemEvent.item.type)}" opacity="${initialOpacity}">`;
		if (opacityAnim) {
			svg += `<animate attributeName="opacity" calcMode="discrete" dur="${totalDurationMs}ms" repeatCount="indefinite"
				keyTimes="${opacityAnim.keyTimes}" values="${opacityAnim.values}"/>`;
		}
		svg += `</use>`;
	}

	for (const explosion of store.explosionEvents) {
		const opacityAnim = getExplosionOpacityAnimation(store, explosion);
		svg += `<g opacity="0">`;
		svg += renderExplosionShape({ explosion });
		if (opacityAnim) {
			svg += `<animate attributeName="opacity" calcMode="discrete" dur="${totalDurationMs}ms" repeatCount="indefinite"
				keyTimes="${opacityAnim.keyTimes}" values="${opacityAnim.values}"/>`;
		}
		svg += `</g>`;
	}

	for (const player of store.players) {
		const positions = getPlayerPositions(store, player.id);
		const opacities = getPlayerOpacities(store, player.id);
		const spriteRefs = getPlayerSpriteRefs(store, player.id);
		const positionAnim = buildStepwiseLinearAnimation(positions);
		const opacityAnim = buildChangingValuesAnimation(opacities);
		const spriteAnim = buildChangingValuesAnimation(spriteRefs);
		svg += `<use id="player-${player.id}" x="${-BOMBERMAN_SVG.PLAYER_SPRITE_WIDTH / 2}" y="${-BOMBERMAN_SVG.PLAYER_SPRITE_HEIGHT + CELL_SIZE / 2}" width="${BOMBERMAN_SVG.PLAYER_SPRITE_WIDTH}" height="${BOMBERMAN_SVG.PLAYER_SPRITE_HEIGHT}" href="${spriteRefs[0] ?? getDefaultPlayerRef(player.id)}" opacity="${opacities[0] ?? '0'}" transform="translate(${positions[0] ?? '0 0'})">`;
		if (spriteAnim) {
			svg += `<animate attributeName="href" calcMode="discrete" dur="${totalDurationMs}ms" repeatCount="indefinite"
				keyTimes="${spriteAnim.keyTimes}" values="${spriteAnim.values}"/>`;
		}
		if (opacityAnim) {
			svg += `<animate attributeName="opacity" calcMode="discrete" dur="${totalDurationMs}ms" repeatCount="indefinite"
				keyTimes="${opacityAnim.keyTimes}" values="${opacityAnim.values}"/>`;
		}
		if (positionAnim) {
			svg += `<animateTransform attributeName="transform" type="translate" calcMode="linear" dur="${totalDurationMs}ms" repeatCount="indefinite"
				keyTimes="${positionAnim.keyTimes}" values="${positionAnim.values}"/>`;
		}
		svg += `</use>`;
	}

	svg += '</svg>';
	return minifySvg(svg);
};

const minifySvg = (svg: string): string =>
	svg
		.replace(/>\s+</g, '><')
		.replace(/\s{2,}/g, ' ')
		.replace(/\s\/>/g, '/>')
		.trim();

const getCellAnimationData = (
	store: BombermanStore,
	x: number,
	y: number,
	eventsByPosition: Map<string, BombermanCellEvent[]>
): AnimationData | null => {
	const totalFrames = store.gameHistory.length;
	const initialColor = store.initialColors[x]?.[y] ?? Utils.getCurrentTheme(store).intensityColors[0];
	const events = eventsByPosition.get(cellEventKey(x, y));

	if (!events || events.length === 0) return null;

	const keyTimes: number[] = [0];
	const values: string[] = [initialColor];

	for (const event of events) {
		const time = frameToKeyTime(event.frameIndex, totalFrames);
		if (time !== keyTimes[keyTimes.length - 1]) {
			keyTimes.push(time);
			values.push(event.color);
		} else {
			values[values.length - 1] = event.color;
		}
	}

	if (keyTimes[keyTimes.length - 1] !== 1) {
		keyTimes.push(1);
		values.push(values[values.length - 1]);
	}

	if (values.length <= 1 || values.every((v) => v === values[0])) return null;

	return { keyTimes: keyTimes.join(';'), values: values.join(';') };
};

type BombRenderEvent = {
	bomb: BombermanBomb;
	startFrame: number;
	endFrameExclusive: number;
};

type ItemRenderEvent = {
	item: BombermanItem;
	startFrame: number;
	endFrameExclusive: number;
};

const collectBombs = (store: BombermanStore): BombRenderEvent[] => {
	const bombs = new Map<number, BombRenderEvent>();
	for (let frameIndex = 0; frameIndex < store.gameHistory.length; frameIndex++) {
		const frame = store.gameHistory[frameIndex];
		for (const bomb of frame.bombs) {
			const existing = bombs.get(bomb.id);
			if (existing) {
				existing.endFrameExclusive = frameIndex + 1;
			} else {
				bombs.set(bomb.id, {
					bomb,
					startFrame: frameIndex,
					endFrameExclusive: frameIndex + 1
				});
			}
		}
	}
	return Array.from(bombs.values());
};

const collectItems = (store: BombermanStore): ItemRenderEvent[] => {
	const items = new Map<number, ItemRenderEvent>();

	for (let frameIndex = 0; frameIndex < store.gameHistory.length; frameIndex++) {
		const frame = store.gameHistory[frameIndex];
		for (const item of frame.items) {
			if (item.hidden || item.collected || item.destroyed) continue;

			const existing = items.get(item.id);
			if (existing) {
				existing.endFrameExclusive = frameIndex + 1;
			} else {
				items.set(item.id, {
					item,
					startFrame: frameIndex,
					endFrameExclusive: frameIndex + 1
				});
			}
		}
	}

	return Array.from(items.values());
};

const getPlayerPositions = (store: BombermanStore, playerId: BombermanPlayer['id']): string[] =>
	store.gameHistory.map((frame) => {
		const player = frame.players.find((candidate) => candidate.id === playerId);
		return player ? centerPosition(player.x, player.y) : '0 0';
	});

const getPlayerSpriteRefs = (store: BombermanStore, playerId: BombermanPlayer['id']): string[] =>
	store.gameHistory.map((frame, frameIndex) => {
		const player = frame.players.find((candidate) => candidate.id === playerId);
		if (!player) return getDefaultPlayerRef(playerId);

		if (!player.alive) {
			const deathFrameIndex = getPlayerDeathFrameIndex(store, playerId);
			if (deathFrameIndex !== null) {
				const chain = PLAYER_DEATH_SPRITE_CHAINS[playerId];
				const spriteIndex = Math.min(Math.max(frameIndex - deathFrameIndex, 0), chain.length - 1);
				return toSpriteRef(chain[spriteIndex]);
			}
		}

		const previousPlayer =
			frameIndex > 0 ? store.gameHistory[frameIndex - 1].players.find((candidate) => candidate.id === playerId) : undefined;
		const moving = Boolean(previousPlayer && (previousPlayer.x !== player.x || previousPlayer.y !== player.y));
		const cycle = PLAYER_SPRITE_CHAINS[playerId][player.direction];
		const spriteIndex = moving ? Math.floor(frameIndex / BOMBERMAN_SVG.PLAYER_SPRITE_FRAME_INTERVAL) % cycle.length : 0;
		return toSpriteRef(cycle[spriteIndex]);
	});

const getPlayerOpacities = (store: BombermanStore, playerId: BombermanPlayer['id']): string[] =>
	store.gameHistory.map((frame, frameIndex) => {
		const player = frame.players.find((candidate) => candidate.id === playerId);
		if (!player) return '0';
		if (player.alive) return '1';

		const deathFrameIndex = getPlayerDeathFrameIndex(store, playerId);
		if (deathFrameIndex === null) return '0';

		const deathFrame = frameIndex - deathFrameIndex;
		return deathFrame >= 0 && deathFrame < PLAYER_DEATH_SPRITE_CHAINS[playerId].length ? '1' : '0';
	});

const getPlayerDeathFrameIndex = (store: BombermanStore, playerId: BombermanPlayer['id']): number | null => {
	for (let frameIndex = 1; frameIndex < store.gameHistory.length; frameIndex++) {
		const previousPlayer = store.gameHistory[frameIndex - 1].players.find((candidate) => candidate.id === playerId);
		const currentPlayer = store.gameHistory[frameIndex].players.find((candidate) => candidate.id === playerId);

		if (previousPlayer?.alive && currentPlayer && !currentPlayer.alive) return frameIndex;
	}

	return null;
};

const centerPosition = (x: number, y: number) => `${toSvgX(x) + CELL_SIZE / 2} ${toSvgY(y) + CELL_SIZE / 2}`;

const renderExplosionShape = (animation: BlastAnimationContext) => {
	const { explosion } = animation;
	const arms = getExplosionArmLengths(explosion);
	return [
		...renderExplosionArm(animation, 'left', arms.left),
		...renderExplosionArm(animation, 'right', arms.right),
		...renderExplosionArm(animation, 'up', arms.up),
		...renderExplosionArm(animation, 'down', arms.down),
		renderBlastSprite('center', explosion.x, explosion.y, 'right', animation)
	].join('');
};

const renderExplosionArm = (animation: BlastAnimationContext, direction: BlastDirection, length: number) => {
	if (length <= 0) return [];

	const endPosition = getExplosionArmPosition(animation.explosion, direction, length);
	return [renderBlastArmBody(animation, direction, length), renderBlastSprite('end', endPosition.x, endPosition.y, direction, animation)];
};

const getExplosionArmPosition = (explosion: BombermanExplosionEvent, direction: BlastDirection, distance: number) => {
	switch (direction) {
		case 'left':
			return { x: explosion.x - distance, y: explosion.y };
		case 'right':
			return { x: explosion.x + distance, y: explosion.y };
		case 'up':
			return { x: explosion.x, y: explosion.y - distance };
		case 'down':
			return { x: explosion.x, y: explosion.y + distance };
	}
};

const renderBlastSprite = (kind: BlastSpriteKind, x: number, y: number, direction: BlastDirection, animation: BlastAnimationContext) => {
	const placement = getBlastPlacement(kind, x, y, direction);
	const rotation = placement.degrees === 0 ? '' : ` transform="rotate(${placement.degrees} ${placement.centerX} ${placement.centerY})"`;
	return `<use x="${placement.x}" y="${placement.y}" width="${placement.width}" height="${placement.height}" href="${getAnimatedBlastRef(kind, animation.explosion)}"${rotation}/>`;
};

const renderBlastArmBody = (animation: BlastAnimationContext, direction: BlastDirection, length: number) => {
	const placement = getBlastArmBodyPlacement(animation.explosion, direction, length);
	const rotation = placement.degrees === 0 ? '' : ` transform="rotate(${placement.degrees} ${placement.centerX} ${placement.centerY})"`;
	return `<use x="${placement.x}" y="${placement.y}" width="${placement.width}" height="${placement.height}" href="${getAnimatedBlastRef('segment', animation.explosion)}"${rotation}/>`;
};

const getBlastPlacement = (kind: BlastSpriteKind, x: number, y: number, direction: BlastDirection) => {
	if (kind === 'center') {
		return {
			x: toSvgX(x),
			y: toSvgY(y),
			width: CELL_SIZE,
			height: CELL_SIZE,
			centerX: toSvgX(x) + CELL_SIZE / 2,
			centerY: toSvgY(y) + CELL_SIZE / 2,
			degrees: 0
		};
	}

	const axisLength = CELL_SIZE;
	const thickness = BOMBERMAN_SVG.BLAST_THICKNESS;
	const cellX = toSvgX(x);
	const cellY = toSvgY(y);
	const cellCenterX = cellX + CELL_SIZE / 2;
	const cellCenterY = cellY + CELL_SIZE / 2;

	switch (direction) {
		case 'left':
			return {
				x: cellX,
				y: cellCenterY - thickness / 2,
				width: axisLength,
				height: thickness,
				centerX: cellX + axisLength / 2,
				centerY: cellCenterY,
				degrees: 180
			};
		case 'right':
			return {
				x: cellX,
				y: cellCenterY - thickness / 2,
				width: axisLength,
				height: thickness,
				centerX: cellX + axisLength / 2,
				centerY: cellCenterY,
				degrees: 0
			};
		case 'up': {
			return {
				x: cellCenterX - axisLength / 2,
				y: cellCenterY - thickness / 2,
				width: axisLength,
				height: thickness,
				centerX: cellCenterX,
				centerY: cellCenterY,
				degrees: -90
			};
		}
		case 'down': {
			return {
				x: cellCenterX - axisLength / 2,
				y: cellCenterY - thickness / 2,
				width: axisLength,
				height: thickness,
				centerX: cellCenterX,
				centerY: cellCenterY,
				degrees: 90
			};
		}
	}
};

const getBlastArmBodyPlacement = (explosion: BombermanExplosionEvent, direction: BlastDirection, length: number) => {
	const originCenterX = toSvgX(explosion.x) + CELL_SIZE / 2;
	const originCenterY = toSvgY(explosion.y) + CELL_SIZE / 2;
	const end = getExplosionArmPosition(explosion, direction, length);
	const endCenterX = toSvgX(end.x) + CELL_SIZE / 2;
	const endCenterY = toSvgY(end.y) + CELL_SIZE / 2;
	const thickness = BOMBERMAN_SVG.BLAST_THICKNESS;

	if (direction === 'left' || direction === 'right') {
		const left = Math.min(originCenterX, endCenterX);
		const right = Math.max(originCenterX, endCenterX);
		return {
			x: left,
			y: originCenterY - thickness / 2,
			width: right - left,
			height: thickness,
			centerX: (left + right) / 2,
			centerY: originCenterY,
			degrees: direction === 'left' ? 180 : 0
		};
	}

	const top = Math.min(originCenterY, endCenterY);
	const bottom = Math.max(originCenterY, endCenterY);
	return {
		x: originCenterX - (bottom - top) / 2,
		y: (top + bottom) / 2 - thickness / 2,
		width: bottom - top,
		height: thickness,
		centerX: originCenterX,
		centerY: (top + bottom) / 2,
		degrees: direction === 'up' ? -90 : 90
	};
};

const getExplosionArmLengths = (explosion: BombermanExplosionEvent) => {
	let left = 0;
	let right = 0;
	let up = 0;
	let down = 0;

	for (const cell of explosion.affectedCells) {
		if (cell.y === explosion.y) {
			if (cell.x < explosion.x) left = Math.max(left, explosion.x - cell.x);
			if (cell.x > explosion.x) right = Math.max(right, cell.x - explosion.x);
		}
		if (cell.x === explosion.x) {
			if (cell.y < explosion.y) up = Math.max(up, explosion.y - cell.y);
			if (cell.y > explosion.y) down = Math.max(down, cell.y - explosion.y);
		}
	}

	return { left, right, up, down };
};

const getExplosionOpacityAnimation = (store: BombermanStore, explosion: BombermanExplosionEvent): AnimationData | null => {
	const totalFrames = store.gameHistory.length;
	const start = frameToKeyTime(explosion.frameIndex, totalFrames);
	const end = frameToKeyTime(explosion.frameIndex + explosion.remainingFrames, totalFrames);
	return {
		keyTimes: `0;${start};${start};${end};${end};1`,
		values: `0;0;${BOMBERMAN_SVG.EXPLOSION_OPACITY};${BOMBERMAN_SVG.EXPLOSION_OPACITY};0;0`
	};
};

const buildVisibilityAnimation = (totalFrames: number, startFrame: number, endFrameExclusive: number): AnimationData | null => {
	if (totalFrames <= 1 || (startFrame === 0 && endFrameExclusive >= totalFrames)) return null;

	const start = frameToKeyTime(startFrame, totalFrames);
	const end = frameToKeyTime(endFrameExclusive, totalFrames);
	return {
		keyTimes: `0;${start};${start};${end};${end};1`,
		values: '0;0;1;1;0;0'
	};
};

const indexCellEvents = (events: BombermanCellEvent[]) => {
	const eventsByPosition = new Map<string, BombermanCellEvent[]>();
	for (const event of events) {
		const key = cellEventKey(event.x, event.y);
		const cellEvents = eventsByPosition.get(key);
		if (cellEvents) {
			cellEvents.push(event);
		} else {
			eventsByPosition.set(key, [event]);
		}
	}
	return eventsByPosition;
};

const cellEventKey = (x: number, y: number) => `${x}:${y}`;

const getAnimatedBlastRef = (kind: BlastSpriteKind, explosion: BombermanExplosionEvent) => {
	const frameCount = BLAST_SPRITES[kind].length;
	const phase = (frameCount - (explosion.frameIndex % frameCount)) % frameCount;
	return `#bm-blast-${kind}-cycle-${phase}`;
};

const buildSpriteDefs = () => {
	const symbols = new Map<string, SpriteSymbol>();
	for (const playerChains of Object.values(PLAYER_SPRITE_CHAINS)) {
		for (const cycle of Object.values(playerChains)) {
			for (const sprite of cycle) symbols.set(sprite.id, sprite);
		}
	}
	for (const cycle of Object.values(PLAYER_DEATH_SPRITE_CHAINS)) {
		for (const sprite of cycle) symbols.set(sprite.id, sprite);
	}
	symbols.set(BOMB_SPRITE.id, BOMB_SPRITE);
	for (const cycle of Object.values(BLAST_SPRITES)) {
		for (const sprite of cycle) symbols.set(sprite.id, sprite);
	}
	for (const sprite of Object.values(ITEM_SPRITES)) symbols.set(sprite.id, sprite);

	const spriteDefs = Array.from(symbols.entries())
		.map(
			([
				id,
				sprite
			]) => `<symbol id="${id}" viewBox="0 0 ${sprite.frame.width} ${sprite.frame.height}" overflow="visible"${sprite.preserveAspectRatio ? ` preserveAspectRatio="${sprite.preserveAspectRatio}"` : ''}>
				<image width="${sprite.frame.width}" height="${sprite.frame.height}" href="${sprite.frame.data}" preserveAspectRatio="xMidYMid meet" style="image-rendering: pixelated;"${sprite.flipX ? ` transform="translate(${sprite.frame.width} 0) scale(-1 1)"` : ''}/>
			</symbol>`
		)
		.join('');

	return `<defs>${spriteDefs}${buildAnimatedBlastDefs()}</defs>`;
};

const buildAnimatedBlastDefs = () =>
	(Object.entries(BLAST_SPRITES) as [BlastSpriteKind, SpriteCycle][])
		.flatMap(([kind, cycle]) => cycle.map((_, phase) => buildAnimatedBlastDef(kind, cycle, phase)))
		.join('');

const buildAnimatedBlastDef = (kind: BlastSpriteKind, cycle: SpriteCycle, phase: number) => {
	const firstFrame = cycle[0].frame;
	const keyTimes = cycle.map((_, index) => Number((index / cycle.length).toFixed(BOMBERMAN_SVG.PRECISION)));
	const frameRefs = rotateValues(cycle.map(toSpriteRef), phase);
	const values = [...frameRefs, frameRefs[0]];
	return `<symbol id="bm-blast-${kind}-cycle-${phase}" viewBox="0 0 ${firstFrame.width} ${firstFrame.height}" overflow="visible" preserveAspectRatio="none"><use width="${firstFrame.width}" height="${firstFrame.height}" href="${frameRefs[0]}"><animate attributeName="href" calcMode="discrete" dur="${getBlastCycleDurationMs(cycle)}ms" repeatCount="indefinite" keyTimes="${[...keyTimes, 1].join(';')}" values="${values.join(';')}"/></use></symbol>`;
};

const rotateValues = <T>(values: readonly T[], offset: number): T[] => [...values.slice(offset), ...values.slice(0, offset)];

const getBlastCycleDurationMs = (cycle: SpriteCycle) => (cycle.length * DELTA_TIME) / BOMBERMAN_SVG.DURATION_SPEED_DIVISOR;

const toSpriteRef = (sprite: SpriteSymbol) => `#${sprite.id}`;

const getDefaultPlayerRef = (playerId: BombermanPlayer['id']) => toSpriteRef(PLAYER_SPRITE_CHAINS[playerId].down[0]);

const getDefaultBombRef = () => toSpriteRef(BOMB_SPRITE);

const getItemRef = (type: BombermanItem['type']) => toSpriteRef(ITEM_SPRITES[type]);

export const Renderer = {
	generateAnimatedSVG
};
