import { Pressable, StyleSheet, Text, View } from 'react-native';

import Icon from './Icon';
import { palette } from './theme';
import type { ViewerHeaderProps } from './viewerHeaderProps';

/** iOS navigation bar: 44pt, "‹ Chats" back button in the tint color, centered title. */
export default function ViewerHeader({ title, onBack }: ViewerHeaderProps) {
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to chats"
        onPress={onBack}
        hitSlop={8}
        style={({ pressed }) => [styles.back, { opacity: pressed ? 0.4 : 1 }]}
      >
        <Icon name="chevronBack" size={22} color={palette.accent} />
        <Text style={styles.backText} maxFontSizeMultiplier={1.4}>
          Chats
        </Text>
      </Pressable>
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 44,
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
  },
  back: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    zIndex: 1,
  },
  backText: { color: palette.accent, fontSize: 17 },
  title: { color: palette.text, fontSize: 17, fontWeight: '600', textAlign: 'center' },
});
