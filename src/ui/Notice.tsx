import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text } from 'react-native';

import { palette } from './theme';
import { useReducedMotion } from './useReducedMotion';

/**
 * Transient feedback ("Reels feed is blocked"). Android: a Material snackbar
 * above the navigation bar. iOS: a small capsule that drops from the top,
 * like system banners.
 */
export default function Notice({ text }: { text: string | null }) {
  const reduceMotion = useReducedMotion();
  const shown = useRef(new Animated.Value(0)).current;
  const last = useRef(text);
  if (text) last.current = text;

  useEffect(() => {
    const to = text ? 1 : 0;
    if (reduceMotion) shown.setValue(to);
    else
      Animated.timing(shown, {
        toValue: to,
        duration: text ? 220 : 160,
        easing: text ? Easing.out(Easing.exp) : Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
  }, [text, reduceMotion, shown]);

  const ios = Platform.OS === 'ios';
  const offset = shown.interpolate({ inputRange: [0, 1], outputRange: [ios ? -16 : 16, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[ios ? styles.iosWrap : styles.androidWrap, { opacity: shown, transform: [{ translateY: offset }] }]}
    >
      <Text style={ios ? styles.iosText : styles.androidText}>{last.current}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  iosWrap: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    backgroundColor: palette.inverseSurface,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  iosText: { color: palette.inverseText, fontSize: 15, fontWeight: '600' },
  androidWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: palette.inverseSurface,
    borderRadius: 4,
    paddingHorizontal: 16,
    elevation: 6,
  },
  androidText: { color: palette.inverseText, fontSize: 14, letterSpacing: 0.25 },
});
