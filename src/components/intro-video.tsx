import { useEvent } from 'expo';
import { type VideoPlayer, useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { colors, fonts, radius, spacing } from '@/theme';

import { Icon } from './icon';

/** expo-video's player takes its sound setting as a property. */
function setPlayerMuted(player: VideoPlayer, muted: boolean) {
  player.muted = muted;
}

/**
 * The cook's short hello. It plays silently on a loop, like a live photo;
 * tap for sound. With Reduce Motion on it waits for a tap instead.
 */
export function IntroVideo({
  uri,
  chefName,
  style,
}: {
  uri: string;
  chefName: string;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReducedMotion();
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const [muted, setMuted] = useState(true);

  const tap = () => {
    if (!isPlaying) {
      player.play();
      return;
    }
    setMuted(!muted);
  };

  // The player follows the sound setting.
  useEffect(() => setPlayerMuted(player, muted), [player, muted]);

  // Start once the view is on screen: on the web the player can only play a mounted video.
  useEffect(() => {
    if (!reduce) player.play();
  }, [player, reduce]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        !isPlaying ? `Play ${chefName}’s video` : muted ? `Turn on sound for ${chefName}’s video` : 'Mute video'
      }
      onPress={tap}
      style={[styles.wrap, style]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      <View style={styles.label} pointerEvents="none">
        <Text style={styles.labelText}>Meet {chefName}</Text>
      </View>
      <View style={styles.control} pointerEvents="none">
        <Icon name={!isPlaying ? 'play' : muted ? 'volume-off' : 'volume-high'} size={18} color={colors.ivory} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surfaceRaised },
  label: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(10,9,7,0.6)',
  },
  labelText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ivory },
  control: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(10,9,7,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
