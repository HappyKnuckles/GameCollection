import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  GestureResponderEvent,
  Platform,
} from 'react-native';
import { COLORS, QueensDifficulty } from '../constants/config';

interface GameProps {
  difficulty: QueensDifficulty;
  grid: number[][];
  colorGrid: number[][];
  hintsUsed: number;
  errors: string[];
  isSolved: boolean;
  highlightedCells: [number, number][];
  hintMessage: string;
  time: number;
  onCellTap: (row: number, col: number) => void;
  onCellDragOver: (row: number, col: number) => void;
  onNewGame: () => void;
  onShowMenu: () => void;
  onGenerateHint: () => void;
  onReset: () => void;
}

const Game: React.FC<GameProps> = ({
  difficulty,
  grid,
  colorGrid,
  hintsUsed,
  errors,
  isSolved,
  highlightedCells,
  hintMessage,
  time,
  onCellTap,
  onCellDragOver,
  onNewGame,
  onShowMenu,
  onGenerateHint,
  onReset,
}) => {
  const [lastDraggedCell, setLastDraggedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const hasDragged = useRef(false);
  const gridWrapperRef = useRef<View>(null);
  const [gridOrigin, setGridOrigin] = useState({ x: 0, y: 0 });

  const { width, height } = Dimensions.get('window');
  const GRID_BORDER_WIDTH = 2;

  const availableWidth = width - 24 - GRID_BORDER_WIDTH * 2;
  const availableHeight = height - 150 - GRID_BORDER_WIDTH * 2;

  const maxContentSize = Math.floor(Math.min(availableWidth, availableHeight));

  const cellSize = maxContentSize / difficulty.size;
  const fontSize = Math.max(8, cellSize * 0.55);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const onGridLayout = () => {
    gridWrapperRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setGridOrigin({
        x: pageX + GRID_BORDER_WIDTH,
        y: pageY + GRID_BORDER_WIDTH,
      });
    });
  };

  const getCellFromCoordinates = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    const locationX = pageX - gridOrigin.x;
    const locationY = pageY - gridOrigin.y;
    const col = Math.floor(locationX / cellSize);
    const row = Math.floor(locationY / cellSize);
    if (
      row < 0 ||
      row >= difficulty.size ||
      col < 0 ||
      col >= difficulty.size
    ) {
      return null;
    }
    return { row, col };
  };

  const handleTouchStart = () => {
    hasDragged.current = false;
  };

  const handleTouchMove = (event: GestureResponderEvent) => {
    hasDragged.current = true;
    const cell = getCellFromCoordinates(event);
    if (!cell) return;
    if (
      lastDraggedCell &&
      lastDraggedCell.row === cell.row &&
      lastDraggedCell.col === cell.col
    ) {
      return;
    }
    onCellDragOver(cell.row, cell.col);
    setLastDraggedCell(cell);
  };

  const handleTouchEnd = (event: GestureResponderEvent) => {
    if (!hasDragged.current) {
      const cell = getCellFromCoordinates(event);
      if (cell) {
        onCellTap(cell.row, cell.col);
      }
    }
    setLastDraggedCell(null);
  };

  const gridContainerProps = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: handleTouchStart,
    onResponderMove: handleTouchMove,
    onResponderRelease: handleTouchEnd,
    ...(Platform.OS === 'web' && { onMouseLeave: handleTouchEnd }),
  };

  return (
    <View style={styles.gameContainer}>
      <View style={styles.gameHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onShowMenu}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.gameTitle}>{difficulty.name}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.hintButton} onPress={onGenerateHint}>
            <Text style={styles.hintButtonText}>💡 Hint</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={onReset}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newGameButton} onPress={onNewGame}>
            <Text style={styles.newGameButtonText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statsSideContainer} />
        <Text style={styles.timeText}>Time: {formatTime(time)}</Text>
        <View style={styles.statsSideContainer}>
          <Text style={styles.hintsText}>Hints: {hintsUsed}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View
          ref={gridWrapperRef}
          onLayout={onGridLayout}
          style={[
            styles.gridBorderWrapper,
            {
              width: maxContentSize + GRID_BORDER_WIDTH * 2,
              height: maxContentSize + GRID_BORDER_WIDTH * 2,
            },
          ]}
        >
          <View {...gridContainerProps}>
            {grid.map((row, i) => (
              <View key={i} style={styles.row}>
                {row.map((cell, j) => {
                  const isHighlighted = highlightedCells.some(
                    ([hr, hc]) => hr === i && hc === j,
                  );
                  const BOLD_BORDER_WIDTH = 2;
                  const cellStyle = {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor:
                      colorGrid[i]?.[j] != null
                        ? COLORS[colorGrid[i][j] % COLORS.length]
                        : 'transparent',
                    borderTopWidth:
                      i > 0 && colorGrid[i]?.[j] !== colorGrid[i - 1]?.[j]
                        ? BOLD_BORDER_WIDTH
                        : 0.5,
                    borderLeftWidth:
                      j > 0 && colorGrid[i]?.[j] !== colorGrid[i][j - 1]
                        ? BOLD_BORDER_WIDTH
                        : 0.5,
                    borderColor: '#000',
                  };
                  return (
                    <View key={`${i}-${j}`} style={[styles.cell, cellStyle]}>
                      <View style={styles.cellContentWrapper}>
                        {isHighlighted && (
                          <View style={styles.highlightOverlay} />
                        )}
                        <Text style={[styles.cellText, { fontSize }]}>
                          {cell === 1 ? '❌\uFE0E' : cell === 2 ? '👑' : ''}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

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
              <Text style={styles.successText}>✅ Solution Complete!</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  hintButton: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  hintText: {
    color: '#d46b08',
    fontSize: 13,
  },
  hintButtonText: { color: 'white', fontWeight: '500' },
  resetButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  resetButtonText: { color: 'white', fontWeight: '500' },
  newGameButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newGameButtonText: { color: 'white', fontWeight: '500' },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statsSideContainer: {
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  hintsText: {
    fontSize: 16,
    color: '#8e44ad',
    textAlign: 'right',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridBorderWrapper: {
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#333',
  },
  row: { flexDirection: 'row' },
  cell: {
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#333',
  },
  cellContentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
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
});

export default Game;
