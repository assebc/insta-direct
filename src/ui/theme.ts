import { Platform, PlatformColor, type ColorValue } from 'react-native';

/**
 * Semantic colors for the native shell. The app is always dark (app.json
 * `userInterfaceStyle: "dark"`), so iOS system colors resolve to their dark
 * variants and adapt to Increase Contrast; Android uses Material You dynamic
 * color on Android 12+ with the Material 3 baseline dark scheme as fallback.
 */
export type Palette = {
  /** Screen background; matches Instagram's dark page so the seams vanish. */
  background: ColorValue;
  /** Bars and sheets. */
  surface: ColorValue;
  surfaceRaised: ColorValue;
  text: ColorValue;
  textSecondary: ColorValue;
  separator: ColorValue;
  /** Interactive accent (buttons, progress). */
  accent: ColorValue;
  onAccent: ColorValue;
  /** Android active-destination pill / iOS gray button fill. */
  indicator: ColorValue;
  onIndicator: ColorValue;
  /** Snackbar / notice. */
  inverseSurface: ColorValue;
  inverseText: ColorValue;
  badge: ColorValue;
};

const ios: Palette = {
  background: '#000000',
  surface: '#000000',
  surfaceRaised: PlatformColor('secondarySystemBackground'),
  text: PlatformColor('label'),
  textSecondary: PlatformColor('secondaryLabel'),
  separator: PlatformColor('separator'),
  accent: PlatformColor('systemBlue'),
  onAccent: '#ffffff',
  indicator: PlatformColor('tertiarySystemFill'),
  onIndicator: PlatformColor('label'),
  inverseSurface: PlatformColor('secondarySystemBackground'),
  inverseText: PlatformColor('label'),
  badge: PlatformColor('systemRed'),
};

const materialBaselineDark: Palette = {
  background: '#000000',
  surface: '#211f26', // surfaceContainer
  surfaceRaised: '#1d1b20', // surfaceContainerLow
  text: '#e6e0e9', // onSurface
  textSecondary: '#cac4d0', // onSurfaceVariant
  separator: '#49454f', // outlineVariant
  accent: '#d0bcff', // primary
  onAccent: '#381e72', // onPrimary
  indicator: '#4a4458', // secondaryContainer
  onIndicator: '#e8def8', // onSecondaryContainer
  inverseSurface: '#e6e0e9',
  inverseText: '#322f35',
  badge: '#f2b8b5', // error
};

const sys = (name: string) => PlatformColor(`@android:color/${name}`);

const materialDynamicDark: Palette = {
  background: '#000000',
  surface: sys('system_neutral1_900'),
  surfaceRaised: sys('system_neutral1_900'),
  text: sys('system_neutral1_100'),
  textSecondary: sys('system_neutral2_200'),
  separator: sys('system_neutral2_700'),
  accent: sys('system_accent1_200'),
  onAccent: sys('system_accent1_800'),
  indicator: sys('system_accent2_700'),
  onIndicator: sys('system_accent2_100'),
  inverseSurface: sys('system_neutral1_100'),
  inverseText: sys('system_neutral1_800'),
  badge: '#f2b8b5',
};

export const palette: Palette =
  Platform.OS === 'ios'
    ? ios
    : Platform.OS === 'android' && Number(Platform.Version) >= 31
      ? materialDynamicDark
      : materialBaselineDark;
