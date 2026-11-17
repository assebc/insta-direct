import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import Icon from './Icon';
import { palette } from './theme';

const ios = Platform.OS === 'ios';

/** Full-screen state when Instagram can't be reached. */
export default function ErrorState(props: { description?: string; onRetry: () => void }) {
  const offline = /internet|offline|network|host|NSURLErrorDomain|ERR_INTERNET|ERR_NAME/i.test(props.description ?? '');
  return (
    <View style={styles.wrap}>
      <Icon name="offline" size={44} color={palette.textSecondary} />
      <Text style={styles.title} accessibilityRole="header">
        {offline ? "You're offline" : "Instagram didn't load"}
      </Text>
      <Text style={styles.body}>
        {offline
          ? 'Connect to Wi-Fi or mobile data, then try again.'
          : 'Instagram may be having trouble. Try again in a moment.'}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={props.onRetry}
        android_ripple={{ color: 'rgba(0,0,0,0.12)' }}
        style={({ pressed }) => [styles.button, ios && pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: palette.background,
  },
  title: ios
    ? { color: palette.text, fontSize: 22, fontWeight: '700', marginTop: 20, textAlign: 'center' }
    : { color: palette.text, fontSize: 24, fontWeight: '400', marginTop: 20, textAlign: 'center' },
  body: {
    color: palette.textSecondary,
    fontSize: ios ? 17 : 14,
    lineHeight: ios ? 22 : 20,
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    marginTop: 28,
    minHeight: ios ? 50 : 40,
    minWidth: ios ? 200 : 0,
    paddingHorizontal: 24,
    borderRadius: ios ? 12 : 20,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonText: ios
    ? { color: palette.onAccent, fontSize: 17, fontWeight: '600' }
    : { color: palette.onAccent, fontSize: 14, fontWeight: '500', letterSpacing: 0.1 },
});
