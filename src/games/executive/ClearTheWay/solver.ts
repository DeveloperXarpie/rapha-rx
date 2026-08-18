/**
 * Breadth-first solver for Clear the Way.
 *
 * One edge is one complete slide of any distance, mirroring the rule that a drag counts
 * as a single action however far the player pulls it. That keeps `minMoves` comparable
 * with the move count the player actually accrues, which is what the performance ratio
 * is built on.
 *
 * The test suite runs this over every catalog level, so a hand-authored board that is
 * unsolvable or mis-tuned fails CI rather than a resident's session.
 */

import {
  applyMove, isSolved, legalMoves, serialize,
  type Board, type Move,
} from './model';

export interface Solution {
  minMoves: number;
  /**
   * Moves preceding the key's first move on the canonical shortest path: the brief's
   * "how many moves must precede the first useful one", and the difficulty axis that
   * carries the upper tiers.
   */
  dependencyDepth: number;
  path: Move[];
}

/**
 * Backstop against a pathological board. Real levels are at most 7x7 and settle orders
 * of magnitude below this; hitting it means the level is wrong, not that the search
 * needs more room.
 */
const MAX_STATES = 200_000;

interface Node {
  board: Board;
  prev: string | null;
  move: Move | null;
}

export interface SolveOptions {
  /** Lower this when solving throwaway candidates in bulk, where giving up early is cheap. */
  maxStates?: number;
}

export function solve(board: Board, options: SolveOptions = {}): Solution | null {
  if (isSolved(board)) return { minMoves: 0, dependencyDepth: 0, path: [] };

  const keyId = board.pieces.find((p) => p.isKey)?.id;
  if (!keyId) return null;

  const limit = options.maxStates ?? MAX_STATES;
  const start = serialize(board);
  const seen = new Map<string, Node>([[start, { board, prev: null, move: null }]]);
  let frontier = [start];

  while (frontier.length > 0) {
    const next: string[] = [];

    for (const stateKey of frontier) {
      const node = seen.get(stateKey)!;

      for (const move of legalMoves(node.board)) {
        const child = applyMove(node.board, move.pieceId, move.axis, move.delta);
        const childKey = serialize(child);
        if (seen.has(childKey)) continue;
        if (seen.size >= limit) return null;

        seen.set(childKey, { board: child, prev: stateKey, move });
        if (isSolved(child)) return describe(seen, childKey, keyId);
        next.push(childKey);
      }
    }

    frontier = next;
  }

  return null;
}

/** The first move of an optimal path from here. Drives the "Show me" hint. */
export function nextBestMove(board: Board): Move | null {
  return solve(board)?.path[0] ?? null;
}

function describe(seen: Map<string, Node>, endKey: string, keyId: string): Solution {
  const path: Move[] = [];
  for (let cursor: string | null = endKey; cursor !== null; ) {
    const node: Node = seen.get(cursor)!;
    if (node.move) path.unshift(node.move);
    cursor = node.prev;
  }

  const firstKeyMove = path.findIndex((m) => m.pieceId === keyId);
  return {
    minMoves: path.length,
    dependencyDepth: firstKeyMove < 0 ? path.length : firstKeyMove,
    path,
  };
}
