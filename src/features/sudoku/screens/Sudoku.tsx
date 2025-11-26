import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Alert,
  View,
  StatusBar,
  ActivityIndicator,
  Text,
  Dimensions,
} from 'react-native';
import SudokuGame from '../components/Game';
import SudokuMenu from '../components/Menu';
import { SudokuDifficulty, SUDOKU_DIFFICULTIES } from '../constants/config';
import { SudokuData, generateSudoku } from '../utils/generator';


type GameState = 'menu' | 'playing' | 'won';

const SudokuScreen: React.FC = () => {
  const [difficulty, setDifficulty] = useState<SudokuDifficulty>(
    SUDOKU_DIFFICULTIES.EASY,
  );
  const [grid, setGrid] = useState<number[][]>([]);
  const [initialGrid, setInitialGrid] = useState<number[][]>([]);
  const [solvedGrid, setSolvedGrid] = useState<number[][]>([]); // For validation

  const [gameState, setGameState] = useState<GameState>('menu');
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [lastPressTime, setLastPressTime] = useState(0);
  const [lastPressedDifficulty, setLastPressedDifficulty] =
    useState<SudokuDifficulty | null>(null);
  const [hintMessage, setHintMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [highlightedCells, setHighlightedCells] = useState<[number, number][]>(
    [],
  );

  const [time, setTime] = useState(0);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    timerInterval.current = setInterval(() => {
      setTime(prev => prev + 1);
    }, 1000);
  };

  useEffect(() => {
    return () => stopTimer();
  }, []);

  const initializeGame = (diff: SudokuDifficulty) => {
    setLoading(true);
    setTimeout(() => {
      const data: SudokuData | null = generateSudoku(diff);

      if (!data) {
        setLoading(false);
        Alert.alert('Generation Failed', 'Could not create a puzzle.');
        return;
      }

      setTime(0);
      startTimer();

      setHintMessage('');
      setDifficulty(diff);
      setGrid(data.initialGrid);
      setInitialGrid(data.initialGrid);
      setSolvedGrid(data.solvedGrid);

      setGameState('playing');
      setErrors([]);
      setIsSolved(false);
      setHintsUsed(0);
      setSelectedCell(null);
      setHighlightedCells([]);
      setLoading(false);
    }, 50);
  };

  const handleDifficultyPress = (diff: SudokuDifficulty) => {
    const currentTime = Date.now();
    const doublePressDelay = 300;
    if (
      lastPressedDifficulty?.id === diff.id &&
      currentTime - lastPressTime < doublePressDelay
    ) {
      initializeGame(diff);
    } else {
      setDifficulty(diff);
      setLastPressTime(currentTime);
      setLastPressedDifficulty(diff);
    }
  };

  const validateGameState = (currentGrid: number[][]): boolean => {
    const newErrors: string[] = [];

    // Check for obvious duplicates in rows/cols/boxes (Immediate feedback mode)
    // Note: We are not checking against the "Solution" yet, just rule violations
    for (let i = 0; i < 9; i++) {
      // Row check
      const rowNums = currentGrid[i].filter(n => n !== 0);
      if (new Set(rowNums).size !== rowNums.length)
        newErrors.push(`Duplicate number in Row ${i + 1}`);

      // Col check
      const colNums = currentGrid.map(r => r[i]).filter(n => n !== 0);
      if (new Set(colNums).size !== colNums.length)
        newErrors.push(`Duplicate number in Column ${i + 1}`);
    }

    setErrors([...new Set(newErrors)]);
    return newErrors.length === 0;
  };

  const checkWinCondition = (currentGrid: number[][]) => {
    // 1. Check if full
    const isFull = currentGrid.every(row => row.every(cell => cell !== 0));
    if (!isFull) return;

    // 2. Check if matches solution (Ultimate validation)
    const isCorrect =
      JSON.stringify(currentGrid) === JSON.stringify(solvedGrid);

    if (isCorrect) {
      stopTimer();
      setIsSolved(true);
      setGameState('won');

      const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
      };

      const message =
        hintsUsed > 0
          ? `You won using ${hintsUsed} hint${
              hintsUsed > 1 ? 's' : ''
            }, taking ${formatTime(time)}!`
          : `Perfect! You won without hints, taking ${formatTime(time)}!`;

      Alert.alert('Congratulations!', message, [
        { text: 'Play Again', onPress: () => initializeGame(difficulty) },
        { text: 'Main Menu', onPress: () => handleShowMenu() },
      ]);
    } else {
      setErrors(['The board is full, but there are mistakes.']);
    }
  };

  const handleCellTap = (row: number, col: number) => {
    if (gameState !== 'playing' || isSolved) return;
    // Don't select clues
    if (initialGrid[row][col] !== 0) {
      setSelectedCell(null);
      return;
    }
    setSelectedCell({ row, col });
    setHighlightedCells([]); // Clear hint highlights on interaction
    setHintMessage('');
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell || gameState !== 'playing' || isSolved) return;
    const { row, col } = selectedCell;

    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = num;
    setGrid(newGrid);

    // Validate immediately or on win?
    // Let's validate constraints immediately
    const validConstraints = validateGameState(newGrid);
    if (validConstraints) checkWinCondition(newGrid);
  };

  const generateHint = () => {
    if (gameState !== 'playing' || isSolved) return;
    setHighlightedCells([]);
    setHintMessage('');

    // 1. Logic: Find a cell with only 1 possible number
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          // Find candidates
          let candidates = [];
          for (let n = 1; n <= 9; n++) {
            // Check if N is valid here based on current grid
            // (Using the local helper logic)
            let possible = true;
            // Check row/col
            for (let k = 0; k < 9; k++) {
              if (grid[r][k] === n) possible = false;
              if (grid[k][c] === n) possible = false;
            }
            // Check box
            const br = Math.floor(r / 3) * 3;
            const bc = Math.floor(c / 3) * 3;
            for (let i = 0; i < 3; i++) {
              for (let j = 0; j < 3; j++) {
                if (grid[br + i][bc + j] === n) possible = false;
              }
            }
            if (possible) candidates.push(n);
          }

          if (candidates.length === 1) {
            setHighlightedCells([[r, c]]);
            setHintsUsed(prev => prev + 1);
            setHintMessage(
              `Cell (${r + 1},${c + 1}) can only be ${candidates[0]}.`,
            );
            return;
          }
        }
      }
    }

    // 2. Fallback: If no logical single, reveal a random cell from solution
    // Find all empty cells
    const emptyCells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) emptyCells.push({ r, c });
      }
    }

    if (emptyCells.length > 0) {
      const rnd = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const correctVal = solvedGrid[rnd.r][rnd.c];

      const newGrid = grid.map(row => [...row]);
      newGrid[rnd.r][rnd.c] = correctVal;
      setGrid(newGrid);

      setHighlightedCells([[rnd.r, rnd.c]]);
      setHintsUsed(prev => prev + 1);
      setHintMessage(
        `Filled cell (${rnd.r + 1},${rnd.c + 1}) with ${correctVal}.`,
      );
    }
  };

  const handleShowMenu = () => {
    stopTimer();
    setGameState('menu');
    setTime(0);
  };

  const handleReset = () => {
    if (initialGrid.length === 0) return;
    setGrid(initialGrid.map(row => [...row]));
    setErrors([]);
    setIsSolved(false);
    setHighlightedCells([]);
    setHintMessage('');
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

    if (gameState === 'playing' || gameState === 'won') {
      return (
        <SudokuGame
          difficulty={difficulty}
          grid={grid}
          initialGrid={initialGrid}
          selectedCell={selectedCell}
          hintsUsed={hintsUsed}
          errors={errors}
          isSolved={isSolved}
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

    return (
      <SudokuMenu
        onSelectDifficulty={handleDifficultyPress}
        selectedDifficulty={difficulty}
      />
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

export default SudokuScreen;
