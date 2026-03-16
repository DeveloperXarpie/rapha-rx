import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';
import type { GeneratedWordSearchContent } from '../../../lib/contentGenerators/wordSearch';

type Phase = 'topic_intro' | 'play_grid' | 'completion';

interface CellPos { row: number; col: number; }

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
  generatedContent?: GeneratedWordSearchContent;
}

// ── Direction snapping ────────────────────────────────────────────────────────

const SNAP_DIRS = [
  { angle: 0,              dr: 0,  dc:  1 }, // right
  { angle: Math.PI / 4,    dr: 1,  dc:  1 }, // down-right
  { angle: Math.PI / 2,    dr: 1,  dc:  0 }, // down
  { angle: 3*Math.PI / 4,  dr: 1,  dc: -1 }, // down-left
  { angle: Math.PI,        dr: 0,  dc: -1 }, // left
  { angle: -3*Math.PI / 4, dr: -1, dc: -1 }, // up-left
  { angle: -Math.PI / 2,   dr: -1, dc:  0 }, // up
  { angle: -Math.PI / 4,   dr: -1, dc:  1 }, // up-right
];

function computeLineCells(
  start: CellPos,
  end: CellPos,
  rows: number,
  cols: number,
): CellPos[] {
  if (start.row === end.row && start.col === end.col) return [start];

  const dr = end.row - start.row;
  const dc = end.col - start.col;
  const angle = Math.atan2(dr, dc);

  let bestDir = SNAP_DIRS[0];
  let minDiff = Infinity;
  for (const dir of SNAP_DIRS) {
    let diff = Math.abs(angle - dir.angle);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff < minDiff) { minDiff = diff; bestDir = dir; }
  }

  const length = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
  const cells: CellPos[] = [];
  for (let i = 0; i < length; i++) {
    const r = start.row + bestDir.dr * i;
    const c = start.col + bestDir.dc * i;
    if (r >= 0 && r < rows && c >= 0 && c < cols) cells.push({ row: r, col: c });
  }
  return cells;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function WordSearch({ levelConfig, onLevelComplete, generatedContent }: Props) {
  const { t } = useTranslation();
  const startedAt = useRef(Date.now());

  const [phase, setPhase]           = useState<Phase>('topic_intro');
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [falseDrags, setFalseDrags] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart]   = useState<CellPos | null>(null);
  const [dragEnd, setDragEnd]       = useState<CellPos | null>(null);
  const [foundCells, setFoundCells] = useState<Map<string, CellPos[]>>(new Map());
  const [flashWord, setFlashWord]   = useState<string | null>(null);

  // Auto-advance from topic intro
  useEffect(() => {
    if (phase !== 'topic_intro') return;
    const t = setTimeout(() => setPhase('play_grid'), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  // Check completion
  useEffect(() => {
    if (phase !== 'play_grid' || !generatedContent) return;
    if (generatedContent.words.length > 0 && foundWords.size === generatedContent.words.length) {
      const t = setTimeout(() => setPhase('completion'), 700);
      return () => clearTimeout(t);
    }
  }, [foundWords.size, generatedContent, phase]);

  const getCellFromPoint = useCallback((clientX: number, clientY: number): CellPos | null => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    let target: Element | null = el;
    while (target) {
      const r = target.getAttribute('data-row');
      const c = target.getAttribute('data-col');
      if (r !== null && c !== null) return { row: parseInt(r, 10), col: parseInt(c, 10) };
      target = target.parentElement;
    }
    return null;
  }, []);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragStart(cell);
    setDragEnd(cell);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || !dragStart) return;
    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    if (cell.row === dragEnd?.row && cell.col === dragEnd?.col) return;
    setDragEnd(cell);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || !dragStart || !generatedContent) {
      setIsDragging(false);
      return;
    }

    const end = dragEnd ?? dragStart;
    const rows = generatedContent.grid.length;
    const cols = generatedContent.grid[0]?.length ?? 0;
    const highlighted = computeLineCells(dragStart, end, rows, cols);
    const selectedLetters = highlighted.map(c => generatedContent.grid[c.row][c.col]).join('');

    let matched: string | null = null;
    for (const word of generatedContent.words) {
      if (!foundWords.has(word) && selectedLetters === word) {
        matched = word;
        break;
      }
    }

    if (matched) {
      const w = matched;
      setFoundWords(prev => new Set([...prev, w]));
      setFoundCells(prev => new Map([...prev, [w, [...highlighted]]]));
      setFlashWord(w);
      setTimeout(() => setFlashWord(null), 1200);
    } else if (highlighted.length > 1) {
      // Only penalise actual drag attempts (not a single tap on a cell)
      setFalseDrags(f => f + 1);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }

  function handleComplete() {
    const duration = Math.floor((Date.now() - startedAt.current) / 1000);
    const totalWords = generatedContent?.words.length ?? 0;
    const found = foundWords.size;
    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: duration,
      completed: true,
      metrics: { wordsFound: found, totalWords, falseDrags, durationSeconds: duration },
    });
  }

  // ── Loading guard ────────────────────────────────────────────────────────────
  if (!generatedContent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-h3 text-caption-text">Loading puzzle…</p>
      </div>
    );
  }

  const { theme, themeIcon, words, grid } = generatedContent;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  // Build cell key sets for rendering
  const currentHighlighted = isDragging && dragStart
    ? computeLineCells(dragStart, dragEnd ?? dragStart, rows, cols)
    : [];
  const currentHighlightSet = new Set(currentHighlighted.map(c => `${c.row},${c.col}`));

  const allFoundKeys = new Set<string>();
  for (const cells of foundCells.values()) {
    for (const c of cells) allFoundKeys.add(`${c.row},${c.col}`);
  }

  // ── Phase: Topic Intro ───────────────────────────────────────────────────────
  if (phase === 'topic_intro') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="panel-surface p-10 flex flex-col items-center gap-5 max-w-sm w-full text-center">
          <span className="text-8xl">{themeIcon}</span>
          <p className="text-caption font-semibold text-caption-text uppercase tracking-widest">
            {t('game.wordSearch.topic', 'Find words about')}
          </p>
          <h2 className="game-title-banner game-title-banner-compact text-center">{theme}</h2>
          <p className="text-body-md text-caption-text">
            {t('game.wordSearch.instructions', 'Swipe across the letters to find each word')}
          </p>
        </div>
      </div>
    );
  }

  // ── Phase: Completion ────────────────────────────────────────────────────────
  if (phase === 'completion') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8 text-center">
        <div className="text-8xl">🌟</div>
        <div>
          <h2 className="text-h1 font-bold text-body-text mb-2">
            {t('game.wordSearch.complete.title', 'Great focus!')}
          </h2>
          <p className="text-h3 text-caption-text">
            {t('game.wordSearch.complete.message', 'You found them all.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {words.map(word => (
            <span
              key={word}
              className="bg-green-100 text-emerald-green font-semibold rounded-xl px-4 py-2 text-body-md"
            >
              ✓ {word}
            </span>
          ))}
        </div>
        <button onClick={handleComplete} className="btn-primary w-full max-w-sm">
          {t('btn.continue', 'Continue')}
        </button>
      </div>
    );
  }

  // ── Phase: Play Grid ─────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col items-center gap-5 p-4 pb-8 select-none">

      {/* Word list */}
      <div className="flex flex-wrap gap-3 justify-center w-full max-w-2xl">
        {words.map(word => {
          const isFound   = foundWords.has(word);
          const isFlashing = flashWord === word;
          return (
            <span
              key={word}
              className={`rounded-xl px-4 py-2 text-h3 font-semibold transition-all duration-300
                ${isFound
                  ? 'bg-green-100 text-emerald-green line-through decoration-2'
                  : isFlashing
                  ? 'bg-green-200 text-emerald-green scale-110'
                  : 'bg-gray-100 text-body-text'
                }`}
            >
              {isFound ? '✓ ' : ''}{word}
            </span>
          );
        })}
      </div>

      {/* Grid */}
      <div
        className="w-full max-w-[640px] touch-none cursor-crosshair rounded-2xl overflow-hidden
                   border-2 border-gray-200 shadow-sm bg-[#FAFAF8]"
        style={{ userSelect: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {grid.map((row, r) =>
            row.map((letter, c) => {
              const key = `${r},${c}`;
              const isActive = currentHighlightSet.has(key);
              const isFound  = allFoundKeys.has(key);

              return (
                <div
                  key={key}
                  data-row={r}
                  data-col={c}
                  className={`aspect-square flex items-center justify-center
                              border border-gray-100 text-h3 font-bold
                              transition-colors duration-75
                              ${isFound
                                ? 'bg-[#E8F5E9] text-emerald-green'
                                : isActive
                                ? 'bg-primary-blue/20 text-primary-blue'
                                : 'text-body-text'
                              }`}
                >
                  <span className="pointer-events-none">{letter}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Progress hint */}
      <p className="text-body-md text-caption-text">
        {foundWords.size} / {words.length} {t('game.wordSearch.found', 'words found')}
      </p>
    </div>
  );
}
