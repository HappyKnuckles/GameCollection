import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  ActivityIndicator,
  Text,
  Dimensions,
} from 'react-native';
import { generatePuzzle, PuzzleData } from '../utils/generator';
import { EMPTY, MARK, QUEEN, buildUnits, findDeduction, Cell } from '../utils/solver';
import Game from '../components/Game';
import { DIFFICULTIES, QueensDifficulty } from '../constants/config';
import QueensMenu from '../components/Menu';
import { randomSeed } from '../../../utils/random';
import { showAlert } from '../../../utils/alert';
import { formatDuration, useGameTimer } from '../../../hooks/useGameTimer';

type GameState = 'menu' | 'playing' | 'won';

interface Hint {
  message: string;
  cells: Cell[];
  /** The hint is done once every cell has this value (or any value if undefined). */
  expect?: number;
}

const validate = (grid: number[][], colorGrid: number[][]): string[] => {
  const errors = new Set<string>();
  const queens: Cell[] = [];
  grid.forEach((row, r) => row.forEach((v, c) => v === QUEEN && queens.push([r, c])));

  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      const [r1, c1] = queens[i];
      const [r2, c2] = queens[j];
      if (r1 === r2) errors.add(`Row ${r1 + 1} has multiple queens.`);
      if (c1 === c2) errors.add(`Column ${c1 + 1} has multiple queens.`);
      if (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1)
        errors.add(`Queens at (${r1 + 1},${c1 + 1}) and (${r2 + 1},${c2 + 1}) are adjacent.`);
    }
  }

  const colorCounts = new Map<number, number>();
  queens.forEach(([r, c]) => {
    const color = colorGrid[r][c];
    colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
  });
  colorCounts.forEach(count => {
    if (count > 1) errors.add(`A color region has ${count} queens.`);
  });

  return [...errors];
};

