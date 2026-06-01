# Bomberman Architecture

The Bomberman implementation keeps mutable game behavior on entities and leaves orchestration/query logic in focused core modules.

## Roles

- `GameEngine`: simulation loop, snapshots, final rendering callbacks.
- `GameState`: aggregate wrapper for controlled mutation of the existing store shape.
- `AiController`: per-player movement and bomb-placement decisions.
- AI movement strategies: ordered behaviors for escape, item pickup, opponent chase, and bomb-origin positioning.
- `GridPosition` in `board.ts`: value object for grid equality, keys, distance, bounds, and adjacency.
- `BlastArea` in `bomb.ts`: value object for gameplay blast cells and renderable blast arms.
- `Player`: movement, death, power-ups, bomb placement, spawn setup, player-specific danger/target checks.
- `Bomb`: blast cells, threat/target checks, explosion flow, chain reactions, scoring, item reveal.
- `Explosion`: lifecycle, hit tracking, active explosion lookup.
- `Item`: creation, lookup, visibility, collection, and destruction.
- `PowerUp`: item effect strategy objects applied to players.
- SVG layer renderers: render month labels, grid, bombs, items, explosions, and players from snapshots/events.
- `board.ts`: geometry and board queries only.

## Boundaries

- Keep obvious entity behavior on the entity.
- Keep `ai.ts` decision-only and `pathfinding.ts` route-search-only.
- Keep renderer code read-only over snapshots/events.
- Prefer value objects when several modules need the same coordinate or blast-shape rules.
- Prefer strategy objects when adding AI behavior or item effects.
- Introduce a service only when logic coordinates unrelated concepts rather than modeling one entity.
