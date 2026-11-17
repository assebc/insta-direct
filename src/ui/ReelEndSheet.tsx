import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import Icon from './Icon';
import { palette } from './theme';
import { useReducedMotion } from './useReducedMotion';

const ios = Platform.OS === 'ios';

/**
 * Shown when a reel finishes (PRD §3: "a clear return, no autoplay").
 * iOS: sheet with grabber and large rounded buttons. Android: Material 3
 * bottom sheet with drag handle, filled + outlined buttons.
 */
export default function ReelEndSheet(props: { visible: boolean; onBack: () => void; onReplay: () => void }) {
  const reduceMotion = useReducedMotion();
  const y = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const to = props.visible ? 0 : 1;
    if (reduceMotion) y.setValue(to);
    else
      Animated.timing(y, {
        toValue: to,
        duration: props.visible ? 320 : 200,
        easing: props.visible ? Easing.bezier(0.05, 0.7, 0.1, 1) : Easing.bezier(0.3, 0, 0.8, 0.15),
        useNativeDriver: true,
      }).start();
  }, [props.visible, reduceMotion, y]);

  return (
    <Animated.View
      pointerEvents={props.visible ? 'auto' : 'none'}
      accessibilityViewIsModal={props.visible}
      style={[
        styles.sheet,
        {
          opacity: y.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }),
          transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, 240] }) }],
        },
      ]}
    >
      <View style={styles.handle} />
      <Text style={styles.title} accessibilityRole="header">
        End of reel
      </Text>
      <Text style={styles.body}>Nothing plays next. Head back to your chat.</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={props.onBack}
          android_ripple={{ color: 'rgba(0,0,0,0.12)' }}
          style={({ pressed }) => [styles.button, styles.primary, ios && pressed && styles.pressed]}
        >
          <Icon name="back" size={18} color={palette.onAccent} />
          <Text style={[styles.buttonText, { color: palette.onAccent }]}>Back to chat</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={props.onReplay}
          android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
          style={({ pressed }) => [styles.button, styles.secondary, ios && pressed && styles.pressed]}
        >
          <Icon name="replay" size={18} color={ios ? palette.text : palette.accent} />
          <Text style={[styles.buttonText, { color: ios ? palette.text : palette.accent }]}>Replay</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: ios ? 20 : 24,
    paddingTop: ios ? 8 : 16,
    paddingBottom: ios ? 20 : 24,
    backgroundColor: palette.surfaceRaised,
    borderTopLeftRadius: ios ? 14 : 28,
    borderTopRightRadius: ios ? 14 : 28,
    ...(ios
      ? { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: -4 } }
      : { elevation: 3 }),
  },
  handle: {
    alignSelf: 'center',
    width: ios ? 36 : 32,
    height: ios ? 5 : 4,
    borderRadius: 3,
    backgroundColor: ios ? palette.indicator : palette.textSecondary,
    opacity: ios ? 1 : 0.4,
    marginBottom: ios ? 14 : 20,
  },
  title: ios
    ? { color: palette.text, fontSize: 20, fontWeight: '700', letterSpacing: 0.38 }
    : { color: palette.text, fontSize: 22, fontWeight: '400' },
  body: {
    color: palette.textSecondary,
    fontSize: ios ? 15 : 14,
    lineHeight: ios ? 20 : 20,
    marginTop: 4,
  },
  actions: { flexDirection: 'row', gap: ios ? 10 : 8, marginTop: ios ? 18 : 24 },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: ios ? 50 : 48,
    borderRadius: ios ? 12 : 24,
    overflow: 'hidden',
  },
  primary: { backgroundColor: palette.accent },
  secondary: ios
    ? { backgroundColor: palette.indicator }
    : { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.separator },
  pressed: { opacity: 0.7 },
  buttonText: ios ? { fontSize: 17, fontWeight: '600' } : { fontSize: 14, fontWeight: '500', letterSpacing: 0.1 },
});
