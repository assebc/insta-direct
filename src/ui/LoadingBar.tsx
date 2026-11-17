import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { palette } from './theme';
import { useReducedMotion } from './useReducedMotion';

/**
 * Thin determinate progress line under the status bar (Safari / Chrome
 * style) instead of a spinner over content. Fades out on completion.
 */
export default function LoadingBar({ progress, visible }: { progress: number; visible: boolean }) {
  const reduceMotion = useReducedMotion();
  const width = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const p = Math.max(0.08, Math.min(1, progress));
    if (reduceMotion) width.setValue(p);
    else Animated.timing(width, { toValue: p, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [progress, reduceMotion, width]);

  useEffect(() => {
    if (visible) {
      width.setValue(0.08);
      opacity.setValue(1);
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 250, delay: 120, useNativeDriver: true }).start();
    }
  }, [visible, opacity, width]);

  return (
    <Animated.View pointerEvents="none" style={[styles.track, { opacity }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            transformOrigin: 'left',
            transform: [{ scaleX: width }],
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, overflow: 'hidden', zIndex: 10 },
  fill: { flex: 1, backgroundColor: palette.accent },
});
