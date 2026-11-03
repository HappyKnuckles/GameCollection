import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, StatusBar, ActivityIndicator, Text, Dimensions } from 'react-native';
import SudokuGame from '../components/Game';
import SudokuMenu from '../components/Menu';
import { SudokuDifficulty, SUDOKU_DIFFICULTIES } from '../constants/config';
import { SudokuData, generateSudoku } from '../utils/generator';
import { findConflicts, findHint, Cell } from '../utils/hints';
import { showAlert } from '../../../utils/alert';
import { formatDuration, useGameTimer } from '../../../hooks/useGameTimer';

type GameState = 'menu' | 'playing' | 'won';

const SudokuScreen: React.FC = () => {
  const [difficulty, setDifficulty] = useState<SudokuDifficulty>(SUDOKU_DIFFICULTIES.EASY);
  const [puzzle, setPuzzle] = useState<SudokuData | null>(null);
  const [grid, setGrid] = useState<number[][]>([]);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintMessage, setHintMessage] = useState('');
  const [highlightedCells, setHighlightedCells] = useState<Cell[]>([]);
  const [loading, setLoading] = useState(false);
  const lastPress = useRef<{ id: string; time: number } | null>(null);

  const { time, timeRef, resetTime } = useGameTimer(gameState === 'playing' && !loading);

  const initialGrid = puzzle?.initialGrid ?? [];
  const isFull = grid.length > 0 && grid.every(row => row.every(cell => cell !== 0));
  const isCorrect =
    !!puzzle && isFull && grid.every((row, r) => row.every((v, c) => v === puzzle.solvedGrid[r][c]));

  const errors = useMemo(() => {
    if (grid.length === 0) return [];
    const conflicts = findConflicts(grid);
    if (conflicts.length === 0 && isFull && !isCorrect)
      return ['The board is full, but there are mistakes.'];
    return conflicts;
  }, [grid, isFull, isCorrect]);

  const initializeGame = useCallback(
    (diff: SudokuDifficulty) => {
      setLoading(true);
      // Let the loading indicator render before the (synchronous) generation.
      setTimeout(() => {
        const data = generateSudoku(diff);
        setDifficulty(diff);
        setPuzzle(data);
        setGrid(data.initialGrid.map(row => [...row]));
        setGameState('playing');
        setHintMessage('');
        setHighlightedCells([]);
        setHintsUsed(0);
        setSelectedCell(null);
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

  // Win check on every board change, so a hint that fills the last cell
  // also finishes the game.
  useEffect(() => {
    if (gameState !== 'playing' || !isCorrect) return;
    setGameState('won');
    setSelectedCell(null);
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

  const handleDifficultyPress = (diff: SudokuDifficulty) => {
    const now = Date.now();
    if (lastPress.current?.id === diff.id && now - lastPress.current.time < 300) {
      lastPress.current = null;
      initializeGame(diff);
    } else {
      setDifficulty(diff);
      lastPress.current = { id: diff.id, time: now };
    }
  };

  const handleCellTap = (row: number, col: number) => {
    if (gameState !== 'playing') return;
    // Clues can't be selected.
    if (initialGrid[row][col] !== 0) {
      setSelectedCell(null);
      return;
    }
    setSelectedCell({ row, col });
    setHighlightedCells([]);
    setHintMessage('');
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell || gameState !== 'playing') return;
    const { row, col } = selectedCell;
    setGrid(prev => {
      const next = prev.map(r => [...r]);
      next[row][col] = num;
      return next;
    });
  };

  const generateHint = () => {
    if (gameState !== 'playing' || !puzzle) return;
    const hint = findHint(
      grid,
      puzzle.initialGrid,
      puzzle.solvedGrid,
      items => items[Math.floor(Math.random() * items.length)],
    );
    if (!hint) return;

    if (hint.kind === 'reveal' && hint.value !== undefined) {
      const [row, col] = hint.cells[0];
      const value = hint.value;
      setGrid(prev => {
        const next = prev.map(r => [...r]);
        next[row][col] = value;
        return next;
      });
    }
    setHighlightedCells(hint.cells);
    setHintMessage(hint.message);
    setHintsUsed(prev => prev + 1);
  };

  const handleReset = () => {
    if (!puzzle) return;
    setGrid(puzzle.initialGrid.map(row => [...row]));
    setHighlightedCells([]);
    setHintMessage('');
    setSelectedCell(null);
    setGameState('playing');
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Generating puzzle...</Text>
        </View>
      );
    }

    if ((gameState === 'playing' || gameState === 'won') && puzzle) {
      return (
        <SudokuGame
          difficulty={difficulty}
          grid={grid}
          initialGrid={initialGrid}
          selectedCell={selectedCell}
          hintsUsed={hintsUsed}
          errors={errors}
          isSolved={gameState === 'won'}
          highlightedCells={highlightedCells}
          hintMessage={hintMessage}
          time={time}
          onCellTap={handleCellTap}
          onNumberInput={handleNumberInput}
          onNewGame={() => initializeGame(difficulty)}
          onShowMenu={handleShowMenu}
          onGenerateHint={generateHint}
          onReset={handleReset}
        />
      );
    }

    return <SudokuMenu onSelectDifficulty={handleDifficultyPress} selectedDifficulty={difficulty} />;
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

export default SudokuScreen;
