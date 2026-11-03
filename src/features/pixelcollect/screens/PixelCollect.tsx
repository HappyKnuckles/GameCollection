import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, StatusBar, Dimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import PixelCollectGame from '../components/Game';
import PixelCollectMenu from '../components/Menu';
import {
  BELT_CAPACITY,
  PIXEL_DIFFICULTIES,
  PixelDifficulty,
  TICK_MS,
  TRAY_SIZE,
} from '../constants/config';
import { generateDeck, Deck } from '../utils/generator';
import { generatePicture } from '../utils/pictureGenerator';
import {
  GameState,
  LaunchSource,
  canLaunch,
  createGame,
  launch,
  suggestLaunch,
  tick,
} from '../utils/engine';
import { randomSeed } from '../../../utils/random';
import { showAlert } from '../../../utils/alert';
import { formatDuration, useGameTimer } from '../../../hooks/useGameTimer';

interface Level {
  difficulty: PixelDifficulty;
  /** Running level number for this difficulty in this session. */
  number: number;
  name: string;
  grid: number[][];
  colors: string[];
  deck: Deck;
}

const newGame = (level: Level) => createGame(level.grid, level.deck.lanes, TRAY_SIZE, BELT_CAPACITY);

const PixelCollectScreen: React.FC = () => {
  const [selected, setSelected] = useState<PixelDifficulty>(PIXEL_DIFFICULTIES[0]);
  const [level, setLevel] = useState<Level | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [hint, setHint] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const levelCounter = useRef<Record<string, number>>({});
  const lastPress = useRef<{ id: string; time: number } | null>(null);
  const isFocused = useIsFocused();

  const playing = state?.status === 'playing';
  const { time, timeRef, resetTime } = useGameTimer(!!playing);

  /** Generates a brand-new picture and deck for the difficulty. */
  const startLevel = useCallback(
    (difficulty: PixelDifficulty) => {
      const number = (levelCounter.current[difficulty.id] ?? 0) + 1;
      levelCounter.current[difficulty.id] = number;

      const picture = generatePicture(difficulty.size, difficulty.size, difficulty.colors, randomSeed());
      const deck = generateDeck(picture.grid, difficulty.lanes, randomSeed());
      const next: Level = { difficulty, number, ...picture, deck };
      setSelected(difficulty);
      setLevel(next);
      setState(newGame(next));
      setHint(null);
      setHintsUsed(0);
      resetTime();
    },
    [resetTime],
  );

  const handleShowMenu = useCallback(() => {
    setState(null);
    setLevel(null);
    resetTime();
  }, [resetTime]);

  const handleReset = () => {
    if (!level) return;
    setState(newGame(level));
    setHint(null);
  };

  // Belt loop: only runs while something is on the belt and the tab is visible.
  const beltBusy = !!state && state.status === 'playing' && state.belt.length > 0;
  useEffect(() => {
    if (!beltBusy || !isFocused) return;
    const id = setInterval(() => setState(s => (s ? tick(s) : s)), TICK_MS);
    return () => clearInterval(id);
  }, [beltBusy, isFocused]);

  // End of game dialogs.
  const status = state?.status;
  useEffect(() => {
    if (!level || !state || status === 'playing') return;
    if (status === 'won') {
      const finalTime = formatDuration(timeRef.current);
      const message =
        hintsUsed > 0
          ? `Level ${level.number} cleared using ${hintsUsed} hint${hintsUsed > 1 ? 's' : ''}, taking ${finalTime}!`
          : `Perfect! Level ${level.number} cleared without hints, taking ${finalTime}!`;
      showAlert('Congratulations!', message, [
        { text: 'Next picture', onPress: () => startLevel(level.difficulty) },
        { text: 'Main Menu', onPress: handleShowMenu },
      ]);
    } else {
      showAlert('Out of space', state.lostReason ?? 'Game over.', [
        { text: 'Try again', onPress: () => handleReset() },
        { text: 'Main Menu', onPress: handleShowMenu },
      ]);
    }
  }, [status]);

  const handleLaunch = (source: LaunchSource) => {
    setState(s => (s ? launch(s, source) : s));
    setHint(null);
  };

  const generateHint = () => {
    if (!state || state.status !== 'playing') return;
    const pick = suggestLaunch(state);
    if (!pick) return;
    setHint(pick.id);
    setHintsUsed(h => h + 1);
  };

  const handleDifficultyPress = (difficulty: PixelDifficulty) => {
    const now = Date.now();
    if (lastPress.current?.id === difficulty.id && now - lastPress.current.time < 300) {
      lastPress.current = null;
      startLevel(difficulty);
    } else {
      setSelected(difficulty);
      lastPress.current = { id: difficulty.id, time: now };
    }
  };

  const launchAllowed = useMemo(() => (state ? canLaunch(state) : false), [state]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      {level && state ? (
        <PixelCollectGame
          title={`Level ${level.number}`}
          state={state}
          colors={level.colors}
          time={time}
          hintsUsed={hintsUsed}
          hint={hint}
          canLaunch={launchAllowed}
          onLaunch={handleLaunch}
          onShowMenu={handleShowMenu}
          onGenerateHint={generateHint}
          onReset={handleReset}
          onNewGame={() => startLevel(level.difficulty)}
        />
      ) : (
        <PixelCollectMenu onSelectDifficulty={handleDifficultyPress} selectedDifficulty={selected} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    minHeight: Dimensions.get('window').height,
  },
});

export default PixelCollectScreen;
