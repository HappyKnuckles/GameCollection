import React, { memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Collector, EMPTY, GameState, LaunchSource, beltSpot, perimeter } from '../utils/engine';

interface GameProps {
  title: string;
  state: GameState;
  colors: string[];
  time: number;
  hintsUsed: number;
  /** Id of the collector the hint points at. */
  hint: number | null;
  canLaunch: boolean;
  onLaunch: (source: LaunchSource) => void;
  onShowMenu: () => void;
  onGenerateHint: () => void;
  onReset: () => void;
  onNewGame: () => void;
}

const LANE_PREVIEW = 3;

/** Dark text on light colours, white text on dark ones. */
const textColorFor = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#2c3e50' : '#ffffff';
};

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

const PictureRow = memo(
  ({ row, colors, cell }: { row: number[]; colors: string[]; cell: number }) => (
    <View style={styles.row}>
      {row.map((v, c) => (
        <View
          key={c}
          style={{
            width: cell,
            height: cell,
            backgroundColor: v === EMPTY ? 'transparent' : colors[v],
          }}
        />
      ))}
    </View>
  ),
);

const Chip = ({
  collector,
  colors,
  size,
  dim,
  highlighted,
}: {
  collector: Collector;
  colors: string[];
  size: number;
  dim?: boolean;
  highlighted?: boolean;
}) => {
  const bg = colors[collector.color];
  return (
    <View
      style={[
        styles.chip,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          opacity: dim ? 0.45 : 1,
        },
        highlighted && styles.chipHighlighted,
      ]}
    >
      <Text style={[styles.chipText, { color: textColorFor(bg), fontSize: Math.max(9, size * 0.38) }]}>
        {collector.count}
      </Text>
    </View>
  );
};

