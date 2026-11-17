import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from './theme';
import { useReducedMotion } from './useReducedMotion';

export type SetupStep = 'install-instagram' | 'grant-access';

/**
 * Android only. Material 3 bottom sheet that explains message notifications
 * and sends the user to the one system setting it needs.
 */
export default function NotificationSetupSheet(props: {
  step: SetupStep | null;
  onPrimary: () => void;
  onDismiss: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const y = useRef(new Animated.Value(1)).current;
  const lastStep = useRef<SetupStep>('grant-access');
  if (props.step) lastStep.current = props.step;
  const step = lastStep.current;

  useEffect(() => {
    const to = props.step ? 0 : 1;
    if (reduceMotion) y.setValue(to);
    else
      Animated.timing(y, {
        toValue: to,
        duration: props.step ? 320 : 200,
        easing: props.step ? Easing.bezier(0.05, 0.7, 0.1, 1) : Easing.bezier(0.3, 0, 0.8, 0.15),
        useNativeDriver: true,
      }).start();
  }, [props.step, reduceMotion, y]);

  const copy =
    step === 'install-instagram'
      ? {
          title: 'Get message notifications',
          body:
            'InstaDirect shows your Instagram message notifications, even when it’s closed. ' +
            'Install the official Instagram app, turn on message notifications only, and never open it.',
          primary: 'Open Play Store',
        }
      : {
          title: 'Get message notifications',
          body:
            'Allow notification access so InstaDirect can show Instagram’s message notifications as its own, ' +
            'even when it’s closed. Tapping one opens InstaDirect, never Instagram.',
          primary: 'Allow access',
        };

  return (
    <Animated.View
      pointerEvents={props.step ? 'auto' : 'none'}
      accessibilityViewIsModal={!!props.step}
      style={[
        styles.sheet,
        {
          opacity: y.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }),
          transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, 280] }) }],
        },
      ]}
    >
      <View style={styles.handle} />
      <Text style={styles.title} accessibilityRole="header">
        {copy.title}
      </Text>
      <Text style={styles.body}>{copy.body}</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={props.onDismiss}
          android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
          style={[styles.button, styles.text]}
        >
          <Text style={[styles.buttonText, { color: palette.accent }]}>Not now</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={props.onPrimary}
          android_ripple={{ color: 'rgba(0,0,0,0.12)' }}
          style={[styles.button, styles.filled]}
        >
          <Text style={[styles.buttonText, { color: palette.onAccent }]}>{copy.primary}</Text>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: palette.surfaceRaised,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 3,
  },
  handle: {
    alignSelf: 'center',
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.textSecondary,
    opacity: 0.4,
    marginBottom: 20,
  },
  title: { color: palette.text, fontSize: 22 },
  body: { color: palette.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24 },
  button: {
    minHeight: 40,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: { paddingHorizontal: 12 },
  filled: { backgroundColor: palette.accent },
  buttonText: { fontSize: 14, fontWeight: '500', letterSpacing: 0.1 },
});
