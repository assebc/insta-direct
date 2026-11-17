import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ColorValue } from 'react-native';

import type { IconName } from './icons';

/** Android / default: Material icons. */
const MATERIAL: Record<IconName, [outline: MCIName, filled: MCIName]> = {
  chevronBack: ['arrow-left', 'arrow-left'],
  offline: ['wifi-off', 'wifi-off'],
  back: ['arrow-left', 'arrow-left'],
  replay: ['replay', 'replay'],
};
type MCIName = keyof typeof MaterialCommunityIcons.glyphMap;

export default function Icon(props: { name: IconName; size?: number; color: ColorValue; filled?: boolean }) {
  const [outline, filled] = MATERIAL[props.name];
  return (
    <MaterialCommunityIcons
      name={props.filled ? filled : outline}
      size={props.size ?? 24}
      color={props.color as string}
    />
  );
}
