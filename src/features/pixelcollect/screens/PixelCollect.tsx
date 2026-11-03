import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, StatusBar, Dimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import PixelCollectGame from '../components/Game';
import PixelCollectMenu from '../components/Menu';
import { PICTURES, PictureDef, parsePicture } from '../constants/pictures';
import { TICK_MS, TRAY_SIZE } from '../constants/config';
import { generateDeck, Deck } from '../utils/generator';
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
  picture: PictureDef;
  grid: number[][];
  colors: string[];
  deck: Deck;
}

const PixelCollectScreen: React.FC = () => {
  const [selected, setSelected] = useState<PictureDef>(PICTURES[0]);
  const [level, setLevel] = useState<Level | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [hint, setHint] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const lastPress = useRef<{ id: string; time: number } | null>(null);
  const isFocused = useIsFocused();

  const playing = state?.status === 'playing';
  const { time, timeRef, resetTime } = useGameTimer(!!playing);

  const startLevel = useCallback(
    (picture: PictureDef) => {
      const { grid, colors } = parsePicture(picture);
      const deck = generateDeck(grid, picture.lanes, randomSeed());
      setSelected(picture);
      setLevel({ picture, grid, colors, deck });
      setState(createGame(grid, deck.lanes, TRAY_SIZE));
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
          ? `You cleared ${level.picture.name} using ${hintsUsed} hint${hintsUsed > 1 ? 's' : ''}, taking ${finalTime}!`
          : `Perfect! You cleared ${level.picture.name} without hints, taking ${finalTime}!`;
      showAlert('Congratulations!', message, [
        { text: 'Next picture', onPress: () => startLevel(nextPicture(level.picture)) },
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

  const handleReset = () => {
    if (!level) return;
    setState(createGame(level.grid, level.deck.lanes, TRAY_SIZE));
    setHint(null);
  };

  const generateHint = () => {
    if (!state || state.status !== 'playing') return;
    const pick = suggestLaunch(state);
    if (!pick) return;
    setHint(pick.id);
    setHintsUsed(h => h + 1);
  };

  const handlePicturePress = (picture: PictureDef) => {
    const now = Date.now();
    if (lastPress.current?.id === picture.id && now - lastPress.current.time < 300) {
      lastPress.current = null;
      startLevel(picture);
    } else {
      setSelected(picture);
      lastPress.current = { id: picture.id, time: now };
    }
  };

  const launchAllowed = useMemo(() => (state ? canLaunch(state) : false), [state]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      {level && state ? (
        <PixelCollectGame
          title={level.picture.name}
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
          onNewGame={() => startLevel(level.picture)}
        />
      ) : (
        <PixelCollectMenu onSelectPicture={handlePicturePress} selectedPicture={selected} />
      )}
    </View>
  );
};

const nextPicture = (current: PictureDef) =>
  PICTURES[(PICTURES.findIndex(p => p.id === current.id) + 1) % PICTURES.length];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    minHeight: Dimensions.get('window').height,
  },
});

export default PixelCollectScreen;
