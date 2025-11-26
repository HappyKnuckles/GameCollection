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
import { generatePuzzle, PuzzleData } from '../utils/generator';
import Game from '../components/Game';
import { DIFFICULTIES, QueensDifficulty,  } from '../constants/config';
import QueensMenu from '../components/Menu';

type GameState = 'menu' | 'playing' | 'won';

const QueensScreen: React.FC = () => {
  const [difficulty, setDifficulty] = useState<QueensDifficulty>(DIFFICULTIES.EASY);
  const [grid, setGrid] = useState<number[][]>([]);
  const [initialGrid, setInitialGrid] = useState<number[][]>([]);
  const [colorGrid, setColorGrid] = useState<number[][]>([]);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [lastPressTime, setLastPressTime] = useState(0);
  const [lastPressedDifficulty, setLastPressedDifficulty] =
    useState<QueensDifficulty | null>(null);
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

  const initializeGame = (diff: QueensDifficulty, newSeed?: number) => {
    setLoading(true);
    setTimeout(() => {
      const initialSeed = newSeed !== undefined ? newSeed : Date.now();
      const puzzleData: PuzzleData | null = generatePuzzle(
        diff.size,
        diff.removalRatio,
        initialSeed,
      );

      if (!puzzleData) {
        setLoading(false);
        Alert.alert('Generation Failed', 'Could not create a puzzle.', [
          { text: 'OK' },
        ]);
        return;
      }

      const { colorGrid: newColorGrid, puzzleGrid: newGrid } = puzzleData;

      setTime(0);
      startTimer();

      setHintMessage('');
      setDifficulty(diff);
      setGrid(newGrid);
      setInitialGrid(newGrid);
      setColorGrid(newColorGrid);
      setGameState('playing');
      setErrors([]);
      setIsSolved(false);
      setHintsUsed(0);
      setHighlightedCells([]);
      setLoading(false);
    }, 50);
  };

  const handleDifficultyPress = (diff: QueensDifficulty) => {
    const currentTime = Date.now();
    const doublePressDelay = 300;
    if (
      lastPressedDifficulty?.size === diff.size &&
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
    const size = difficulty.size;
    const newErrors: string[] = [];
    const queens: [number, number][] = [];
    for (let i = 0; i < size; i++)
      for (let j = 0; j < size; j++)
        if (currentGrid[i][j] === 2) queens.push([i, j]);

    for (let i = 0; i < queens.length; i++) {
      for (let j = i + 1; j < queens.length; j++) {
        const [r1, c1] = queens[i];
        const [r2, c2] = queens[j];
        if (r1 === r2) newErrors.push(`Row ${r1 + 1} has multiple queens.`);
        if (c1 === c2) newErrors.push(`Column ${c1 + 1} has multiple queens.`);
        if (Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1)
          newErrors.push(
            `Queens at (${r1 + 1},${c1 + 1}) and (${r2 + 1},${
              c2 + 1
            }) are adjacent.`,
          );
      }
    }

    const colorCounts: { [key: number]: number } = {};
    queens.forEach(([r, c]) => {
      const color = colorGrid[r][c];
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
    for (const color in colorCounts)
      if (colorCounts[color] > 1)
        newErrors.push(`A color region has ${colorCounts[color]} queens.`);

    setErrors([...new Set(newErrors)]);
    return newErrors.length === 0;
  };

  const checkWinCondition = (currentGrid: number[][]) => {
    const size = difficulty.size;
    const queenCount = currentGrid.flat().filter(cell => cell === 2).length;
    if (queenCount === size && validateGameState(currentGrid)) {
      stopTimer();

      setIsSolved(true);
      setGameState('won');

      const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
      };
      const finalTime = formatTime(time);

      const message =
        hintsUsed > 0
          ? `You won using ${hintsUsed} hint${
              hintsUsed > 1 ? 's' : ''
            }, taking ${finalTime}!`
          : `Perfect! You won without hints, taking ${finalTime}!`;

      Alert.alert('Congratulations!', message, [
        { text: 'Play Again', onPress: () => initializeGame(difficulty) },
        { text: 'Main Menu', onPress: () => handleShowMenu() },
      ]);
    }
  };

  const checkAndClearHighlights = (currentGrid: number[][]) => {
    if (highlightedCells.length === 0) {
      return;
    }

    const allHighlightsFilled = highlightedCells.every(
      ([r, c]) => currentGrid[r][c] !== 0,
    );

    if (allHighlightsFilled) {
      setHighlightedCells([]);
      setHintMessage('');
    }
  };

  const handleCellTap = (row: number, col: number) => {
    if (gameState !== 'playing' || isSolved) return;
    const newGrid = grid.map(gridRow => [...gridRow]);
    newGrid[row][col] = (newGrid[row][col] + 1) % 3;
    setGrid(newGrid);
    setTimeout(() => {
      checkAndClearHighlights(newGrid);
      const isValid = validateGameState(newGrid);
      if (isValid) checkWinCondition(newGrid);
    }, 0);
  };

  const handleCellDragOver = (row: number, col: number) => {
    if (grid[row][col] === 0) {
      const newGrid = grid.map(gridRow => [...gridRow]);
      newGrid[row][col] = 1;
      setGrid(newGrid);
      checkAndClearHighlights(newGrid);
    }
  };

  const generateHint = () => {
    if (gameState !== 'playing' || isSolved) return;
    const size = difficulty.size;

    setHighlightedCells([]);
    setHintMessage('');

    const queens: [number, number][] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 2) queens.push([r, c]);
      }
    }

    if (queens.length > 0) {
      for (const [qr, qc] of queens) {
        const attackedCellsToHighlight: [number, number][] = [];
        const queenColor = colorGrid[qr][qc];

        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (grid[r][c] === 0) {
              const isInRow = r === qr;
              const isInCol = c === qc;
              const isAdjacent = Math.abs(r - qr) <= 1 && Math.abs(c - qc) <= 1;
              const isInColor = colorGrid[r][c] === queenColor;

              if (isInRow || isInCol || isAdjacent || isInColor) {
                attackedCellsToHighlight.push([r, c]);
              }
            }
          }
        }

        if (attackedCellsToHighlight.length > 0) {
          setHighlightedCells(attackedCellsToHighlight);
          setHintsUsed(prev => prev + 1);
          setHintMessage(
            `A queen at (${qr + 1}, ${qc + 1}) attacks these empty squares.`,
          );
          return;
        }
      }
    }

    const checkConstraintForSingle = (
      cells: [number, number][],
      constraintName: string,
    ): boolean => {
      if (cells.some(([r, c]) => grid[r][c] === 2)) return false;

      const possibleSpots: [number, number][] = [];
      for (const [r, c] of cells) {
        if (grid[r][c] === 0) {
          let isSafe = true;
          for (const [qr, qc] of queens) {
            if (
              r === qr ||
              c === qc ||
              (Math.abs(r - qr) <= 1 && Math.abs(c - qc) <= 1) ||
              colorGrid[r][c] === colorGrid[qr][qc]
            ) {
              isSafe = false;
              break;
            }
          }
          if (isSafe) {
            possibleSpots.push([r, c]);
          }
        }
      }

      if (possibleSpots.length === 1) {
        const [r, c] = possibleSpots[0];
        setHighlightedCells([[r, c]]);
        setHintsUsed(prev => prev + 1);
        setHintMessage(
          `In the ${constraintName}, there is only one valid place for a queen.`,
        );
        return true;
      }
      return false;
    };

    for (let i = 0; i < size; i++) {
      if (
        checkConstraintForSingle(
          Array.from({ length: size }, (_, c) => [i, c]),
          `Row ${i + 1}`,
        )
      )
        return;
      if (
        checkConstraintForSingle(
          Array.from({ length: size }, (_, r) => [r, i]),
          `Column ${i + 1}`,
        )
      )
        return;

      const colorCells: [number, number][] = [];
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (colorGrid[r][c] === i) colorCells.push([r, c]);
      if (colorCells.length > 0) {
        if (checkConstraintForSingle(colorCells, `Color Region`)) return;
      }
    }

    Alert.alert(
      'No Obvious Hints',
      'There are no simple moves based on your current board. You may need to use more advanced logic or re-evaluate your queen placements.',
    );
  };

  const handleShowMenu = () => {
    stopTimer();
    setGameState('menu');
    setTime(0);
  };

  const handleReset = () => {
    if (!initialGrid.length) return;
    setGrid(initialGrid);
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
          <Text style={styles.loadingText}>Generating new puzzle...</Text>
        </View>
      );
    }

    if (gameState === 'playing' || gameState === 'won') {
      return (
        <Game
          difficulty={difficulty}
          grid={grid}
          colorGrid={colorGrid}
          hintsUsed={hintsUsed}
          errors={errors}
          isSolved={isSolved}
          highlightedCells={highlightedCells}
          hintMessage={hintMessage}
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
      <QueensMenu
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

export default QueensScreen;
