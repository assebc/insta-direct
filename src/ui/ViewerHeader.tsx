import { Pressable, StyleSheet, Text, View } from 'react-native';

import Icon from './Icon';
import { palette } from './theme';
import type { ViewerHeaderProps } from './viewerHeaderProps';

/** Android: Material 3 small top app bar, 64dp, navigation icon + title. */
export default function ViewerHeader({ title, onBack }: ViewerHeaderProps) {
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to chats"
        onPress={onBack}
        android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: true, radius: 24 }}
        style={styles.nav}
      >
        <Icon name="chevronBack" size={24} color={palette.text} />
      </Pressable>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    backgroundColor: palette.background,
  },
  nav: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  title: { color: palette.text, fontSize: 22, marginLeft: 4 },
});