const PixelCollectGame: React.FC<GameProps> = ({
  title,
  state,
  colors,
  time,
  hintsUsed,
  hint,
  canLaunch,
  onLaunch,
  onShowMenu,
  onGenerateHint,
  onReset,
  onNewGame,
}) => {
  const rows = state.picture.length;
  const cols = state.picture[0].length;
  const { width } = Dimensions.get('window');

  const boardWidth = Math.min(width - 24, 460);
  // Belt ring around the picture: ~1.6 cells wide.
  const cell = Math.floor(boardWidth / (cols + 3.2));
  const ring = Math.floor(cell * 1.6);
  const pictureW = cell * cols;
  const pictureH = cell * rows;
  const boardW = pictureW + 2 * ring;
  const boardH = pictureH + 2 * ring;
  const riderSize = Math.floor(ring * 0.85);

  const spotCenter = (pos: number) => {
    const spot = beltSpot(pos, rows, cols);
    switch (spot.side) {
      case 'bottom':
        return { x: ring + spot.line * cell + cell / 2, y: ring + pictureH + ring / 2 };
      case 'right':
        return { x: ring + pictureW + ring / 2, y: ring + spot.line * cell + cell / 2 };
      case 'top':
        return { x: ring + spot.line * cell + cell / 2, y: ring / 2 };
      case 'left':
        return { x: ring / 2, y: ring + spot.line * cell + cell / 2 };
    }
  };
  const entry = spotCenter(0);
  const lap = perimeter(rows, cols);

  const isHinted = (c: Collector | null | undefined) => !!c && c.id === hint;

  const playing = state.status === 'playing';

  return (
    <View style={styles.gameContainer}>
      <View style={styles.gameHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onShowMenu}>
          <Text style={styles.buttonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.gameTitle}>{title}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.hintButton} onPress={onGenerateHint}>
            <Text style={styles.buttonText}>💡 Hint</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={onReset}>
            <Text style={styles.buttonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newGameButton} onPress={onNewGame}>
            <Text style={styles.buttonText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statsSide} />
        <Text style={styles.timeText}>Time: {formatTime(time)}</Text>
        <View style={styles.statsSide}>
          <Text style={styles.hintsText}>Hints: {hintsUsed}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Board: belt ring + picture */}
        <View style={[styles.board, { width: boardW, height: boardH, borderRadius: ring / 2 }]}>
          <View
            style={[
              styles.picture,
              { left: ring, top: ring, width: pictureW, height: pictureH },
            ]}
          >
            {state.picture.map((row, r) => (
              <PictureRow key={r} row={row} colors={colors} cell={cell} />
            ))}
          </View>

          {/* Entry marker */}
          <View
            style={[
              styles.entry,
              {
                left: entry.x - riderSize / 2,
                top: entry.y - riderSize / 2,
                width: riderSize,
                height: riderSize,
                borderRadius: riderSize / 2,
              },
            ]}
          />

          {state.belt.map(rider => {
            const p = spotCenter(rider.pos);
            return (
              <View
                key={rider.collector.id}
                style={{ position: 'absolute', left: p.x - riderSize / 2, top: p.y - riderSize / 2 }}
              >
                <Chip collector={rider.collector} colors={colors} size={riderSize} />
              </View>
            );
          })}
        </View>
        <Text style={styles.beltInfo}>
          {state.belt.length > 0
            ? `${state.belt.length} on the belt · lap = ${lap} steps`
            : 'Tap a collector to send it around the picture'}
        </Text>

        {/* Tray */}
        <Text style={styles.sectionTitle}>Tray</Text>
        <View style={styles.tray}>
          {state.tray.map((c, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.slot, isHinted(c) && styles.slotHinted]}
              disabled={!c || !playing}
              onPress={() => onLaunch({ from: 'tray', index })}
            >
              {c ? (
                <Chip
                  collector={c}
                  colors={colors}
                  size={40}
                  dim={!canLaunch}
                  highlighted={isHinted(c)}
                />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        {/* Deck lanes */}
        <Text style={styles.sectionTitle}>Collectors</Text>
        <View style={styles.lanes}>
          {state.lanes.map((lane, index) => (
            <TouchableOpacity
              key={index}
              style={styles.lane}
              disabled={lane.length === 0 || !playing}
              onPress={() => onLaunch({ from: 'lane', index })}
            >
              {lane.slice(0, LANE_PREVIEW).map((c, i) => (
                <View key={c.id} style={i > 0 && styles.laneQueued}>
                  <Chip
                    collector={c}
                    colors={colors}
                    size={i === 0 ? 46 : 32}
                    dim={i > 0 || !canLaunch}
                    highlighted={i === 0 && isHinted(c)}
                  />
                </View>
              ))}
              {lane.length > LANE_PREVIEW && (
                <Text style={styles.moreText}>+{lane.length - LANE_PREVIEW}</Text>
              )}
              {lane.length === 0 && <Text style={styles.moreText}>empty</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {state.status === 'won' && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>✅ Picture cleared!</Text>
          </View>
        )}
        {state.status === 'lost' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {state.lostReason ?? 'Game over.'}</Text>
          </View>
        )}
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
  backButton: { backgroundColor: '#95a5a6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  hintButton: { backgroundColor: '#f39c12', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  resetButton: { backgroundColor: '#3498db', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  newGameButton: { backgroundColor: '#e74c3c', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  buttonText: { color: 'white', fontWeight: '500' },
  gameTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statsSide: { flex: 1 },
  timeText: { fontSize: 16, color: '#2c3e50', fontWeight: 'bold', textAlign: 'center' },
  hintsText: { fontSize: 16, color: '#8e44ad', textAlign: 'right' },
  scrollContainer: { flexGrow: 1, alignItems: 'center', paddingBottom: 24 },
  board: { backgroundColor: '#d5d8dc', marginTop: 8 },
  picture: { position: 'absolute', backgroundColor: '#ffffff' },
  row: { flexDirection: 'row' },
  entry: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#7f8c8d',
  },
  beltInfo: { fontSize: 12, color: '#7f8c8d', marginTop: 6 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#95a5a6',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 6,
  },
  tray: { flexDirection: 'row', gap: 8 },
  slot: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#d5d8dc',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotHinted: { borderColor: '#f39c12', borderStyle: 'solid' },
  lanes: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  lane: {
    width: 64,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  laneQueued: { marginTop: 6 },
  moreText: { fontSize: 12, color: '#95a5a6', marginTop: 6 },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  chipHighlighted: { borderColor: '#f39c12', borderWidth: 3 },
  chipText: { fontWeight: '800' },
  successContainer: {
    backgroundColor: '#dfd',
    padding: 10,
    borderRadius: 5,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#cfc',
  },
  successText: { color: '#383', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 10,
    borderRadius: 5,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorText: { color: '#c33', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
});

export default PixelCollectGame;