const QueensScreen: React.FC = () => {
  const [difficulty, setDifficulty] = useState<QueensDifficulty>(DIFFICULTIES.EASY);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [grid, setGrid] = useState<number[][]>([]);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hint, setHint] = useState<Hint | null>(null);
  const [loading, setLoading] = useState(false);
  const lastPress = useRef<{ id: string; time: number } | null>(null);

  const { time, timeRef, resetTime } = useGameTimer(gameState === 'playing' && !loading);

  const colorGrid = puzzle?.colorGrid ?? [];
  const units = useMemo(() => (puzzle ? buildUnits(puzzle.colorGrid) : null), [puzzle]);
  const errors = useMemo(
    () => (puzzle ? validate(grid, puzzle.colorGrid) : []),
    [grid, puzzle],
  );

  const initializeGame = useCallback(
    (diff: QueensDifficulty) => {
      setLoading(true);
      // Let the loading indicator render before the (synchronous) generation.
      setTimeout(() => {
        const data = generatePuzzle(diff.size, diff.removalRatio, randomSeed());
        if (!data) {
          setLoading(false);
          showAlert('Generation Failed', 'Could not create a puzzle.');
          return;
        }
        setDifficulty(diff);
        setPuzzle(data);
        setGrid(data.puzzleGrid.map(row => [...row]));
        setGameState('playing');
        setHint(null);
        setHintsUsed(0);
        resetTime();
        setLoading(false);
      }, 50);
    },
    [resetTime],
  );

  const handleShowMenu = useCallback(() => {
    setGameState('menu');
    resetTime();
  }, [resetTime]);

  // Win check: only a board change can complete the puzzle.
  useEffect(() => {
    if (gameState !== 'playing' || !puzzle) return;
    const queens = grid.flat().filter(v => v === QUEEN).length;
    if (queens !== difficulty.size || errors.length > 0) return;

    setGameState('won');
    setHint(null);
    const finalTime = formatDuration(timeRef.current);
    const message =
      hintsUsed > 0
        ? `You won using ${hintsUsed} hint${hintsUsed > 1 ? 's' : ''}, taking ${finalTime}!`
        : `Perfect! You won without hints, taking ${finalTime}!`;
    showAlert('Congratulations!', message, [
      { text: 'Play Again', onPress: () => initializeGame(difficulty) },
      { text: 'Main Menu', onPress: handleShowMenu },
    ]);
  }, [grid]);

  // Clear the hint once the player has acted on all highlighted cells.
  useEffect(() => {
    if (!hint || hint.cells.length === 0) return;
    const done = hint.cells.every(([r, c]) =>
      hint.expect === undefined ? grid[r][c] !== EMPTY : grid[r][c] === hint.expect,
    );
    if (done) setHint(null);
  }, [grid, hint]);

  const handleDifficultyPress = (diff: QueensDifficulty) => {
    const now = Date.now();
    if (lastPress.current?.id === diff.id && now - lastPress.current.time < 300) {
      lastPress.current = null;
      initializeGame(diff);
    } else {
      setDifficulty(diff);
      lastPress.current = { id: diff.id, time: now };
    }
  };

  const isGiven = (row: number, col: number) => puzzle?.puzzleGrid[row][col] === MARK;

  const handleCellTap = (row: number, col: number) => {
    if (gameState !== 'playing' || isGiven(row, col)) return;
    setGrid(prev => {
      const next = prev.map(r => [...r]);
      next[row][col] = (next[row][col] + 1) % 3;
      return next;
    });
  };

  const handleCellDragOver = (row: number, col: number) => {
    if (gameState !== 'playing') return;
    // Functional update: several drag events can arrive before a re-render.
    setGrid(prev => {
      if (prev[row][col] !== EMPTY) return prev;
      const next = prev.map(r => [...r]);
      next[row][col] = MARK;
      return next;
    });
  };

  const generateHint = () => {
    if (gameState !== 'playing' || !puzzle || !units) return;
    const { solutionGrid } = puzzle;
    const size = difficulty.size;

    const give = (h: Hint) => {
      setHint(h);
      setHintsUsed(prev => prev + 1);
    };

    // 1. Point out mistakes first; logic hints are meaningless on a wrong board.
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === QUEEN && solutionGrid[r][c] !== QUEEN) {
          return give({
            message: `The queen at (${r + 1}, ${c + 1}) is not part of the solution.`,
            cells: [[r, c]],
            expect: EMPTY,
          });
        }
        if (grid[r][c] === MARK && solutionGrid[r][c] === QUEEN) {
          return give({
            message: `(${r + 1}, ${c + 1}) is marked ❌, but a queen belongs there.`,
            cells: [[r, c]],
            expect: QUEEN,
          });
        }
      }
    }

    // 2. Next logical step from the player's current board.
    const step = findDeduction(grid, puzzle.colorGrid, units);
    if (step && step !== 'contradiction') {
      return give({
        message: step.reason,
        cells: step.cells,
        expect: step.kind === 'place' ? QUEEN : undefined,
      });
    }

    // 3. Fallback (shouldn't be needed): reveal a queen.
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (solutionGrid[r][c] === QUEEN && grid[r][c] !== QUEEN) {
          return give({ message: 'A queen belongs here.', cells: [[r, c]], expect: QUEEN });
        }
      }
    }
  };

  const handleReset = () => {
    if (!puzzle) return;
    setGrid(puzzle.puzzleGrid.map(row => [...row]));
    setHint(null);
    setGameState('playing');
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Generating new puzzle...</Text>
        </View>
      );
    }

    if ((gameState === 'playing' || gameState === 'won') && puzzle) {
      return (
        <Game
          difficulty={difficulty}
          grid={grid}
          colorGrid={colorGrid}
          hintsUsed={hintsUsed}
          errors={errors}
          isSolved={gameState === 'won'}
          highlightedCells={hint?.cells ?? []}
          hintMessage={hint?.message ?? ''}
          time={time}
          onCellTap={handleCellTap}
          onCellDragOver={handleCellDragOver}
          onNewGame={() => initializeGame(difficulty)}
          onShowMenu={handleShowMenu}
          onGenerateHint={generateHint}
          onReset={handleReset}
        />
      );
    }

    return (
      <QueensMenu onSelectDifficulty={handleDifficultyPress} selectedDifficulty={difficulty} />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    minHeight: Dimensions.get('window').height,
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#2c3e50' },
});

export default QueensScreen;
