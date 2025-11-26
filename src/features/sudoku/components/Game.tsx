import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SudokuDifficulty } from '../constants/config';

interface GameProps {
  difficulty: SudokuDifficulty;
  grid: number[][];
  initialGrid: number[][];
  selectedCell: { row: number; col: number } | null;
  hintsUsed: number;
  errors: string[];
  isSolved: boolean;
  highlightedCells: [number, number][];
  hintMessage: string;
  time: number;
  onCellTap: (row: number, col: number) => void;
  onNumberInput: (num: number) => void;
  onNewGame: () => void;
  onShowMenu: () => void;
  onGenerateHint: () => void;
  onReset: () => void;
}

const SudokuGame: React.FC<GameProps> = ({
  difficulty,
  grid,
  initialGrid,
  selectedCell,
  hintsUsed,
  errors,
  isSolved,
  highlightedCells,
  hintMessage,
  time,
  onCellTap,
  onNumberInput,
  onNewGame,
  onShowMenu,
  onGenerateHint,
  onReset,
}) => {
  const { width, height } = Dimensions.get('window');

  // Layout Logic
  const availableWidth = width - 35;
  const availableHeight = height - 350;
  const maxContentSize = Math.floor(Math.min(availableWidth, availableHeight));
  const cellSize = maxContentSize / 9;
  const fontSize = Math.max(12, cellSize * 0.6);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <View style={styles.gameContainer}>
      {/* Header */}
      <View style={styles.gameHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onShowMenu}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.gameTitle}>{difficulty.name}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.hintButton} onPress={onGenerateHint}>
            <Text style={styles.hintButtonText}>💡 Hint</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newGameButton} onPress={onNewGame}>
            <Text style={styles.newGameButtonText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statsSideContainer} />
        <Text style={styles.timeText}>Time: {formatTime(time)}</Text>
        <View style={styles.statsSideContainer}>
          <Text style={styles.hintsText}>Hints: {hintsUsed}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* The Grid */}
        <View
          style={[
            styles.gridBorderWrapper,
            {
              width: maxContentSize + 4,
              height: maxContentSize + 4,
            },
          ]}
        >
          {grid.map((row, i) => (
            <View key={i} style={styles.row}>
              {row.map((cell, j) => {
                const isInitial = initialGrid[i][j] !== 0;
                const isSelected =
                  selectedCell?.row === i && selectedCell?.col === j;
                const isHighlighted = highlightedCells.some(
                  ([hr, hc]) => hr === i && hc === j,
                );

                const borderRight = (j + 1) % 3 === 0 && j !== 8 ? 2 : 0.5;
                const borderBottom = (i + 1) % 3 === 0 && i !== 8 ? 2 : 0.5;

                const backgroundColor = isSelected
                  ? '#bbdefb'
                  : isHighlighted
                  ? '#fff9c4'
                  : isInitial
                  ? '#f0f0f0'
                  : '#fff';

                return (
                  <TouchableOpacity
                    key={`${i}-${j}`}
                    activeOpacity={0.8}
                    onPress={() => onCellTap(i, j)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        borderRightWidth: borderRight,
                        borderBottomWidth: borderBottom,
                        backgroundColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        {
                          fontSize: fontSize,
                          color: isInitial ? '#000' : '#1565c0',
                          fontWeight: isInitial ? 'bold' : 'normal',
                        },
                      ]}
                    >
                      {cell !== 0 ? cell : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Info / Errors */}
        <View style={styles.statusContainer}>
          {hintMessage ? (
            <View style={styles.hintContainer}>
              <Text style={styles.hintTitle}>💡 Hint:</Text>
              <Text style={styles.hintText}>{hintMessage}</Text>
            </View>
          ) : null}
          {errors.length > 0 && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>⚠️ Errors:</Text>
              {errors.map((error, index) => (
                <Text key={index} style={styles.errorText}>
                  • {error}
                </Text>
              ))}
            </View>
          )}
          {isSolved && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>✅ Puzzle Solved!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Number Pad */}
      <View style={styles.numpadContainer}>
        <View style={styles.numpadRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <TouchableOpacity
              key={num}
              style={styles.numpadButton}
              onPress={() => onNumberInput(num)}
            >
              <Text style={styles.numpadText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.numpadActions}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => onNumberInput(0)}
          >
            <Text style={styles.clearButtonText}>Clear Cell</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={onReset}>
            <Text style={styles.resetButtonText}>Reset Board</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gameContainer: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  backButton: {
    backgroundColor: '#95a5a6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: { color: 'white', fontWeight: '500' },
  gameTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  newGameButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newGameButtonText: { color: 'white', fontWeight: '500' },
  hintButton: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  hintButtonText: { color: 'white', fontWeight: '500' },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statsSideContainer: { flex: 1 },
  timeText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  hintsText: { fontSize: 16, color: '#8e44ad', textAlign: 'right' },

  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridBorderWrapper: {
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#333',
  },
  row: { flexDirection: 'row' },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRightColor: '#999',
    borderBottomColor: '#999',
  },
  cellText: { textAlign: 'center' },

  statusContainer: { width: '100%', marginTop: 20 },
  hintContainer: {
    backgroundColor: '#fffbe6',
    padding: 12,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ffe58f',
  },
  hintTitle: {
    color: '#d46b08',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  hintText: { color: '#d46b08', fontSize: 13 },

  errorContainer: {
    backgroundColor: '#fee',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorTitle: {
    color: '#c33',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  errorText: { color: '#c33', fontSize: 12 },

  successContainer: {
    backgroundColor: '#dfd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#cfc',
  },
  successText: {
    color: '#383',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },

  numpadContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#eee',
    paddingBottom: 80,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  numpadButton: {
    width: 35,
    height: 40,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  numpadText: { fontSize: 18, color: '#1565c0', fontWeight: '600' },
  numpadActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  clearButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#ffebee',
    borderRadius: 20,
  },
  clearButtonText: { color: '#d32f2f', fontWeight: '600' },
  resetButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#eceff1',
    borderRadius: 20,
  },
  resetButtonText: { color: '#455a64', fontWeight: '600' },
});

export default SudokuGame;
