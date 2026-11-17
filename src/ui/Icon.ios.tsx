import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import type { IconName } from './icons';

/** iOS: SF Symbols. */
const SF: Record<IconName, [outline: SFSymbol, filled: SFSymbol]> = {
  chevronBack: ['chevron.backward', 'chevron.backward'],
  offline: ['wifi.exclamationmark', 'wifi.exclamationmark'],
  back: ['arrow.uturn.backward', 'arrow.uturn.backward'],
  replay: ['gobackward', 'gobackward'],
};

export default function Icon(props: { name: IconName; size?: number; color: ColorValue; filled?: boolean }) {
  const [outline, filled] = SF[props.name];
  const size = props.size ?? 24;
  return (
    <SymbolView
      name={props.filled ? filled : outline}
      tintColor={props.color}
      weight={props.name === 'chevronBack' ? 'semibold' : 'regular'}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
    />
  );
}
